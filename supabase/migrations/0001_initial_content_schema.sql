-- in C Supabase MVP content schema
-- Reviewed: 2026-07-14
-- Apply only after explicit approval to create/configure a Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.works (
  id text primary key,
  slug text unique not null,
  title text not null,
  original_title text,
  summary text not null,
  era text,
  genre text,
  copyright_status text not null,
  status text not null default 'draft' check (status in ('draft', 'public', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creators (
  id text primary key,
  slug text unique not null,
  display_name text not null,
  roles text[] not null default '{}',
  summary text not null,
  status text not null default 'draft' check (status in ('draft', 'public', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.columns (
  slug text primary key,
  title text not null,
  summary text not null,
  category text not null,
  published_at date,
  status text not null default 'draft' check (status in ('draft', 'public', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scores (
  slug text primary key,
  title text not null,
  work_id text references public.works(id) on delete set null,
  musicxml_path text not null,
  chromatics_path text not null,
  copyright_note text not null,
  status text not null default 'draft' check (status in ('draft', 'public', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.concerts (
  id text primary key,
  slug text unique not null,
  title text not null,
  starts_at timestamptz,
  venue text,
  city text,
  preview_note text not null,
  external_url text,
  status text not null default 'draft' check (status in ('draft', 'public', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classes (
  id text primary key,
  slug text unique not null,
  title text not null,
  format text not null,
  level text not null,
  summary text not null,
  status text not null default 'draft' check (status in ('draft', 'public', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_creators (
  work_id text not null references public.works(id) on delete cascade,
  creator_id text not null references public.creators(id) on delete cascade,
  role text not null default 'related',
  primary key (work_id, creator_id, role)
);

create table if not exists public.work_columns (
  work_id text not null references public.works(id) on delete cascade,
  column_slug text not null references public.columns(slug) on delete cascade,
  primary key (work_id, column_slug)
);

create table if not exists public.concert_works (
  concert_id text not null references public.concerts(id) on delete cascade,
  work_id text not null references public.works(id) on delete cascade,
  primary key (concert_id, work_id)
);

create table if not exists public.class_works (
  class_id text not null references public.classes(id) on delete cascade,
  work_id text not null references public.works(id) on delete cascade,
  primary key (class_id, work_id)
);

create table if not exists public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_slug text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

alter table public.works enable row level security;
alter table public.creators enable row level security;
alter table public.columns enable row level security;
alter table public.scores enable row level security;
alter table public.concerts enable row level security;
alter table public.classes enable row level security;
alter table public.work_creators enable row level security;
alter table public.work_columns enable row level security;
alter table public.concert_works enable row level security;
alter table public.class_works enable row level security;
alter table public.feedback_events enable row level security;

create policy "public works are readable" on public.works
  for select using (status = 'public');
create policy "public creators are readable" on public.creators
  for select using (status = 'public');
create policy "public columns are readable" on public.columns
  for select using (status = 'public');
create policy "public scores are readable" on public.scores
  for select using (status = 'public');
create policy "public concerts are readable" on public.concerts
  for select using (status = 'public');
create policy "public classes are readable" on public.classes
  for select using (status = 'public');

create policy "relationship tables are readable" on public.work_creators
  for select using (true);
create policy "work columns are readable" on public.work_columns
  for select using (true);
create policy "concert works are readable" on public.concert_works
  for select using (true);
create policy "class works are readable" on public.class_works
  for select using (true);

create policy "anonymous feedback insert" on public.feedback_events
  for insert with check (true);

