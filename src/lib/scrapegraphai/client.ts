// Thin wrapper around ScrapeGraphAI v2's Search endpoint (ADR 0002).
// v1 (searchscraper, /v1/*) is deprecated; v2 moved to a new host and made
// search synchronous -- no submit-then-poll needed anymore.
//
// One call does discovery + content fetch together: given a query, it
// searches the web and returns each result's page content -- so Phase 1
// needs no separate discovery step.
//
// Docs: POST https://v2-api.scrapegraphai.com/api/search

const SEARCH_URL = 'https://v2-api.scrapegraphai.com/api/search'

export interface SearchScraperResult {
  status: 'completed' | 'failed'
  markdownContent?: string
  referenceUrls?: string[]
  error?: string
}

export interface ScrapeGraphAIClient {
  search(prompt: string, opts?: { numResults?: number }): Promise<SearchScraperResult>
}

interface SearchResponse {
  id: string
  results: { url: string; title: string; content: string }[]
  error?: string
}

export function createScrapeGraphAIClient(opts?: { apiKey?: string }): ScrapeGraphAIClient {
  const apiKey = opts?.apiKey ?? process.env.SCRAPEGRAPHAI_API_KEY
  if (!apiKey) {
    throw new Error('Missing required env var: SCRAPEGRAPHAI_API_KEY')
  }

  const headers = {
    'SGAI-APIKEY': apiKey,
    'Content-Type': 'application/json',
  }

  async function search(
    query: string,
    searchOpts?: { numResults?: number }
  ): Promise<SearchScraperResult> {
    const res = await fetch(SEARCH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        numResults: searchOpts?.numResults ?? 3,
        format: 'markdown',
      }),
    })

    if (!res.ok) {
      return { status: 'failed', error: `Search request failed: ${res.status} ${await res.text()}` }
    }

    const body = (await res.json()) as SearchResponse
    if (!body.results || body.results.length === 0) {
      return { status: 'failed', error: body.error ?? 'No results returned' }
    }

    return {
      status: 'completed',
      markdownContent: body.results.map((r) => `## ${r.title}\n${r.content}`).join('\n\n'),
      referenceUrls: body.results.map((r) => r.url),
    }
  }

  return { search }
}
