import { getSourceCategoriesForIntent } from '@/lib/config/config-router'
import type { UserIntent } from '@/lib/config/intents'
import { createScrapeGraphAIClient, type ScrapeGraphAIClient } from '@/lib/scrapegraphai/client'
import { createSupabaseServiceClient } from '@/lib/db/supabase'
import { getBoss, QUEUE } from '@/lib/queue/boss'

export interface BusinessContextInput {
  businessName: string
  businessDescription: string
  targetAudience: string
}

export interface ScrapeAttemptResult {
  sourceCategory: string
  status: 'success' | 'failed'
  sourceUrl?: string
  scrapedText?: string
  errorMessage?: string
}

// ScrapeGraphAI's /api/search `query` field behaves like a search-engine
// query (short keywords), not an LLM instruction -- a full paragraph
// reliably returns zero results (verified against the live API). Keep it
// short: the business's product category plus the source category.
function buildQuery(businessContext: BusinessContextInput, sourceCategory: string): string {
  return `${businessContext.businessDescription} ${sourceCategory}`
}

// Task 1.3's core logic, kept pure and Supabase-free so it can be unit
// tested against a mocked ScrapeGraphAI client (Sprint 1 testing gate).
export async function runScrapePhase(params: {
  intent: UserIntent
  businessContext: BusinessContextInput
  client: ScrapeGraphAIClient
}): Promise<ScrapeAttemptResult[]> {
  const { intent, businessContext, client } = params
  const categories = getSourceCategoriesForIntent(intent)

  const results = await Promise.all(
    categories.map(async (sourceCategory): Promise<ScrapeAttemptResult> => {
      try {
        // numResults: 1 -- each result costs a real page fetch server-side;
        // 3 categories already give source diversity, so we don't also fetch
        // multiple pages per category. Cuts wall-clock time roughly 3x.
        const res = await client.search(buildQuery(businessContext, sourceCategory), {
          numResults: 1,
        })
        if (res.status === 'failed') {
          return { sourceCategory, status: 'failed', errorMessage: res.error ?? 'Unknown error' }
        }
        return {
          sourceCategory,
          status: 'success',
          sourceUrl: res.referenceUrls?.[0],
          scrapedText: res.markdownContent ?? '',
        }
      } catch (err) {
        return {
          sourceCategory,
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : String(err),
        }
      }
    })
  )

  return results
}

// Supabase-aware wrapper: the actual pg-boss job handler for the
// 'scrape-run' queue. Loads the Run + Business Context, runs Phase 1,
// persists every attempt (success or failed -- CONTEXT.md), and hands the
// Run off to 'synthesizing' for Sprint 2's Phase 2 job to pick up.
export async function handleScrapeRunJob(job: { data: { runId: string } }): Promise<void> {
  const { runId } = job.data
  const supabase = createSupabaseServiceClient()

  const { data: run, error: runError } = await supabase
    .from('runs')
    .select('id, intent, business_context_id')
    .eq('id', runId)
    .single()
  if (runError || !run) throw new Error(`Run ${runId} not found: ${runError?.message}`)

  const { data: context, error: contextError } = await supabase
    .from('business_contexts')
    .select('business_name, business_description, target_audience')
    .eq('id', run.business_context_id)
    .single()
  if (contextError || !context) {
    throw new Error(`Business context for run ${runId} not found: ${contextError?.message}`)
  }

  const businessContext: BusinessContextInput = {
    businessName: context.business_name,
    businessDescription: context.business_description,
    targetAudience: context.target_audience,
  }

  const client = createScrapeGraphAIClient()
  const results = await runScrapePhase({ intent: run.intent as UserIntent, businessContext, client })

  // pg-boss retries a job on crash/timeout (e.g. a worker restart mid-run).
  // Clear any attempts from a prior try first so a retry replaces rather
  // than appends -- otherwise a retried job leaves duplicate rows behind.
  await supabase.from('scrape_attempts').delete().eq('run_id', runId)

  await supabase.from('scrape_attempts').insert(
    results.map((r) => ({
      run_id: runId,
      source_category: r.sourceCategory,
      source_url: r.sourceUrl ?? null,
      status: r.status,
      scraped_text: r.scrapedText ?? null,
      error_message: r.errorMessage ?? null,
    }))
  )

  const successCount = results.filter((r) => r.status === 'success').length

  await supabase
    .from('runs')
    .update({
      status: successCount > 0 ? 'synthesizing' : 'failed',
      thin_evidence_warning: successCount > 0 && successCount < results.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', runId)

  if (successCount > 0) {
    const boss = await getBoss()
    await boss.send(QUEUE.synthesizeRun, { runId })
  }
}
