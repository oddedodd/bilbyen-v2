alter table public.dealers
drop constraint if exists dealers_group_slug_check;

alter table public.dealers
add constraint dealers_group_slug_check
check (group_slug in ('bilbyen', 'bruktbil-trondelag', 'inactive'));
