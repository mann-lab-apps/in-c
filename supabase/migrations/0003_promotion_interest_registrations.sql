-- Promotion interest registration intake
-- Reviewed: 2026-08-15
-- Anonymous users may submit interest; public clients must not read rows.

create extension if not exists pgcrypto;

create table if not exists public.promotion_interest_registrations (
  id uuid primary key default gen_random_uuid(),
  applicant_name text not null check (char_length(trim(applicant_name)) between 1 and 80),
  role text not null check (
    role in ('performer', 'planner', 'ensemble', 'other')
  ),
  contact_phone text check (
    contact_phone is null
    or char_length(trim(contact_phone)) between 1 and 80
  ),
  contact_email text check (
    contact_email is null
    or char_length(trim(contact_email)) between 1 and 160
  ),
  contact_instagram text check (
    contact_instagram is null
    or char_length(trim(contact_instagram)) between 1 and 80
  ),
  upcoming_recital text not null check (
    upcoming_recital in ('scheduled', 'planning', 'notYet')
  ),
  help_needed text[] not null default '{}' check (
    cardinality(help_needed) <= 6
    and help_needed <@ array[
      'audienceTarget',
      'copywriting',
      'channels',
      'report',
      'design',
      'notSure'
    ]::text[]
  ),
  notes text not null default '' check (char_length(notes) <= 1600),
  source_path text not null default 'index.html' check (char_length(source_path) <= 120),
  created_at timestamptz not null default now(),
  check (
    nullif(trim(coalesce(contact_phone, '')), '') is not null
    or nullif(trim(coalesce(contact_email, '')), '') is not null
    or nullif(trim(coalesce(contact_instagram, '')), '') is not null
  )
);

create index if not exists promotion_interest_created_at_idx
  on public.promotion_interest_registrations (created_at desc);

alter table public.promotion_interest_registrations enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on public.promotion_interest_registrations to anon, authenticated;

create policy "anonymous promotion interest insert"
  on public.promotion_interest_registrations
  for insert
  with check (true);
