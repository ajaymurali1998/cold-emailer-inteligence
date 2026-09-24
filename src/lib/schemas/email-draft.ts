import { z } from 'zod'

// Phase 3's output contract (Task 3.3): single subject + single body.
// Multi-variant subject-line A/B is explicitly out of MVP scope (CONTEXT.md).
export const emailDraftSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
})

export type EmailDraft = z.infer<typeof emailDraftSchema>
