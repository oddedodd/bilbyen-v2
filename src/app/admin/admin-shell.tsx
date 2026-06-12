import Link from 'next/link'
import type { ReactNode } from 'react'
import { logoutAdmin } from './actions'

export type AdminSection =
  | 'analytics'
  | 'dealers'
  | 'ads'
  | 'settings'

const navItems: {
  href: string
  label: string
  section: AdminSection
}[] = [
  { href: '/admin', label: 'Statistikk', section: 'analytics' },
  { href: '/admin/forhandlere', label: 'Forhandlere', section: 'dealers' },
  { href: '/admin/annonser', label: 'Annonser', section: 'ads' },
  { href: '/admin/innstillinger', label: 'Innstillinger', section: 'settings' },
]

export function AdminShell({
  activeSection,
  children,
  userEmail,
}: {
  activeSection: AdminSection
  children: ReactNode
  userEmail?: string
}) {
  return (
    <main className="min-h-screen bg-[#e8eef4] px-3 py-4 text-[#102a43] sm:px-5 lg:px-8">
      <div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1500px] overflow-hidden rounded-xl bg-[#f8fafc] shadow-sm ring-1 ring-slate-200">
        <header>
          <div className="bg-[#0d2d49] px-6 py-4 text-white lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/admin" className="flex items-center gap-3">
                <span className="font-serif text-xl font-bold leading-none text-white">
                  Bilbyen
                </span>
                <span className="rounded border border-sky-200/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.24em] text-sky-100">
                  Admin
                </span>
              </Link>

              <div className="flex flex-wrap items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#1f5d82] text-xs font-bold text-white ring-1 ring-sky-200/20">
                  {getInitials(userEmail)}
                </div>
                {userEmail && (
                  <p className="max-w-[14rem] truncate text-sm text-sky-100">
                    {userEmail}
                  </p>
                )}
                <form action={logoutAdmin}>
                  <button
                    type="submit"
                    className="rounded-md border border-white/25 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    Logg ut
                  </button>
                </form>
              </div>
            </div>
          </div>

          <nav
            aria-label="Adminseksjoner"
            className="flex gap-7 overflow-x-auto border-b border-slate-200 bg-white px-6 text-sm font-bold lg:px-8"
          >
            {navItems.map((item) => {
              const isActive = activeSection === item.section

              return (
                <Link
                  key={item.section}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={
                    isActive
                      ? 'border-b-2 border-[#0d2d49] py-4 text-[#0d2d49]'
                      : 'border-b-2 border-transparent py-4 text-slate-500 transition hover:text-[#0d2d49]'
                  }
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </header>

        <div className="min-w-0">{children}</div>
      </div>
    </main>
  )
}

function getInitials(email?: string): string {
  if (!email) {
    return 'AD'
  }

  return email.slice(0, 2).toUpperCase()
}
