create table if not exists public.app_admins (
  id uuid primary key default gen_random_uuid(),
  tg_user_id bigint unique,
  username text unique,
  role text not null default 'admin' check (role in ('admin', 'superadmin')),
  is_active boolean not null default true,
  added_by_tg_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (tg_user_id is not null or username is not null)
);

create index if not exists app_admins_active_role_idx
  on public.app_admins (is_active, role);

drop trigger if exists app_admins_set_updated_at on public.app_admins;
create trigger app_admins_set_updated_at
before update on public.app_admins
for each row
execute function public.set_updated_at();

alter table public.app_admins enable row level security;

grant select, insert, update, delete on public.app_admins to service_role;
