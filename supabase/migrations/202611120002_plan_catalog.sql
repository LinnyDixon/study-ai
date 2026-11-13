-- Add STUDY AI plan tiers and billing periods. Existing monthly/yearly plans
-- are preserved as Study Plus so current VIP subscriptions keep their tier.

alter table public.user_plans
  add column if not exists billing_period text;

alter table public.user_plans
  drop constraint if exists user_plans_plan_check,
  drop constraint if exists user_plans_check;

update public.user_plans
set billing_period = case
  when plan = 'monthly' then 'monthly'
  when plan = 'annual' then 'annual'
  when plan = 'dixon' then 'none'
  else 'none'
end,
plan = case
  when plan in ('monthly', 'annual') then 'plus'
  else plan
end;

alter table public.user_plans
  alter column billing_period set default 'none',
  alter column billing_period set not null;

alter table public.user_plans
  drop constraint if exists user_plans_billing_period_check;

alter table public.user_plans
  add constraint user_plans_plan_check
    check (plan in ('free', 'plus', 'pro', 'dixon')),
  add constraint user_plans_billing_period_check
    check (
      (plan in ('free', 'dixon') and billing_period = 'none')
      or (plan in ('plus', 'pro') and billing_period in ('monthly', 'annual'))
    ),
  add constraint user_plans_status_check
    check (
      (plan = 'free' and payment_status = 'free')
      or (plan = 'dixon' and payment_status = 'comped')
      or (plan in ('plus', 'pro') and payment_status in ('paid', 'comped', 'unpaid'))
    );

drop policy if exists "Study admins can manage plans" on public.user_plans;
create policy "Study admins can manage plans"
  on public.user_plans for all to authenticated
  using (
    (select public.is_study_admin())
    and (plan <> 'dixon' or lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'ownersession2010@gmail.com')
  )
  with check (
    (select public.is_study_admin())
    and (plan <> 'dixon' or lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'ownersession2010@gmail.com')
  );
