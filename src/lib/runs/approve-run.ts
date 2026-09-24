import { createSupabaseServiceClient } from '@/lib/db/supabase'
import {
  createOpenRouterEmailClient,
  generateEmailDraft,
  type ApprovedStrategy,
  type EmailGenerationResult,
} from '@/lib/runs/generate-email'
import type { BusinessContextInput } from '@/lib/jobs/scrape-run'
import type { UserIntent } from '@/lib/config/intents'
import type { CoreInsight } from '@/lib/schemas/strategy-brief'

async function loadRunAndContext(runId: string) {
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

  return { supabase, intent: run.intent as UserIntent, businessContext }
}

async function runGenerationAndPersist(
  runId: string,
  intent: UserIntent,
  businessContext: BusinessContextInput,
  strategy: ApprovedStrategy
): Promise<EmailGenerationResult> {
  const supabase = createSupabaseServiceClient()
  const client = createOpenRouterEmailClient()

  const result = await generateEmailDraft({ intent, businessContext, strategy, client })

  if (result.ok) {
    // Idempotent on retry, same reasoning as scrape_attempts/strategy_briefs.
    await supabase.from('email_drafts').delete().eq('run_id', runId)

    const { data: brief } = await supabase
      .from('strategy_briefs')
      .select('id')
      .eq('run_id', runId)
      .eq('selected', true)
      .single()

    await supabase.from('email_drafts').insert({
      run_id: runId,
      strategy_brief_id: brief?.id,
      subject: result.subject,
      body: result.body,
    })
    await supabase
      .from('runs')
      .update({ status: 'complete', updated_at: new Date().toISOString() })
      .eq('id', runId)
  }
  // On failure: run stays at 'generating' -- no re-approval or re-run of
  // Phase 1/2 needed, since the strategy is already persisted (Task 3.4).
  // The UI's retry action calls retryGeneration() directly.

  return result
}

// Task 3.3: user clicked "Approve Strategy" (after any free-text edits).
// Persists the selection/edits, then generates the email synchronously.
export async function approveStrategyAndGenerate(params: {
  runId: string
  briefId: string
  edited: { headline: string; coreInsights: CoreInsight[] }
}): Promise<EmailGenerationResult> {
  const { runId, briefId, edited } = params
  const { supabase, intent, businessContext } = await loadRunAndContext(runId)

  // Only one brief is selected/approved per run -- clear any prior selection.
  await supabase.from('strategy_briefs').update({ selected: false }).eq('run_id', runId)
  await supabase
    .from('strategy_briefs')
    .update({
      selected: true,
      edited_headline: edited.headline,
      edited_core_insights: edited.coreInsights,
    })
    .eq('id', briefId)

  await supabase
    .from('runs')
    .update({ status: 'generating', updated_at: new Date().toISOString() })
    .eq('id', runId)

  return runGenerationAndPersist(runId, intent, businessContext, {
    headline: edited.headline,
    coreInsights: edited.coreInsights,
  })
}

// Task 3.4's retry: resubmits the already-approved (persisted) strategy --
// no form data needed, since edits were saved at approval time.
export async function retryGeneration(runId: string): Promise<EmailGenerationResult> {
  const { supabase, intent, businessContext } = await loadRunAndContext(runId)

  const { data: brief, error: briefError } = await supabase
    .from('strategy_briefs')
    .select('headline, core_insights, edited_headline, edited_core_insights')
    .eq('run_id', runId)
    .eq('selected', true)
    .single()
  if (briefError || !brief) {
    throw new Error(`Run ${runId} has no approved strategy brief to retry from`)
  }

  const strategy: ApprovedStrategy = {
    headline: brief.edited_headline ?? brief.headline,
    coreInsights: (brief.edited_core_insights ?? brief.core_insights) as CoreInsight[],
  }

  return runGenerationAndPersist(runId, intent, businessContext, strategy)
}
