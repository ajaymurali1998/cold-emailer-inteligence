import { emailDraftSchema } from '@/lib/schemas/email-draft'
import { INTENT_CONFIG, type UserIntent } from '@/lib/config/intents'
import { createOpenRouterClient, MODELS } from '@/lib/llm/openrouter'
import type { CoreInsight } from '@/lib/schemas/strategy-brief'
import type { BusinessContextInput } from '@/lib/jobs/scrape-run'

export interface ApprovedStrategy {
  headline: string
  coreInsights: CoreInsight[]
}

// Task 3.4: a small set of well-known error codes instead of a generic
// failure, so the UI can show something actionable and offer a targeted
// retry rather than a dead end.
export type EmailGenerationErrorCode = 'invalid_strategy' | 'provider_timeout' | 'provider_error'

export type EmailGenerationResult =
  | { ok: true; subject: string; body: string }
  | { ok: false; code: EmailGenerationErrorCode; message: string }

export interface EmailGenerationClient {
  generateEmail(params: {
    intent: UserIntent
    businessContext: BusinessContextInput
    strategy: ApprovedStrategy
  }): Promise<unknown>
}

function validateStrategy(strategy: ApprovedStrategy): string | null {
  if (!strategy.headline.trim()) return 'Strategy headline is empty.'
  if (strategy.coreInsights.length === 0) return 'Strategy has no supporting facts.'
  if (strategy.coreInsights.some((i) => !i.fact.trim())) return 'One or more facts are empty.'
  return null
}

// Task 3.3's core logic, kept pure and OpenRouter-free so it's testable
// against a mocked EmailGenerationClient (Sprint 3 testing gate).
export async function generateEmailDraft(params: {
  intent: UserIntent
  businessContext: BusinessContextInput
  strategy: ApprovedStrategy
  client: EmailGenerationClient
}): Promise<EmailGenerationResult> {
  const validationError = validateStrategy(params.strategy)
  if (validationError) {
    return { ok: false, code: 'invalid_strategy', message: validationError }
  }

  let raw: unknown
  try {
    raw = await params.client.generateEmail(params)
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return {
        ok: false,
        code: 'provider_timeout',
        message: 'The email generation request timed out. Try again.',
      }
    }
    return {
      ok: false,
      code: 'provider_error',
      message: err instanceof Error ? err.message : String(err),
    }
  }

  const parsed = emailDraftSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      code: 'provider_error',
      message: `Model returned an invalid draft: ${parsed.error.message}`,
    }
  }

  return { ok: true, subject: parsed.data.subject, body: parsed.data.body }
}

const GENERATION_TIMEOUT_MS = 30_000

export function createOpenRouterEmailClient(): EmailGenerationClient {
  const client = createOpenRouterClient()

  return {
    async generateEmail({ intent, businessContext, strategy }) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS)

      const factsBlock = strategy.coreInsights
        .map((i) => `- [${i.insight_label}] ${i.fact}`)
        .join('\n')

      const userPrompt = [
        `Business: ${businessContext.businessName}`,
        `Description: ${businessContext.businessDescription}`,
        `Target audience: ${businessContext.targetAudience}`,
        `Email intent: ${INTENT_CONFIG[intent].label} -- ${INTENT_CONFIG[intent].strategicObjective}`,
        '',
        `Approved strategy headline: ${strategy.headline}`,
        'Supporting facts to draw on:',
        factsBlock,
      ].join('\n')

      try {
        const completion = await client.chat.completions.create(
          {
            model: MODELS.emailGeneration,
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert B2B cold email copywriter. Write a single email (one subject line, one body) that executes the given approved strategy. Do not invent facts beyond what is provided.',
              },
              { role: 'user', content: userPrompt },
            ],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'submit_email_draft',
                  description: 'Submit the final email draft.',
                  parameters: { type: 'object', properties: { subject: { type: 'string' }, body: { type: 'string' } }, required: ['subject', 'body'], additionalProperties: false },
                },
              },
            ],
            tool_choice: { type: 'function', function: { name: 'submit_email_draft' } },
          },
          { signal: controller.signal }
        )

        const toolCall = completion.choices[0]?.message?.tool_calls?.[0]
        if (!toolCall || toolCall.type !== 'function') {
          throw new Error('Model did not call submit_email_draft')
        }
        return JSON.parse(toolCall.function.arguments)
      } catch (err) {
        if (controller.signal.aborted) {
          const timeoutError = new Error('Timed out waiting for email generation')
          timeoutError.name = 'TimeoutError'
          throw timeoutError
        }
        throw err
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}
