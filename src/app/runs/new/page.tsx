import Link from 'next/link'
import { createSupabaseServiceClient } from '@/lib/db/supabase'
import { RunConfigForm } from '@/app/runs/new/RunConfigForm'
import { cancelRun } from '@/app/runs/actions'
import { INTENT_CONFIG, type UserIntent } from '@/lib/config/intents'

const IN_PROGRESS_STATUSES = ['pending', 'scraping', 'synthesizing', 'awaiting_approval', 'generating']

export default async function NewRunPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = createSupabaseServiceClient()
  const { data: contexts, error: fetchError } = await supabase
    .from('business_contexts')
    .select('id, business_name, business_description')
    .order('created_at', { ascending: false })
  if (fetchError) throw fetchError

  let blockingRun: { id: string; intent: string; businessName: string | null } | null = null
  if (error === 'in_progress') {
    const { data: activeRun, error: activeError } = await supabase
      .from('runs')
      .select('id, intent, business_contexts(business_name)')
      .in('status', IN_PROGRESS_STATUSES)
      .limit(1)
      .maybeSingle()
    if (activeError) throw activeError
    if (activeRun) {
      blockingRun = {
        id: activeRun.id,
        intent: activeRun.intent,
        businessName:
          (activeRun as unknown as { business_contexts: { business_name: string } | null })
            .business_contexts?.business_name ?? null,
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 items-start justify-center p-6">
      <div className="card-elevation-3 flex w-full max-w-[480px] flex-col rounded-lg">
        <div className="border-b border-border px-6 py-5">
          <h1 className="text-lg font-semibold text-text">Configure Intelligence Run</h1>
          <p className="text-sm text-text-muted">
            Deterministic research gathering &amp; multi-brief strategic synthesis
          </p>
        </div>

        {error === 'in_progress' && blockingRun && (
          <div className="mx-6 mt-4 flex flex-col gap-2 rounded-md bg-warning-bg p-3 text-sm text-warning-text">
            <p>
              Another run is already in progress --{' '}
              <span className="font-medium">
                {blockingRun.businessName ?? 'Unknown context'} (
                {INTENT_CONFIG[blockingRun.intent as UserIntent]?.label ?? blockingRun.intent})
              </span>
              . Only one run may run at a time.
            </p>
            <form action={cancelRun.bind(null, blockingRun.id)}>
              <button
                type="submit"
                className="rounded-md border border-warning-text/40 px-3 py-1.5 text-sm font-medium text-warning-text hover:bg-warning-text/10"
              >
                Cancel this run
              </button>
            </form>
          </div>
        )}

        {contexts?.length === 0 ? (
          <p className="p-6 text-text-secondary">
            You need a Business Context first.{' '}
            <Link href="/contexts/new" className="text-primary underline">
              Create one
            </Link>
            .
          </p>
        ) : (
          <RunConfigForm
            contexts={(contexts ?? []).map((c) => ({
              id: c.id,
              businessName: c.business_name,
              businessDescription: c.business_description,
            }))}
          />
        )}
      </div>
    </div>
  )
}
