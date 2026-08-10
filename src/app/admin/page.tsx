import { Suspense } from 'react'
import { connection } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import { dealerGroupList } from '@/lib/car-groups'
import {
  getAdminAnalyticsOverview,
  normalizeAdminAnalyticsGroup,
  normalizeAdminAnalyticsPeriod,
  normalizeAdminAnalyticsSort,
  normalizeAdminAnalyticsSortDirection,
} from '@/lib/admin-data'
import { AdminAnalyticsView } from './admin-client'
import { AdminShell } from './admin-shell'

interface AdminPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
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
  await connection()

  const resolvedSearchParams = await searchParams
  const group = normalizeAdminAnalyticsGroup(
    getSearchParam(resolvedSearchParams, 'group')
  )
  const periodDays = normalizeAdminAnalyticsPeriod(
    getSearchParam(resolvedSearchParams, 'period')
  )
  const sort = normalizeAdminAnalyticsSort(
    getSearchParam(resolvedSearchParams, 'sort')
  )
  const direction = normalizeAdminAnalyticsSortDirection(
    getSearchParam(resolvedSearchParams, 'direction')
  )

  const [adminUser, analyticsOverview] = await Promise.all([
    requireAdminUser(),
    getAdminAnalyticsOverview({
      group,
      periodDays,
      sort,
      direction,
    }),
  ])
  const carGroups = dealerGroupList.map((group) => ({
    slug: group.slug,
    name: group.name,
  }))

  return (
    <AdminShell activeSection="analytics" userEmail={adminUser.email}>
      <AdminAnalyticsView
        analyticsOverview={analyticsOverview}
        carGroups={carGroups}
      />
    </AdminShell>
  )
}

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | undefined {
  const value = searchParams?.[key]

  return typeof value === 'string' ? value : undefined
}
