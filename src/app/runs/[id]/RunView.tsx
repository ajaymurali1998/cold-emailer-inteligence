'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, Circle, Clock } from 'lucide-react'
import { INTENT_CONFIG, type UserIntent } from '@/lib/config/intents'
import type { RunSnapshot } from '@/lib/runs/get-run-snapshot'
import { Badge } from '@/components/ui/Badge'
import { finishRunForNow } from '@/app/runs/actions'
import { BriefCarousel } from '@/app/runs/[id]/BriefCarousel'
import { EmailDraftView } from '@/app/runs/[id]/EmailDraftView'

const POLLING_STATUSES = ['scraping', 'synthesizing']

function PhaseCard({
  number,
  title,
  status,
  children,
}: {
  number: number
  title: string
  status: 'done' | 'active' | 'waiting' | 'failed'
  children: React.ReactNode
}) {
  const circle =
    status === 'done' ? (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success-bg text-success-text">
        <CheckCircle2 size={16} />
      </span>
    ) : status === 'failed' ? (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-critical-bg text-critical-text">
        <XCircle size={16} />
      </span>
    ) : status === 'active' ? (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-primary">
        <Loader2 size={16} className="animate-spin" />
      </span>
    ) : (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-text-muted">
        <Circle size={14} />
      </span>
    )

  const cardTone =
    status === 'failed'
      ? 'border-critical-border bg-critical-bg'
      : status === 'active'
        ? 'border-primary/40 bg-indigo-50/40'
        : status === 'waiting'
          ? 'border-border bg-slate-50 opacity-70'
          : 'border-border bg-card'

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        {circle}
        <div className="mt-1 w-px flex-1 bg-divider" />
      </div>
      <div className={`mb-4 flex-1 rounded-lg border p-4 ${cardTone}`}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">
            PHASE {number} -- {title}
          </h3>
        </div>
        {children}
      </div>
    </div>
  )
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

  async function refreshSnapshot() {
    const res = await fetch(`/api/runs/${runId}`)
    if (res.ok) setSnapshot(await res.json())
  }

  const boundFinish = finishRunForNow.bind(null, runId)
  const intentConfig = INTENT_CONFIG[snapshot.intent as UserIntent]
  const expectedCategories = intentConfig.sourceCategories

  const phase1Failed = snapshot.status === 'failed' && snapshot.attempts.length === 0
  const phase1Status: 'done' | 'active' | 'failed' = phase1Failed
    ? 'failed'
    : snapshot.attempts.length > 0
      ? 'done'
      : 'active'

  const phase2Failed = snapshot.status === 'failed' && snapshot.attempts.length > 0
  const phase2Status: 'done' | 'active' | 'waiting' | 'failed' = phase2Failed
    ? 'failed'
    : snapshot.briefs.length > 0
      ? 'done'
      : snapshot.status === 'synthesizing'
        ? 'active'
        : 'waiting'

  const phase3Status: 'done' | 'waiting' = snapshot.emailDraft ? 'done' : 'waiting'

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-text">{intentConfig.label}</h1>
        <p className="text-sm text-text-muted">{snapshot.businessName}</p>
      </div>

      <div>
        <PhaseCard number={1} title="Deterministic Gathering" status={phase1Status}>
          {phase1Failed ? (
            <p className="text-sm text-critical-text">{snapshot.errorMessage}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {expectedCategories.map((category) => {
                const attempt = snapshot.attempts.find((a) => a.sourceCategory === category)
                return (
                  <li
                    key={category}
                    className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-text">{category}</span>
                    {!attempt ? (
                      <span className="flex items-center gap-1.5 text-text-muted">
                        <Clock size={14} /> pending
                      </span>
                    ) : attempt.status === 'success' ? (
                      <a
                        href={attempt.sourceUrl ?? undefined}
                        className="flex items-center gap-1.5 truncate text-success-text hover:underline"
                      >
                        <CheckCircle2 size={14} /> verified
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 text-critical-text">
                        <XCircle size={14} /> {attempt.errorMessage ?? 'failed'}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {snapshot.thinEvidenceWarning && (
            <p className="mt-3 rounded-md bg-warning-bg p-2.5 text-xs text-warning-text">
              Some sources failed to scrape -- brief count may be reduced due to limited evidence.
            </p>
          )}
        </PhaseCard>

        <PhaseCard number={2} title="AI Synthesis & Knowledge Extraction" status={phase2Status}>
          {phase2Failed ? (
            <p className="text-sm text-critical-text">{snapshot.errorMessage}</p>
          ) : phase2Status === 'waiting' ? (
            <p className="text-sm text-text-muted">Waiting on Phase 1.</p>
          ) : phase2Status === 'active' ? (
            <p className="text-sm text-primary">Extracting strategy briefs from the evidence...</p>
          ) : (
            <p className="text-sm text-success-text">
              {snapshot.briefs.length} strategy brief{snapshot.briefs.length === 1 ? '' : 's'}{' '}
              generated.
            </p>
          )}
        </PhaseCard>

        <PhaseCard number={3} title="Strategy Review (manual)" status={phase3Status}>
          {snapshot.briefs.length === 0 ? (
            <p className="text-sm text-text-muted">Waiting on Phase 2.</p>
          ) : snapshot.emailDraft ? (
            <p className="text-sm text-success-text">Approved -- email draft generated.</p>
          ) : (
            <div className="flex items-center gap-2">
              <Badge tone="warning">Ready</Badge>
              <span className="text-sm text-text">
                Needs your approval -- review the briefs below.
              </span>
            </div>
          )}
        </PhaseCard>
      </div>

      {snapshot.briefs.length > 0 && !snapshot.emailDraft && (
        <BriefCarousel runId={runId} briefs={snapshot.briefs} onApproved={refreshSnapshot} />
      )}

      {snapshot.emailDraft && (
        <EmailDraftView emailDraft={snapshot.emailDraft} briefs={snapshot.briefs} />
      )}

      {POLLING_STATUSES.includes(snapshot.status) && (
        <form action={boundFinish}>
          <button type="submit" className="text-xs text-text-muted underline">
            Finish this run for now
          </button>
        </form>
      )}
    </div>
  )
}
