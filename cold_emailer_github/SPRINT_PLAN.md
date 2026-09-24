# Development Sprint Plan: Email Intelligence App (MVP)

## Sprint 0: Foundation, Schema, & Infrastructure

**Goal**: Establish the repository, database schema, and background-job pipeline.

**Task 0.1: Repository & Stack Initialization**
- Bootstrap Next.js (App Router), TailwindCSS, TypeScript.
- Initialize Supabase project — Postgres only. **No Auth** (single-user, no login).
- Add `pg-boss` for the background job queue (runs against the same Supabase Postgres — no separate service).
- Set up a single Railway service that runs the Next.js app and the pg-boss worker together (pg-boss needs a persistent process; this rules out Vercel).

**Task 0.2: Database Schema Design (Supabase)**
- `business_contexts` table (business info, target audience) — saved once, reused across runs.
- `runs` table (FK to `business_context_id`, selected intent, status) — one per pipeline invocation.
- `scrape_attempts` table (FK to `run_id`, source URL, status: `success`/`failed`, scraped text, provenance ID) — every attempt persisted, including failures, so failure patterns are queryable later.
- `strategy_briefs` table (FK to `run_id`, JSONB column for the polymorphic `core_insights` output, `selected` boolean).

**Task 0.3: Core Zod Schema Definitions**
- Define base Zod schemas for the API contracts, specifically the polymorphic `core_insights` array wrapper.

**Testing Gate (Sprint 0)**:
- Unit: Zod validation tests on dummy JSON.
- Infra: pg-boss job successfully enqueues/dequeues against local Supabase Postgres. Migrations apply cleanly.

---

## Sprint 1: Deterministic Gathering Layer (Phase 1)

**Goal**: Capture user intent and scrape target sources without LLM intervention.

**Task 1.1: User Context UI**
- Intake form: Business Context (saved, reusable), Target Audience, dropdown for the 5 Email Intents. No manual URL field — ScrapeGraphAI's search endpoint resolves competitor/source names to URLs on its own.
- Business Context management: edit and delete a saved Business Context (deleting one should not orphan its past Runs — keep the Runs' snapshot of the context data, or block delete while Runs reference it; pick one during implementation).

**Task 1.2: Deterministic Router (Config_Router)**
- Hardcoded mapping utility: intent → source *categories* (e.g. `Negotiation` → `['Pricing Pages', 'SLA docs']`).
- Resolving a category into actual URLs is ScrapeGraphAI's job (search endpoint), not this router's — the router only picks categories, per intent.

**Task 1.3: ScrapeGraphAI Orchestration (pg-boss job)**
- pg-boss job receives source categories from Config_Router.
- Use ScrapeGraphAI's search endpoint to resolve categories → concrete URLs, then its extract endpoint to scrape.
- Run scrapes in parallel up to the plan's concurrency limit (Free plan: 1 concurrent — effectively serial for now).
- On failure, mark that `scrape_attempts` row `failed` and continue — do not fail the run. If a run ends with too little evidence, mark the run with a "thin evidence" warning rather than failing it (surfaced to the user in Sprint 3's UI).
- Insert results (success or failure) into `scrape_attempts`.

**Testing Gate (Sprint 1)**:
- Unit: Config_Router returns correct source categories for all 5 intents.
- Integration: Mock the ScrapeGraphAI API (search + extract) and verify the pg-boss job processes and writes both successful and failed attempts to `scrape_attempts` correctly.

---

## Sprint 2: Single-Pass Synthesis Engine (Phase 2)

**Goal**: Process scraped evidence through Claude using dynamically constrained Zod schemas.

**Task 2.1: Dynamic Zod Schema Compiler**
- Utility that reads the run's intent and injects that intent's 5 allowed `insight_label` enums into the strict LLM extraction schema.

**Task 2.2: Synthesis via OpenRouter (pg-boss job)**
- Chain this job after Task 1.3 completes.
- Compile the master prompt: Business Context + all `scrape_attempts` text for the run (successful ones only).
- Call `anthropic/claude-sonnet-4.6` via OpenRouter's standard (non-batch) API, using structured tool-use/JSON schema to enforce the Zod schema. (Both Phase 2 and Phase 3 route through OpenRouter — one client/billing surface; OpenRouter passes through Anthropic's native tool-use, so schema enforcement isn't weakened.)

**Task 2.3: Idempotency & Error Handling**
- pg-boss automatic retries if Claude returns malformed JSON or times out.
- Save the validated JSON payload into `strategy_briefs`.

**Testing Gate (Sprint 2)**:
- Unit: Pass a rogue intent label into the Zod schema compiler and assert it throws.
- Integration: Run the Claude call with a mocked `scrape_attempts` payload; verify output strictly adheres to the injected enums and saves to Supabase.

---

## Sprint 3: Presentation & Generation Layer (Phase 3)

**Goal**: Expose progress, let the user pick/edit a brief, generate the final email.

**Task 3.0: Run History List**
- List view of past/in-progress Runs per Business Context (status, intent, created date), linking into Task 3.1/3.2's detail views.
- Only one Run may be active system-wide: disable/hide the "start new Run" action while any Run has an in-progress status. Matches ScrapeGraphAI Free plan's 1-concurrent-job cap.

**Task 3.1: Live Progress UI**
- Poll `runs.status` (and related `scrape_attempts`/`strategy_briefs` state) from the client — no SSE/webhook dependency, since pg-boss has no built-in push mechanism.
- Terminal-style UI showing background progress (e.g. "Extracting ROI Proof..."), including a visible warning state when a run has thin evidence (per Sprint 1's failure handling).

**Task 3.2: Strategy Brief Carousel UI**
- Fetch completed `strategy_briefs` for the run from Supabase.
- Dynamic card UI mapping over `core_insights`; must render whatever enum labels were generated without breaking.
- "Click-to-Evidence": clicking a fact queries `scrape_attempts` by `source_id` and displays the scraped snippet.
- Selecting a brief is free-text editable (headline/angle/facts) before approval — no separate "swap insight" control.

**Task 3.3: Bounded Email Generation**
- UI state where the user clicks "Approve Strategy" (after any free-text edits).
- Synchronous Next.js server action/API route that accepts only the approved (possibly edited) strategy object and calls `openai/gpt-5.6-luna` via OpenRouter to generate a single subject + single body email draft. (Multi-variant subject-line A/B generation is out of scope for MVP — planned for a later version.)

**Task 3.4: Phase 3 Failure Handling**
- Define a small set of well-known error codes for the generation call (e.g. `provider_timeout`, `provider_error`, `invalid_strategy`) instead of a generic 500.
- UI maps each code to a specific, actionable message and a "Retry" action that resubmits the same approved strategy object — no re-approval or re-run of Phase 1/2 needed, since the strategy is already persisted in `strategy_briefs`.

**Testing Gate (Sprint 3)**:
- Unit: Carousel renders correctly for every intent's enum set without type errors.
- Integration: Full pipeline run (mocked scrape + mocked Claude) from intake to approved single-subject/single-body draft.
