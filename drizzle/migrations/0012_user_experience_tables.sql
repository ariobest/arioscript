-- ARIO user experience tables: account preferences, script comments, and saved collections.
-- Safe to apply more than once; existing tables and policies are retained.

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('system','dark','light','royal-blue','midnight','ocean')),
  email_notifications boolean not null default true,
  public_profile boolean not null default true,
  compact_layout boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.script_comments (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.scripts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists script_comments_script_created_idx on public.script_comments(script_id, created_at desc);
create index if not exists script_comments_user_idx on public.script_comments(user_id);

create table if not exists public.script_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);
create index if not exists script_collections_user_idx on public.script_collections(user_id);

create table if not exists public.script_collection_items (
  collection_id uuid not null references public.script_collections(id) on delete cascade,
  script_id uuid not null references public.scripts(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (collection_id, script_id)
);
create index if not exists script_collection_items_script_idx on public.script_collection_items(script_id);

alter table public.user_preferences enable row level security;
alter table public.script_comments enable row level security;
alter table public.script_collections enable row level security;
alter table public.script_collection_items enable row level security;

revoke all on public.user_preferences, public.script_comments, public.script_collections, public.script_collection_items from anon, authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.script_comments to authenticated;
grant select, insert, update, delete on public.script_collections to authenticated;
grant select, insert, update, delete on public.script_collection_items to authenticated;
grant select on public.script_comments, public.script_collections, public.script_collection_items to anon;

drop policy if exists user_preferences_owner_all on public.user_preferences;
create policy user_preferences_owner_all on public.user_preferences for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists script_comments_read_public_or_owner_or_staff on public.script_comments;
create policy script_comments_read_public_or_owner_or_staff on public.script_comments for select to anon, authenticated
  using (
    (exists (select 1 from public.scripts s where s.id = script_id and s.published = true and s.archived = false))
    or (select auth.uid()) = user_id
    or (select public.is_staff((select auth.uid())))
  );

drop policy if exists script_comments_insert_own on public.script_comments;
create policy script_comments_insert_own on public.script_comments for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.scripts s where s.id = script_id and s.published = true and s.archived = false)
  );

drop policy if exists script_comments_update_own_or_staff on public.script_comments;
create policy script_comments_update_own_or_staff on public.script_comments for update to authenticated
  using ((select auth.uid()) = user_id or (select public.is_staff((select auth.uid()))))
  with check ((select auth.uid()) = user_id or (select public.is_staff((select auth.uid()))));

drop policy if exists script_comments_delete_own_or_staff on public.script_comments;
create policy script_comments_delete_own_or_staff on public.script_comments for delete to authenticated
  using ((select auth.uid()) = user_id or (select public.is_staff((select auth.uid()))));

drop policy if exists script_collections_read_owner_or_public on public.script_collections;
create policy script_collections_read_owner_or_public on public.script_collections for select to anon, authenticated
  using (is_public = true or (select auth.uid()) = user_id or (select public.is_staff((select auth.uid()))));

drop policy if exists script_collections_insert_own on public.script_collections;
create policy script_collections_insert_own on public.script_collections for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists script_collections_update_own_or_staff on public.script_collections;
create policy script_collections_update_own_or_staff on public.script_collections for update to authenticated
  using ((select auth.uid()) = user_id or (select public.is_staff((select auth.uid()))))
  with check ((select auth.uid()) = user_id or (select public.is_staff((select auth.uid()))));

drop policy if exists script_collections_delete_own_or_staff on public.script_collections;
create policy script_collections_delete_own_or_staff on public.script_collections for delete to authenticated
  using ((select auth.uid()) = user_id or (select public.is_staff((select auth.uid()))));

drop policy if exists script_collection_items_read_visible_collection on public.script_collection_items;
create policy script_collection_items_read_visible_collection on public.script_collection_items for select to anon, authenticated
  using (exists (
    select 1 from public.script_collections c
    where c.id = collection_id
      and (c.is_public = true or c.user_id = (select auth.uid()) or (select public.is_staff((select auth.uid()))))
  ));

drop policy if exists script_collection_items_insert_owner on public.script_collection_items;
create policy script_collection_items_insert_owner on public.script_collection_items for insert to authenticated
  with check (exists (
    select 1 from public.script_collections c
    where c.id = collection_id and c.user_id = (select auth.uid())
  ));

drop policy if exists script_collection_items_delete_owner on public.script_collection_items;
create policy script_collection_items_delete_owner on public.script_collection_items for delete to authenticated
  using (exists (
    select 1 from public.script_collections c
    where c.id = collection_id and (c.user_id = (select auth.uid()) or (select public.is_staff((select auth.uid()))))
  ));
