'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, Plus } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/runs', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contexts', label: 'Business Contexts', icon: Building2 },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-5 py-5">
          <span className="text-lg font-semibold text-text">Email Intelligence</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  active
                    ? 'bg-indigo-50 text-primary'
                    : 'text-text-secondary hover:bg-slate-50'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end border-b border-border bg-card px-6 py-3">
          <Link
            href="/runs/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            <Plus size={16} />
            Start New Run
          </Link>
        </header>
        <main className="flex flex-1 flex-col bg-background">{children}</main>
      </div>
    </div>
  )
}
