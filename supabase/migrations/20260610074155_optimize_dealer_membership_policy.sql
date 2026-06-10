drop policy if exists "Dealer users can view their own memberships" on public.dealer_users;

create policy "Dealer users can view their own memberships"
on public.dealer_users
for select
to authenticated
using (user_id = (select auth.uid()));
