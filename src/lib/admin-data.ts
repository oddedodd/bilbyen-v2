import type { User } from '@supabase/supabase-js'
import { isDealerGroupSlug, type DealerGroupSlug } from './car-groups'
import { createSupabaseAdminClient } from './supabase-server'

export type DealerUserRole = 'owner' | 'viewer'
export type AdminAnalyticsGroupFilter = DealerGroupSlug | 'all'
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
  groupSlug: DealerGroupSlug
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
  groupSlug: DealerGroupSlug
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
  group_slug: DealerGroupSlug
}

interface DealerUserRow {
  dealer_id: string
  user_id: string
  role: DealerUserRole
}

interface AdminUserRow {
  user_id: string
  email: string
  created_at: string
  created_by: string | null
}

interface AdminAnalyticsRpcResponse {
  totals?: {
    impressions?: number
    clicks?: number
    uniqueSessions?: number
    activeAds?: number
    activeDealers?: number
  }
  dailyStats?: AdminAnalyticsRpcDailyStats[]
  dealerStats?: AdminAnalyticsRpcDealerStats[]
}

interface AdminAnalyticsRpcDailyStats {
  date: string
  impressions: number
  clicks: number
}

interface AdminAnalyticsRpcDealerStats {
  dealerId: string
  name: string
  orgId: string
  groupSlug: DealerGroupSlug
  impressions: number
  clicks: number
  uniqueSessions: number
  activeAds: number
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
  const fromDate = getDateDaysAgo(periodDays - 1)

  const { data, error } = await supabase.rpc('get_admin_analytics_overview', {
    p_group_slug: group,
    p_from_date: fromDate,
  })

  if (error) {
    throw error
  }

  return buildAdminAnalyticsOverviewFromRpc({
    analytics: data as AdminAnalyticsRpcResponse | null,
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

function buildAdminAnalyticsOverviewFromRpc({
  analytics,
  group,
  periodDays,
  sort,
  direction,
}: {
  analytics: AdminAnalyticsRpcResponse | null
  group: AdminAnalyticsGroupFilter
  periodDays: AdminAnalyticsPeriodDays
  sort: AdminAnalyticsSortKey
  direction: AdminAnalyticsSortDirection
}): AdminAnalyticsOverview {
  const dealerStats = (analytics?.dealerStats ?? [])
    .map((dealer) => ({
      ...dealer,
      clickRate: calculateClickRate(dealer.clicks, dealer.impressions),
    }))
    .sort((a, b) => compareAdminDealerStats(a, b, sort, direction))

  const dailyStats = (analytics?.dailyStats ?? []).map((daily) => ({
    ...daily,
    clickRate: calculateClickRate(daily.clicks, daily.impressions),
  }))
  const totals = analytics?.totals
  const impressions = totals?.impressions ?? 0
  const clicks = totals?.clicks ?? 0

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
      uniqueSessions: totals?.uniqueSessions ?? 0,
      activeAds: totals?.activeAds ?? 0,
      activeDealers: totals?.activeDealers ?? 0,
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
  return value && isDealerGroupSlug(value) ? value : 'all'
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
