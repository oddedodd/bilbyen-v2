import { createSupabaseServerClient } from './supabase-auth'

export interface DealerDashboardDealer {
  id: string
  name: string
  orgId: string
  slug: string
  role: string
}

export interface DealerDashboardStats {
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

interface StatRow {
  dealer_id: string
  finn_ad_id: string
  stat_date: string
  carousel_impressions: number
  ad_clicks: number
  cars: {
    title: string
    ad_url: string | null
    last_seen_at: string | null
  } | null
}

export async function getDealerDashboardStats(
  dealerId?: string
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

  const fromDate = getDateDaysAgo(29)
  const { data: stats, error: statsError } = await supabase
    .from('dealer_ad_daily_stats')
    .select(
      'dealer_id, finn_ad_id, stat_date, carousel_impressions, ad_clicks, cars(title, ad_url, last_seen_at)'
    )
    .eq('dealer_id', selectedDealer.id)
    .gte('stat_date', fromDate)
    .order('stat_date', { ascending: true })

  if (statsError) {
    throw statsError
  }

  return buildDashboardStats(
    dealers,
    selectedDealer,
    (stats ?? []) as unknown as StatRow[]
  )
}

function buildDashboardStats(
  dealers: DealerDashboardDealer[],
  selectedDealer: DealerDashboardDealer,
  stats: StatRow[]
): DealerDashboardStats {
  const dailyByDate = new Map<string, { impressions: number; clicks: number }>()
  const adsById = new Map<
    string,
    {
      title: string
      adUrl?: string
      impressions: number
      clicks: number
      lastSeenAt?: string
    }
  >()

  for (const row of stats) {
    const daily = dailyByDate.get(row.stat_date) ?? {
      impressions: 0,
      clicks: 0,
    }
    daily.impressions += row.carousel_impressions
    daily.clicks += row.ad_clicks
    dailyByDate.set(row.stat_date, daily)

    const ad = adsById.get(row.finn_ad_id) ?? {
      title: row.cars?.title ?? row.finn_ad_id,
      adUrl: row.cars?.ad_url ?? undefined,
      impressions: 0,
      clicks: 0,
      lastSeenAt: row.cars?.last_seen_at ?? undefined,
    }
    ad.impressions += row.carousel_impressions
    ad.clicks += row.ad_clicks
    if (row.cars?.last_seen_at && (!ad.lastSeenAt || row.cars.last_seen_at > ad.lastSeenAt)) {
      ad.lastSeenAt = row.cars.last_seen_at
    }
    adsById.set(row.finn_ad_id, ad)
  }

  const dailyStats = getLast30Dates().map((date) => {
    const daily = dailyByDate.get(date) ?? { impressions: 0, clicks: 0 }

    return {
      date,
      impressions: daily.impressions,
      clicks: daily.clicks,
      clickRate: calculateClickRate(daily.clicks, daily.impressions),
    }
  })

  const adStats = [...adsById.entries()]
    .map(([finnAdId, ad]) => ({
      finnAdId,
      title: ad.title,
      adUrl: ad.adUrl,
      impressions: ad.impressions,
      clicks: ad.clicks,
      clickRate: calculateClickRate(ad.clicks, ad.impressions),
      lastSeenAt: ad.lastSeenAt,
    }))
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)

  const impressions = dailyStats.reduce((sum, day) => sum + day.impressions, 0)
  const clicks = dailyStats.reduce((sum, day) => sum + day.clicks, 0)

  return {
    dealers,
    selectedDealer,
    totals: {
      impressions,
      clicks,
      clickRate: calculateClickRate(clicks, impressions),
      activeAds: adStats.length,
    },
    dailyStats,
    adStats,
  }
}

function calculateClickRate(clicks: number, impressions: number): number {
  return impressions > 0 ? clicks / impressions : 0
}

function getLast30Dates(): string[] {
  return Array.from({ length: 30 }, (_, index) => getDateDaysAgo(29 - index))
}

function getDateDaysAgo(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)

  return date.toISOString().slice(0, 10)
}
