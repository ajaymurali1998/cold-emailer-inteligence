import type { HTMLAttributes } from 'react'

export type BadgeTone = 'success' | 'warning' | 'critical' | 'neutral' | 'primary'

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-success-bg text-success-text border-success-border',
  warning: 'bg-warning-bg text-warning-text border-warning-border',
  critical: 'bg-critical-bg text-critical-text border-critical-border',
  neutral: 'bg-slate-100 text-text-secondary border-border',
  primary: 'bg-indigo-50 text-primary border-indigo-200',
}

export function Badge({
  tone = 'neutral',
  className = '',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    />
  )
}
