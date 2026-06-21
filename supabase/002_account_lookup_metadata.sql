alter table public.accounts
  add column if not exists account_game_id text,
  add column if not exists account_server_id text,
  add column if not exists account_nickname text,
  add column if not exists account_region text;

create index if not exists accounts_game_id_idx
  on public.accounts (account_game_id)
  where account_game_id is not null;
