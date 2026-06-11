import Link from 'next/link'
import type { ReactNode } from 'react'
import { logoutAdmin } from './actions'

type AdminSection = 'analytics' | 'users'

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
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                href="/"
                className="text-sm font-medium text-sky-700 hover:text-sky-900 hover:underline"
              >
                Til forsiden
              </Link>
              <h1 className="mt-2 text-2xl font-bold text-gray-950">
                Admin
              </h1>
              {userEmail && (
                <p className="mt-1 text-sm text-gray-500">
                  {userEmail}
                </p>
              )}
            </div>

            <form action={logoutAdmin}>
              <button
                type="submit"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
              >
                Logg ut
              </button>
            </form>
          </div>

          <nav
            aria-label="Adminseksjoner"
            className="flex flex-wrap gap-2 text-sm font-semibold"
          >
            <AdminNavLink
              href="/admin"
              isActive={activeSection === 'analytics'}
            >
              Statistikk
            </AdminNavLink>
            <AdminNavLink
              href="/admin/brukere"
              isActive={activeSection === 'users'}
            >
              Brukere
            </AdminNavLink>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        {children}
      </div>
    </main>
  )
}

function AdminNavLink({
  children,
  href,
  isActive,
}: {
  children: ReactNode
  href: string
  isActive: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={
        isActive
          ? 'rounded-md bg-gray-950 px-3 py-2 text-white'
          : 'rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-700 transition hover:bg-gray-50 hover:text-gray-950'
      }
    >
      {children}
    </Link>
  )
}
