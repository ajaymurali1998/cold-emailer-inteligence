import Link from 'next/link'
import { createSupabaseServiceClient } from '@/lib/db/supabase'

export default async function ContextsPage() {
  const supabase = createSupabaseServiceClient()
  const { data: contexts, error } = await supabase
    .from('business_contexts')
    .select('id, business_name, target_audience')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Business Contexts</h1>
        <Link className="rounded-full bg-black px-4 py-2 text-sm text-white" href="/contexts/new">
          + New
        </Link>
      </div>

      {contexts?.length === 0 && (
        <p className="text-zinc-500">No Business Contexts yet. Create one to start a Run.</p>
      )}

      <ul className="flex flex-col gap-3">
        {contexts?.map((ctx) => (
          <li key={ctx.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <Link href={`/contexts/${ctx.id}`} className="font-medium hover:underline">
              {ctx.business_name}
            </Link>
            <p className="text-sm text-zinc-500">{ctx.target_audience}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
