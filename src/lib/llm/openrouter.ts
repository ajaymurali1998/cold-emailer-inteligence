import OpenAI from 'openai'

// Both Phase 2 (Claude Sonnet 4.6) and Phase 3 (GPT-5.6 Luna) route through
// OpenRouter -- one client/billing surface, see CONTEXT.md. OpenRouter is
// OpenAI-compatible, so the `openai` SDK works unchanged against it.
export const MODELS = {
  synthesis: 'anthropic/claude-sonnet-4.6',
  emailGeneration: 'openai/gpt-5.6-luna',
} as const

export function createOpenRouterClient(apiKey?: string): OpenAI {
  const key = apiKey ?? process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('Missing required env var: OPENROUTER_API_KEY')

  return new OpenAI({ apiKey: key, baseURL: 'https://openrouter.ai/api/v1' })
}
