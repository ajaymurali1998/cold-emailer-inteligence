# 0001: Single always-on Railway service instead of Vercel

## Status
Accepted

## Context
Phase 1/2 background processing runs on pg-boss, which polls jobs from a persistent Node process. Vercel functions are ephemeral/serverless and cannot host a long-running polling loop. Persistence already lives on Supabase Postgres, so pg-boss (queue-in-Postgres) avoids a second service to run — but only if something hosts the persistent worker.

## Decision
Deploy the whole app (Next.js + the pg-boss worker) as one always-on service on Railway, rather than deploying the frontend/API routes to Vercel and standing up a separate worker service elsewhere.

## Consequences
- One deploy target, one thing to operate, for an MVP.
- Gives up Vercel's edge network and zero-ops scaling; Railway requires manually sizing/scaling the instance.
- If load later demands independent scaling of web vs. worker, this will need to be split into two services.
