'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { getRunStatusDisplay } from '@/lib/ui/run-status'
import { formatTimestamp } from '@/lib/ui/format'
import { INTENT_CONFIG, type UserIntent } from '@/lib/config/intents'

export interface RunRow {
  id: string
  intent: string
  status: string
  createdAt: string
  businessName: string | null
}

const PAGE_SIZE = 10

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'complete', label: 'Complete' },
  { value: 'failed', label: 'Failed' },
  { value: 'in_progress', label: 'In Progress' },
] as const

function matchesStatusFilter(status: string, filter: string): boolean {
  if (filter === 'all') return true
  if (filter === 'in_progress') {
    return ['pending', 'scraping', 'synthesizing', 'awaiting_approval', 'generating'].includes(
      status
    )
  }
  return status === filter
}

export function RunsTable({ runs }: { runs: RunRow[] }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return runs.filter((r) => {
      if (!matchesStatusFilter(r.status, statusFilter)) return false
      if (!term) return true
      const intentLabel = INTENT_CONFIG[r.intent as UserIntent]?.label ?? r.intent
      return (
        (r.businessName ?? '').toLowerCase().includes(term) ||
        intentLabel.toLowerCase().includes(term)
      )
    })
  }, [runs, statusFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <Input
          placeholder="Search business context or intent..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          className="w-72"
        />
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(0)
          }}
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="card-elevation-1 overflow-hidden rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
              <th className="px-4 py-2.5">Business Context</th>
              <th className="px-4 py-2.5">Intent</th>
              <th className="px-4 py-2.5">Started</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  No runs match this filter.
                </td>
              </tr>
            )}
            {pageRows.map((r) => {
              const { label, tone } = getRunStatusDisplay(r.status)
              const intentLabel = INTENT_CONFIG[r.intent as UserIntent]?.label ?? r.intent
              return (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-text">{r.businessName}</td>
                  <td className="px-4 py-3">
                    <Badge tone="primary">{intentLabel}</Badge>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {formatTimestamp(r.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={tone}>{label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/runs/${r.id}`} className="font-medium text-primary hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>
            Showing {currentPage * PAGE_SIZE + 1}-
            {Math.min(filtered.length, (currentPage + 1) * PAGE_SIZE)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-border px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-border px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
