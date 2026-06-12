import type { User } from '@supabase/supabase-js'
import { isCarGroupSlug, type CarGroupSlug } from './car-groups'
import { createSupabaseAdminClient } from './supabase-server'

export type DealerUserRole = 'owner' | 'viewer'
export type AdminAnalyticsGroupFilter = CarGroupSlug | 'all'
export type AdminAnalyticsSortKey =
  | 'name'
  | 'group'
  | 'impressions'
  | 'clicks'
  | 'clickRate'
export type AdminAnalyticsSortDirection = 'asc' | 'desc'
export type AdminAnalyticsPeriodDays = 7 | 30 | 90 | 365

export interface AdminDealer {
  id: string
  orgId: string
  name: string
  slug: string
  groupSlug: CarGroupSlug
  users: AdminDealerUser[]
}

export interface AdminDealerUser {
  userId: string
  dealerId: string
  email: string
  role: DealerUserRole
}

export interface AdminAnalyticsOverview {
  filters: {
    group: AdminAnalyticsGroupFilter
    periodDays: AdminAnalyticsPeriodDays
    sort: AdminAnalyticsSortKey
    direction: AdminAnalyticsSortDirection
  }
  totals: {
    impressions: number
    clicks: number
    clickRate: number
    uniqueSessions: number
    activeAds: number
    activeDealers: number
  }
  dailyStats: AdminAnalyticsDailyStats[]
  dealerStats: AdminAnalyticsDealerStats[]
}

export interface AdminAnalyticsDailyStats {
  date: string
  impressions: number
  clicks: number
  clickRate: number
}

export interface AdminAnalyticsDealerStats {
  dealerId: string
  name: string
  orgId: string
  groupSlug: CarGroupSlug
  impressions: number
  clicks: number
  clickRate: number
  uniqueSessions: number
  activeAds: number
}

export interface AdminUser {
  userId: string
  email: string
  createdAt: string
  createdBy?: string
}

interface DealerRow {
  id: string
  org_id: string
  name: string
  slug: string
  group_slug: CarGroupSlug
}

interface DealerUserRow {
  dealer_id: string
  user_id: string
  role: DealerUserRole
}

interface AdminAnalyticsStatRow {
  dealer_id: string
  finn_ad_id: string
  stat_date: string
  carousel_impressions: number
  ad_clicks: number
  unique_sessions: number
}

interface AdminUserRow {
  user_id: string
  email: string
  created_at: string
  created_by: string | null
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, email, created_at, created_by')
    .order('email')

  if (error) {
    throw error
  }

  return ((data ?? []) as AdminUserRow[]).map((adminUser) => ({
    userId: adminUser.user_id,
    email: adminUser.email,
    createdAt: adminUser.created_at,
    createdBy: adminUser.created_by ?? undefined,
  }))
}

export async function getAdminDealers(): Promise<AdminDealer[]> {
  const supabase = createSupabaseAdminClient()

  const [{ data: dealers, error: dealersError }, { data: dealerUsers, error: dealerUsersError }] =
    await Promise.all([
      supabase
        .from('dealers')
        .select('id, org_id, name, slug, group_slug')
        .order('name'),
      supabase.from('dealer_users').select('dealer_id, user_id, role'),
    ])

  if (dealersError) {
    throw dealersError
  }

  if (dealerUsersError) {
    throw dealerUsersError
  }

  const usersById = await getAuthUsersById()
  const membershipsByDealer = new Map<string, AdminDealerUser[]>()

  for (const membership of (dealerUsers ?? []) as DealerUserRow[]) {
    const user = usersById.get(membership.user_id)
    const users = membershipsByDealer.get(membership.dealer_id) ?? []

    users.push({
      userId: membership.user_id,
      dealerId: membership.dealer_id,
      email: user?.email ?? 'Ukjent e-post',
      role: membership.role,
    })
    membershipsByDealer.set(membership.dealer_id, users)
  }

  return ((dealers ?? []) as DealerRow[]).map((dealer) => ({
    id: dealer.id,
    orgId: dealer.org_id,
    name: dealer.name,
    slug: dealer.slug,
    groupSlug: dealer.group_slug,
    users: membershipsByDealer.get(dealer.id) ?? [],
  }))
}

export async function getAdminAnalyticsOverview({
  group = 'all',
  periodDays = 30,
  sort = 'clicks',
  direction = 'desc',
}: {
  group?: AdminAnalyticsGroupFilter
  periodDays?: AdminAnalyticsPeriodDays
  sort?: AdminAnalyticsSortKey
  direction?: AdminAnalyticsSortDirection
}): Promise<AdminAnalyticsOverview> {
  const supabase = createSupabaseAdminClient()
  let dealersQuery = supabase
    .from('dealers')
    .select('id, org_id, name, slug, group_slug')
    .order('name')

  if (group !== 'all') {
    dealersQuery = dealersQuery.eq('group_slug', group)
  }

  const { data: dealers, error: dealersError } = await dealersQuery

  if (dealersError) {
    throw dealersError
  }

  const dealerRows = (dealers ?? []) as DealerRow[]
  const dealerIds = dealerRows.map((dealer) => dealer.id)
  const fromDate = getDateDaysAgo(periodDays - 1)
  let statRows: AdminAnalyticsStatRow[] = []

  if (dealerIds.length > 0) {
    const { data: stats, error: statsError } = await supabase
      .from('dealer_ad_daily_stats')
      .select(
        'dealer_id, finn_ad_id, stat_date, carousel_impressions, ad_clicks, unique_sessions'
      )
      .in('dealer_id', dealerIds)
      .gte('stat_date', fromDate)

    if (statsError) {
      throw statsError
    }

    statRows = (stats ?? []) as AdminAnalyticsStatRow[]
  }

  return buildAdminAnalyticsOverview({
    dealers: dealerRows,
    stats: statRows,
    group,
    periodDays,
    sort,
    direction,
  })
}

async function getAuthUsersById(): Promise<Map<string, User>> {
  const supabase = createSupabaseAdminClient()
  const usersById = new Map<string, User>()
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      throw error
    }

    for (const user of data.users) {
      usersById.set(user.id, user)
    }

    if (data.users.length < perPage) {
      break
    }

    page += 1
  }

  return usersById
}

function buildAdminAnalyticsOverview({
  dealers,
  stats,
  group,
  periodDays,
  sort,
  direction,
}: {
  dealers: DealerRow[]
  stats: AdminAnalyticsStatRow[]
  group: AdminAnalyticsGroupFilter
  periodDays: AdminAnalyticsPeriodDays
  sort: AdminAnalyticsSortKey
  direction: AdminAnalyticsSortDirection
}): AdminAnalyticsOverview {
  const dealerStatsById = new Map<
    string,
    {
      impressions: number
      clicks: number
      uniqueSessions: number
      adIds: Set<string>
    }
  >()
  const dailyByDate = new Map<string, { impressions: number; clicks: number }>()
  const totalAdIds = new Set<string>()

  for (const row of stats) {
    const dealerStats = dealerStatsById.get(row.dealer_id) ?? {
      impressions: 0,
      clicks: 0,
      uniqueSessions: 0,
      adIds: new Set<string>(),
    }
    dealerStats.impressions += row.carousel_impressions
    dealerStats.clicks += row.ad_clicks
    dealerStats.uniqueSessions += row.unique_sessions
    dealerStats.adIds.add(row.finn_ad_id)
    dealerStatsById.set(row.dealer_id, dealerStats)
    totalAdIds.add(`${row.dealer_id}:${row.finn_ad_id}`)

    const daily = dailyByDate.get(row.stat_date) ?? {
      impressions: 0,
      clicks: 0,
    }
    daily.impressions += row.carousel_impressions
    daily.clicks += row.ad_clicks
    dailyByDate.set(row.stat_date, daily)
  }

  const dealerStats = dealers
    .map((dealer) => {
      const statsForDealer = dealerStatsById.get(dealer.id)
      const impressions = statsForDealer?.impressions ?? 0
      const clicks = statsForDealer?.clicks ?? 0

      return {
        dealerId: dealer.id,
        name: dealer.name,
        orgId: dealer.org_id,
        groupSlug: dealer.group_slug,
        impressions,
        clicks,
        clickRate: calculateClickRate(clicks, impressions),
        uniqueSessions: statsForDealer?.uniqueSessions ?? 0,
        activeAds: statsForDealer?.adIds.size ?? 0,
      }
    })
    .sort((a, b) => compareAdminDealerStats(a, b, sort, direction))

  const dailyStats = getLastDates(periodDays)
    .map((date) => {
      const daily = dailyByDate.get(date) ?? { impressions: 0, clicks: 0 }

      return {
        date,
        impressions: daily.impressions,
        clicks: daily.clicks,
        clickRate: calculateClickRate(daily.clicks, daily.impressions),
      }
    })
    .reverse()

  const impressions = dealerStats.reduce(
    (sum, dealer) => sum + dealer.impressions,
    0
  )
  const clicks = dealerStats.reduce((sum, dealer) => sum + dealer.clicks, 0)
  const uniqueSessions = dealerStats.reduce(
    (sum, dealer) => sum + dealer.uniqueSessions,
    0
  )

  return {
    filters: {
      group,
      periodDays,
      sort,
      direction,
    },
    totals: {
      impressions,
      clicks,
      clickRate: calculateClickRate(clicks, impressions),
      uniqueSessions,
      activeAds: totalAdIds.size,
      activeDealers: dealerStats.filter(
        (dealer) => dealer.impressions > 0 || dealer.clicks > 0
      ).length,
    },
    dailyStats,
    dealerStats,
  }
}

function compareAdminDealerStats(
  a: AdminAnalyticsDealerStats,
  b: AdminAnalyticsDealerStats,
  sort: AdminAnalyticsSortKey,
  direction: AdminAnalyticsSortDirection
): number {
  const modifier = direction === 'asc' ? 1 : -1
  let result: number

  switch (sort) {
    case 'name':
      result = a.name.localeCompare(b.name, 'nb-NO')
      break
    case 'group':
      result =
        a.groupSlug.localeCompare(b.groupSlug, 'nb-NO') ||
        a.name.localeCompare(b.name, 'nb-NO')
      break
    case 'impressions':
      result = a.impressions - b.impressions
      break
    case 'clickRate':
      result = a.clickRate - b.clickRate
      break
    case 'clicks':
    default:
      result = a.clicks - b.clicks
      break
  }

  if (result === 0) {
    return a.name.localeCompare(b.name, 'nb-NO')
  }

  return result * modifier
}

function calculateClickRate(clicks: number, impressions: number): number {
  return impressions > 0 ? clicks / impressions : 0
}

function getLastDates(days: AdminAnalyticsPeriodDays): string[] {
  return Array.from({ length: days }, (_, index) =>
    getDateDaysAgo(days - 1 - index)
  )
}

function getDateDaysAgo(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)

  return date.toISOString().slice(0, 10)
}

export function normalizeDealerRole(value: FormDataEntryValue | null): DealerUserRole {
  return value === 'owner' ? 'owner' : 'viewer'
}

export function normalizeAdminAnalyticsGroup(
  value?: string
): AdminAnalyticsGroupFilter {
  return value && isCarGroupSlug(value) ? value : 'all'
}

export function normalizeAdminAnalyticsPeriod(
  value?: string
): AdminAnalyticsPeriodDays {
  if (value === '7' || value === '30' || value === '90' || value === '365') {
    return Number(value) as AdminAnalyticsPeriodDays
  }

  return 30
}

export function normalizeAdminAnalyticsSort(
  value?: string
): AdminAnalyticsSortKey {
  if (
    value === 'name' ||
    value === 'group' ||
    value === 'impressions' ||
    value === 'clicks' ||
    value === 'clickRate'
  ) {
    return value
  }

  return 'clicks'
}

export function normalizeAdminAnalyticsSortDirection(
  value?: string
): AdminAnalyticsSortDirection {
  return value === 'asc' ? 'asc' : 'desc'
}

export function slugifyDealerName(name: string, orgId: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug ? slug : `dealer-${orgId}`
}
