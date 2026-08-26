-- Promotion interest admin review access
-- Reviewed: 2026-08-15
-- Admin users can read submissions and mark review state.

alter table public.promotion_interest_registrations
  add column if not exists review_status text not null default 'new' check (
    review_status in ('new', 'contacted', 'archived')
  ),
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewer_user_id uuid references auth.users(id) on delete set null;

create index if not exists promotion_interest_review_status_created_at_idx
  on public.promotion_interest_registrations (review_status, created_at desc);

grant select on public.promotion_interest_registrations to authenticated;
grant update (review_status, reviewed_at, reviewer_user_id)
  on public.promotion_interest_registrations to authenticated;

drop policy if exists "admins can read promotion interest registrations"
  on public.promotion_interest_registrations;
create policy "admins can read promotion interest registrations"
  on public.promotion_interest_registrations
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

drop policy if exists "admins can update promotion interest review status"
  on public.promotion_interest_registrations;
create policy "admins can update promotion interest review status"
  on public.promotion_interest_registrations
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
