create extension if not exists pgcrypto;

create table if not exists public.platforms (
  slug text primary key,
  title text not null,
  subtitle text not null default '',
  accent_color text not null default '#ff5a1f',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  platform_slug text not null references public.platforms(slug) on update cascade on delete restrict,
  title text not null,
  description text not null,
  account_game_id text,
  account_server_id text,
  account_nickname text,
  account_region text,
  price_uzs bigint not null check (price_uzs > 0),
  status text not null default 'available' check (status in ('available', 'sold', 'hidden')),
  seller_tg_id bigint,
  seller_username text,
  seller_name text,
  is_top boolean not null default false,
  media jsonb not null default '[]'::jsonb check (jsonb_typeof(media) = 'array'),
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  last_error_at timestamptz
);

create index if not exists accounts_platform_status_created_idx
  on public.accounts (platform_slug, status, created_at desc);

create index if not exists accounts_status_created_idx
  on public.accounts (status, created_at desc);

create index if not exists accounts_game_id_idx
  on public.accounts (account_game_id)
  where account_game_id is not null;

create index if not exists bot_users_active_last_seen_idx
  on public.bot_users (is_active, last_seen_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
before update on public.accounts
for each row
execute function public.set_updated_at();

alter table public.platforms enable row level security;
alter table public.accounts enable row level security;
alter table public.bot_users enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.platforms to service_role;
grant select, insert, update, delete on public.accounts to service_role;
grant select, insert, update, delete on public.bot_users to service_role;
grant execute on function public.set_updated_at() to service_role;

insert into public.platforms (slug, title, subtitle, accent_color, sort_order) values
  ('free-fire', 'Free Fire', 'Battle royale akkauntlari', '#ff5a1f', 10),
  ('mobile-legends', 'Mobile Legends', 'Skin, rank va kolleksiya', '#b24cff', 20),
  ('pubg-mobile', 'PUBG Mobile', 'UC, skin va inventar', '#d4a017', 30),
  ('steam', 'Steam', 'Game library va profil', '#1b8a6b', 40),
  ('telegram', 'Telegram', 'Kanal, bot va username', '#4f5d75', 50),
  ('instagram', 'Instagram', 'Auditoriya va sahifalar', '#c23b57', 60)
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  accent_color = excluded.accent_color,
  sort_order = excluded.sort_order,
  is_active = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'account-media',
  'account-media',
  true,
  83886080,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
