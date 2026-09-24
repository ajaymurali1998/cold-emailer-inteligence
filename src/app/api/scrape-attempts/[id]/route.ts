import { createSupabaseServiceClient } from '@/lib/db/supabase'

// Task 3.2's "Click-to-Evidence": fetched on demand when a fact is expanded,
// rather than embedded in every run-snapshot poll (scraped_text can be tens
// of thousands of characters -- too heavy to ship on every 2s poll tick).
export async function GET(_req: Request, ctx: RouteContext<'/api/scrape-attempts/[id]'>) {
  const { id } = await ctx.params
  const supabase = createSupabaseServiceClient()

  const { data, error } = await supabase
    .from('scrape_attempts')
    .select('source_category, source_url, scraped_text')
    .eq('id', id)
    .single()
  if (error || !data) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json({
    sourceCategory: data.source_category,
    sourceUrl: data.source_url,
    snippet: (data.scraped_text ?? '').slice(0, 1500),
  })
}
