import { notFound } from 'next/navigation'
import { createSupabaseServiceClient } from '@/lib/db/supabase'
import { deleteBusinessContext, updateBusinessContext } from '@/app/contexts/actions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'

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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold text-text">Edit Business Context</h1>
      <Card className="p-6">
        <form action={boundUpdate} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Business name</span>
            <Input name="business_name" defaultValue={context.business_name} required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Business description</span>
            <Textarea
              name="business_description"
              defaultValue={context.business_description}
              required
              rows={4}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Target audience</span>
            <Textarea
              name="target_audience"
              defaultValue={context.target_audience}
              required
              rows={3}
            />
          </label>
          <Button type="submit" className="self-start">
            Save
          </Button>
        </form>
      </Card>

      <form action={boundDelete}>
        <Button type="submit" variant="destructive">
          Delete this Business Context
        </Button>
      </form>
    </div>
  )
}
