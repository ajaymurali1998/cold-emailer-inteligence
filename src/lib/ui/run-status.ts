import type { BadgeTone } from '@/components/ui/Badge'

export function getRunStatusDisplay(status: string): { label: string; tone: BadgeTone } {
  switch (status) {
    case 'complete':
      return { label: 'Complete', tone: 'success' }
    case 'failed':
      return { label: 'Failed', tone: 'critical' }
    case 'pending':
      return { label: 'Pending', tone: 'neutral' }
    case 'scraping':
      return { label: 'Gathering', tone: 'primary' }
    case 'synthesizing':
      return { label: 'Synthesizing', tone: 'primary' }
    case 'awaiting_approval':
      return { label: 'Awaiting approval', tone: 'warning' }
    case 'generating':
      return { label: 'Generating', tone: 'primary' }
    default:
      return { label: status, tone: 'neutral' }
  }
}
