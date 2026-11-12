-- Per-user profile and preference records for STUDY AI.
-- Apply once in the Supabase SQL Editor or with the Supabase CLI.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  preferences jsonb not null default '{"theme":"light","accent":"#7759d8"}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  section text not null check (section in ('ai', 'reader', 'exams', 'summaries', 'search')),
  title text not null default 'Nueva conversación' check (char_length(title) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_section_updated_idx
  on public.conversations (user_id, section, updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 100000),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at asc);

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on public.profiles from anon;
revoke all on public.user_preferences from anon;
revoke all on public.conversations from anon;
revoke all on public.messages from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant delete on public.messages to authenticated;

drop policy if exists "Users can manage their own conversations" on public.conversations;
create policy "Users can manage their own conversations"
  on public.conversations for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can read messages in their own conversations" on public.messages;
create policy "Users can read messages in their own conversations"
  on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.user_id = (select auth.uid())
  ));

drop policy if exists "Users can add messages to their own conversations" on public.messages;
create policy "Users can add messages to their own conversations"
  on public.messages for insert to authenticated
  with check (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.user_id = (select auth.uid())
  ));

drop policy if exists "Users can delete messages in their own conversations" on public.messages;
create policy "Users can delete messages in their own conversations"
  on public.messages for delete to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.user_id = (select auth.uid())
  ));

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "Users can read their own preferences" on public.user_preferences;
create policy "Users can read their own preferences"
  on public.user_preferences for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can create their own preferences" on public.user_preferences;
create policy "Users can create their own preferences"
  on public.user_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their own preferences" on public.user_preferences;
create policy "Users can update their own preferences"
  on public.user_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete their own preferences" on public.user_preferences;
create policy "Users can delete their own preferences"
  on public.user_preferences for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

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
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();
