import type { PgBoss } from 'pg-boss'
import { createSupabaseServiceClient } from '@/lib/db/supabase'
import { QUEUE } from '@/lib/queue/boss'

function extractMessage(output: unknown): string {
  if (output && typeof output === 'object' && 'message' in output) {
    const message = (output as { message: unknown }).message
    if (typeof message === 'string') return message
  }
  return 'Job failed after exhausting all retries (no error detail captured).'
}

// Handler for the 'run-failures' dead-letter queue: pg-boss routes a
// scrape-run/synthesize-run job here once it exhausts retryLimit, instead of
// leaving the Run silently stuck at its last in-progress status forever.
export async function handleRunFailureJob(
  boss: PgBoss,
  job: { id: string; data: { runId: string } }
): Promise<void> {
  const { runId } = job.data

  const meta = await boss.getJobById(QUEUE.runFailures, job.id)
  const errorMessage = extractMessage(meta?.output)

  const supabase = createSupabaseServiceClient()
  await supabase
    .from('runs')
    .update({ status: 'failed', error_message: errorMessage, updated_at: new Date().toISOString() })
    .eq('id', runId)
}
