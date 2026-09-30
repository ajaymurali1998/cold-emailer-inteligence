import Link from 'next/link'
import { createSupabaseServiceClient } from '@/lib/db/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default async function ContextsPage() {
  const supabase = createSupabaseServiceClient()
  const [{ data: contexts, error }, { data: runs }] = await Promise.all([
    supabase
      .from('business_contexts')
      .select('id, business_name, target_audience')
      .order('created_at', { ascending: false }),
    supabase.from('runs').select('business_context_id'),
  ])

  if (error) throw error

  const runCounts = new Map<string, number>()
  for (const r of runs ?? []) {
    runCounts.set(r.business_context_id, (runCounts.get(r.business_context_id) ?? 0) + 1)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Business Contexts</h1>
        <Link href="/contexts/new">
          <Button>+ New</Button>
        </Link>
      </div>

      {contexts?.length === 0 && (
        <p className="text-text-muted">No Business Contexts yet. Create one to start a Run.</p>
      )}

      <ul className="flex flex-col gap-3">
        {contexts?.map((ctx) => (
          <li key={ctx.id}>
            <Card className="flex items-center justify-between p-4">
              <div>
                <Link href={`/contexts/${ctx.id}`} className="font-medium text-text hover:underline">
                  {ctx.business_name}
                </Link>
                <p className="text-sm text-text-muted">{ctx.target_audience}</p>
              </div>
              <span className="text-sm text-text-muted">
                {runCounts.get(ctx.id) ?? 0} run{(runCounts.get(ctx.id) ?? 0) === 1 ? '' : 's'}
              </span>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
