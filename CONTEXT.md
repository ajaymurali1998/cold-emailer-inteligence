# Context: Email Intelligence App

## Glossary

**User Intent** — one of five fixed strategic objectives a user picks for an email: Lead Generation, Negotiation, Competitor Displacement, Closing Deals, Lead Nurturing. Determines which research sources are scraped and which `insight_label` enum values are valid.

**Strategy Brief** — a single proposed angle for the email, made of `{ intent, headline, insight_label, supporting_facts[] }`. Phase 2 produces 2-3 of these per run. The user picks one and free-text edits its fields; there is no separate "swap insight" mechanic — picking a different brief *is* the insight swap.

**core_insights** — the stable array field the frontend always expects from Phase 2, regardless of intent. Its `insight_label` values are drawn from an intent-specific enum (see PRD table), injected dynamically into the Zod schema server-side.

**insight_label** — an enum value classifying one extracted fact (e.g. `Customer Pain`, `Objection Handling`). The valid set is determined by the selected User Intent, not global.

**Business Context** — a user's business/audience profile, saved once and reused across multiple Runs. Not re-entered per run. Editable and deletable after creation.

**Run** — one invocation of the pipeline for a single User Intent against a saved Business Context. Owns its own scrape results, Strategy Briefs, and final email draft.

**Scrape attempt** — one fetch of one source URL within a Run's Phase 1. Failures are recorded with a failed status (not discarded) rather than surfaced to the end user; the Run proceeds with a warning if evidence is thin.

## Decisions (see ADRs for the hard-to-reverse ones)
- Scope: all 5 intents in MVP. No auth (single user).
- Email draft output for MVP: single subject + single body. Multiple subject-line variants (2-3, for A/B) is explicitly deferred to a future version.
- Deployment architecture: see [ADR 0001](docs/adr/0001-railway-single-service-over-vercel.md).
- Scraping/discovery tool: see [ADR 0002](docs/adr/0002-scrapegraphai-over-firecrawl-and-agent-reach.md). Discovery is fully automatic (ScrapeGraphAI search resolves names/categories to URLs) — no manual URL input in the intake form.
- LLM access: both Phase 2 (Claude Sonnet 4.6) and Phase 3 (GPT-5.6 Luna) called via OpenRouter, one client/billing surface.
- Only one Run may be in progress at a time, system-wide (reversed from an earlier "allow concurrent Runs" decision, to match ScrapeGraphAI Free plan's 1-concurrent-job cap without building cross-Run queuing). Starting a new Run is blocked while one is active.
- A Run History list view is in MVP scope (Runs are persisted specifically to be revisited).
- Phase 3 (synchronous email generation) failures surface as a well-defined, user-facing error with a way to fix/retry — not a generic failure state.
