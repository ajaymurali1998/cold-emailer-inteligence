'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { INTENT_CONFIG, USER_INTENTS, type UserIntent } from '@/lib/config/intents'
import { createRun } from '@/app/runs/actions'

interface ContextOption {
  id: string
  businessName: string
  businessDescription: string
}

export function RunConfigForm({ contexts }: { contexts: ContextOption[] }) {
  const [intent, setIntent] = useState<UserIntent>(USER_INTENTS[0])
  const config = INTENT_CONFIG[intent]

  return (
    <form action={createRun} className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Business Context *</span>
          <Select name="business_context_id" required defaultValue="">
            <option value="" disabled>
              Select a business context
            </option>
            {contexts.map((ctx) => (
              <option key={ctx.id} value={ctx.id}>
                {ctx.businessName} -- {ctx.businessDescription.slice(0, 60)}
                {ctx.businessDescription.length > 60 ? '...' : ''}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Email Intent *</span>
          <Select
            name="intent"
            required
            value={intent}
            onChange={(e) => setIntent(e.target.value as UserIntent)}
          >
            {USER_INTENTS.map((i) => (
              <option key={i} value={i}>
                {INTENT_CONFIG[i].label}
              </option>
            ))}
          </Select>
          <span className="text-xs text-text-muted">{config.strategicObjective}</span>
        </label>

        <div className="card-elevation-1 flex flex-col gap-3 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-primary" />
            <span className="text-sm font-semibold text-text">Target Research Sources</span>
          </div>
          <p className="text-xs text-text-muted">
            The following sources will be automatically analyzed for this intent:
          </p>
          <ul className="flex flex-col gap-2">
            {config.sourceCategories.map((category) => (
              <li
                key={category}
                className="rounded-md border border-border bg-slate-50 px-3 py-2 text-sm text-text"
              >
                {category}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border p-4">
        <Link href="/runs">
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </Link>
        <Button type="submit">Start Run</Button>
      </div>
    </form>
  )
}
