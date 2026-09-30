'use client'

import { useActionState, useEffect, useState } from 'react'
import { approveStrategyAction, retryGenerationAction } from '@/app/runs/actions'
import { Button } from '@/components/ui/Button'
import { Textarea, Input } from '@/components/ui/Input'
import type { StrategyBriefSnapshot } from '@/lib/runs/get-run-snapshot'
import type { CoreInsight } from '@/lib/schemas/strategy-brief'

interface EditState {
  headline: string
  facts: CoreInsight[]
}

function defaultEdit(brief: StrategyBriefSnapshot): EditState {
  return {
    headline: brief.editedHeadline ?? brief.headline,
    facts: brief.editedCoreInsights ?? brief.coreInsights,
  }
}

interface EvidenceEntry {
  sourceCategory: string
  sourceUrl: string | null
  snippet: string
}

// Task 3.2's "Click-to-Evidence", as a persistent right-pane panel rather
// than a per-fact inline toggle -- the currently-focused fact's evidence is
// fetched on demand and cached per source_id for the life of this session.
function EvidencePanel({ sourceId }: { sourceId: string | null }) {
  const [cache, setCache] = useState<Record<string, EvidenceEntry>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sourceId || cache[sourceId]) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/scrape-attempts/${sourceId}`)
      .then((r) => r.json())
      .then((data: EvidenceEntry) => {
        if (!cancelled) setCache((prev) => ({ ...prev, [sourceId]: data }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sourceId, cache])

  if (!sourceId) {
    return <p className="text-sm text-text-muted">Click a fact to see its source.</p>
  }

  const entry = cache[sourceId]
  if (loading && !entry) return <p className="text-sm text-text-muted">Loading...</p>
  if (!entry) return null

  return (
    <div className="flex flex-col gap-2">
      {entry.sourceUrl && (
        <a href={entry.sourceUrl} className="block truncate text-sm text-primary underline">
          {entry.sourceUrl}
        </a>
      )}
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {entry.sourceCategory}
      </p>
      <p className="whitespace-pre-wrap break-words text-sm text-text-secondary">{entry.snippet}</p>
    </div>
  )
}

export function BriefCarousel({
  runId,
  briefs,
  onApproved,
}: {
  runId: string
  briefs: StrategyBriefSnapshot[]
  onApproved: () => void
}) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const i = briefs.findIndex((b) => b.selected)
    return i >= 0 ? i : 0
  })
  // Edits keyed by brief id -- so switching tabs to compare briefs doesn't
  // discard in-progress edits on the one you switched away from.
  const [editsByBriefId, setEditsByBriefId] = useState<Record<string, EditState>>({})
  const [focusedSourceId, setFocusedSourceId] = useState<string | null>(null)
  const [approveState, approveFormAction, approvePending] = useActionState(
    approveStrategyAction,
    null
  )
  const [retryState, retryFormAction, retryPending] = useActionState(retryGenerationAction, null)

  // RunView's snapshot is captured once via useState(initial) and only
  // polls while a background job is running -- once briefs exist, nothing
  // else would ever tell it the run finished. Pull a fresh snapshot the
  // moment either action actually succeeds.
  useEffect(() => {
    if (approveState?.ok || retryState?.ok) onApproved()
  }, [approveState, retryState, onApproved])

  const selectedBrief = briefs[selectedIndex]
  const edit = editsByBriefId[selectedBrief.id] ?? defaultEdit(selectedBrief)
  const lastResult = retryState ?? approveState

  function updateHeadline(value: string) {
    setEditsByBriefId((prev) => ({
      ...prev,
      [selectedBrief.id]: { ...(prev[selectedBrief.id] ?? defaultEdit(selectedBrief)), headline: value },
    }))
  }

  function updateFact(i: number, value: string) {
    setEditsByBriefId((prev) => {
      const current = prev[selectedBrief.id] ?? defaultEdit(selectedBrief)
      return {
        ...prev,
        [selectedBrief.id]: {
          ...current,
          facts: current.facts.map((f, idx) => (idx === i ? { ...f, fact: value } : f)),
        },
      }
    })
  }

  return (
    <div className="card-elevation-1 flex flex-col rounded-lg">
      <div className="border-b border-border p-4">
        <h2 className="text-sm font-semibold text-text">Strategy Workspace</h2>
        <p className="text-xs text-text-muted">Pick a brief, edit if you like, then approve.</p>
      </div>

      <div className="flex gap-1 border-b border-border px-4 pt-3">
        {briefs.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setSelectedIndex(i)}
            className={`rounded-t-md px-3 py-2 text-sm font-medium ${
              i === selectedIndex
                ? 'border-b-2 border-primary text-primary'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Brief {i + 1}
          </button>
        ))}
      </div>

      <div className="grid min-w-0 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3 border-b border-border p-4 lg:border-r lg:border-b-0">
          <Input
            value={edit.headline}
            onChange={(e) => updateHeadline(e.target.value)}
            className="w-full font-semibold"
          />
          <ul className="flex flex-col gap-3">
            {edit.facts.map((f, i) => (
              <li key={i} className="rounded-md border border-border p-3">
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-primary">
                  {f.insight_label}
                </span>
                <Textarea
                  value={f.fact}
                  onChange={(e) => updateFact(i, e.target.value)}
                  rows={2}
                  className="mt-2 w-full"
                />
                <button
                  type="button"
                  onClick={() => setFocusedSourceId(f.source_id)}
                  className="mt-1 text-xs text-primary underline"
                >
                  Focus evidence &rarr;
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Evidence Inspector
          </h3>
          <EvidencePanel sourceId={focusedSourceId} />
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border p-4">
        <form action={approveFormAction} className="flex justify-end">
          <input type="hidden" name="run_id" value={runId} />
          <input type="hidden" name="brief_id" value={selectedBrief.id} />
          <input type="hidden" name="headline" value={edit.headline} />
          <input type="hidden" name="core_insights_json" value={JSON.stringify(edit.facts)} />
          <Button type="submit" disabled={approvePending}>
            {approvePending ? 'Generating email...' : 'Approve Strategy'}
          </Button>
        </form>

        {lastResult && !lastResult.ok && (
          <div className="rounded-md bg-critical-bg p-3 text-sm text-critical-text">
            <p>
              <span className="font-mono text-xs">{lastResult.code}</span> -- {lastResult.message}
            </p>
            <form action={retryFormAction} className="mt-2">
              <input type="hidden" name="run_id" value={runId} />
              <Button type="submit" variant="destructive" disabled={retryPending}>
                {retryPending ? 'Retrying...' : 'Retry'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
