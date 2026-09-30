import { createSupabaseServiceClient } from '@/lib/db/supabase'
import type { CoreInsight } from '@/lib/schemas/strategy-brief'

export interface ScrapeAttemptSnapshot {
  id: string
  sourceCategory: string
  status: 'success' | 'failed'
  sourceUrl: string | null
  errorMessage: string | null
}

export interface StrategyBriefSnapshot {
  id: string
  headline: string
  coreInsights: CoreInsight[]
  selected: boolean
  editedHeadline: string | null
  editedCoreInsights: CoreInsight[] | null
}

export interface RunSnapshot {
  id: string
  intent: string
  status: string
  thinEvidenceWarning: boolean
  errorMessage: string | null
  businessName: string | null
  attempts: ScrapeAttemptSnapshot[]
  briefs: StrategyBriefSnapshot[]
  emailDraft: { subject: string; body: string } | null
}

// Shared by the SSR run page (initial paint) and the polling API route
// (Task 3.1) -- one source of truth for "what does this Run look like right
// now" so the two never drift apart.
export async function getRunSnapshot(runId: string): Promise<RunSnapshot | null> {
  const supabase = createSupabaseServiceClient()

  const { data: run, error: runError } = await supabase
    .from('runs')
    .select(
      'id, intent, status, thin_evidence_warning, error_message, business_contexts(business_name)'
    )
    .eq('id', runId)
    .single()
  if (runError || !run) return null

  const [{ data: attempts }, { data: briefs }, { data: draft }] = await Promise.all([
    supabase
      .from('scrape_attempts')
      .select('id, source_category, status, source_url, error_message')
      .eq('run_id', runId)
      .order('created_at', { ascending: true }),
    supabase
      .from('strategy_briefs')
      .select('id, headline, core_insights, selected, edited_headline, edited_core_insights')
      .eq('run_id', runId)
      .order('created_at', { ascending: true }),
    supabase.from('email_drafts').select('subject, body').eq('run_id', runId).maybeSingle(),
  ])

  const businessName = (run as unknown as { business_contexts: { business_name: string } | null })
    .business_contexts?.business_name

  return {
    id: run.id,
    intent: run.intent,
    status: run.status,
    thinEvidenceWarning: run.thin_evidence_warning,
    errorMessage: run.error_message,
    businessName: businessName ?? null,
    attempts: (attempts ?? []).map((a) => ({
      id: a.id,
      sourceCategory: a.source_category,
      status: a.status as 'success' | 'failed',
      sourceUrl: a.source_url,
      errorMessage: a.error_message,
    })),
    briefs: (briefs ?? []).map((b) => ({
      id: b.id,
      headline: b.headline,
      coreInsights: b.core_insights as CoreInsight[],
      selected: b.selected,
      editedHeadline: b.edited_headline,
      editedCoreInsights: b.edited_core_insights as CoreInsight[] | null,
    })),
    emailDraft: draft ?? null,
  }
}
