create extension if not exists pgcrypto with schema extensions;

create table public.dealers (
  id uuid primary key default extensions.gen_random_uuid(),
  org_id text not null unique,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.dealer_users (
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (dealer_id, user_id),
  constraint dealer_users_role_check check (role in ('owner', 'viewer'))
);

create table public.cars (
  finn_ad_id text primary key,
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  title text not null,
  ad_url text,
  image_url text,
  make text,
  model text,
  year integer,
  price integer,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  finn_ad_id text not null references public.cars(finn_ad_id) on delete cascade,
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  group_slug text not null,
  page_path text not null,
  carousel_key text,
  position integer,
  session_id_hash text,
  occurred_at timestamptz not null default now(),
  constraint analytics_events_event_type_check check (
    event_type in ('carousel_impression', 'ad_click')
  )
);

create table public.dealer_ad_daily_stats (
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  finn_ad_id text not null references public.cars(finn_ad_id) on delete cascade,
  stat_date date not null,
  carousel_impressions integer not null default 0,
  ad_clicks integer not null default 0,
  unique_sessions integer not null default 0,
  primary key (dealer_id, finn_ad_id, stat_date)
);

create index dealers_org_id_idx on public.dealers(org_id);
create index dealer_users_user_id_idx on public.dealer_users(user_id);
create index cars_dealer_id_idx on public.cars(dealer_id);
create index analytics_events_dealer_occurred_idx
  on public.analytics_events(dealer_id, occurred_at desc);
create index analytics_events_finn_ad_occurred_idx
  on public.analytics_events(finn_ad_id, occurred_at desc);
create index dealer_ad_daily_stats_dealer_date_idx
  on public.dealer_ad_daily_stats(dealer_id, stat_date desc);

alter table public.dealers enable row level security;
alter table public.dealer_users enable row level security;
alter table public.cars enable row level security;
alter table public.analytics_events enable row level security;
alter table public.dealer_ad_daily_stats enable row level security;

create function public.current_user_dealer_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select dealer_id
  from public.dealer_users
  where user_id = auth.uid()
$$;

create policy "Dealer users can view their dealers"
on public.dealers
for select
to authenticated
using (id in (select public.current_user_dealer_ids()));

create policy "Dealer users can view their memberships"
on public.dealer_users
for select
to authenticated
using (dealer_id in (select public.current_user_dealer_ids()));

create policy "Dealer users can view their cars"
on public.cars
for select
to authenticated
using (dealer_id in (select public.current_user_dealer_ids()));

create policy "Dealer users can view their daily stats"
on public.dealer_ad_daily_stats
for select
to authenticated
using (dealer_id in (select public.current_user_dealer_ids()));

revoke execute on function public.current_user_dealer_ids() from public;
grant execute on function public.current_user_dealer_ids() to authenticated;

grant select on public.dealers to authenticated;
grant select on public.dealer_users to authenticated;
grant select on public.cars to authenticated;
grant select on public.dealer_ad_daily_stats to authenticated;

grant all on public.dealers to service_role;
grant all on public.dealer_users to service_role;
grant all on public.cars to service_role;
grant all on public.analytics_events to service_role;
grant all on public.dealer_ad_daily_stats to service_role;
grant usage, select on sequence public.analytics_events_id_seq to service_role;

insert into public.dealers (org_id, name, slug)
values
  ('903902014', 'Bilsenteret', 'bilsenteret'),
  ('1401679938', 'Høylandet Auto', 'hoylandet-auto'),
  ('2068682021', 'Otto Moe', 'otto-moe'),
  ('2038393302', 'Sannan Bil', 'sannan-bil'),
  ('1784917547', 'Steinkjer Bil', 'steinkjer-bil'),
  ('756031412', 'Slatlem Verdal', 'slatlem-verdal')
on conflict (org_id) do update
set
  name = excluded.name,
  slug = excluded.slug;
