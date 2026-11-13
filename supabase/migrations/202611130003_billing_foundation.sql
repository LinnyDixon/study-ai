-- Payment ledger foundation. Provider credentials and state changes belong to
-- trusted server/Edge Functions; authenticated clients are read-only.

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('paypal', 'mercadopago')),
  provider_subscription_id text unique,
  plan text not null check (plan in ('plus', 'pro')),
  billing_period text not null check (billing_period in ('monthly', 'annual')),
  status text not null check (status in ('trialing', 'pending', 'active', 'past_due', 'cancelled', 'expired')),
  currency text not null check (currency in ('USD', 'UYU')),
  amount_minor bigint not null check (amount_minor >= 0),
  started_at timestamptz,
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.billing_subscriptions(id) on delete set null,
  provider text not null check (provider in ('paypal', 'mercadopago')),
  provider_payment_id text not null,
  provider_order_id text,
  plan text not null check (plan in ('plus', 'pro')),
  billing_period text not null check (billing_period in ('monthly', 'annual')),
  status text not null check (status in ('created', 'pending', 'approved', 'rejected', 'refunded', 'chargeback')),
  original_currency text not null check (original_currency in ('USD', 'UYU')),
  original_amount_minor bigint not null check (original_amount_minor >= 0),
  fx_rate numeric(20, 8),
  fx_source text,
  fx_quoted_at timestamptz,
  provider_fee_minor bigint check (provider_fee_minor is null or provider_fee_minor >= 0),
  provider_fee_currency text check (provider_fee_currency is null or provider_fee_currency in ('USD', 'UYU')),
  net_amount_minor bigint check (net_amount_minor is null or net_amount_minor >= 0),
  net_currency text check (net_currency is null or net_currency in ('USD', 'UYU')),
  provider_status text,
  raw_status jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create table if not exists public.billing_payouts (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('paypal', 'mercadopago')),
  provider_payout_id text not null,
  currency text not null check (currency in ('USD', 'UYU')),
  gross_amount_minor bigint not null check (gross_amount_minor >= 0),
  fee_amount_minor bigint check (fee_amount_minor is null or fee_amount_minor >= 0),
  net_amount_minor bigint not null check (net_amount_minor >= 0),
  status text not null check (status in ('pending', 'paid', 'failed', 'reversed')),
  destination_label text,
  settled_at timestamptz,
  source_report text,
  created_at timestamptz not null default now(),
  unique(provider, provider_payout_id)
);

create table if not exists public.billing_trial_claims (
  user_id uuid primary key references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now()
);

create table if not exists public.study_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (timezone('utc', now())::date),
  tokens_used bigint not null default 0 check (tokens_used >= 0),
  images_created integer not null default 0 check (images_created >= 0),
  images_sent integer not null default 0 check (images_sent >= 0),
  updated_at timestamptz not null default now(),
  primary key(user_id, usage_date)
);

create table if not exists public.billing_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  provider text,
  provider_event_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);

drop trigger if exists billing_subscriptions_set_updated_at on public.billing_subscriptions;
create trigger billing_subscriptions_set_updated_at before update on public.billing_subscriptions
  for each row execute function public.set_updated_at();
drop trigger if exists billing_payments_set_updated_at on public.billing_payments;
create trigger billing_payments_set_updated_at before update on public.billing_payments
  for each row execute function public.set_updated_at();
drop trigger if exists study_daily_usage_set_updated_at on public.study_daily_usage;
create trigger study_daily_usage_set_updated_at before update on public.study_daily_usage
  for each row execute function public.set_updated_at();

alter table public.billing_subscriptions enable row level security;
alter table public.billing_payments enable row level security;
alter table public.billing_payouts enable row level security;
alter table public.billing_trial_claims enable row level security;
alter table public.study_daily_usage enable row level security;
alter table public.billing_audit_log enable row level security;

revoke all on public.billing_subscriptions, public.billing_payments, public.billing_payouts,
  public.billing_trial_claims, public.study_daily_usage, public.billing_audit_log from anon, authenticated;
grant select on public.billing_subscriptions, public.billing_payments, public.billing_trial_claims,
  public.study_daily_usage to authenticated;
grant select on public.billing_payouts, public.billing_audit_log to authenticated;

drop policy if exists "Users read their billing subscriptions" on public.billing_subscriptions;
create policy "Users read their billing subscriptions" on public.billing_subscriptions
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_study_admin()));
drop policy if exists "Users read their billing payments" on public.billing_payments;
create policy "Users read their billing payments" on public.billing_payments
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_study_admin()));
drop policy if exists "Admins read payout ledger" on public.billing_payouts;
create policy "Admins read payout ledger" on public.billing_payouts
  for select to authenticated using ((select public.is_study_admin()));
drop policy if exists "Users read own trial claim" on public.billing_trial_claims;
create policy "Users read own trial claim" on public.billing_trial_claims
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_study_admin()));
drop policy if exists "Users read own daily usage" on public.study_daily_usage;
create policy "Users read own daily usage" on public.study_daily_usage
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_study_admin()));
drop policy if exists "Admins read billing audit" on public.billing_audit_log;
create policy "Admins read billing audit" on public.billing_audit_log
  for select to authenticated using ((select public.is_study_admin()));

-- A user may claim the first-month promotion only once, even with retries or
-- multiple browser sessions. The caller cannot choose another user's ID.
create or replace function public.claim_monthly_trial()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  insert into public.billing_trial_claims(user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;
  return found;
end;
$$;

revoke all on function public.claim_monthly_trial() from public, anon;
grant execute on function public.claim_monthly_trial() to authenticated;

comment on table public.billing_payouts is 'Provider-reported payouts only; never infer BROU deposit from a successful charge.';
comment on column public.billing_payments.fx_rate is 'Snapshot of the disclosed quote used for this transaction; null if not applicable.';
