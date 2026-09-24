import { notFound } from 'next/navigation'
import { createSupabaseServiceClient } from '@/lib/db/supabase'
import { deleteBusinessContext, updateBusinessContext } from '@/app/contexts/actions'

export default async function EditContextPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createSupabaseServiceClient()
  const { data: context, error } = await supabase
    .from('business_contexts')
    .select('id, business_name, business_description, target_audience')
    .eq('id', id)
    .single()

  if (error || !context) notFound()

  const boundUpdate = updateBusinessContext.bind(null, id)
  const boundDelete = deleteBusinessContext.bind(null, id)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Edit Business Context</h1>
      <form action={boundUpdate} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Business name</span>
          <input
            name="business_name"
            defaultValue={context.business_name}
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-transparent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Business description</span>
          <textarea
            name="business_description"
            defaultValue={context.business_description}
            required
            rows={4}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-transparent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Target audience</span>
          <textarea
            name="target_audience"
            defaultValue={context.target_audience}
            required
            rows={3}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-transparent"
          />
        </label>
        <button type="submit" className="self-start rounded-full bg-black px-5 py-2 text-white">
          Save
        </button>
      </form>

      <form action={boundDelete}>
        <button type="submit" className="text-sm text-red-600 hover:underline">
          Delete this Business Context
        </button>
      </form>
    </div>
  )
}
