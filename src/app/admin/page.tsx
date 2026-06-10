import Link from 'next/link'
import { Suspense } from 'react'
import { requireAdminUser } from '@/lib/admin-auth'
import { carGroupList } from '@/lib/car-groups'
import { getAdminDealers } from '@/lib/admin-data'
import { AdminControls } from './admin-client'
import { logoutAdmin } from './actions'

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminDashboard />
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

async function AdminDashboard() {
  const [adminUser, dealers] = await Promise.all([
    requireAdminUser(),
    getAdminDealers(),
  ])
  const carGroups = carGroupList.map((group) => ({
    slug: group.slug,
    name: group.name,
  }))

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
        <AdminControls carGroups={carGroups} dealers={dealers} />
      </div>
    </main>
  )
}
