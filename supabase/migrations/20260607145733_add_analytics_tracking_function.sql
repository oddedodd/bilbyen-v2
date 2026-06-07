create function public.record_analytics_event(
  p_event_type text,
  p_finn_ad_id text,
  p_org_id text,
  p_title text,
  p_group_slug text,
  p_page_path text,
  p_carousel_key text default null,
  p_position integer default null,
  p_session_id_hash text default null,
  p_ad_url text default null,
  p_image_url text default null,
  p_make text default null,
  p_model text default null,
  p_year integer default null,
  p_price integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dealer_id uuid;
  v_stat_date date := current_date;
begin
  if p_event_type not in ('carousel_impression', 'ad_click') then
    raise exception 'Invalid analytics event type: %', p_event_type;
  end if;

  select id into v_dealer_id
  from public.dealers
  where org_id = p_org_id;

  if v_dealer_id is null then
    raise exception 'Unknown dealer org_id: %', p_org_id;
  end if;

  insert into public.cars (
    finn_ad_id,
    dealer_id,
    title,
    ad_url,
    image_url,
    make,
    model,
    year,
    price,
    last_seen_at
  )
  values (
    p_finn_ad_id,
    v_dealer_id,
    p_title,
    p_ad_url,
    p_image_url,
    p_make,
    p_model,
    p_year,
    p_price,
    now()
  )
  on conflict (finn_ad_id) do update
  set
    dealer_id = excluded.dealer_id,
    title = excluded.title,
    ad_url = excluded.ad_url,
    image_url = excluded.image_url,
    make = excluded.make,
    model = excluded.model,
    year = excluded.year,
    price = excluded.price,
    last_seen_at = now();

  insert into public.analytics_events (
    event_type,
    finn_ad_id,
    dealer_id,
    group_slug,
    page_path,
    carousel_key,
    position,
    session_id_hash
  )
  values (
    p_event_type,
    p_finn_ad_id,
    v_dealer_id,
    p_group_slug,
    p_page_path,
    p_carousel_key,
    p_position,
    p_session_id_hash
  );

  insert into public.dealer_ad_daily_stats (
    dealer_id,
    finn_ad_id,
    stat_date,
    carousel_impressions,
    ad_clicks,
    unique_sessions
  )
  values (
    v_dealer_id,
    p_finn_ad_id,
    v_stat_date,
    case when p_event_type = 'carousel_impression' then 1 else 0 end,
    case when p_event_type = 'ad_click' then 1 else 0 end,
    case when p_session_id_hash is null then 0 else 1 end
  )
  on conflict (dealer_id, finn_ad_id, stat_date) do update
  set
    carousel_impressions =
      public.dealer_ad_daily_stats.carousel_impressions + excluded.carousel_impressions,
    ad_clicks = public.dealer_ad_daily_stats.ad_clicks + excluded.ad_clicks;

  update public.dealer_ad_daily_stats
  set unique_sessions = (
    select count(distinct session_id_hash)::integer
    from public.analytics_events
    where dealer_id = v_dealer_id
      and finn_ad_id = p_finn_ad_id
      and occurred_at >= v_stat_date::timestamptz
      and occurred_at < (v_stat_date + 1)::timestamptz
      and session_id_hash is not null
  )
  where dealer_id = v_dealer_id
    and finn_ad_id = p_finn_ad_id
    and stat_date = v_stat_date;
end;
$$;

revoke execute on function public.record_analytics_event(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer
) from public;

grant execute on function public.record_analytics_event(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer
) to service_role;
