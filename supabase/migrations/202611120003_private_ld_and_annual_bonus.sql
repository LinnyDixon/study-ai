-- Rename the private plan to L.D. and validate its owner-only assignment.
-- New annual assignments receive 14 months of access from the app action.

alter table public.user_plans
  drop constraint if exists user_plans_plan_check,
  drop constraint if exists user_plans_billing_period_check,
  drop constraint if exists user_plans_status_check;

update public.user_plans
set plan = 'ld'
where plan = 'dixon';

update public.user_plans
set period_ends_at = period_ends_at + interval '2 months'
where billing_period = 'annual'
  and payment_status in ('paid', 'comped')
  and period_ends_at > now();

alter table public.user_plans
  add constraint user_plans_plan_check
    check (plan in ('free', 'plus', 'pro', 'ld')),
  add constraint user_plans_billing_period_check
    check (
      (plan in ('free', 'ld') and billing_period = 'none')
      or (plan in ('plus', 'pro') and billing_period in ('monthly', 'annual'))
    ),
  add constraint user_plans_status_check
    check (
      (plan = 'free' and payment_status = 'free')
      or (plan = 'ld' and payment_status = 'comped')
      or (plan in ('plus', 'pro') and payment_status in ('paid', 'comped', 'unpaid'))
    );

drop policy if exists "Study admins can manage plans" on public.user_plans;
create policy "Study admins can manage plans"
  on public.user_plans for all to authenticated
  using (
    (select public.is_study_admin())
    and (plan <> 'ld' or lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'ownersession2010@gmail.com')
  )
  with check (
    (select public.is_study_admin())
    and (plan <> 'ld' or lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'ownersession2010@gmail.com')
  );
