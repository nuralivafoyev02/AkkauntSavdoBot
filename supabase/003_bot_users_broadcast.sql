create table if not exists public.bot_users (
  tg_user_id bigint primary key,
  chat_id bigint not null unique,
  username text,
  first_name text,
  last_name text,
  language_code text,
  is_bot boolean not null default false,
  is_active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_error text,
  last_error_at timestamptzа
);

create index if not exists bot_users_active_last_seen_idx
  on public.bot_users (is_active, last_seen_at desc);

alter table public.bot_users enable row level security;

grant select, insert, update, delete on public.bot_users to service_role;
