import { describe, expect, it } from 'vitest'
import { runScrapePhase } from '@/lib/jobs/scrape-run'
import type { ScrapeGraphAIClient } from '@/lib/scrapegraphai/client'

const businessContext = {
  businessName: 'Acme Analytics',
  businessDescription: 'B2B dashboarding SaaS',
  targetAudience: 'Data teams at mid-market companies',
}

describe('runScrapePhase', () => {
  it('produces one success result per source category when the client succeeds', async () => {
    const client: ScrapeGraphAIClient = {
      search: async () => ({
        requestId: 'req-1',
        status: 'completed',
        markdownContent: 'some scraped facts',
        referenceUrls: ['https://example.com/g2'],
      }),
    }

    const results = await runScrapePhase({ intent: 'lead_generation', businessContext, client })

    expect(results).toHaveLength(3) // lead_generation has 3 source categories
    expect(results.every((r) => r.status === 'success')).toBe(true)
    expect(results[0].scrapedText).toBe('some scraped facts')
    expect(results[0].sourceUrl).toBe('https://example.com/g2')
  })

  it('records a failed attempt per category without throwing when the client errors', async () => {
    const client: ScrapeGraphAIClient = {
      search: async () => {
        throw new Error('network down')
      },
    }

    const results = await runScrapePhase({ intent: 'negotiation', businessContext, client })

    expect(results).toHaveLength(3) // negotiation has 3 source categories
    expect(results.every((r) => r.status === 'failed')).toBe(true)
    expect(results[0].errorMessage).toBe('network down')
  })

  it('mixes success and failure per category independently (thin-evidence case)', async () => {
    let call = 0
    const client: ScrapeGraphAIClient = {
      search: async () => {
        call += 1
        if (call === 1) {
          return { requestId: 'req-1', status: 'completed', markdownContent: 'ok', referenceUrls: [] }
        }
        return { requestId: 'req-2', status: 'failed', error: 'blocked by site' }
      },
    }

    const results = await runScrapePhase({ intent: 'competitor_displacement', businessContext, client })

    expect(results).toHaveLength(2) // competitor_displacement has 2 source categories
    expect(results.filter((r) => r.status === 'success')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'failed')).toHaveLength(1)
    expect(results.find((r) => r.status === 'failed')?.errorMessage).toBe('blocked by site')
  })
})
