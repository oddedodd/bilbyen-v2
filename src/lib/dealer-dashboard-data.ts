import { createSupabaseServerClient } from './supabase-auth'

export type DashboardPeriodDays = 7 | 30 | 90 | 365

export interface DealerDashboardDealer {
  id: string
  name: string
  orgId: string
  slug: string
  role: string
}

export interface DealerDashboardStats {
  periodDays: DashboardPeriodDays
  dealers: DealerDashboardDealer[]
  selectedDealer: DealerDashboardDealer | null
  totals: {
    impressions: number
    clicks: number
    clickRate: number
    activeAds: number
  }
  dailyStats: DailyStats[]
  adStats: AdStats[]
}

export interface DailyStats {
  date: string
  impressions: number
  clicks: number
  clickRate: number
}

export interface AdStats {
  finnAdId: string
  title: string
  adUrl?: string
  impressions: number
  clicks: number
  clickRate: number
  lastSeenAt?: string
}

interface DealerUserRow {
  role: string
  dealers: {
    id: string
    name: string
    org_id: string
    slug: string
  }
}

interface DashboardAnalyticsRpcResponse {
  totals?: {
    impressions?: number
    clicks?: number
    activeAds?: number
  }
  dailyStats?: DashboardAnalyticsRpcDailyStats[]
  adStats?: DashboardAnalyticsRpcAdStats[]
}

interface DashboardAnalyticsRpcDailyStats {
  date: string
  impressions: number
  clicks: number
}

interface DashboardAnalyticsRpcAdStats {
  finnAdId: string
  title: string
  adUrl?: string | null
  impressions: number
  clicks: number
  lastSeenAt?: string | null
}

export async function getDealerDashboardStats(
  dealerId?: string,
  periodDays: DashboardPeriodDays = 30
): Promise<DealerDashboardStats> {
  const supabase = await createSupabaseServerClient()
  const { data: memberships, error: membershipsError } = await supabase
    .from('dealer_users')
    .select('role, dealers(id, name, org_id, slug)')
    .order('role')

  if (membershipsError) {
    throw membershipsError
  }

  const dealers = ((memberships ?? []) as unknown as DealerUserRow[])
    .map((membership) => ({
      id: membership.dealers.id,
      name: membership.dealers.name,
      orgId: membership.dealers.org_id,
      slug: membership.dealers.slug,
      role: membership.role,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'nb-NO'))

  const selectedDealer =
    dealers.find((dealer) => dealer.id === dealerId) ?? dealers[0] ?? null

  if (!selectedDealer) {
    return {
      periodDays,
      dealers,
      selectedDealer: null,
      totals: {
        impressions: 0,
        clicks: 0,
        clickRate: 0,
        activeAds: 0,
      },
      dailyStats: [],
      adStats: [],
    }
  }

  const fromDate = getDateDaysAgo(periodDays - 1)
  const { data, error } = await supabase.rpc('get_dealer_dashboard_analytics', {
    p_dealer_id: selectedDealer.id,
    p_from_date: fromDate,
  })

  if (error) {
    throw error
  }

  return buildDashboardStats(
    dealers,
    selectedDealer,
    data as DashboardAnalyticsRpcResponse | null,
    periodDays
  )
}

function buildDashboardStats(
  dealers: DealerDashboardDealer[],
  selectedDealer: DealerDashboardDealer,
  analytics: DashboardAnalyticsRpcResponse | null,
  periodDays: DashboardPeriodDays
): DealerDashboardStats {
  const dailyStats = (analytics?.dailyStats ?? []).map((daily) => ({
    ...daily,
    clickRate: calculateClickRate(daily.clicks, daily.impressions),
  }))

  const adStats = (analytics?.adStats ?? [])
    .map((ad) => ({
      finnAdId: ad.finnAdId,
      title: ad.title,
      adUrl: ad.adUrl ?? undefined,
      impressions: ad.impressions,
      clicks: ad.clicks,
      clickRate: calculateClickRate(ad.clicks, ad.impressions),
      lastSeenAt: ad.lastSeenAt ?? undefined,
    }))
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)

  const totals = analytics?.totals
  const impressions = totals?.impressions ?? 0
  const clicks = totals?.clicks ?? 0

  return {
    periodDays,
    dealers,
    selectedDealer,
    totals: {
      impressions,
      clicks,
      clickRate: calculateClickRate(clicks, impressions),
      activeAds: totals?.activeAds ?? 0,
    },
    dailyStats,
    adStats,
  }
}

function calculateClickRate(clicks: number, impressions: number): number {
  return impressions > 0 ? clicks / impressions : 0
}

export function normalizeDashboardPeriod(value?: string): DashboardPeriodDays {
  if (value === '7' || value === '30' || value === '90' || value === '365') {
    return Number(value) as DashboardPeriodDays
  }

  return 30
}

function getDateDaysAgo(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)

  return date.toISOString().slice(0, 10)
}
