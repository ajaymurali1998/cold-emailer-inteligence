import { describe, expect, it } from 'vitest'
import { runScrapePhase } from '@/lib/jobs/scrape-run'
import { synthesizeStrategyBriefs, type SynthesisClient } from '@/lib/jobs/synthesize-run'
import { generateEmailDraft, type EmailGenerationClient } from '@/lib/runs/generate-email'
import type { ScrapeGraphAIClient } from '@/lib/scrapegraphai/client'

// Sprint 3 testing gate: full pipeline run (mocked scrape + mocked Claude)
// from intake to an approved single-subject/single-body draft. No Supabase
// or real network calls -- each phase's pure function chained via mocks,
// mirroring how the real job handlers chain them.
describe('full pipeline (mocked)', () => {
  it('goes from business context + intent to a final email draft', async () => {
    const businessContext = {
      businessName: 'Acme Analytics',
      businessDescription: 'B2B dashboarding SaaS',
      targetAudience: 'Data teams at mid-market companies',
    }

    const scrapeClient: ScrapeGraphAIClient = {
      search: async () => ({
        status: 'completed',
        markdownContent: 'Users on G2 complain about slow onboarding and poor support.',
        referenceUrls: ['https://www.g2.com/products/acme/reviews'],
      }),
    }

    const scrapeResults = await runScrapePhase({
      intent: 'lead_generation',
      businessContext,
      client: scrapeClient,
    })
    expect(scrapeResults.every((r) => r.status === 'success')).toBe(true)

    const evidence = scrapeResults.map((r, i) => ({
      sourceId: `123e4567-e89b-12d3-a456-42661417400${i}`,
      sourceCategory: r.sourceCategory,
      text: r.scrapedText ?? '',
    }))

    const synthesisClient: SynthesisClient = {
      generateStrategyBriefs: async () => ({
        briefs: [
          {
            intent: 'lead_generation',
            headline: 'Your onboarding is costing you customers',
            core_insights: [
              { insight_label: 'Customer Pain', fact: 'Slow onboarding', source_id: evidence[0].sourceId },
            ],
          },
          {
            intent: 'lead_generation',
            headline: 'What competitors are missing',
            core_insights: [
              { insight_label: 'Competitor Gap', fact: 'Poor support', source_id: evidence[0].sourceId },
            ],
          },
        ],
      }),
    }

    const synthesis = await synthesizeStrategyBriefs({
      intent: 'lead_generation',
      businessContext,
      evidence,
      client: synthesisClient,
    })
    expect(synthesis.briefs).toHaveLength(2)

    const approvedStrategy = {
      headline: synthesis.briefs[0].headline,
      coreInsights: synthesis.briefs[0].core_insights,
    }

    const emailClient: EmailGenerationClient = {
      generateEmail: async () => ({
        subject: 'Stop losing customers to slow onboarding',
        body: 'Hi -- noticed your team might be facing onboarding friction...',
      }),
    }

    const draft = await generateEmailDraft({
      intent: 'lead_generation',
      businessContext,
      strategy: approvedStrategy,
      client: emailClient,
    })

    expect(draft).toEqual({
      ok: true,
      subject: 'Stop losing customers to slow onboarding',
      body: 'Hi -- noticed your team might be facing onboarding friction...',
    })
  })
})
