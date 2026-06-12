create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null
);

create unique index admin_users_email_lower_idx
on public.admin_users (lower(email));

alter table public.admin_users enable row level security;

revoke all on public.admin_users from public;
revoke all on public.admin_users from anon;
revoke all on public.admin_users from authenticated;

grant all on public.admin_users to service_role;
