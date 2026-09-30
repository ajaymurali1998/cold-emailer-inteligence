'use client'

import { useState } from 'react'
import Link from 'next/link'
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
