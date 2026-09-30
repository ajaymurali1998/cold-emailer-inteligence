import { createSupabaseServiceClient } from '@/lib/db/supabase'
import { getBoss, QUEUE } from '@/lib/queue/boss'
import type { UserIntent } from '@/lib/config/intents'

const IN_PROGRESS_STATUSES = ['scraping', 'synthesizing', 'awaiting_approval', 'generating']

export class RunInProgressError extends Error {
  constructor() {
    super('Another run is already in progress. Only one run may run at a time.')
    this.name = 'RunInProgressError'
  }
}

// Enforces CONTEXT.md's "only one Run in progress system-wide" decision --
// a deliberate simplification to match ScrapeGraphAI's Free-plan 1-concurrent
// -job cap without building cross-run queuing.
export async function startRun(params: {
  businessContextId: string
  intent: UserIntent
}): Promise<{ runId: string }> {
  const supabase = createSupabaseServiceClient()

  const { data: activeRuns, error: activeError } = await supabase
    .from('runs')
    .select('id')
    .in('status', IN_PROGRESS_STATUSES)
    .limit(1)
  if (activeError) throw activeError
  if (activeRuns && activeRuns.length > 0) throw new RunInProgressError()

  const { data: run, error: insertError } = await supabase
    .from('runs')
    .insert({
      business_context_id: params.businessContextId,
      intent: params.intent,
      status: 'scraping',
    })
    .select('id')
    .single()
  if (insertError || !run) throw insertError ?? new Error('Failed to create run')

  const boss = await getBoss()
  await boss.send(QUEUE.scrapeRun, { runId: run.id })

  return { runId: run.id }
}
