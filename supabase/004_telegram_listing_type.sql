alter table public.accounts
  add column if not exists listing_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_listing_type_check'
      and conrelid = 'public.accounts'::regclass
  ) then
    alter table public.accounts
      add constraint accounts_listing_type_check
      check (listing_type is null or listing_type in ('nft', 'username'));
  end if;
end;
$$;

create index if not exists accounts_platform_listing_status_created_idx
  on public.accounts (platform_slug, listing_type, status, created_at desc)
  where listing_type is not null;
