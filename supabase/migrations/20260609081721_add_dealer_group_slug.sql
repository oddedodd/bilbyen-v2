alter table public.dealers
add column if not exists group_slug text;

update public.dealers
set group_slug = 'bilbyen'
where org_id in ('903902014', '1401679938', '2068682021');

update public.dealers
set group_slug = 'bruktbil-trondelag'
where org_id in ('2038393302', '1784917547', '756031412');

update public.dealers
set group_slug = 'bilbyen'
where group_slug is null;

alter table public.dealers
alter column group_slug set not null;

alter table public.dealers
drop constraint if exists dealers_group_slug_check;

alter table public.dealers
add constraint dealers_group_slug_check
check (group_slug in ('bilbyen', 'bruktbil-trondelag'));

create index if not exists dealers_group_slug_idx
on public.dealers(group_slug);
