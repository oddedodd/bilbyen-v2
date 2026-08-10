import Link from 'next/link'
import { Suspense } from 'react'
import { connection } from 'next/server'
import {
  RankingBarChart,
  TrafficTrendChart,
  type RankingPoint,
  type TrafficTrendPoint,
} from '@/components/analytics-charts'
import { requireDealerUser } from '@/lib/dealer-auth'
import {
  type DashboardPeriodDays,
  getDealerDashboardStats,
  normalizeDashboardPeriod,
  type AdStats,
  type DailyStats,
} from '@/lib/dealer-dashboard-data'
import { logoutDealer } from './actions'

interface DealerDashboardPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const DASHBOARD_PERIODS: {
  days: DashboardPeriodDays
  label: string
}[] = [
  { days: 7, label: '7 d' },
  { days: 30, label: '30 d' },
  { days: 90, label: '90 d' },
  { days: 365, label: '1 år' },
]

export default function DealerDashboardPage({
  searchParams,
}: DealerDashboardPageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DealerDashboard searchParams={searchParams} />
    </Suspense>
  )
}

function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[#e8eef4] px-3 py-4 text-[#102a43] sm:px-5 lg:px-8">
      <div className="mx-auto max-w-[1500px] px-4 py-6 text-sm text-slate-500">
        Laster ...
      </div>
    </main>
  )
}

async function DealerDashboard({
  searchParams,
}: DealerDashboardPageProps) {
  await connection()

  const user = await requireDealerUser()
  const resolvedSearchParams = await searchParams
  const dealerId = getSearchParam(resolvedSearchParams, 'dealer')
  const periodDays = normalizeDashboardPeriod(
    getSearchParam(resolvedSearchParams, 'period')
  )
  const stats = await getDealerDashboardStats(dealerId, periodDays)

  return (
    <main className="min-h-screen bg-[#e8eef4] px-3 py-4 text-[#102a43] sm:px-5 lg:px-8">
      <div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1500px] overflow-hidden rounded-xl bg-[#f8fafc] shadow-sm ring-1 ring-slate-200">
        <header>
          <div className="bg-[#0d2d49] px-6 py-4 text-white lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/forhandler" className="flex items-center gap-3">
                <span className="font-serif text-xl font-bold leading-none text-white">
                  Bilbyen
                </span>
                <span className="rounded border border-sky-200/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.24em] text-sky-100">
                  Forhandler
                </span>
              </Link>

              <div className="flex flex-wrap items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#1f5d82] text-xs font-bold text-white ring-1 ring-sky-200/20">
                  {getInitials(user.email)}
                </div>
                <p className="max-w-[14rem] truncate text-sm text-sky-100">
                  {user.email}
                </p>
                <form action={logoutDealer}>
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
            aria-label="Forhandlerseksjoner"
            className="flex gap-7 overflow-x-auto border-b border-slate-200 bg-white px-6 text-sm font-bold lg:px-8"
          >
            <Link
              href="/forhandler"
              aria-current="page"
              className="border-b-2 border-[#0d2d49] py-4 text-[#0d2d49]"
            >
              Oversikt
            </Link>
            <Link
              href="/"
              className="border-b-2 border-transparent py-4 text-slate-500 transition hover:text-[#0d2d49]"
            >
              Forsiden
            </Link>
          </nav>
        </header>

        <div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
          {!stats.selectedDealer ? (
            <NoAccessState />
          ) : (
            <>
              <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="font-serif text-2xl font-bold leading-none text-[#0b263f]">
                    {stats.selectedDealer.name}
                  </h1>
                  <p className="mt-2 text-sm text-slate-500">
                    Samlet trafikk og annonseklikk for valgt forhandler.
                  </p>
                </div>

                {stats.dealers.length > 1 && (
                  <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <input
                      type="hidden"
                      name="period"
                      value={stats.periodDays}
                    />
                    <label className="flex flex-col gap-1.5 text-sm font-bold text-[#0b263f]">
                      Forhandler
                      <select
                        name="dealer"
                        defaultValue={stats.selectedDealer.id}
                        className="min-w-56 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
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
                      className="rounded-md bg-[#0d2d49] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#123a5e]"
                    >
                      Vis
                    </button>
                  </form>
                )}
              </section>

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  accent
                  description="Ganger biler er vist i karusellene"
                  label="Visninger"
                  value={formatNumber(stats.totals.impressions)}
                />
                <MetricCard
                  accent
                  description="Videreklikk til FINN-annonsene"
                  label="Klikk"
                  value={formatNumber(stats.totals.clicks)}
                />
                <MetricCard
                  accent
                  description="Andel visninger som endte med klikk"
                  label="Klikkrate"
                  value={formatPercent(stats.totals.clickRate)}
                />
                <MetricCard
                  description="Annonser med visning eller klikk"
                  label="Aktive annonser"
                  value={formatNumber(stats.totals.activeAds)}
                />
              </section>

              {stats.totals.impressions === 0 && stats.totals.clicks === 0 ? (
                <EmptyStatsState
                  periodDays={stats.periodDays}
                  dealerId={stats.selectedDealer.id}
                />
              ) : (
                <>
                  <TrafficTrendPanel
                    dailyStats={stats.dailyStats}
                    dealerId={stats.selectedDealer.id}
                    periodDays={stats.periodDays}
                  />

                  <TopAdsChartPanel adStats={stats.adStats} />

                  <AdStatsTable adStats={stats.adStats} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}

function TrafficTrendPanel({
  dailyStats,
  dealerId,
  periodDays,
}: {
  dailyStats: DailyStats[]
  dealerId: string
  periodDays: DashboardPeriodDays
}) {
  const points: TrafficTrendPoint[] = [...dailyStats]
    .reverse()
    .map((day) => ({
      date: day.date,
      impressions: day.impressions,
      clicks: day.clicks,
    }))

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-[#0b263f]">
            Daglig utvikling
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Visninger og klikk per dag.
          </p>
        </div>
        <PeriodLinks dealerId={dealerId} periodDays={periodDays} />
      </div>
      <div className="mt-5 h-56 sm:h-64">
        <TrafficTrendChart
          ariaLabel="Linjediagram som viser daglige visninger og klikk for forhandler"
          points={points}
        />
      </div>
    </section>
  )
}

function TopAdsChartPanel({ adStats }: { adStats: AdStats[] }) {
  const points: RankingPoint[] = [...adStats]
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, 10)
    .map((ad) => ({
      label: ad.title,
      value: ad.clicks,
      impressions: ad.impressions,
      clickRate: ad.clickRate,
    }))

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-base font-bold text-[#0b263f]">
          Topp annonser
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Rangert etter klikk i valgt periode.
        </p>
      </div>
      <div className="mt-5 h-72">
        <RankingBarChart
          ariaLabel="Stolpediagram som viser topp annonser etter klikk"
          points={points}
          valueLabel="Klikk"
        />
      </div>
    </section>
  )
}

function MetricCard({
  accent = false,
  description,
  label,
  value,
}: {
  accent?: boolean
  description: string
  label: string
  value: string
}) {
  return (
    <div className="flex min-h-28 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {accent && <span className="mb-3 h-0.5 w-6 rounded-full bg-sky-500" />}
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-serif text-4xl font-bold leading-none text-[#0b263f]">
        {value}
      </p>
      <p className="mt-3 text-xs leading-snug text-slate-500">
        {description}
      </p>
    </div>
  )
}

function PeriodLinks({
  dealerId,
  periodDays,
}: {
  dealerId: string
  periodDays: DashboardPeriodDays
}) {
  return (
    <nav
      aria-label="Velg trendperiode"
      className="flex shrink-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold"
    >
      {DASHBOARD_PERIODS.map((period) => {
        const isActive = period.days === periodDays

        return (
          <Link
            key={period.days}
            href={getDashboardHref(dealerId, period.days)}
            aria-current={isActive ? 'page' : undefined}
            className={
              isActive
                ? 'rounded-md bg-[#0d2d49] px-4 py-2 text-white shadow-sm'
                : 'rounded-md px-4 py-2 text-slate-500 transition hover:bg-white hover:text-[#0d2d49]'
            }
          >
            {period.label}
          </Link>
        )
      })}
    </nav>
  )
}

function AdStatsTable({ adStats }: { adStats: AdStats[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-bold text-[#0b263f]">
          Annonser
        </h2>
        <span className="text-sm font-medium text-slate-500">
          Sortert etter klikk
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[58rem] divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
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
                  <p className="font-bold text-slate-950 line-clamp-2">
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
                <td className="px-5 py-4 text-right tabular-nums font-semibold text-[#0b263f]">
                  {formatNumber(ad.impressions)}
                </td>
                <td className="px-5 py-4 text-right tabular-nums font-semibold text-[#0b263f]">
                  {formatNumber(ad.clicks)}
                </td>
                <td className="px-5 py-4 text-right tabular-nums font-semibold text-teal-700">
                  {formatPercent(ad.clickRate)}
                </td>
                <td className="px-5 py-4 text-slate-600">
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
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm font-medium text-amber-800">
      Brukeren din er ikke koblet til en forhandler ennå.
    </section>
  )
}

function EmptyStatsState({
  periodDays,
  dealerId,
}: {
  periodDays: DashboardPeriodDays
  dealerId: string
}) {
  return (
    <section className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500">
      <p className="font-medium">
        Ingen statistikk registrert for {getPeriodLabel(periodDays).toLowerCase()}.
      </p>
      <div className="mt-4 flex justify-center">
        <PeriodLinks dealerId={dealerId} periodDays={periodDays} />
      </div>
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

function getPeriodLabel(periodDays: DashboardPeriodDays): string {
  const labels: Record<DashboardPeriodDays, string> = {
    7: 'Siste 7 dager',
    30: 'Siste 30 dager',
    90: 'Siste 90 dager',
    365: 'Siste år',
  }

  return labels[periodDays]
}

function getDashboardHref(
  dealerId: string,
  periodDays: DashboardPeriodDays
): string {
  const params = new URLSearchParams({
    dealer: dealerId,
    period: String(periodDays),
  })

  return `/forhandler?${params.toString()}`
}

function getInitials(email?: string): string {
  if (!email) {
    return 'FD'
  }

  return email.slice(0, 2).toUpperCase()
}
