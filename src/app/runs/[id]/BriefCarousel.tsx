'use client'

import { useActionState, useState } from 'react'
import { approveStrategyAction, retryGenerationAction } from '@/app/runs/actions'
import type { StrategyBriefSnapshot } from '@/lib/runs/get-run-snapshot'
import type { CoreInsight } from '@/lib/schemas/strategy-brief'

function EvidenceSnippet({ sourceId }: { sourceId: string }) {
  const [snippet, setSnippet] = useState<string | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (snippet === null) {
      setLoading(true)
      const res = await fetch(`/api/scrape-attempts/${sourceId}`)
      const data = await res.json()
      setSnippet(data.snippet ?? '(no evidence text captured)')
      setSourceUrl(data.sourceUrl ?? null)
      setLoading(false)
    }
  }

  return (
    <div className="mt-1">
      <button type="button" onClick={toggle} className="text-xs text-blue-600 underline">
        {open ? 'Hide evidence' : 'Show evidence'}
      </button>
      {open && (
        <div className="mt-1 rounded bg-zinc-50 p-2 text-xs text-zinc-600 dark:bg-zinc-900">
          {loading ? (
            'Loading...'
          ) : (
            <>
              {sourceUrl && (
                <a href={sourceUrl} className="mb-1 block truncate text-blue-600 underline">
                  {sourceUrl}
                </a>
              )}
              <p className="whitespace-pre-wrap">{snippet}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function BriefEditor({
  runId,
  brief,
  isPending,
  formAction,
}: {
  runId: string
  brief: StrategyBriefSnapshot
  isPending: boolean
  formAction: (formData: FormData) => void
}) {
  const [headline, setHeadline] = useState(brief.editedHeadline ?? brief.headline)
  const [facts, setFacts] = useState<CoreInsight[]>(brief.editedCoreInsights ?? brief.coreInsights)

  function updateFact(i: number, fact: string) {
    setFacts((prev) => prev.map((f, idx) => (idx === i ? { ...f, fact } : f)))
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="run_id" value={runId} />
      <input type="hidden" name="brief_id" value={brief.id} />
      <input type="hidden" name="core_insights_json" value={JSON.stringify(facts)} />

      <input
        name="headline"
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        className="rounded border border-zinc-300 px-3 py-2 font-semibold dark:border-zinc-700 dark:bg-transparent"
      />

      <ul className="flex flex-col gap-3">
        {facts.map((f, i) => (
          <li key={i} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium dark:bg-zinc-800">
              {f.insight_label}
            </span>
            <textarea
              value={f.fact}
              onChange={(e) => updateFact(i, e.target.value)}
              rows={2}
              className="mt-2 w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-transparent"
            />
            <EvidenceSnippet sourceId={f.source_id} />
          </li>
        ))}
      </ul>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-full bg-black px-5 py-2 text-white disabled:opacity-50"
      >
        {isPending ? 'Generating email...' : 'Approve Strategy'}
      </button>
    </form>
  )
}

export function BriefCarousel({
  runId,
  briefs,
  emailDraft,
}: {
  runId: string
  briefs: StrategyBriefSnapshot[]
  emailDraft: { subject: string; body: string } | null
}) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const i = briefs.findIndex((b) => b.selected)
    return i >= 0 ? i : 0
  })
  const [approveState, approveFormAction, approvePending] = useActionState(
    approveStrategyAction,
    null
  )
  const [retryState, retryFormAction, retryPending] = useActionState(retryGenerationAction, null)

  const selected = briefs[selectedIndex]
  const lastResult = retryState ?? approveState

  if (emailDraft) {
    return (
      <div className="rounded border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
        <h2 className="font-semibold">Email draft ready</h2>
        <p className="mt-2 font-medium">{emailDraft.subject}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm">{emailDraft.body}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-medium">Strategy Briefs -- pick one, edit if you like, then approve</h2>

      <div className="flex gap-2">
        {briefs.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setSelectedIndex(i)}
            className={`rounded-full px-3 py-1 text-sm ${
              i === selectedIndex ? 'bg-black text-white' : 'border border-zinc-300'
            }`}
          >
            Brief {i + 1}
          </button>
        ))}
      </div>

      <BriefEditor
        key={selected.id}
        runId={runId}
        brief={selected}
        isPending={approvePending}
        formAction={approveFormAction}
      />

      {lastResult && !lastResult.ok && (
        <div className="rounded bg-red-100 p-3 text-sm text-red-900">
          <p>
            <span className="font-mono text-xs">{lastResult.code}</span> -- {lastResult.message}
          </p>
          <form action={retryFormAction} className="mt-2">
            <input type="hidden" name="run_id" value={runId} />
            <button
              type="submit"
              disabled={retryPending}
              className="rounded-full border border-red-900 px-4 py-1 text-sm disabled:opacity-50"
            >
              {retryPending ? 'Retrying...' : 'Retry'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
