import { INTENT_CONFIG, type UserIntent } from '@/lib/config/intents'

// Task 1.2: Deterministic Router. Pure lookup, no LLM involved -- maps an
// intent to the source *categories* Phase 1 should scrape. Resolving a
// category into an actual URL is ScrapeGraphAI's job (Task 1.3), not this
// router's -- see CONTEXT.md / ADR 0002.
export function getSourceCategoriesForIntent(intent: UserIntent): readonly string[] {
  return INTENT_CONFIG[intent].sourceCategories
}
