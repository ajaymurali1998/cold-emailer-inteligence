import { notFound } from 'next/navigation'
import { getRunSnapshot } from '@/lib/runs/get-run-snapshot'
import { RunView } from '@/app/runs/[id]/RunView'

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const snapshot = await getRunSnapshot(id)
  if (!snapshot) notFound()

  return <RunView runId={id} initial={snapshot} />
}
