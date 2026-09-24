import { createBusinessContext } from '@/app/contexts/actions'

export default function NewContextPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">New Business Context</h1>
      <form action={createBusinessContext} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Business name</span>
          <input name="business_name" required className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-transparent" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Business description</span>
          <textarea name="business_description" required rows={4} className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-transparent" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Target audience</span>
          <textarea name="target_audience" required rows={3} className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-transparent" />
        </label>
        <button type="submit" className="self-start rounded-full bg-black px-5 py-2 text-white">
          Save
        </button>
      </form>
    </div>
  )
}
