import Link from 'next/link'
import { createSupabaseServiceClient } from '@/lib/db/supabase'
import { INTENT_CONFIG, type UserIntent } from '@/lib/config/intents'

export default async function RunsPage() {
  const supabase = createSupabaseServiceClient()
  const { data: runs, error } = await supabase
    .from('runs')
    .select('id, intent, status, created_at, business_contexts(business_name)')
    .order('created_at', { ascending: false })
  if (error) throw error

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Runs</h1>
        <Link className="rounded-full bg-black px-4 py-2 text-sm text-white" href="/runs/new">
          + Start a Run
        </Link>
      </div>

      {runs?.length === 0 && <p className="text-zinc-500">No runs yet.</p>}

      <ul className="flex flex-col gap-2">
        {runs?.map((r) => {
          const businessName = (r as unknown as { business_contexts: { business_name: string } | null })
            .business_contexts?.business_name
          return (
            <li key={r.id} className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
              <Link href={`/runs/${r.id}`} className="font-medium hover:underline">
                {INTENT_CONFIG[r.intent as UserIntent].label}
              </Link>
              <p className="text-zinc-500">
                {businessName} -- <span className="font-mono">{r.status}</span> --{' '}
                {new Date(r.created_at).toLocaleString()}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
