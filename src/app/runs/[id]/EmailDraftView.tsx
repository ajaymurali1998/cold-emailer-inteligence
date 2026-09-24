'use client'

import { useEffect, useState } from 'react'
import { Copy, ShieldCheck } from 'lucide-react'
import type { StrategyBriefSnapshot } from '@/lib/runs/get-run-snapshot'
import type { CoreInsight } from '@/lib/schemas/strategy-brief'

function GroundedFact({ fact }: { fact: CoreInsight }) {
  const [snippet, setSnippet] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/scrape-attempts/${fact.source_id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setSnippet(d.snippet ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [fact.source_id])

  return (
    <li className="rounded-md border border-border p-2.5 text-xs">
      <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 font-medium text-primary">
        {fact.insight_label}
      </span>
      <p className="mt-1 text-text-secondary">{fact.fact}</p>
      {snippet && <p className="mt-1 truncate text-text-muted">&quot;{snippet.slice(0, 120)}...&quot;</p>}
    </li>
  )
}

// Read-only by design (Sprint 3 decision): edits happen earlier, on the
// strategy brief, before generation -- the generated email is final.
export function EmailDraftView({
  emailDraft,
  briefs,
}: {
  emailDraft: { subject: string; body: string }
  briefs: StrategyBriefSnapshot[]
}) {
  const approvedBrief = briefs.find((b) => b.selected) ?? briefs[0]
  const facts: CoreInsight[] = approvedBrief
    ? approvedBrief.editedCoreInsights ?? approvedBrief.coreInsights
    : []
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(`Subject: ${emailDraft.subject}\n\n${emailDraft.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="card-elevation-1 flex min-w-0 flex-col rounded-lg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Email draft ready</h2>
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Copy size={14} /> {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </div>
        <p className="text-lg font-semibold text-text">{emailDraft.subject}</p>
        <p className="mt-4 whitespace-pre-wrap break-words text-base leading-relaxed text-text-secondary">
          {emailDraft.body}
        </p>
      </div>

      <div className="card-elevation-1 flex min-w-0 flex-col gap-3 rounded-lg p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-success-text" />
          <h3 className="text-sm font-semibold text-text">Grounding</h3>
        </div>
        <p className="text-sm text-text-secondary">
          {facts.length}/{facts.length} facts grounded in real scraped evidence.
        </p>
        <ul className="flex flex-col gap-2">
          {facts.map((f, i) => (
            <GroundedFact key={i} fact={f} />
          ))}
        </ul>
      </div>
    </div>
  )
}
