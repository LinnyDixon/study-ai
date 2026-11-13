-- Private image library and atomic daily generation limits.

create table if not exists public.user_generated_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  prompt text not null check (char_length(prompt) <= 1800),
  style text not null check (style in ('realistic', 'anime', 'illustration', 'watercolor', 'minimalist', 'educational', 'artistic')),
  orientation text not null check (orientation in ('square', 'landscape', 'portrait')),
  quality text not null check (quality in ('low', 'medium', 'high')),
  created_at timestamptz not null default now()
);

create index if not exists user_generated_images_owner_created_idx
  on public.user_generated_images (user_id, created_at desc);

alter table public.user_generated_images enable row level security;
revoke all on public.user_generated_images from anon;
grant select, insert, delete on public.user_generated_images to authenticated;

drop policy if exists "Users read their own generated images" on public.user_generated_images;
create policy "Users read their own generated images" on public.user_generated_images
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users add their own generated images" on public.user_generated_images;
create policy "Users add their own generated images" on public.user_generated_images
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Users delete their own generated images" on public.user_generated_images;
create policy "Users delete their own generated images" on public.user_generated_images
  for delete to authenticated using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('study-generated-images', 'study-generated-images', false, 20971520, array['image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read their generated image files" on storage.objects;
create policy "Users read their generated image files" on storage.objects
  for select to authenticated using (
    bucket_id = 'study-generated-images' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "Users upload their generated image files" on storage.objects;
create policy "Users upload their generated image files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'study-generated-images' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "Users delete their generated image files" on storage.objects;
create policy "Users delete their generated image files" on storage.objects
  for delete to authenticated using (
    bucket_id = 'study-generated-images' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create or replace function public.image_generation_quota()
returns table (images_used integer, daily_limit integer, images_remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_plan text := 'free';
  current_status text := 'free';
  current_expiry timestamptz;
  limit_for_plan integer := 8;
  used_today integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select up.plan, up.payment_status, up.period_ends_at
    into current_plan, current_status, current_expiry
    from public.user_plans up where up.user_id = current_user_id;

  if current_plan = 'dixon' and current_status = 'comped'
     and (current_expiry is null or current_expiry > now()) then
    limit_for_plan := 2147483647;
  elsif current_plan in ('plus', 'pro')
        and current_status in ('paid', 'comped')
        and (current_expiry is null or current_expiry > now()) then
    limit_for_plan := case when current_plan = 'pro' then 24 else 14 end;
  else
    current_plan := 'free';
    limit_for_plan := 8;
  end if;

  select coalesce(usage.images_created, 0)::integer into used_today
    from public.study_daily_usage usage
    where usage.user_id = current_user_id
      and usage.usage_date = timezone('utc', now())::date;

  return query select coalesce(used_today, 0), limit_for_plan,
    greatest(limit_for_plan - coalesce(used_today, 0), 0);
end;
$$;

create or replace function public.reserve_image_generation()
returns table (images_used integer, daily_limit integer, images_remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  quota record;
  next_used integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  insert into public.study_daily_usage (user_id, usage_date)
  values (current_user_id, timezone('utc', now())::date)
  on conflict (user_id, usage_date) do nothing;

  perform 1 from public.study_daily_usage usage
    where usage.user_id = current_user_id
      and usage.usage_date = timezone('utc', now())::date
    for update;

  select * into quota from public.image_generation_quota();
  if quota.images_used >= quota.daily_limit then
    raise exception 'Daily image generation limit reached' using errcode = 'P0001';
  end if;

  update public.study_daily_usage usage
    set images_created = usage.images_created + 1
    where usage.user_id = current_user_id
      and usage.usage_date = timezone('utc', now())::date
    returning usage.images_created into next_used;

  return query select next_used, quota.daily_limit,
    greatest(quota.daily_limit - next_used, 0);
end;
$$;

create or replace function public.release_image_generation()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  update public.study_daily_usage usage
    set images_created = greatest(usage.images_created - 1, 0)
    where usage.user_id = current_user_id
      and usage.usage_date = timezone('utc', now())::date;
end;
$$;

revoke all on function public.image_generation_quota() from public, anon;
revoke all on function public.reserve_image_generation() from public, anon;
revoke all on function public.release_image_generation() from public, anon;
grant execute on function public.image_generation_quota() to authenticated;
grant execute on function public.reserve_image_generation() to authenticated;
grant execute on function public.release_image_generation() to authenticated;
