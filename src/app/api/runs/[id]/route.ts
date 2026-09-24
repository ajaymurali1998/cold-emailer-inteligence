import { getRunSnapshot } from '@/lib/runs/get-run-snapshot'

// Polling endpoint for the run page's Live Progress UI (Task 3.1) -- pg-boss
// has no push mechanism, so the client polls this instead of using SSE.
export async function GET(_req: Request, ctx: RouteContext<'/api/runs/[id]'>) {
  const { id } = await ctx.params
  const snapshot = await getRunSnapshot(id)
  if (!snapshot) {
    return Response.json({ error: 'Run not found' }, { status: 404 })
  }
  return Response.json(snapshot)
}
