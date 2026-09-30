import { describe, expect, it } from 'vitest'
import { synthesizeStrategyBriefs, type SynthesisClient } from '@/lib/jobs/synthesize-run'

const businessContext = {
  businessName: 'Acme Analytics',
  businessDescription: 'B2B dashboarding SaaS',
  targetAudience: 'Data teams at mid-market companies',
}

const evidence = [
  { sourceId: '123e4567-e89b-12d3-a456-426614174000', sourceCategory: 'G2 reviews', text: 'Users complain about slow onboarding.' },
  { sourceId: '223e4567-e89b-12d3-a456-426614174001', sourceCategory: 'Forums', text: 'Competitors lack real-time sync.' },
]

function validResponse(sourceId: string) {
  return {
    briefs: [
      {
        intent: 'lead_generation',
        headline: 'Your onboarding is costing you customers',
        core_insights: [{ insight_label: 'Customer Pain', fact: 'Slow onboarding', source_id: sourceId }],
      },
      {
        intent: 'lead_generation',
        headline: 'What competitors are missing',
        core_insights: [{ insight_label: 'Competitor Gap', fact: 'No real-time sync', source_id: sourceId }],
      },
    ],
  }
}

describe('synthesizeStrategyBriefs', () => {
  it('accepts a valid response citing known source_ids', async () => {
    const client: SynthesisClient = {
      generateStrategyBriefs: async () => validResponse(evidence[0].sourceId),
    }

    const result = await synthesizeStrategyBriefs({
      intent: 'lead_generation',
      businessContext,
      evidence,
      client,
    })

    expect(result.briefs).toHaveLength(2)
  })

  it('throws when the response fails Zod schema validation (rogue insight_label)', async () => {
    const client: SynthesisClient = {
      generateStrategyBriefs: async () => ({
        briefs: [
          {
            intent: 'lead_generation',
            headline: 'Bad brief',
            core_insights: [{ insight_label: 'Not A Real Label', fact: 'x', source_id: evidence[0].sourceId }],
          },
          validResponse(evidence[0].sourceId).briefs[0],
        ],
      }),
    }

    await expect(
      synthesizeStrategyBriefs({ intent: 'lead_generation', businessContext, evidence, client })
    ).rejects.toThrow(/schema validation/)
  })

  it('throws when a brief cites a source_id not present in the evidence', async () => {
    const client: SynthesisClient = {
      generateStrategyBriefs: async () => validResponse('00000000-0000-0000-0000-000000000000'),
    }

    await expect(
      synthesizeStrategyBriefs({ intent: 'lead_generation', businessContext, evidence, client })
    ).rejects.toThrow(/unknown source_id/)
  })

  it('throws when the model returns malformed (non-schema-shaped) JSON', async () => {
    const client: SynthesisClient = {
      generateStrategyBriefs: async () => ({ not: 'the right shape' }),
    }

    await expect(
      synthesizeStrategyBriefs({ intent: 'lead_generation', businessContext, evidence, client })
    ).rejects.toThrow(/schema validation/)
  })
})
