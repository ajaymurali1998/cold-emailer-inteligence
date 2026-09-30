import { type ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'destructive'

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover active:bg-primary-active disabled:opacity-50',
  secondary:
    'bg-card text-text border border-border hover:bg-slate-50 hover:border-divider disabled:opacity-50',
  destructive:
    'bg-critical-bg text-critical-text border border-critical-border hover:bg-red-100 disabled:opacity-50',
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ variant = 'primary', className = '', ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`inline-flex h-9 items-center justify-center rounded-md px-3.5 text-sm font-medium transition-colors ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
})
