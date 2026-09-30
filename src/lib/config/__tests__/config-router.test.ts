import { describe, expect, it } from 'vitest'
import { getSourceCategoriesForIntent } from '@/lib/config/config-router'

describe('getSourceCategoriesForIntent', () => {
  it('returns the correct source categories for every intent', () => {
    expect(getSourceCategoriesForIntent('lead_generation')).toEqual([
      'Competitor landing pages',
      'G2 reviews',
      'Forums',
    ])
    expect(getSourceCategoriesForIntent('negotiation')).toEqual([
      'Pricing pages',
      'Feature matrices',
      'SLA terms',
    ])
    expect(getSourceCategoriesForIntent('competitor_displacement')).toEqual([
      'Competitor release notes',
      'Negative review clusters',
    ])
    expect(getSourceCategoriesForIntent('closing_deals')).toEqual([
      'Case studies',
      'ROI calculators',
      'Regulatory news',
    ])
    expect(getSourceCategoriesForIntent('lead_nurturing')).toEqual([
      'Educational blogs',
      'LinkedIn posts',
      'Trend reports',
    ])
  })
})
