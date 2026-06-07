import Link from 'next/link'
import { requireDealerUser } from '@/lib/dealer-auth'
import {
  getDealerDashboardStats,
  type AdStats,
  type DailyStats,
} from '@/lib/dealer-dashboard-data'
import { logoutDealer } from './actions'

interface DealerDashboardPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function DealerDashboardPage({
  searchParams,
}: DealerDashboardPageProps) {
  const user = await requireDealerUser()
  const resolvedSearchParams = await searchParams
  const dealerId = getSearchParam(resolvedSearchParams, 'dealer')
  const stats = await getDealerDashboardStats(dealerId)

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
              Forhandlerdashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {user.email}
            </p>
          </div>

          <form action={logoutDealer}>
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
        {!stats.selectedDealer ? (
          <NoAccessState />
        ) : (
          <>
            <section className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Siste 30 dager
                </p>
                <h2 className="mt-1 text-xl font-bold text-gray-950">
                  {stats.selectedDealer.name}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  FINN orgId {stats.selectedDealer.orgId}
                </p>
              </div>

              {stats.dealers.length > 1 && (
                <form>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
                    Forhandler
                    <select
                      name="dealer"
                      defaultValue={stats.selectedDealer.id}
                      className="min-w-56 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    >
                      {stats.dealers.map((dealer) => (
                        <option key={dealer.id} value={dealer.id}>
                          {dealer.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="mt-2 rounded-md bg-gray-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
                  >
                    Vis
                  </button>
                </form>
              )}
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Karusellvisninger"
                value={formatNumber(stats.totals.impressions)}
              />
              <MetricCard
                label="Annonseklikk"
                value={formatNumber(stats.totals.clicks)}
              />
              <MetricCard
                label="Klikkrate"
                value={formatPercent(stats.totals.clickRate)}
              />
              <MetricCard
                label="Annonser med statistikk"
                value={formatNumber(stats.totals.activeAds)}
              />
            </section>

            {stats.totals.impressions === 0 && stats.totals.clicks === 0 ? (
              <EmptyStatsState />
            ) : (
              <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
                <DailyStatsTable dailyStats={stats.dailyStats} />
                <AdStatsTable adStats={stats.adStats} />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-950">{value}</p>
    </div>
  )
}

function DailyStatsTable({ dailyStats }: { dailyStats: DailyStats[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-base font-semibold text-gray-950">
          Daglig trend
        </h2>
      </div>
      <div className="max-h-[34rem] overflow-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3">Dato</th>
              <th className="px-5 py-3 text-right">Visninger</th>
              <th className="px-5 py-3 text-right">Klikk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {dailyStats.map((day) => (
              <tr key={day.date}>
                <td className="px-5 py-3 text-gray-700">
                  {formatDate(day.date)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-gray-950">
                  {formatNumber(day.impressions)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-gray-950">
                  {formatNumber(day.clicks)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AdStatsTable({ adStats }: { adStats: AdStats[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-base font-semibold text-gray-950">
          Annonser
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3">Annonse</th>
              <th className="px-5 py-3 text-right">Visninger</th>
              <th className="px-5 py-3 text-right">Klikk</th>
              <th className="px-5 py-3 text-right">Klikkrate</th>
              <th className="px-5 py-3">Sist sett</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {adStats.map((ad) => (
              <tr key={ad.finnAdId}>
                <td className="max-w-sm px-5 py-4">
                  <p className="font-medium text-gray-950 line-clamp-2">
                    {ad.title}
                  </p>
                  {ad.adUrl && (
                    <a
                      href={ad.adUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs font-medium text-sky-700 hover:text-sky-900 hover:underline"
                    >
                      Åpne annonse
                    </a>
                  )}
                </td>
                <td className="px-5 py-4 text-right tabular-nums text-gray-950">
                  {formatNumber(ad.impressions)}
                </td>
                <td className="px-5 py-4 text-right tabular-nums text-gray-950">
                  {formatNumber(ad.clicks)}
                </td>
                <td className="px-5 py-4 text-right tabular-nums text-gray-950">
                  {formatPercent(ad.clickRate)}
                </td>
                <td className="px-5 py-4 text-gray-600">
                  {ad.lastSeenAt ? formatDate(ad.lastSeenAt) : 'Ukjent'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function NoAccessState() {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
      Brukeren din er ikke koblet til en forhandler ennå.
    </section>
  )
}

function EmptyStatsState() {
  return (
    <section className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-12 text-center text-sm text-gray-500">
      Ingen statistikk registrert for de siste 30 dagene.
    </section>
  )
}

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | undefined {
  const value = searchParams?.[key]

  return typeof value === 'string' ? value : undefined
}

function formatNumber(value: number): string {
  return value.toLocaleString('nb-NO')
}

function formatPercent(value: number): string {
  return value.toLocaleString('nb-NO', {
    maximumFractionDigits: 1,
    style: 'percent',
  })
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}
