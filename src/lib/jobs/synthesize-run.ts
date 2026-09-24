import { z } from 'zod'
import { strategyBriefsResponseSchema, type StrategyBriefsResponse } from '@/lib/schemas/strategy-brief'
import { INTENT_CONFIG, type UserIntent } from '@/lib/config/intents'
import { createSupabaseServiceClient } from '@/lib/db/supabase'
import { createOpenRouterClient, MODELS } from '@/lib/llm/openrouter'
import type { BusinessContextInput } from '@/lib/jobs/scrape-run'

export interface EvidenceItem {
  sourceId: string
  sourceCategory: string
  text: string
}

// Abstracted so the pure synthesis logic below is testable without hitting
// OpenRouter -- Sprint 2 testing gate mocks this.
export interface SynthesisClient {
  generateStrategyBriefs(params: {
    intent: UserIntent
    businessContext: BusinessContextInput
    evidence: EvidenceItem[]
    jsonSchema: object
  }): Promise<unknown>
}

function truncate(text: string, maxChars: number): string {
  return text.length > maxChars ? text.slice(0, maxChars) + '\n[...truncated]' : text
}

export function createOpenRouterSynthesisClient(): SynthesisClient {
  const client = createOpenRouterClient()

  return {
    async generateStrategyBriefs({ intent, businessContext, evidence, jsonSchema }) {
      const evidenceBlock = evidence
        .map((e) => `[source_id: ${e.sourceId}] (${e.sourceCategory})\n${truncate(e.text, 6000)}`)
        .join('\n\n---\n\n')

      const userPrompt = [
        `Business: ${businessContext.businessName}`,
        `Description: ${businessContext.businessDescription}`,
        `Target audience: ${businessContext.targetAudience}`,
        `Email intent: ${INTENT_CONFIG[intent].label} -- ${INTENT_CONFIG[intent].strategicObjective}`,
        '',
        'Evidence gathered from research. Cite ONLY the source_id values shown below -- never invent one:',
        evidenceBlock,
      ].join('\n')

      const completion = await client.chat.completions.create({
        model: MODELS.synthesis,
        messages: [
          {
            role: 'system',
            content:
              'You are a B2B messaging strategist. Extract facts from the given evidence into 2-3 distinct candidate email strategies (Strategy Briefs), each grounded in the evidence provided. Never fabricate facts not present in the evidence.',
          },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'submit_strategy_briefs',
              description: 'Submit 2-3 candidate strategy briefs extracted from the evidence.',
              parameters: jsonSchema as Record<string, unknown>,
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'submit_strategy_briefs' } },
      })

      const toolCall = completion.choices[0]?.message?.tool_calls?.[0]
      if (!toolCall || toolCall.type !== 'function') {
        throw new Error('Model did not call submit_strategy_briefs')
      }
      return JSON.parse(toolCall.function.arguments)
    },
  }
}

// Task 2.1/2.2's core logic, kept pure and OpenRouter-free so it can be unit
// tested against a mocked SynthesisClient (Sprint 2 testing gate).
export async function synthesizeStrategyBriefs(params: {
  intent: UserIntent
  businessContext: BusinessContextInput
  evidence: EvidenceItem[]
  client: SynthesisClient
}): Promise<StrategyBriefsResponse> {
  const schema = strategyBriefsResponseSchema(params.intent)
  const jsonSchema = z.toJSONSchema(schema)

  const raw = await params.client.generateStrategyBriefs({ ...params, jsonSchema })

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    // Thrown, not returned -- pg-boss retries the job on a thrown error
    // (Task 2.3: automatic retries on malformed JSON/schema violations).
    throw new Error(`Synthesis response failed schema validation: ${parsed.error.message}`)
  }

  const knownSourceIds = new Set(params.evidence.map((e) => e.sourceId))
  for (const brief of parsed.data.briefs) {
    for (const insight of brief.core_insights) {
      if (!knownSourceIds.has(insight.source_id)) {
        throw new Error(`Synthesis response cited an unknown source_id: ${insight.source_id}`)
      }
    }
  }

  return parsed.data
}

// Supabase-aware wrapper: the pg-boss job handler for 'synthesize-run'.
// Chained after 'scrape-run' (Task 2.2) -- loads the Run's successful
// scrape evidence, produces 2-3 Strategy Briefs, and hands the Run to
// 'awaiting_approval' for Sprint 3's review UI.
export async function handleSynthesizeRunJob(job: { data: { runId: string } }): Promise<void> {
  const { runId } = job.data
  const supabase = createSupabaseServiceClient()

  const { data: run, error: runError } = await supabase
    .from('runs')
    .select('id, intent, business_context_id')
    .eq('id', runId)
    .single()
  if (runError || !run) throw new Error(`Run ${runId} not found: ${runError?.message}`)

  const { data: context, error: contextError } = await supabase
    .from('business_contexts')
    .select('business_name, business_description, target_audience')
    .eq('id', run.business_context_id)
    .single()
  if (contextError || !context) {
    throw new Error(`Business context for run ${runId} not found: ${contextError?.message}`)
  }

  const { data: attempts, error: attemptsError } = await supabase
    .from('scrape_attempts')
    .select('id, source_category, scraped_text')
    .eq('run_id', runId)
    .eq('status', 'success')
  if (attemptsError) throw attemptsError
  if (!attempts || attempts.length === 0) {
    throw new Error(`Run ${runId} has no successful scrape attempts to synthesize from`)
  }

  const businessContext: BusinessContextInput = {
    businessName: context.business_name,
    businessDescription: context.business_description,
    targetAudience: context.target_audience,
  }

  const evidence: EvidenceItem[] = attempts.map((a) => ({
    sourceId: a.id,
    sourceCategory: a.source_category,
    text: a.scraped_text ?? '',
  }))

  const client = createOpenRouterSynthesisClient()
  const response = await synthesizeStrategyBriefs({
    intent: run.intent as UserIntent,
    businessContext,
    evidence,
    client,
  })

  // Idempotent on retry, same reasoning as scrape_attempts (CONTEXT.md).
  await supabase.from('strategy_briefs').delete().eq('run_id', runId)

  await supabase.from('strategy_briefs').insert(
    response.briefs.map((b) => ({
      run_id: runId,
      headline: b.headline,
      core_insights: b.core_insights,
      selected: false,
    }))
  )

  await supabase
    .from('runs')
    .update({ status: 'awaiting_approval', updated_at: new Date().toISOString() })
    .eq('id', runId)
}
