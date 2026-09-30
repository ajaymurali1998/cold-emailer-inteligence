import 'dotenv/config'
import { getBoss, QUEUE } from '@/lib/queue/boss'
import { handleScrapeRunJob } from '@/lib/jobs/scrape-run'
import { handleSynthesizeRunJob } from '@/lib/jobs/synthesize-run'
import { handleRunFailureJob } from '@/lib/jobs/run-failure'

// Runs alongside the Next.js app on the single Railway service (ADR 0001).
// Local dev: `npm run worker` in a second terminal, next to `npm run dev`.
async function main() {
  const boss = await getBoss()

  // retryLimit: automatic retries on a thrown error (Task 2.3) -- e.g. the
  // model returning malformed JSON or a schema violation. deadLetter: once
  // retries are exhausted, the job lands on 'run-failures' instead of
  // silently disappearing, so the Run gets marked 'failed' with a reason.
  // Must exist before scrapeRun/synthesizeRun reference it as their deadLetter.
  await boss.createQueue(QUEUE.runFailures)

  // createQueue is INSERT ... ON CONFLICT DO NOTHING -- a no-op for a queue
  // that already exists from a previous run. updateQueue applies the config
  // either way, so retryLimit/deadLetter changes actually take effect.
  const scrapeRunOpts = { retryLimit: 3, deadLetter: QUEUE.runFailures }
  await boss.createQueue(QUEUE.scrapeRun, scrapeRunOpts)
  await boss.updateQueue(QUEUE.scrapeRun, scrapeRunOpts)

  const synthesizeRunOpts = {
    retryLimit: 3,
    retryDelay: 5,
    retryBackoff: true,
    deadLetter: QUEUE.runFailures,
  }
  await boss.createQueue(QUEUE.synthesizeRun, synthesizeRunOpts)
  await boss.updateQueue(QUEUE.synthesizeRun, synthesizeRunOpts)

  await boss.work(QUEUE.scrapeRun, async ([job]) => {
    console.log(`[worker] processing ${QUEUE.scrapeRun} job ${job.id}`)
    await handleScrapeRunJob(job as { data: { runId: string } })
    console.log(`[worker] finished ${QUEUE.scrapeRun} job ${job.id}`)
  })

  await boss.work(QUEUE.synthesizeRun, async ([job]) => {
    console.log(`[worker] processing ${QUEUE.synthesizeRun} job ${job.id}`)
    await handleSynthesizeRunJob(job as { data: { runId: string } })
    console.log(`[worker] finished ${QUEUE.synthesizeRun} job ${job.id}`)
  })

  await boss.work(QUEUE.runFailures, async ([job]) => {
    console.log(`[worker] processing ${QUEUE.runFailures} job ${job.id}`)
    await handleRunFailureJob(boss, job as { id: string; data: { runId: string } })
    console.log(`[worker] finished ${QUEUE.runFailures} job ${job.id}`)
  })

  console.log(
    '[worker] listening on',
    QUEUE.scrapeRun,
    ',',
    QUEUE.synthesizeRun,
    'and',
    QUEUE.runFailures
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
