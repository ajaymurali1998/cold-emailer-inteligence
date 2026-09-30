import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card-elevation-1 rounded-lg ${className}`} {...props} />
}
