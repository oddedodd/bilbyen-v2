'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  TrafficTrendChart,
  type TrafficTrendPoint,
} from '@/components/analytics-charts'
import type { CarGroupSlug } from '@/lib/car-groups'
import type {
  AdminAnalyticsGroupFilter,
  AdminAnalyticsOverview,
  AdminAnalyticsPeriodDays,
  AdminAnalyticsSortDirection,
  AdminAnalyticsSortKey,
  AdminDealer,
} from '@/lib/admin-data'
import {
  createDealer,
  createDealerUser,
  deleteDealerUser,
  updateDealerGroup,
  updateDealerUser,
  type AdminActionState,
} from './actions'

interface CarGroupOption {
  slug: CarGroupSlug
  name: string
}

interface AdminAnalyticsViewProps {
  analyticsOverview: AdminAnalyticsOverview
  carGroups: CarGroupOption[]
}

interface AdminUserManagementViewProps {
  dealers: AdminDealer[]
  carGroups: CarGroupOption[]
}

const initialActionState: AdminActionState = {
  ok: null,
  message: '',
}

export function AdminAnalyticsView({
  analyticsOverview,
  carGroups,
}: AdminAnalyticsViewProps) {
  return (
    <AdminAnalyticsSection
      analyticsOverview={analyticsOverview}
      carGroups={carGroups}
    />
  )
}

export function AdminUserManagementView({
  dealers,
  carGroups,
}: AdminUserManagementViewProps) {
  const [notice, setNotice] = useState<AdminActionState>(initialActionState)

  return (
    <section className="flex flex-col gap-6 px-6 py-6 lg:px-8">
      <GlobalNotice notice={notice} />
      <div>
        <h2 className="font-serif text-2xl font-bold leading-none text-[#0b263f]">
          Forhandlere og brukere
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Administrer forhandlere, grupper og brukertilganger.
        </p>
      </div>
      <section className="grid gap-6 lg:grid-cols-2">
        <CreateDealerCard carGroups={carGroups} onNotice={setNotice} />
        <CreateUserCard dealers={dealers} onNotice={setNotice} />
      </section>

      <DealersSection
        carGroups={carGroups}
        dealers={dealers}
        onNotice={setNotice}
      />
    </section>
  )
}

function AdminAnalyticsSection({
  analyticsOverview,
  carGroups,
}: {
  analyticsOverview: AdminAnalyticsOverview
  carGroups: CarGroupOption[]
}) {
  const { filters, totals, dealerStats, dailyStats } = analyticsOverview

  return (
    <section className="flex flex-col gap-5 px-6 py-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold leading-none text-[#0b263f]">
            Trafikkoversikt
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Samlet trafikk, visninger og klikk for alle forhandlere.
          </p>
        </div>
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <FilterLinks
            carGroups={carGroups}
            filters={filters}
          />
          <PeriodLinks filters={filters} />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          accent
          description="Ganger biler er vist i karusellene"
          label="Visninger"
          value={formatNumber(totals.impressions)}
        />
        <MetricCard
          accent
          description="Videreklikk til FINN-annonsene"
          label="Klikk"
          value={formatNumber(totals.clicks)}
        />
        <MetricCard
          accent
          description="Andel visninger som endte med klikk"
          label="Klikkrate"
          value={formatPercent(totals.clickRate)}
        />
        <MetricCard
          description="Unike besøkende i perioden"
          label="Sesjoner"
          value={formatNumber(totals.uniqueSessions)}
        />
        <MetricCard
          description="Annonser med visning eller klikk"
          label="Aktive annonser"
          value={formatNumber(totals.activeAds)}
        />
        <MetricCard
          description={`av ${formatNumber(dealerStats.length)} registrerte i perioden`}
          label="Aktive forhandlere"
          value={formatNumber(totals.activeDealers)}
        />
      </section>

      <section>
        <TrafficTrendPanel dailyStats={dailyStats} />
      </section>

      <DealerStatsPanel
        carGroups={carGroups}
        dealerStats={dealerStats}
        filters={filters}
      />
    </section>
  )
}

function TrafficTrendPanel({
  dailyStats,
}: {
  dailyStats: AdminAnalyticsOverview['dailyStats']
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
      <div>
        <h3 className="text-base font-bold text-[#0b263f]">
          Daglig utvikling
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Visninger og klikk per dag
        </p>
      </div>
      <div className="mt-4 h-48 sm:h-56">
        <TrafficTrendChart
          ariaLabel="Linjediagram som viser daglige visninger og klikk"
          points={points}
        />
      </div>
    </section>
  )
}

function FilterLinks({
  carGroups,
  filters,
}: {
  carGroups: CarGroupOption[]
  filters: AdminAnalyticsOverview['filters']
}) {
  const options: { label: string; group: AdminAnalyticsGroupFilter }[] = [
    { label: 'Alle', group: 'all' },
    ...carGroups.map((group) => ({
      label: group.name,
      group: group.slug,
    })),
  ]

  return (
    <nav
      aria-label="Filtrer trafikkoversikt"
      className="flex flex-wrap items-center gap-2 text-xs font-bold"
    >
      {options.map((option) => {
        const isActive = option.group === filters.group

        return (
          <Link
            key={option.group}
            href={getAdminAnalyticsHref(filters, { group: option.group })}
            aria-current={isActive ? 'page' : undefined}
            className={
              isActive
                ? 'rounded-full bg-[#0d2d49] px-4 py-2 text-white'
                : 'rounded-full border border-slate-200 bg-white px-4 py-2 text-[#173b58] transition hover:border-slate-300 hover:bg-slate-50'
            }
          >
            {option.label}
          </Link>
        )
      })}
    </nav>
  )
}

function PeriodLinks({
  filters,
}: {
  filters: AdminAnalyticsOverview['filters']
}) {
  const periods: { label: string; periodDays: AdminAnalyticsPeriodDays }[] = [
    { label: '7 d', periodDays: 7 },
    { label: '30 d', periodDays: 30 },
    { label: '90 d', periodDays: 90 },
    { label: '1 år', periodDays: 365 },
  ]

  return (
    <nav
      aria-label="Velg trafikkperiode"
      className="flex flex-wrap items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold"
    >
      {periods.map((period) => {
        const isActive = period.periodDays === filters.periodDays

        return (
          <Link
            key={period.periodDays}
            href={getAdminAnalyticsHref(filters, {
              periodDays: period.periodDays,
            })}
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

function DealerStatsPanel({
  dealerStats,
  carGroups,
  filters,
}: {
  dealerStats: AdminAnalyticsOverview['dealerStats']
  carGroups: CarGroupOption[]
  filters: AdminAnalyticsOverview['filters']
}) {
  const sortedLabel = getSortLabel(filters.sort)
  const maxImpressions = Math.max(
    1,
    ...dealerStats.map((dealer) => dealer.impressions)
  )

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <h3 className="text-base font-bold text-[#0b263f]">
          Forhandlere
        </h3>
        <span className="text-sm font-medium text-slate-500">
          Sortert etter {sortedLabel}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[58rem] divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-5 py-3">#</th>
              <SortableHeader
                filters={filters}
                label="Firma"
                sortKey="name"
              />
              <SortableHeader
                filters={filters}
                label="Gruppe"
                sortKey="group"
              />
              <SortableHeader
                filters={filters}
                label="Visninger"
                sortKey="impressions"
              />
              <SortableHeader
                align="right"
                filters={filters}
                label="Klikk"
                sortKey="clicks"
              />
              <SortableHeader
                align="right"
                filters={filters}
                label="Klikkrate"
                sortKey="clickRate"
              />
              <th className="px-5 py-3 text-right">Sesjoner</th>
              <th className="px-5 py-3 text-right">Annonser</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {dealerStats.map((dealer, index) => (
              <tr key={dealer.dealerId}>
                <td className="px-5 py-3 font-medium tabular-nums text-slate-400">
                  {index + 1}
                </td>
                <td className="px-5 py-3 font-bold text-slate-900">
                  {dealer.name}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      dealer.groupSlug === 'bilbyen'
                        ? 'bg-sky-100 text-[#17486a]'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {getCarGroupName(carGroups, dealer.groupSlug)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-full min-w-24 max-w-40 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-sky-500"
                        style={{
                          width: `${Math.round(
                            (dealer.impressions / maxImpressions) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="font-bold tabular-nums text-[#0b263f]">
                      {formatNumber(dealer.impressions)}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums text-[#0b263f]">
                  {formatNumber(dealer.clicks)}
                </td>
                <td
                  className={`px-5 py-3 text-right font-bold tabular-nums ${
                    dealer.clickRate > 0 ? 'text-teal-600' : 'text-slate-400'
                  }`}
                >
                  {dealer.clickRate > 0 ? formatPercent(dealer.clickRate) : '0 %'}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                  {formatNumber(dealer.uniqueSessions)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                  {formatNumber(dealer.activeAds)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SortableHeader({
  label,
  sortKey,
  filters,
  align = 'left',
}: {
  label: string
  sortKey: AdminAnalyticsSortKey
  filters: AdminAnalyticsOverview['filters']
  align?: 'left' | 'right'
}) {
  const isActive = filters.sort === sortKey
  const nextDirection = getNextSortDirection(filters, sortKey)

  return (
    <th className={`px-5 py-3 ${align === 'right' ? 'text-right' : ''}`}>
      <Link
        href={getAdminAnalyticsHref(filters, {
          sort: sortKey,
          direction: nextDirection,
        })}
        className="inline-flex items-center gap-1 transition hover:text-[#0b263f] hover:underline hover:underline-offset-4"
      >
        {label}
        {isActive && (
          <span aria-hidden="true">{filters.direction === 'asc' ? '↑' : '↓'}</span>
        )}
      </Link>
    </th>
  )
}

function GlobalNotice({ notice }: { notice: AdminActionState }) {
  if (notice.ok === null) {
    return null
  }

  return (
    <ActionMessage
      state={notice}
      className="rounded-md border px-4 py-3 text-sm"
    />
  )
}

function CreateDealerCard({
  carGroups,
  onNotice,
}: {
  carGroups: CarGroupOption[]
  onNotice: (notice: AdminActionState) => void
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useActionState(
    createDealer,
    initialActionState
  )

  useEffect(() => {
    if (state.ok === null) {
      return
    }

    onNotice(state)

    if (state.ok) {
      formRef.current?.reset()
      router.refresh()
    }
  }, [onNotice, router, state])

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

      <form
        ref={formRef}
        action={formAction}
        className="mt-5 grid gap-4 sm:grid-cols-2"
      >
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
            {carGroups.map((group) => (
              <option key={group.slug} value={group.slug}>
                {group.name}
              </option>
            ))}
          </select>
        </label>

        {state.ok === false && (
          <ActionMessage
            state={state}
            className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
          />
        )}

        <div className="sm:col-span-2">
          <SubmitButton label="Lagre forhandler" pendingLabel="Lagrer ..." />
        </div>
      </form>
    </section>
  )
}

function CreateUserCard({
  dealers,
  onNotice,
}: {
  dealers: AdminDealer[]
  onNotice: (notice: AdminActionState) => void
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useActionState(
    createDealerUser,
    initialActionState
  )

  useEffect(() => {
    if (state.ok === null) {
      return
    }

    onNotice(state)

    if (state.ok) {
      formRef.current?.reset()
      router.refresh()
    }
  }, [onNotice, router, state])

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

      <form
        ref={formRef}
        action={formAction}
        className="mt-5 grid gap-4 sm:grid-cols-2"
      >
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

        {state.ok === false && (
          <ActionMessage
            state={state}
            className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
          />
        )}

        <div className="self-end">
          <SubmitButton label="Opprett bruker" pendingLabel="Oppretter ..." />
        </div>
      </form>
    </section>
  )
}

function DealersSection({
  dealers,
  carGroups,
  onNotice,
}: {
  dealers: AdminDealer[]
  carGroups: CarGroupOption[]
  onNotice: (notice: AdminActionState) => void
}) {
  const [openDealerIds, setOpenDealerIds] = useState<Set<string>>(new Set())

  function toggleDealer(dealerId: string) {
    setOpenDealerIds((currentIds) => {
      const nextIds = new Set(currentIds)

      if (nextIds.has(dealerId)) {
        nextIds.delete(dealerId)
      } else {
        nextIds.add(dealerId)
      }

      return nextIds
    })
  }

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
              <DealerRow
                key={dealer.id}
                carGroups={carGroups}
                dealer={dealer}
                dealers={dealers}
                isOpen={openDealerIds.has(dealer.id)}
                onNotice={onNotice}
                onToggle={() => toggleDealer(dealer.id)}
              />
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
  carGroups,
  isOpen,
  onNotice,
  onToggle,
}: {
  dealer: AdminDealer
  dealers: AdminDealer[]
  carGroups: CarGroupOption[]
  isOpen: boolean
  onNotice: (notice: AdminActionState) => void
  onToggle: () => void
}) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="grid w-full grid-cols-[minmax(14rem,1.4fr)_9rem_minmax(12rem,1fr)_6rem] items-center gap-4 px-5 py-4 text-left text-sm transition hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <ChevronIcon isOpen={isOpen} />
          <div>
            <p className="font-medium text-gray-950">{dealer.name}</p>
            <p className="mt-1 text-xs text-gray-500">{dealer.slug}</p>
          </div>
        </div>
        <span className="font-mono text-xs text-gray-700">
          {dealer.orgId}
        </span>
        <span className="text-gray-700">
          {getCarGroupName(carGroups, dealer.groupSlug)}
        </span>
        <span className="text-right text-gray-700">
          {dealer.users.length}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-5">
          <div className="grid gap-5 xl:grid-cols-[20rem_1fr]">
            <DealerGroupForm
              carGroups={carGroups}
              dealer={dealer}
              onNotice={onNotice}
            />

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
                      onNotice={onNotice}
                      user={user}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

function DealerGroupForm({
  dealer,
  carGroups,
  onNotice,
}: {
  dealer: AdminDealer
  carGroups: CarGroupOption[]
  onNotice: (notice: AdminActionState) => void
}) {
  const router = useRouter()
  const [state, formAction] = useActionState(
    updateDealerGroup,
    initialActionState
  )

  useEffect(() => {
    if (state.ok === null) {
      return
    }

    onNotice(state)

    if (state.ok) {
      router.refresh()
    }
  }, [onNotice, router, state])

  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-950">
        Forhandleroppsett
      </h3>
      <form
        action={formAction}
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
            {carGroups.map((group) => (
              <option key={group.slug} value={group.slug}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        {state.ok === false && (
          <ActionMessage
            state={state}
            className="rounded-md border px-3 py-2 text-sm"
          />
        )}
        <SubmitButton
          label="Lagre gruppe"
          pendingLabel="Lagrer ..."
          variant="secondary"
        />
      </form>
    </section>
  )
}

function UserEditor({
  dealers,
  user,
  onNotice,
}: {
  dealers: AdminDealer[]
  user: AdminDealer['users'][number]
  onNotice: (notice: AdminActionState) => void
}) {
  const router = useRouter()
  const [updateState, updateAction] = useActionState(
    updateDealerUser,
    initialActionState
  )
  const [deleteState, deleteAction] = useActionState(
    deleteDealerUser,
    initialActionState
  )

  useEffect(() => {
    if (updateState.ok === null) {
      return
    }

    onNotice(updateState)

    if (updateState.ok) {
      router.refresh()
    }
  }, [onNotice, router, updateState])

  useEffect(() => {
    if (deleteState.ok === null) {
      return
    }

    onNotice(deleteState)

    if (deleteState.ok) {
      router.refresh()
    }
  }, [deleteState, onNotice, router])

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <form
        id={`update-user-${user.userId}`}
        action={updateAction}
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
          <SubmitButton label="Lagre" pendingLabel="Lagrer ..." />
        </div>

        {updateState.ok === false && (
          <ActionMessage
            state={updateState}
            className="rounded-md border px-3 py-2 text-sm lg:col-span-5"
          />
        )}
      </form>

      <form
        action={deleteAction}
        className="mt-2"
        onSubmit={(event) => {
          if (!window.confirm(`Slette ${user.email}?`)) {
            event.preventDefault()
          }
        }}
      >
        <input type="hidden" name="userId" value={user.userId} />
        <DeleteButton />
        {deleteState.ok === false && (
          <ActionMessage
            state={deleteState}
            className="mt-2 rounded-md border px-3 py-2 text-sm"
          />
        )}
      </form>
    </div>
  )
}

function SubmitButton({
  label,
  pendingLabel,
  variant = 'primary',
}: {
  label: string
  pendingLabel: string
  variant?: 'primary' | 'secondary'
}) {
  const { pending } = useFormStatus()
  const className =
    variant === 'primary'
      ? 'rounded-md bg-gray-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60'
      : 'self-start rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  )
}

function DeleteButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-semibold text-red-700 transition hover:text-red-900 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Sletter ...' : 'Slett bruker'}
    </button>
  )
}

function ActionMessage({
  state,
  className,
}: {
  state: AdminActionState
  className: string
}) {
  const toneClassName = state.ok
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-red-200 bg-red-50 text-red-700'

  return (
    <p aria-live="polite" className={`${className} ${toneClassName}`}>
      {state.message}
    </p>
  )
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
        isOpen ? 'rotate-180' : ''
      }`}
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

function getAdminAnalyticsHref(
  filters: AdminAnalyticsOverview['filters'],
  overrides: Partial<{
    group: AdminAnalyticsGroupFilter
    periodDays: AdminAnalyticsPeriodDays
    sort: AdminAnalyticsSortKey
    direction: AdminAnalyticsSortDirection
  }>
): string {
  const params = new URLSearchParams()
  const group = overrides.group ?? filters.group
  const periodDays = overrides.periodDays ?? filters.periodDays
  const sort = overrides.sort ?? filters.sort
  const direction = overrides.direction ?? filters.direction

  if (group !== 'all') {
    params.set('group', group)
  }
  if (periodDays !== 30) {
    params.set('period', String(periodDays))
  }
  if (sort !== 'clicks') {
    params.set('sort', sort)
  }
  if (direction !== 'desc') {
    params.set('direction', direction)
  }

  const query = params.toString()
  return query ? `/admin?${query}` : '/admin'
}

function getNextSortDirection(
  filters: AdminAnalyticsOverview['filters'],
  sortKey: AdminAnalyticsSortKey
): AdminAnalyticsSortDirection {
  if (filters.sort === sortKey) {
    return filters.direction === 'asc' ? 'desc' : 'asc'
  }

  return sortKey === 'name' || sortKey === 'group' ? 'asc' : 'desc'
}

function getSortLabel(sort: AdminAnalyticsSortKey): string {
  const labels: Record<AdminAnalyticsSortKey, string> = {
    clickRate: 'klikkrate',
    clicks: 'klikk',
    group: 'gruppe',
    impressions: 'visninger',
    name: 'firma',
  }

  return labels[sort]
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

function getCarGroupName(
  carGroups: CarGroupOption[],
  groupSlug: CarGroupSlug
): string {
  return carGroups.find((group) => group.slug === groupSlug)?.name ?? groupSlug
}
