import Link from 'next/link'
import { Suspense } from 'react'
import { requireAdminUser } from '@/lib/admin-auth'
import { carGroupList, getCarGroupLabel } from '@/lib/car-groups'
import { getAdminDealers, type AdminDealer } from '@/lib/admin-data'
import {
  createDealer,
  createDealerUser,
  deleteDealerUser,
  logoutAdmin,
  updateDealerGroup,
  updateDealerUser,
} from './actions'

interface AdminPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const ERROR_MESSAGES: Record<string, string> = {
  dealer: 'Kunne ikke lagre firma.',
  membership: 'Brukeren ble opprettet, men kunne ikke kobles til firma.',
  missing: 'Alle feltene må fylles ut.',
  password: 'Passord må være minst 8 tegn.',
  user: 'Kunne ikke lagre brukeren.',
  'self-delete': 'Du kan ikke slette din egen adminbruker.',
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
        Laster ...
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
  const message = getAdminMessage(resolvedSearchParams)

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

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        {message && <AdminMessage message={message} />}

        <section className="grid gap-6 lg:grid-cols-2">
          <CreateDealerCard />
          <CreateUserCard dealers={dealers} />
        </section>

        <DealersSection dealers={dealers} />
      </div>
    </main>
  )
}

function AdminMessage({
  message,
}: {
  message: { tone: 'success' | 'error'; text: string }
}) {
  const className =
    message.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <p className={`rounded-md border px-4 py-3 text-sm ${className}`}>
      {message.text}
    </p>
  )
}

function CreateDealerCard() {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-gray-950">
          Ny forhandler
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Legg inn FINN orgId og velg hvilken offentlig gruppe forhandleren
          skal vises i.
        </p>
      </div>

      <form action={createDealer} className="mt-5 grid gap-4 sm:grid-cols-2">
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

        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800 sm:col-span-2">
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

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
          >
            Lagre forhandler
          </button>
        </div>
      </form>
    </section>
  )
}

function CreateUserCard({ dealers }: { dealers: AdminDealer[] }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-gray-950">
          Ny bruker
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Opprett én innlogging og koble brukeren til én forhandler.
        </p>
      </div>

      <form action={createDealerUser} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800 sm:col-span-2">
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

        <div className="self-end">
          <button
            type="submit"
            className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
          >
            Opprett bruker
          </button>
        </div>
      </form>
    </section>
  )
}

function DealersSection({ dealers }: { dealers: AdminDealer[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-950">
            Forhandlere
          </h2>
          <p className="text-sm text-gray-500">
            Åpne en forhandler for å redigere gruppe og brukertilganger.
          </p>
        </div>
        <span className="text-sm font-medium text-gray-500">
          {dealers.length} forhandler{dealers.length === 1 ? '' : 'e'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[48rem]">
          <div className="grid grid-cols-[minmax(14rem,1.4fr)_9rem_minmax(12rem,1fr)_6rem] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span>Firma</span>
            <span>OrgId</span>
            <span>Gruppe</span>
            <span className="text-right">Brukere</span>
          </div>
          <div className="divide-y divide-gray-100">
            {dealers.map((dealer) => (
              <DealerRow key={dealer.id} dealer={dealer} dealers={dealers} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function DealerRow({
  dealer,
  dealers,
}: {
  dealer: AdminDealer
  dealers: AdminDealer[]
}) {
  return (
    <details className="group">
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(14rem,1.4fr)_9rem_minmax(12rem,1fr)_6rem] items-center gap-4 px-5 py-4 text-sm transition hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-3">
          <ChevronIcon />
          <div>
            <p className="font-medium text-gray-950">{dealer.name}</p>
            <p className="mt-1 text-xs text-gray-500">{dealer.slug}</p>
          </div>
        </div>
        <span className="font-mono text-xs text-gray-700">
          {dealer.orgId}
        </span>
        <span className="text-gray-700">
          {getCarGroupLabel(dealer.groupSlug)}
        </span>
        <span className="text-right text-gray-700">
          {dealer.users.length}
        </span>
      </summary>

      <div className="border-t border-gray-100 bg-gray-50 px-5 py-5">
        <div className="grid gap-5 xl:grid-cols-[20rem_1fr]">
          <section>
            <h3 className="text-sm font-semibold text-gray-950">
              Forhandleroppsett
            </h3>
            <form
              action={updateDealerGroup}
              className="mt-3 flex flex-col gap-3 rounded-md border border-gray-200 bg-white p-4"
            >
              <input type="hidden" name="dealerId" value={dealer.id} />
              <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
                Gruppe
                <select
                  name="groupSlug"
                  defaultValue={dealer.groupSlug}
                  aria-label={`Gruppe for ${dealer.name}`}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  {carGroupList.map((group) => (
                    <option key={group.slug} value={group.slug}>
                      {getCarGroupLabel(group.slug)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="self-start rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
              >
                Lagre gruppe
              </button>
            </form>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-950">
                Tilknyttede brukere
              </h3>
              <span className="text-xs font-medium text-gray-500">
                {dealer.users.length} bruker
                {dealer.users.length === 1 ? '' : 'e'}
              </span>
            </div>

            {dealer.users.length === 0 ? (
              <div className="mt-3 rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                Ingen brukere er koblet til denne forhandleren.
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {dealer.users.map((user) => (
                  <UserEditor
                    key={user.userId}
                    dealers={dealers}
                    user={user}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </details>
  )
}

function UserEditor({
  dealers,
  user,
}: {
  dealers: AdminDealer[]
  user: AdminDealer['users'][number]
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <form
        id={`update-user-${user.userId}`}
        action={updateDealerUser}
        className="grid gap-3 lg:grid-cols-[minmax(13rem,1.2fr)_minmax(12rem,1fr)_8rem_minmax(9rem,0.8fr)_auto]"
      >
        <input type="hidden" name="userId" value={user.userId} />

        <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
          E-post
          <input
            name="email"
            type="email"
            defaultValue={user.email}
            required
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
          Forhandler
          <select
            name="dealerId"
            defaultValue={user.dealerId}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            {dealers.map((dealer) => (
              <option key={dealer.id} value={dealer.id}>
                {dealer.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
          Rolle
          <select
            name="role"
            defaultValue={user.role}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            <option value="viewer">Viewer</option>
            <option value="owner">Owner</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-gray-600">
          Nytt passord
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            placeholder="Uendret"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <div className="flex gap-2 lg:self-end lg:justify-end">
          <button
            type="submit"
            className="rounded-md bg-gray-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
          >
            Lagre
          </button>
        </div>
      </form>

      <form action={deleteDealerUser} className="mt-2">
        <input type="hidden" name="userId" value={user.userId} />
        <button
          type="submit"
          className="text-xs font-semibold text-red-700 hover:text-red-900 hover:underline"
        >
          Slett bruker
        </button>
      </form>
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function getAdminMessage(
  searchParams: Record<string, string | string[] | undefined> | undefined
): { tone: 'success' | 'error'; text: string } | null {
  const error = getSearchParam(searchParams, 'error')

  if (error && ERROR_MESSAGES[error]) {
    return { tone: 'error', text: ERROR_MESSAGES[error] }
  }

  if (getSearchParam(searchParams, 'dealerCreated') === '1') {
    return { tone: 'success', text: 'Forhandleren ble lagret.' }
  }

  if (getSearchParam(searchParams, 'groupUpdated') === '1') {
    return { tone: 'success', text: 'Gruppen ble oppdatert.' }
  }

  if (getSearchParam(searchParams, 'userCreated') === '1') {
    return { tone: 'success', text: 'Brukeren ble opprettet.' }
  }

  if (getSearchParam(searchParams, 'userUpdated') === '1') {
    return { tone: 'success', text: 'Brukeren ble oppdatert.' }
  }

  if (getSearchParam(searchParams, 'userDeleted') === '1') {
    return { tone: 'success', text: 'Brukeren ble slettet.' }
  }

  return null
}

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | undefined {
  const value = searchParams?.[key]

  return typeof value === 'string' ? value : undefined
}
