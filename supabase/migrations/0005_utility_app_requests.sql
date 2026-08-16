-- Utility app request intake
-- Reviewed: 2026-08-16
-- Anonymous users may submit small public tool ideas; public clients must not read rows.

create extension if not exists pgcrypto;

create table if not exists public.utility_app_requests (
  id uuid primary key default gen_random_uuid(),
  applicant_name text not null check (char_length(trim(applicant_name)) between 1 and 80),
  role text not null check (
    role in ('performer', 'teacher', 'student', 'ensemble', 'planner', 'other')
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
  activity_context text not null check (
    activity_context in ('practice', 'lesson', 'rehearsal', 'performance', 'promotion', 'other')
  ),
  problem_frequency text not null check (
    problem_frequency in ('daily', 'weekly', 'perProject', 'occasional')
  ),
  problem_description text not null check (char_length(trim(problem_description)) between 1 and 1600),
  current_workaround text not null default '' check (char_length(current_workaround) <= 1000),
  desired_tool text not null default '' check (char_length(desired_tool) <= 1000),
  expected_users text[] not null default '{}' check (
    cardinality(expected_users) <= 3
    and expected_users <@ array['self', 'team', 'public']::text[]
  ),
  source_path text not null default 'utility-apps.html' check (char_length(source_path) <= 120),
  review_status text not null default 'new' check (
    review_status in ('new', 'contacted', 'selected', 'archived')
  ),
  reviewed_at timestamptz,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    nullif(trim(coalesce(contact_phone, '')), '') is not null
    or nullif(trim(coalesce(contact_email, '')), '') is not null
    or nullif(trim(coalesce(contact_instagram, '')), '') is not null
  )
);

create index if not exists utility_app_requests_created_at_idx
  on public.utility_app_requests (created_at desc);

create index if not exists utility_app_requests_review_status_created_at_idx
  on public.utility_app_requests (review_status, created_at desc);

alter table public.utility_app_requests enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on public.utility_app_requests to anon, authenticated;
grant select on public.utility_app_requests to authenticated;
grant update (review_status, reviewed_at, reviewer_user_id)
  on public.utility_app_requests to authenticated;

create policy "anonymous utility app request insert"
  on public.utility_app_requests
  for insert
  with check (true);

create policy "admins can read utility app requests"
  on public.utility_app_requests
  for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.role = 'admin'
        and profiles.status = 'active'
    )
  );

create policy "admins can update utility app request review status"
  on public.utility_app_requests
  for update
  using (
    exists (
      select 1
      from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.role = 'admin'
        and profiles.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.role = 'admin'
        and profiles.status = 'active'
    )
  );
