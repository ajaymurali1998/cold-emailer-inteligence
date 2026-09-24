import Link from 'next/link'
import { createSupabaseServiceClient } from '@/lib/db/supabase'
import { RunConfigForm } from '@/app/runs/new/RunConfigForm'

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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 items-start justify-center p-6">
      <div className="card-elevation-3 flex w-full max-w-[480px] flex-col rounded-lg">
        <div className="border-b border-border px-6 py-5">
          <h1 className="text-lg font-semibold text-text">Configure Intelligence Run</h1>
          <p className="text-sm text-text-muted">
            Deterministic research gathering &amp; multi-brief strategic synthesis
          </p>
        </div>

        {error === 'in_progress' && (
          <p className="mx-6 mt-4 rounded-md bg-warning-bg p-3 text-sm text-warning-text">
            Another run is already in progress. Only one run may run at a time.
          </p>
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
