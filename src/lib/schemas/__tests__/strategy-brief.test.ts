import { describe, expect, it } from 'vitest'
import { strategyBriefsResponseSchema } from '@/lib/schemas/strategy-brief'

const validBrief = (label: string) => ({
  intent: 'lead_generation' as const,
  headline: 'Your competitors are missing this',
  core_insights: [
    {
      insight_label: label,
      fact: 'Reviewers on G2 cite slow onboarding as a top complaint.',
      source_id: '123e4567-e89b-12d3-a456-426614174000',
    },
  ],
})

describe('strategyBriefsResponseSchema', () => {
  it('accepts a valid response with 2-3 briefs using intent-correct labels', () => {
    const schema = strategyBriefsResponseSchema('lead_generation')
    const result = schema.safeParse({
      briefs: [validBrief('Customer Pain'), validBrief('Competitor Gap')],
    })
    expect(result.success).toBe(true)
  })

  it('rejects a rogue insight_label not in the intent enum', () => {
    const schema = strategyBriefsResponseSchema('lead_generation')
    const result = schema.safeParse({
      briefs: [validBrief('Objection Handling'), validBrief('Customer Pain')],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a label valid for a different intent', () => {
    const schema = strategyBriefsResponseSchema('negotiation')
    const result = schema.safeParse({
      briefs: [
        { ...validBrief('Customer Pain'), intent: 'negotiation' as const },
        { ...validBrief('Objection Handling'), intent: 'negotiation' as const },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects fewer than 2 briefs', () => {
    const schema = strategyBriefsResponseSchema('lead_generation')
    const result = schema.safeParse({ briefs: [validBrief('Customer Pain')] })
    expect(result.success).toBe(false)
  })

  it('rejects more than 3 briefs', () => {
    const schema = strategyBriefsResponseSchema('lead_generation')
    const result = schema.safeParse({
      briefs: [
        validBrief('Customer Pain'),
        validBrief('Competitor Gap'),
        validBrief('Proof & ROI'),
        validBrief('Status Quo Flaw'),
      ],
    })
    expect(result.success).toBe(false)
  })
})
