create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create or replace function private.current_user_dealer_ids()
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

revoke execute on function private.current_user_dealer_ids() from public;
revoke execute on function private.current_user_dealer_ids() from anon;
revoke execute on function private.current_user_dealer_ids() from authenticated;
grant usage on schema private to authenticated;
grant execute on function private.current_user_dealer_ids() to authenticated;

drop policy if exists "Dealer users can view their dealers" on public.dealers;
drop policy if exists "Dealer users can view their memberships" on public.dealer_users;
drop policy if exists "Dealer users can view their cars" on public.cars;
drop policy if exists "Dealer users can view their daily stats" on public.dealer_ad_daily_stats;
drop policy if exists "No client access to analytics events" on public.analytics_events;

create policy "Dealer users can view their dealers"
on public.dealers
for select
to authenticated
using (id in (select private.current_user_dealer_ids()));

create policy "Dealer users can view their own memberships"
on public.dealer_users
for select
to authenticated
using (user_id = auth.uid());

create policy "Dealer users can view their cars"
on public.cars
for select
to authenticated
using (dealer_id in (select private.current_user_dealer_ids()));

create policy "Dealer users can view their daily stats"
on public.dealer_ad_daily_stats
for select
to authenticated
using (dealer_id in (select private.current_user_dealer_ids()));

create policy "No client access to analytics events"
on public.analytics_events
for all
to anon, authenticated
using (false)
with check (false);

revoke all on all tables in schema public from public;
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from public;
revoke all on all sequences in schema public from anon;
revoke all on all sequences in schema public from authenticated;
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

grant usage on schema public to anon, authenticated;
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

drop function if exists public.current_user_dealer_ids();

create index if not exists dealer_ad_daily_stats_finn_ad_id_idx
on public.dealer_ad_daily_stats(finn_ad_id);
