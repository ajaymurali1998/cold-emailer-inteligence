import { createSupabaseServiceClient } from '@/lib/db/supabase'
import { Card } from '@/components/ui/Card'
import { RunsTable, type RunRow } from '@/app/runs/RunsTable'

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  return `${Math.round(ms / 60_000)}m`
}

export default async function RunsPage() {
  const supabase = createSupabaseServiceClient()
  const { data: runs, error } = await supabase
    .from('runs')
    .select('id, intent, status, created_at, updated_at, business_contexts(business_name)')
    .order('created_at', { ascending: false })
  if (error) throw error

  const rows: RunRow[] = (runs ?? []).map((r) => ({
    id: r.id,
    intent: r.intent,
    status: r.status,
    createdAt: r.created_at,
    businessName:
      (r as unknown as { business_contexts: { business_name: string } | null }).business_contexts
        ?.business_name ?? null,
  }))

  const completed = (runs ?? []).filter((r) => r.status === 'complete')
  const avgDurationMs =
    completed.length === 0
      ? null
      : completed.reduce(
          (sum, r) => sum + (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()),
          0
        ) / completed.length

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold text-text">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-sm text-text-muted">Total Runs</p>
          <p className="mt-1 text-3xl font-semibold text-text">{rows.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-text-muted">Completed</p>
          <p className="mt-1 text-3xl font-semibold text-text">{completed.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-text-muted">Avg Run Duration</p>
          <p className="mt-1 text-3xl font-semibold text-text">
            {avgDurationMs === null ? '--' : formatDuration(avgDurationMs)}
          </p>
        </Card>
      </div>

      <RunsTable runs={rows} />
    </div>
  )
}
