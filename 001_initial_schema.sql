-- AIF Academic Platform starter schema (PostgreSQL / Supabase)
-- Apply in a NEW Supabase project after reviewing this file.
-- All private data is protected by RLS. Never expose service_role credentials to the browser.

create extension if not exists pgcrypto;

create type public.app_role as enum ('student','teacher','centre','admin');
create type public.assessment_kind as enum ('practice','exam');
create type public.assessment_status as enum ('draft','review','published','closed','archived');

create table public.centres (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  status text not null default 'active' check (status in ('active','suspended','terminated')),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  public_id text unique not null,
  role public.app_role not null,
  display_name text not null,
  centre_id uuid references public.centres(id),
  board text,
  medium text check (medium in ('English','বাংলা')),
  grade smallint check (grade between 1 and 6),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  centre_id uuid references public.centres(id),
  board text not null,
  medium text not null,
  grade smallint not null check (grade between 1 and 6),
  subject text not null,
  created_at timestamptz not null default now(),
  unique(teacher_id, centre_id, board, medium, grade, subject)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_en text not null,
  name_bn text,
  supplementary boolean not null default false,
  active boolean not null default true
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete restrict,
  centre_id uuid references public.centres(id),
  board text not null,
  medium text not null check (medium in ('English','বাংলা')),
  grade smallint not null check (grade between 1 and 6),
  subject text not null,
  topic text,
  prompt jsonb not null,
  options jsonb not null check (jsonb_typeof(options)='array' and jsonb_array_length(options)>=2),
  answer_key jsonb not null,
  explanation jsonb,
  marks numeric(7,2) not null default 1 check (marks > 0),
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','advanced')),
  status public.assessment_status not null default 'draft',
  version integer not null default 1,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind public.assessment_kind not null,
  board text not null,
  medium text not null check (medium in ('English','বাংলা')),
  grade smallint not null check (grade between 1 and 6),
  subject text not null,
  centre_id uuid references public.centres(id),
  starts_at timestamptz,
  ends_at timestamptz,
  duration_seconds integer not null default 900 check (duration_seconds between 60 and 14400),
  max_attempts integer not null default 1 check (max_attempts between 1 and 10),
  question_ids uuid[] not null default '{}',
  status public.assessment_status not null default 'draft',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  client_attempt_id uuid not null,
  student_id uuid not null references public.profiles(id) on delete restrict,
  assessment_id uuid not null references public.assessments(id) on delete restrict,
  started_at timestamptz,
  submitted_at timestamptz not null default now(),
  answers jsonb not null,
  score numeric(8,2) not null default 0,
  max_score numeric(8,2) not null default 0,
  percent numeric(5,2) not null default 0,
  sync_status text not null default 'synced' check (sync_status in ('queued','synced','rejected')),
  marking_version integer not null default 1,
  created_at timestamptz not null default now(),
  unique(student_id, client_attempt_id)
);

create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  response jsonb,
  awarded_marks numeric(7,2) not null default 0,
  max_marks numeric(7,2) not null default 0,
  unique(attempt_id, question_id)
);

create table public.reward_rules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  quarter_start date not null,
  quarter_end date not null,
  category text not null check (category in ('student','teacher','centre')),
  rules jsonb not null default '{}',
  active boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (quarter_end >= quarter_start)
);

create table public.reward_awards (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.reward_rules(id),
  recipient_id uuid not null references public.profiles(id),
  centre_id uuid references public.centres(id),
  score numeric(8,2) not null,
  rank integer,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(rule_id, recipient_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index attempts_student_submitted_idx on public.attempts(student_id, submitted_at desc);
create index questions_scope_idx on public.questions(board, medium, grade, subject, status);
create index profiles_centre_role_idx on public.profiles(centre_id, role, active);

create or replace function public.current_role()
returns public.app_role language sql stable security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() and active = true $$;

create or replace function public.current_centre()
returns uuid language sql stable security definer
set search_path = public
as $$ select centre_id from public.profiles where id = auth.uid() and active = true $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$ select coalesce(public.current_role() = 'admin'::public.app_role, false) $$;

create or replace function public.can_teach(p_board text, p_medium text, p_grade smallint, p_subject text, p_centre uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.teacher_assignments ta
    where ta.teacher_id = auth.uid()
      and ta.board = p_board and ta.medium = p_medium
      and ta.grade = p_grade and ta.subject = p_subject
      and (ta.centre_id is null or ta.centre_id = p_centre)
  )
$$;

alter table public.centres enable row level security;
alter table public.profiles enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.subjects enable row level security;
alter table public.questions enable row level security;
alter table public.assessments enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.reward_rules enable row level security;
alter table public.reward_awards enable row level security;
alter table public.audit_logs enable row level security;

create policy "centres visible to admin or same centre" on public.centres for select to authenticated
using (public.is_admin() or id = public.current_centre());
create policy "admins manage centres" on public.centres for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "profile self or authorized scope read" on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.is_admin()
  or (public.current_role() = 'centre' and centre_id = public.current_centre())
);
create policy "admins manage profiles" on public.profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "teachers read own assignments or admin" on public.teacher_assignments for select to authenticated
using (teacher_id = auth.uid() or public.is_admin() or (public.current_role()='centre' and centre_id=public.current_centre()));
create policy "admins manage assignments" on public.teacher_assignments for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "authenticated users read active subjects" on public.subjects for select to authenticated using (active=true or public.is_admin());
create policy "admins manage subjects" on public.subjects for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "questions read by authorized scope" on public.questions for select to authenticated
using (
  public.is_admin()
  or (status='published' and (centre_id is null or centre_id=public.current_centre()))
  or (author_id=auth.uid())
  or (public.current_role()='centre' and centre_id=public.current_centre())
);
create policy "teachers create assigned questions" on public.questions for insert to authenticated
with check (author_id=auth.uid() and public.current_role()='teacher' and public.can_teach(board,medium,grade,subject,centre_id));
create policy "teachers update own draft and admins manage" on public.questions for update to authenticated
using ((author_id=auth.uid() and status in ('draft','review') and public.current_role()='teacher' and public.can_teach(board,medium,grade,subject,centre_id)) or public.is_admin())
with check ((author_id=auth.uid() and status in ('draft','review') and public.current_role()='teacher' and public.can_teach(board,medium,grade,subject,centre_id)) or public.is_admin());
create policy "admins delete questions" on public.questions for delete to authenticated using (public.is_admin());

create policy "assessments visible in assigned scope" on public.assessments for select to authenticated
using (
  public.is_admin()
  or created_by=auth.uid()
  or (status='published' and (centre_id is null or centre_id=public.current_centre()))
  or (public.current_role()='centre' and centre_id=public.current_centre())
);
create policy "teachers create assessments for assigned scope" on public.assessments for insert to authenticated
with check (created_by=auth.uid() and public.current_role()='teacher' and public.can_teach(board,medium,grade,subject,centre_id));
create policy "admins manage assessments" on public.assessments for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "students see own attempts; scoped staff see centre attempts" on public.attempts for select to authenticated
using (
  student_id=auth.uid()
  or public.is_admin()
  or (public.current_role()='centre' and exists(select 1 from public.profiles p where p.id=student_id and p.centre_id=public.current_centre()))
  or (public.current_role()='teacher' and exists(select 1 from public.profiles p join public.teacher_assignments ta on ta.teacher_id=auth.uid() where p.id=student_id and p.centre_id=ta.centre_id))
);
-- Direct client inserts/updates/deletes are intentionally not allowed.
-- Add a reviewed Edge Function or SECURITY DEFINER RPC for server-side marking and sync.
create policy "students see their answer details; staff scoped" on public.attempt_answers for select to authenticated
using (
  exists(select 1 from public.attempts a where a.id=attempt_id and (
    a.student_id=auth.uid() or public.is_admin()
    or (public.current_role()='centre' and exists(select 1 from public.profiles p where p.id=a.student_id and p.centre_id=public.current_centre()))
  ))
);
create policy "admins manage reward rules" on public.reward_rules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "reward awards visible to recipient or scoped staff" on public.reward_awards for select to authenticated
using (recipient_id=auth.uid() or public.is_admin() or (public.current_role()='centre' and centre_id=public.current_centre()));
create policy "admins manage rewards" on public.reward_awards for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins read audit logs" on public.audit_logs for select to authenticated using (public.is_admin());
create policy "authenticated actors may append audit events" on public.audit_logs for insert to authenticated with check (actor_id=auth.uid());

insert into public.subjects(code,name_en,name_bn,supplementary) values
('ENGLISH','English','ইংরেজি',false),
('BENGALI','Bengali','বাংলা',false),
('MATH','Mathematics','গণিত',false),
('EVS','Environmental Studies','পরিবেশবিদ্যা',false),
('SCIENCE','Science','বিজ্ঞান',false),
('SOCIAL','Social Science','সমাজবিজ্ঞান',false),
('HINDI','Hindi','হিন্দি',false),
('COMPUTER','Computer Studies','কম্পিউটার শিক্ষা',false),
('REASONING','Reasoning','রিজনিং',true),
('ABACUS','Abacus','অ্যাবাকাস',true)
on conflict (code) do nothing;
