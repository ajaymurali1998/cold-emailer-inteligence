'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { startRun, RunInProgressError } from '@/lib/runs/start-run'
import { approveStrategyAndGenerate, retryGeneration } from '@/lib/runs/approve-run'
import { createSupabaseServiceClient } from '@/lib/db/supabase'
import type { UserIntent } from '@/lib/config/intents'
import type { CoreInsight } from '@/lib/schemas/strategy-brief'
import type { EmailGenerationResult } from '@/lib/runs/generate-email'

export async function createRun(formData: FormData) {
  const businessContextId = formData.get('business_context_id')
  const intent = formData.get('intent')

  if (typeof businessContextId !== 'string' || !businessContextId) {
    throw new Error('Select a Business Context')
  }
  if (typeof intent !== 'string' || !intent) {
    throw new Error('Select an intent')
  }

  let runId: string
  try {
    ;({ runId } = await startRun({ businessContextId, intent: intent as UserIntent }))
  } catch (err) {
    if (err instanceof RunInProgressError) {
      redirect('/runs/new?error=in_progress')
    }
    throw err
  }

  redirect(`/runs/${runId}`)
}

// Task 3.3: approve the (possibly edited) selected brief and generate the
// email synchronously. useActionState-compatible signature -- the returned
// EmailGenerationResult drives the UI's success/error+retry state.
export async function approveStrategyAction(
  _prevState: EmailGenerationResult | null,
  formData: FormData
): Promise<EmailGenerationResult> {
  const runId = formData.get('run_id')
  const briefId = formData.get('brief_id')
  const headline = formData.get('headline')
  const coreInsightsJson = formData.get('core_insights_json')

  if (
    typeof runId !== 'string' ||
    typeof briefId !== 'string' ||
    typeof headline !== 'string' ||
    typeof coreInsightsJson !== 'string'
  ) {
    return { ok: false, code: 'invalid_strategy', message: 'Missing required fields.' }
  }

  let coreInsights: CoreInsight[]
  try {
    coreInsights = JSON.parse(coreInsightsJson)
  } catch {
    return { ok: false, code: 'invalid_strategy', message: 'Malformed strategy data.' }
  }

  const result = await approveStrategyAndGenerate({
    runId,
    briefId,
    edited: { headline, coreInsights },
  })
  revalidatePath(`/runs/${runId}`)
  return result
}

// Task 3.4: retry resubmits the already-persisted approved strategy -- no
// re-approval or re-run of Phase 1/2.
export async function retryGenerationAction(
  _prevState: EmailGenerationResult | null,
  formData: FormData
): Promise<EmailGenerationResult> {
  const runId = formData.get('run_id')
  if (typeof runId !== 'string') {
    return { ok: false, code: 'invalid_strategy', message: 'Missing run id.' }
  }

  const result = await retryGeneration(runId)
  revalidatePath(`/runs/${runId}`)
  return result
}

// Escape hatch for a run stuck in a background phase (scraping/synthesizing)
// with no user-facing action available yet -- e.g. abandoning a run you no
// longer want to wait on. Not needed once a run reaches awaiting_approval,
// since Task 3.2/3.3 give it a real action path (approve or let it fail).
export async function finishRunForNow(runId: string) {
  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from('runs')
    .update({ status: 'complete', updated_at: new Date().toISOString() })
    .eq('id', runId)
  if (error) throw error

  revalidatePath(`/runs/${runId}`)
  revalidatePath('/runs/new')
}
