import { describe, expect, it } from 'vitest'
import { generateEmailDraft, type EmailGenerationClient } from '@/lib/runs/generate-email'

const businessContext = {
  businessName: 'Acme Analytics',
  businessDescription: 'B2B dashboarding SaaS',
  targetAudience: 'Data teams at mid-market companies',
}

const strategy = {
  headline: 'Your onboarding is costing you customers',
  coreInsights: [
    { insight_label: 'Customer Pain', fact: 'Slow onboarding', source_id: '123e4567-e89b-12d3-a456-426614174000' },
  ],
}

describe('generateEmailDraft', () => {
  it('returns a subject/body on a valid client response', async () => {
    const client: EmailGenerationClient = {
      generateEmail: async () => ({ subject: 'Stop losing customers', body: 'Hi there...' }),
    }

    const result = await generateEmailDraft({ intent: 'lead_generation', businessContext, strategy, client })
    expect(result).toEqual({ ok: true, subject: 'Stop losing customers', body: 'Hi there...' })
  })

  it('returns invalid_strategy without calling the client when the strategy is empty', async () => {
    let called = false
    const client: EmailGenerationClient = {
      generateEmail: async () => {
        called = true
        return { subject: 'x', body: 'y' }
      },
    }

    const result = await generateEmailDraft({
      intent: 'lead_generation',
      businessContext,
      strategy: { headline: '  ', coreInsights: [] },
      client,
    })

    expect(result).toEqual({ ok: false, code: 'invalid_strategy', message: 'Strategy headline is empty.' })
    expect(called).toBe(false)
  })

  it('returns provider_timeout when the client throws a TimeoutError', async () => {
    const client: EmailGenerationClient = {
      generateEmail: async () => {
        const err = new Error('timed out')
        err.name = 'TimeoutError'
        throw err
      },
    }

    const result = await generateEmailDraft({ intent: 'lead_generation', businessContext, strategy, client })
    expect(result.ok).toBe(false)
    expect(result).toMatchObject({ code: 'provider_timeout' })
  })

  it('returns provider_error when the client throws a generic error', async () => {
    const client: EmailGenerationClient = {
      generateEmail: async () => {
        throw new Error('rate limited')
      },
    }

    const result = await generateEmailDraft({ intent: 'lead_generation', businessContext, strategy, client })
    expect(result).toEqual({ ok: false, code: 'provider_error', message: 'rate limited' })
  })

  it('returns provider_error when the client response fails schema validation', async () => {
    const client: EmailGenerationClient = {
      generateEmail: async () => ({ subject: '' }),
    }

    const result = await generateEmailDraft({ intent: 'lead_generation', businessContext, strategy, client })
    expect(result.ok).toBe(false)
    expect(result).toMatchObject({ code: 'provider_error' })
  })
})
