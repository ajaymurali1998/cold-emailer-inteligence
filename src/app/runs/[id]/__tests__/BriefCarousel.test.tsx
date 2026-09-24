// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach } from 'vitest'
import { BriefCarousel } from '@/app/runs/[id]/BriefCarousel'
import { EmailDraftView } from '@/app/runs/[id]/EmailDraftView'
import { USER_INTENTS, INTENT_CONFIG } from '@/lib/config/intents'
import type { StrategyBriefSnapshot } from '@/lib/runs/get-run-snapshot'

afterEach(cleanup)

describe('BriefCarousel', () => {
  it.each(USER_INTENTS)('renders correctly for %s without type errors', (intent) => {
    const labels = INTENT_CONFIG[intent].insightLabels

    const brief: StrategyBriefSnapshot = {
      id: 'brief-1',
      headline: `Test headline for ${intent}`,
      coreInsights: labels.map((label, i) => ({
        insight_label: label,
        fact: `Fact ${i} for ${label}`,
        source_id: `123e4567-e89b-12d3-a456-42661417400${i}`,
      })),
      selected: false,
      editedHeadline: null,
      editedCoreInsights: null,
    }

    render(<BriefCarousel runId="run-1" briefs={[brief]} onApproved={() => {}} />)

    // Two matches by design: the visible editable input and the hidden
    // form field that carries the same value to the server action.
    expect(screen.getAllByDisplayValue(brief.headline).length).toBeGreaterThan(0)
    for (const label of labels) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
  })
})

describe('EmailDraftView', () => {
  it('renders the final email draft read-only', () => {
    const brief: StrategyBriefSnapshot = {
      id: 'brief-1',
      headline: 'Headline',
      coreInsights: [],
      selected: true,
      editedHeadline: null,
      editedCoreInsights: null,
    }

    render(
      <EmailDraftView
        briefs={[brief]}
        emailDraft={{ subject: 'Subject line', body: 'Body text' }}
      />
    )

    expect(screen.getByText('Subject line')).toBeTruthy()
    expect(screen.getByText('Body text')).toBeTruthy()
  })
})
