import Link from 'next/link'
import { Suspense } from 'react'
import { requireAdminUser } from '@/lib/admin-auth'
import { carGroupList, getCarGroupLabel } from '@/lib/car-groups'
import { getAdminDealers } from '@/lib/admin-data'
import {
  createDealer,
  createDealerUser,
  logoutAdmin,
  updateDealerGroup,
} from './actions'

interface AdminPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const ERROR_MESSAGES: Record<string, string> = {
  dealer: 'Kunne ikke lagre firma.',
  membership: 'Brukeren ble opprettet, men kunne ikke kobles til firma.',
  missing: 'Alle feltene må fylles ut.',
  password: 'Passord må være minst 8 tegn.',
  'user-exists': 'E-postadressen finnes allerede i Supabase Auth.',
}

export default function AdminPage({ searchParams }: AdminPageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminDashboard searchParams={searchParams} />
    </Suspense>
  )
}

function AdminLoading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-gray-500">
        Laster …
      </div>
    </main>
  )
}

async function AdminDashboard({ searchParams }: AdminPageProps) {
  const adminUser = await requireAdminUser()
  const [dealers, resolvedSearchParams] = await Promise.all([
    getAdminDealers(),
    searchParams,
  ])
  const error = getSearchParam(resolvedSearchParams, 'error')
  const dealerCreated =
    getSearchParam(resolvedSearchParams, 'dealerCreated') === '1'
  const userCreated =
    getSearchParam(resolvedSearchParams, 'userCreated') === '1'
  const groupUpdated =
    getSearchParam(resolvedSearchParams, 'groupUpdated') === '1'

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
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
            <p className="mt-1 text-sm text-gray-500">
              {adminUser.email}
            </p>
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
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[22rem_1fr]">
        <div className="flex flex-col gap-6">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-950">
              Ny forhandler
            </h2>

            <form action={createDealer} className="mt-5 flex flex-col gap-4">
              {dealerCreated && (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Forhandleren ble lagret.
                </p>
              )}
              {groupUpdated && (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Gruppen ble oppdatert.
                </p>
              )}
              {error && ERROR_MESSAGES[error] && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {ERROR_MESSAGES[error]}
                </p>
              )}

              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
                Firma
                <input
                  name="dealerName"
                  required
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
                FINN orgId
                <input
                  name="orgId"
                  inputMode="numeric"
                  required
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
                Gruppe
                <select
                  name="groupSlug"
                  defaultValue="bilbyen"
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  {carGroupList.map((group) => (
                    <option key={group.slug} value={group.slug}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
              >
                Lagre forhandler
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-950">
              Ny forhandlerbruker
            </h2>

            <form action={createDealerUser} className="mt-5 flex flex-col gap-4">
              {userCreated && (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Brukeren ble opprettet.
                </p>
              )}

              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
                Forhandler
                <select
                  name="dealerId"
                  required
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value="">Velg forhandler</option>
                  {dealers.map((dealer) => (
                    <option key={dealer.id} value={dealer.id}>
                      {dealer.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
                E-post
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
                Midlertidig passord
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
                Rolle
                <select
                  name="role"
                  defaultValue="viewer"
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value="viewer">Viewer</option>
                  <option value="owner">Owner</option>
                </select>
              </label>

              <button
                type="submit"
                className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
              >
                Opprett bruker
              </button>
            </form>
          </section>
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-950">
              Forhandlere
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Firma</th>
                  <th className="px-5 py-3">OrgId</th>
                  <th className="px-5 py-3">Gruppe</th>
                  <th className="px-5 py-3">Brukere</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {dealers.map((dealer) => (
                  <tr key={dealer.id}>
                    <td className="px-5 py-4 align-top">
                      <p className="font-medium text-gray-950">
                        {dealer.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {dealer.slug}
                      </p>
                    </td>
                    <td className="px-5 py-4 align-top font-mono text-xs text-gray-700">
                      {dealer.orgId}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <form
                        action={updateDealerGroup}
                        className="flex min-w-52 items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="dealerId"
                          value={dealer.id}
                        />
                        <select
                          name="groupSlug"
                          defaultValue={dealer.groupSlug}
                          aria-label={`Gruppe for ${dealer.name}`}
                          className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        >
                          {carGroupList.map((group) => (
                            <option key={group.slug} value={group.slug}>
                              {getCarGroupLabel(group.slug)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
                        >
                          Lagre
                        </button>
                      </form>
                    </td>
                    <td className="px-5 py-4 align-top">
                      {dealer.users.length === 0 ? (
                        <span className="text-gray-500">0 brukere</span>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <span className="font-medium text-gray-950">
                            {dealer.users.length} bruker
                            {dealer.users.length === 1 ? '' : 'e'}
                          </span>
                          <div className="flex flex-col gap-1">
                            {dealer.users.map((user) => (
                              <div
                                key={user.userId}
                                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-600"
                              >
                                <span>{user.email}</span>
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                  {user.role}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | undefined {
  const value = searchParams?.[key]

  return typeof value === 'string' ? value : undefined
}
