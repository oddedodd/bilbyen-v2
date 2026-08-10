create function public.get_admin_analytics_overview(
  p_group_slug text,
  p_from_date date
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with selected_dealers as (
    select id, org_id, name, group_slug
    from public.dealers
    where p_group_slug = 'all'
      or group_slug = p_group_slug
  ),
  filtered_stats as (
    select stats.*
    from public.dealer_ad_daily_stats stats
    join selected_dealers dealers on dealers.id = stats.dealer_id
    where stats.stat_date >= p_from_date
  ),
  daily_stats as (
    select
      days.stat_date,
      coalesce(sum(stats.carousel_impressions), 0)::integer as impressions,
      coalesce(sum(stats.ad_clicks), 0)::integer as clicks
    from generate_series(p_from_date, current_date, interval '1 day') days(stat_date)
    left join filtered_stats stats on stats.stat_date = days.stat_date::date
    group by days.stat_date
  ),
  dealer_stats as (
    select
      dealers.id as dealer_id,
      dealers.name,
      dealers.org_id,
      dealers.group_slug,
      coalesce(sum(stats.carousel_impressions), 0)::integer as impressions,
      coalesce(sum(stats.ad_clicks), 0)::integer as clicks,
      coalesce(sum(stats.unique_sessions), 0)::integer as unique_sessions,
      count(distinct stats.finn_ad_id)::integer as active_ads
    from selected_dealers dealers
    left join filtered_stats stats on stats.dealer_id = dealers.id
    group by dealers.id, dealers.name, dealers.org_id, dealers.group_slug
  ),
  totals as (
    select
      coalesce((select sum(impressions) from dealer_stats), 0)::integer as impressions,
      coalesce((select sum(clicks) from dealer_stats), 0)::integer as clicks,
      coalesce((select sum(unique_sessions) from dealer_stats), 0)::integer as unique_sessions,
      coalesce((select count(distinct (dealer_id, finn_ad_id)) from filtered_stats), 0)::integer as active_ads,
      coalesce((
        select count(*)
        from dealer_stats
        where impressions > 0 or clicks > 0
      ), 0)::integer as active_dealers
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'impressions', totals.impressions,
      'clicks', totals.clicks,
      'uniqueSessions', totals.unique_sessions,
      'activeAds', totals.active_ads,
      'activeDealers', totals.active_dealers
    ),
    'dailyStats', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'date', daily_stats.stat_date::date::text,
          'impressions', daily_stats.impressions,
          'clicks', daily_stats.clicks
        )
        order by daily_stats.stat_date desc
      )
      from daily_stats
    ), '[]'::jsonb),
    'dealerStats', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'dealerId', dealer_stats.dealer_id,
          'name', dealer_stats.name,
          'orgId', dealer_stats.org_id,
          'groupSlug', dealer_stats.group_slug,
          'impressions', dealer_stats.impressions,
          'clicks', dealer_stats.clicks,
          'uniqueSessions', dealer_stats.unique_sessions,
          'activeAds', dealer_stats.active_ads
        )
        order by dealer_stats.name
      )
      from dealer_stats
    ), '[]'::jsonb)
  )
  from totals;
$$;

create function public.get_dealer_dashboard_analytics(
  p_dealer_id uuid,
  p_from_date date
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with filtered_stats as (
    select stats.*
    from public.dealer_ad_daily_stats stats
    where stats.dealer_id = p_dealer_id
      and stats.stat_date >= p_from_date
  ),
  daily_stats as (
    select
      days.stat_date,
      coalesce(sum(stats.carousel_impressions), 0)::integer as impressions,
      coalesce(sum(stats.ad_clicks), 0)::integer as clicks
    from generate_series(p_from_date, current_date, interval '1 day') days(stat_date)
    left join filtered_stats stats on stats.stat_date = days.stat_date::date
    group by days.stat_date
  ),
  ad_stats as (
    select
      stats.finn_ad_id,
      coalesce(max(cars.title), stats.finn_ad_id) as title,
      max(cars.ad_url) as ad_url,
      sum(stats.carousel_impressions)::integer as impressions,
      sum(stats.ad_clicks)::integer as clicks,
      max(cars.last_seen_at) as last_seen_at
    from filtered_stats stats
    left join public.cars cars on cars.finn_ad_id = stats.finn_ad_id
    group by stats.finn_ad_id
  ),
  totals as (
    select
      coalesce(sum(daily_stats.impressions), 0)::integer as impressions,
      coalesce(sum(daily_stats.clicks), 0)::integer as clicks,
      coalesce((select count(*) from ad_stats), 0)::integer as active_ads
    from daily_stats
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'impressions', totals.impressions,
      'clicks', totals.clicks,
      'activeAds', totals.active_ads
    ),
    'dailyStats', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'date', daily_stats.stat_date::date::text,
          'impressions', daily_stats.impressions,
          'clicks', daily_stats.clicks
        )
        order by daily_stats.stat_date desc
      )
      from daily_stats
    ), '[]'::jsonb),
    'adStats', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'finnAdId', ad_stats.finn_ad_id,
          'title', ad_stats.title,
          'adUrl', ad_stats.ad_url,
          'impressions', ad_stats.impressions,
          'clicks', ad_stats.clicks,
          'lastSeenAt', ad_stats.last_seen_at
        )
        order by ad_stats.clicks desc, ad_stats.impressions desc
      )
      from ad_stats
    ), '[]'::jsonb)
  )
  from totals;
$$;

revoke execute on function public.get_admin_analytics_overview(text, date) from public;
revoke execute on function public.get_dealer_dashboard_analytics(uuid, date) from public;

grant execute on function public.get_admin_analytics_overview(text, date) to service_role;
grant execute on function public.get_dealer_dashboard_analytics(uuid, date) to authenticated;
