'use client'

import { useEffect, useState } from 'react'
import { INTENT_CONFIG, type UserIntent } from '@/lib/config/intents'
import type { RunSnapshot } from '@/lib/runs/get-run-snapshot'
import { finishRunForNow } from '@/app/runs/actions'
import { BriefCarousel } from '@/app/runs/[id]/BriefCarousel'

const POLLING_STATUSES = ['scraping', 'synthesizing']
const ESCAPE_HATCH_STATUSES = ['scraping', 'synthesizing']

const PROGRESS_LABEL: Record<string, string> = {
  scraping: 'Gathering research sources...',
  synthesizing: 'Extracting strategy briefs from the evidence...',
}

export function RunView({ runId, initial }: { runId: string; initial: RunSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial)

  useEffect(() => {
    if (!POLLING_STATUSES.includes(snapshot.status)) return

    const interval = setInterval(async () => {
      const res = await fetch(`/api/runs/${runId}`)
      if (res.ok) setSnapshot(await res.json())
    }, 2500)

    return () => clearInterval(interval)
  }, [runId, snapshot.status])

  const boundFinish = finishRunForNow.bind(null, runId)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-xl font-semibold">
          {INTENT_CONFIG[snapshot.intent as UserIntent].label}
        </h1>
        <p className="text-sm text-zinc-500">{snapshot.businessName}</p>
      </div>

      {snapshot.status === 'failed' && snapshot.errorMessage && (
        <p className="rounded bg-red-100 p-3 text-sm text-red-900">
          This run failed: {snapshot.errorMessage}
        </p>
      )}

      {snapshot.thinEvidenceWarning && (
        <p className="rounded bg-amber-100 p-3 text-sm text-amber-900">
          Some sources failed to scrape -- brief count may be reduced due to limited evidence.
        </p>
      )}

      {POLLING_STATUSES.includes(snapshot.status) && (
        <div className="flex items-center gap-2 font-mono text-sm text-zinc-600 dark:text-zinc-400">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-black dark:bg-white" />
          {PROGRESS_LABEL[snapshot.status]}
        </div>
      )}

      {snapshot.attempts.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-medium">Research sources</h2>
          <ul className="flex flex-col gap-2">
            {snapshot.attempts.map((a) => (
              <li
                key={a.id}
                className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800"
              >
                <span className="font-medium">{a.sourceCategory}</span> --{' '}
                <span className={a.status === 'success' ? 'text-green-700' : 'text-red-700'}>
                  {a.status}
                </span>
                {a.errorMessage && <p className="text-zinc-500">{a.errorMessage}</p>}
                {a.sourceUrl && (
                  <a href={a.sourceUrl} className="block truncate text-blue-600 underline">
                    {a.sourceUrl}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {snapshot.briefs.length > 0 && (
        <BriefCarousel runId={runId} briefs={snapshot.briefs} emailDraft={snapshot.emailDraft} />
      )}

      {ESCAPE_HATCH_STATUSES.includes(snapshot.status) && (
        <form action={boundFinish}>
          <button type="submit" className="text-sm text-zinc-500 underline">
            Finish this run for now
          </button>
        </form>
      )}
    </div>
  )
}
