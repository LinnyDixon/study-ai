-- Private owner dashboard and manual plan tracking for STUDY AI.
-- Apply after 202611110001_profiles_preferences.sql.

create table if not exists public.study_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.study_user_directory (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

insert into public.study_user_directory (user_id, email)
select id, email from auth.users where email is not null
on conflict (user_id) do update set email = excluded.email;

create table if not exists public.user_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'monthly', 'annual')),
  payment_status text not null default 'free' check (payment_status in ('free', 'paid', 'comped', 'unpaid')),
  period_ends_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  check ((plan = 'free' and payment_status = 'free') or plan <> 'free')
);

insert into public.user_plans (user_id)
select id from auth.users
on conflict (user_id) do nothing;

alter table public.study_admins enable row level security;
alter table public.study_user_directory enable row level security;
alter table public.user_plans enable row level security;

revoke all on public.study_admins from anon;
revoke all on public.study_user_directory from anon;
revoke all on public.user_plans from anon;
grant select on public.study_admins to authenticated;
grant select on public.study_user_directory to authenticated;
grant select, insert, update on public.user_plans to authenticated;

create or replace function public.is_study_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.study_admins a
    where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_study_admin() from public;
grant execute on function public.is_study_admin() to authenticated;

create policy "Study admins can read admin list"
  on public.study_admins for select to authenticated
  using ((select public.is_study_admin()));

create policy "Study admins can read user directory"
  on public.study_user_directory for select to authenticated
  using ((select public.is_study_admin()));

create policy "Study admins can read all profiles"
  on public.profiles for select to authenticated
  using ((select public.is_study_admin()));

create policy "Users can read their own plan"
  on public.user_plans for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Study admins can manage plans"
  on public.user_plans for all to authenticated
  using ((select public.is_study_admin()))
  with check ((select public.is_study_admin()));

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', '')), 80)
  )
  on conflict (id) do nothing;

  if new.email is not null then
    insert into public.study_user_directory (user_id, email)
    values (new.id, new.email)
    on conflict (user_id) do update set email = excluded.email;
  end if;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_plans (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null then
    delete from public.study_user_directory where user_id = new.id;
  else
    insert into public.study_user_directory (user_id, email)
    values (new.id, new.email)
    on conflict (user_id) do update set email = excluded.email;
  end if;
  return new;
end;
$$;

create trigger auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

create trigger user_plans_set_updated_at
  before update on public.user_plans
  for each row execute function public.set_updated_at();

-- After creating your own account, run this once in the SQL Editor and replace the email:
-- insert into public.study_admins (user_id)
-- select id from auth.users where lower(email) = lower('YOUR_EMAIL_HERE')
-- on conflict (user_id) do nothing;
