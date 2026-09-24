// Single source of truth for the 5 User Intents: their DB enum value,
// display label, Phase 1 source categories (Config_Router, Task 1.2), and
// Phase 2 insight_label enum (dynamic Zod schema compiler, Task 2.1).
// See CONTEXT.md for the glossary these map to.

export const USER_INTENTS = [
  'lead_generation',
  'negotiation',
  'competitor_displacement',
  'closing_deals',
  'lead_nurturing',
] as const

export type UserIntent = (typeof USER_INTENTS)[number]

export const INTENT_CONFIG: Record<
  UserIntent,
  {
    label: string
    strategicObjective: string
    sourceCategories: readonly string[]
    insightLabels: readonly [string, string, string, string, string]
  }
> = {
  lead_generation: {
    label: 'Lead Generation',
    strategicObjective: 'Highlight unmet needs and prove credibility.',
    sourceCategories: ['Competitor landing pages', 'G2 reviews', 'Forums'],
    insightLabels: [
      'Customer Pain',
      'Competitor Gap',
      'Proof & ROI',
      'Status Quo Flaw',
      'Unmet Need',
    ],
  },
  negotiation: {
    label: 'Negotiation',
    strategicObjective: 'Defend price and navigate commercial pushback.',
    sourceCategories: ['Pricing pages', 'Feature matrices', 'SLA terms'],
    insightLabels: [
      'Offer & Pricing',
      'Objection Handling',
      'Trade Variable',
      'Value Justification',
      'Alternative Cost',
    ],
  },
  competitor_displacement: {
    label: 'Competitor Displacement',
    strategicObjective: 'Convince active users of a rival tool to migrate.',
    sourceCategories: ['Competitor release notes', 'Negative review clusters'],
    insightLabels: [
      'Competitor Weakness',
      'Positioning Advantage',
      'Migration Proof',
      'Feature Differentiator',
      'Switching Catalyst',
    ],
  },
  closing_deals: {
    label: 'Closing Deals',
    strategicObjective: 'Force a decision and overcome final hesitation.',
    sourceCategories: ['Case studies', 'ROI calculators', 'Regulatory news'],
    insightLabels: [
      'Final Objection',
      'Risk Reversal',
      'Urgency Trigger',
      'Implementation Timeline',
      'Cost of Inaction',
    ],
  },
  lead_nurturing: {
    label: 'Lead Nurturing',
    strategicObjective: 'Keep warm leads engaged until ready to buy.',
    sourceCategories: ['Educational blogs', 'LinkedIn posts', 'Trend reports'],
    insightLabels: [
      'Educational Insight',
      'Customer Goal',
      'Product Capability',
      'Industry Trend',
      'Success Benchmark',
    ],
  },
}
