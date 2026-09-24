import Link from 'next/link'
import { createSupabaseServiceClient } from '@/lib/db/supabase'
import { createRun } from '@/app/runs/actions'
import { INTENT_CONFIG, USER_INTENTS } from '@/lib/config/intents'

export default async function NewRunPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = createSupabaseServiceClient()
  const { data: contexts, error: fetchError } = await supabase
    .from('business_contexts')
    .select('id, business_name')
    .order('created_at', { ascending: false })
  if (fetchError) throw fetchError

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Start a Run</h1>

      {error === 'in_progress' && (
        <p className="rounded bg-amber-100 p-3 text-sm text-amber-900">
          Another run is already in progress. Only one run may run at a time -- wait for it to
          finish before starting a new one.
        </p>
      )}

      {contexts?.length === 0 ? (
        <p className="text-zinc-500">
          You need a Business Context first.{' '}
          <Link href="/contexts/new" className="underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <form action={createRun} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Business Context</span>
            <select
              name="business_context_id"
              required
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-transparent"
            >
              {contexts?.map((ctx) => (
                <option key={ctx.id} value={ctx.id}>
                  {ctx.business_name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Email Intent</span>
            <select
              name="intent"
              required
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-transparent"
            >
              {USER_INTENTS.map((intent) => (
                <option key={intent} value={intent}>
                  {INTENT_CONFIG[intent].label}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="self-start rounded-full bg-black px-5 py-2 text-white">
            Start Run
          </button>
        </form>
      )}
    </div>
  )
}
