-- Task 0.2: core schema for the Email Intelligence App
-- Entities: Business Context -> Run -> (scrape_attempts, strategy_briefs)
-- See /CONTEXT.md for the domain glossary these map to.

create extension if not exists "pgcrypto";

create type user_intent as enum (
  'lead_generation',
  'negotiation',
  'competitor_displacement',
  'closing_deals',
  'lead_nurturing'
);

create type run_status as enum (
  'pending',
  'scraping',
  'synthesizing',
  'awaiting_approval',
  'generating',
  'complete',
  'failed'
);

create type scrape_status as enum (
  'success',
  'failed'
);

-- Business Context: saved once, reused across many Runs. Editable/deletable.
create table business_contexts (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  business_description text not null,
  target_audience text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Run: one pipeline invocation for one intent against one Business Context.
-- Only one run may be in_progress system-wide (enforced at the application layer,
-- matching ScrapeGraphAI's Free-plan 1-concurrent-job cap) -- see CONTEXT.md.
create table runs (
  id uuid primary key default gen_random_uuid(),
  business_context_id uuid not null references business_contexts(id) on delete restrict,
  intent user_intent not null,
  status run_status not null default 'pending',
  thin_evidence_warning boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index runs_business_context_id_idx on runs(business_context_id);
create index runs_status_idx on runs(status);

-- Scrape attempt: one fetch of one source URL within a Run's Phase 1.
-- Failures are persisted, not discarded, so failure patterns are queryable.
create table scrape_attempts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  source_category text not null,
  source_url text,
  status scrape_status not null,
  scraped_text text,
  error_message text,
  created_at timestamptz not null default now()
);

create index scrape_attempts_run_id_idx on scrape_attempts(run_id);

-- Strategy Brief: one of 2-3 proposed angles Phase 2 produces per Run.
-- core_insights is the polymorphic array; its insight_label values are
-- validated application-side against the intent-specific enum (see
-- src/lib/schemas/strategy-brief.ts), not constrained in Postgres, since
-- the valid set varies per intent.
create table strategy_briefs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  headline text not null,
  core_insights jsonb not null,
  selected boolean not null default false,
  edited_headline text,
  edited_core_insights jsonb,
  created_at timestamptz not null default now()
);

create index strategy_briefs_run_id_idx on strategy_briefs(run_id);

-- Email draft: Phase 3 output for a Run's selected/edited brief.
create table email_drafts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  strategy_brief_id uuid not null references strategy_briefs(id) on delete restrict,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index email_drafts_run_id_idx on email_drafts(run_id);
