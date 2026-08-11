-- ============================================================
-- SkillCircle — Phase 1 schema (Supabase / Postgres)
-- Run this in Supabase SQL Editor once, on a fresh project.
-- ============================================================

-- ---------- USERS ----------
-- Supabase Auth already has auth.users. We extend it with a profile row.
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  avatar_url text,
  is_developer boolean not null default false,
  status text not null default 'active'
    check (status in ('active','on_leave_review','removed')),
  created_at timestamptz not null default now()
);

-- ---------- INVITES ----------
-- Since sign-up is closed, the Developer pre-creates an invite row.
-- App checks this table before allowing account creation.
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  invited_by uuid references public.users(id),
  used boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- SKILLS ----------
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  teacher_id uuid not null references public.users(id),
  start_date date not null default current_date,
  duration_days int not null default 30,
  status text not null default 'in_progress'
    check (status in ('in_progress','completed','abandoned')),
  cover_image text,
  created_at timestamptz not null default now()
);

-- ---------- DAILY REPORTS ----------
create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  day_number int not null,
  content_richtext text not null,
  attachment_url text,
  submitted_at timestamptz not null default now(),
  status text not null default 'pending_review'
    check (status in ('pending_review','approved','rejected')),
  reviewed_by uuid references public.users(id),
  reviewer_notes text,
  is_late boolean not null default false,
  unique (skill_id, day_number)
);

-- ---------- FINAL TIPS (day 30 shortcut/tips) ----------
create table public.skill_final_tips (
  skill_id uuid primary key references public.skills(id) on delete cascade,
  tips_richtext text not null,
  submitted_at timestamptz not null default now(),
  status text not null default 'pending_review'
    check (status in ('pending_review','approved','rejected')),
  reviewed_by uuid references public.users(id)
);

-- ---------- ENROLLMENTS ----------
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.users(id),
  skill_id uuid not null references public.skills(id) on delete cascade,
  current_day int not null default 0,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (learner_id, skill_id)
);

-- ---------- LEAVES (missed-day tracking, used in Phase 2) ----------
create table public.teacher_leaves (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  day_number int not null,
  missed_at timestamptz not null default now(),
  reason text,
  auto_flagged boolean not null default true
);

-- ============================================================
-- ROW LEVEL SECURITY
-- This is what actually enforces "locked until approved + complete"
-- at the database level, not just hidden in the app UI.
-- ============================================================

alter table public.users enable row level security;
alter table public.skills enable row level security;
alter table public.daily_reports enable row level security;
alter table public.skill_final_tips enable row level security;
alter table public.enrollments enable row level security;
alter table public.teacher_leaves enable row level security;

-- Helper: is the current user a developer?
create or replace function public.is_developer()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_developer from public.users where id = auth.uid()),
    false
  );
$$;

-- USERS: everyone can read basic profiles (for public profile / catalog),
-- only the user themself or a developer can update.
create policy "users_select_all" on public.users
  for select using (true);

create policy "users_update_self_or_dev" on public.users
  for update using (auth.uid() = id or public.is_developer());

-- SKILLS: catalog is browsable by everyone (title/desc always visible).
create policy "skills_select_all" on public.skills
  for select using (true);

create policy "skills_insert_self" on public.skills
  for insert with check (auth.uid() = teacher_id);

create policy "skills_update_teacher_or_dev" on public.skills
  for update using (auth.uid() = teacher_id or public.is_developer());

-- DAILY REPORTS: the core gate.
-- - Teacher can see/insert/update their own skill's reports (any status).
-- - Developer can see/update everything (for the approval queue).
-- - Everyone else (learners) can ONLY see reports with status = 'approved'.
create policy "reports_select_approved_or_owner_or_dev" on public.daily_reports
  for select using (
    status = 'approved'
    or public.is_developer()
    or exists (
      select 1 from public.skills s
      where s.id = daily_reports.skill_id and s.teacher_id = auth.uid()
    )
  );

create policy "reports_insert_teacher" on public.daily_reports
  for insert with check (
    exists (
      select 1 from public.skills s
      where s.id = daily_reports.skill_id and s.teacher_id = auth.uid()
    )
  );

create policy "reports_update_teacher_or_dev" on public.daily_reports
  for update using (
    public.is_developer()
    or exists (
      select 1 from public.skills s
      where s.id = daily_reports.skill_id and s.teacher_id = auth.uid()
    )
  );

-- FINAL TIPS: same pattern as reports.
create policy "tips_select_approved_or_owner_or_dev" on public.skill_final_tips
  for select using (
    status = 'approved'
    or public.is_developer()
    or exists (
      select 1 from public.skills s
      where s.id = skill_final_tips.skill_id and s.teacher_id = auth.uid()
    )
  );

create policy "tips_insert_teacher" on public.skill_final_tips
  for insert with check (
    exists (
      select 1 from public.skills s
      where s.id = skill_final_tips.skill_id and s.teacher_id = auth.uid()
    )
  );

create policy "tips_update_teacher_or_dev" on public.skill_final_tips
  for update using (
    public.is_developer()
    or exists (
      select 1 from public.skills s
      where s.id = skill_final_tips.skill_id and s.teacher_id = auth.uid()
    )
  );

-- ENROLLMENTS: learners manage their own; developer sees all.
create policy "enrollments_select_self_or_dev" on public.enrollments
  for select using (auth.uid() = learner_id or public.is_developer());

create policy "enrollments_insert_self" on public.enrollments
  for insert with check (auth.uid() = learner_id);

create policy "enrollments_update_self_or_dev" on public.enrollments
  for update using (auth.uid() = learner_id or public.is_developer());

-- TEACHER LEAVES: teacher of that skill + developer only.
create policy "leaves_select_teacher_or_dev" on public.teacher_leaves
  for select using (
    public.is_developer()
    or exists (
      select 1 from public.skills s
      where s.id = teacher_leaves.skill_id and s.teacher_id = auth.uid()
    )
  );

-- ============================================================
-- AUTO-CREATE PROFILE ON FIRST LOGIN
-- When someone completes the magic-link sign-in, Supabase Auth creates
-- a row in auth.users. This trigger mirrors it into public.users and
-- marks their invite as used, so the app has a profile to work with
-- immediately.
-- ============================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, name, email)
  values (new.id, split_part(new.email, '@', 1), new.email)
  on conflict (id) do nothing;

  update public.invites set used = true
  where email = new.email and used = false;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ============================================================
-- Seed yourself as the first Developer (run manually after your
-- first sign-up, replacing the email):
--
-- update public.users set is_developer = true where email = 'you@example.com';
-- ============================================================
