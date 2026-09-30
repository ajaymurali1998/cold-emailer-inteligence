import { PgBoss } from 'pg-boss'

// One pg-boss instance per process, hosted alongside the Next.js app on a
// single always-on Railway service (ADR 0001) -- pg-boss needs a persistent
// process to poll its queue, which serverless platforms don't provide.
let boss: PgBoss | undefined

export async function getBoss(): Promise<PgBoss> {
  if (boss) return boss

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('Missing required env var: DATABASE_URL')
  }

  boss = new PgBoss(connectionString)
  boss.on('error', (err) => console.error('[pg-boss]', err))
  await boss.start()
  return boss
}

export const QUEUE = {
  scrapeRun: 'scrape-run',
  synthesizeRun: 'synthesize-run',
  // Dead-letter target for scrapeRun/synthesizeRun: pg-boss routes a job
  // here once it exhausts its retryLimit, instead of leaving it silently
  // failed with no visible effect on the Run.
  runFailures: 'run-failures',
} as const
