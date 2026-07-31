-- Community board MVP schema
-- Reviewed: 2026-07-31
-- Apply only after explicit approval to create/configure a Supabase project.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  profile_image_url text,
  bio text not null default '',
  role text not null default 'user' check (
    role in ('user', 'creator', 'organizer', 'moderator', 'admin')
  ),
  status text not null default 'active' check (
    status in ('active', 'hidden', 'suspended')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references public.profiles(user_id) on delete cascade,
  category text not null default 'general' check (
    category in ('notice', 'question', 'feedback', 'general')
  ),
  title text not null check (char_length(trim(title)) between 2 and 120),
  body text not null check (char_length(trim(body)) between 2 and 5000),
  status text not null default 'public' check (
    status in ('public', 'private', 'hidden')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_user_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  status text not null default 'public' check (
    status in ('public', 'hidden')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_public_recent_idx
  on public.community_posts (created_at desc)
  where status = 'public';

create index if not exists community_posts_category_recent_idx
  on public.community_posts (category, created_at desc)
  where status = 'public';

create index if not exists community_comments_post_recent_idx
  on public.community_comments (post_id, created_at)
  where status = 'public';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at
  before update on public.community_posts
  for each row
  execute function public.set_updated_at();

drop trigger if exists community_comments_set_updated_at on public.community_comments;
create trigger community_comments_set_updated_at
  before update on public.community_comments
  for each row
  execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select on public.community_posts to anon, authenticated;
grant insert, update, delete on public.community_posts to authenticated;
grant select on public.community_comments to anon, authenticated;
grant insert, update, delete on public.community_comments to authenticated;

create policy "active profiles are readable" on public.profiles
  for select using (status = 'active');

create policy "users can insert own profile" on public.profiles
  for insert with check (
    auth.uid() = user_id
    and role = 'user'
    and status = 'active'
  );

create policy "users can update own profile basics" on public.profiles
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and role = 'user'
    and status = 'active'
  );

create policy "public community posts are readable" on public.community_posts
  for select using (status = 'public' or auth.uid() = author_user_id);

create policy "authenticated users can create community posts" on public.community_posts
  for insert with check (
    auth.uid() = author_user_id
    and status in ('public', 'private')
    and (
      category <> 'notice'
      or exists (
        select 1
        from public.profiles
        where profiles.user_id = auth.uid()
          and profiles.role in ('moderator', 'admin')
      )
    )
  );

create policy "owners can update own community posts" on public.community_posts
  for update using (auth.uid() = author_user_id)
  with check (
    auth.uid() = author_user_id
    and status in ('public', 'private')
    and (
      category <> 'notice'
      or exists (
        select 1
        from public.profiles
        where profiles.user_id = auth.uid()
          and profiles.role in ('moderator', 'admin')
      )
    )
  );

create policy "owners can delete own community posts" on public.community_posts
  for delete using (auth.uid() = author_user_id);

create policy "public community comments are readable" on public.community_comments
  for select using (
    status = 'public'
    and exists (
      select 1
      from public.community_posts
      where community_posts.id = community_comments.post_id
        and community_posts.status = 'public'
    )
  );

create policy "authenticated users can create community comments" on public.community_comments
  for insert with check (
    auth.uid() = author_user_id
    and status = 'public'
    and exists (
      select 1
      from public.community_posts
      where community_posts.id = community_comments.post_id
        and community_posts.status = 'public'
    )
  );

create policy "owners can update own community comments" on public.community_comments
  for update using (auth.uid() = author_user_id)
  with check (
    auth.uid() = author_user_id
    and status = 'public'
  );

create policy "owners can delete own community comments" on public.community_comments
  for delete using (auth.uid() = author_user_id);
