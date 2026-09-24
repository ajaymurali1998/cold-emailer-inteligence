# 0002: ScrapeGraphAI for research scraping

## Status
Accepted

## Context
Phase 1 needs to both discover URLs (from an intent's source categories, e.g. "G2 reviews", "pricing pages") and scrape them, for general company websites. Three candidates were considered:
- **Firecrawl**: unified crawl/scrape/extract API, ~5x cheaper per structured-extract page, returns clean markdown.
- **ScrapeGraphAI**: natural-language structured extraction, has search+extract endpoints covering discovery and scraping in one tool, pricier per page.
- **Agent-Reach**: open-source, no API fees, but purpose-built for social/dev platforms (Twitter, Reddit, GitHub, etc.) via an agent-facing MCP skill, not a server-callable API for arbitrary company websites.

## Decision
Use ScrapeGraphAI for both discovery (search endpoint) and scraping (extract endpoint), starting on its Free plan.

## Consequences
- Firecrawl's cost advantage was set aside because Phase 2's Claude call already does the reasoning/structuring, so Firecrawl's cheap-markdown model wasn't the deciding factor.
- Agent-Reach was ruled out entirely: wrong shape (agent skill, not backend API) and wrong target sources (social/dev platforms, not company websites).
- Free plan constraint: 1 concurrent job serializes Phase 1 scraping; ~20 runs' worth of credits before an upgrade to Starter/Growth is needed.
