import { createBusinessContext } from '@/app/contexts/actions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'

export default function NewContextPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold text-text">New Business Context</h1>
      <Card className="p-6">
        <form action={createBusinessContext} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Business name</span>
            <Input name="business_name" required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Business description</span>
            <Textarea name="business_description" required rows={4} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Target audience</span>
            <Textarea name="target_audience" required rows={3} />
          </label>
          <Button type="submit" className="self-start">
            Save
          </Button>
        </form>
      </Card>
    </div>
  )
}
