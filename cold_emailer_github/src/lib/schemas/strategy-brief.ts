import { z } from 'zod'
import { INTENT_CONFIG, type UserIntent } from '@/lib/config/intents'

// One extracted fact, classified by an intent-specific insight_label.
// The label enum is injected per-intent (Task 2.1's dynamic compiler),
// since the valid set is not global -- see CONTEXT.md's insight_label entry.
function coreInsightSchema(intent: UserIntent) {
  const [a, b, c, d, e] = INTENT_CONFIG[intent].insightLabels
  return z.object({
    insight_label: z.enum([a, b, c, d, e]),
    fact: z.string().min(1),
    source_id: z.string().uuid(),
  })
}

// A single proposed angle for the email (CONTEXT.md: Strategy Brief).
function strategyBriefSchema(intent: UserIntent) {
  return z.object({
    intent: z.literal(intent),
    headline: z.string().min(1),
    core_insights: z.array(coreInsightSchema(intent)).min(1),
  })
}

// Phase 2's output contract: 2-3 Strategy Briefs, all Zod-constrained to
// the same intent's enum. Rejects a rogue intent label at the type level --
// the Sprint 2 testing gate exercises exactly this failure path.
export function strategyBriefsResponseSchema(intent: UserIntent) {
  return z.object({
    briefs: z.array(strategyBriefSchema(intent)).min(2).max(3),
  })
}

export type CoreInsight = z.infer<ReturnType<typeof coreInsightSchema>>
export type StrategyBrief = z.infer<ReturnType<typeof strategyBriefSchema>>
export type StrategyBriefsResponse = z.infer<
  ReturnType<typeof strategyBriefsResponseSchema>
>
