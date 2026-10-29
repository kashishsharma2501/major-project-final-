-- =============================================================================
-- SkillShare Local — Migration 007: Payments (Razorpay Test Mode)
-- =============================================================================
-- Additive only.
-- Adds: payments table, refund_requests table, payment status on bookings.
--
-- Security model:
--   • Razorpay secret key lives ONLY in Supabase Edge Function secrets — never
--     in the frontend bundle or this migration.
--   • Payment records are created by the verify-razorpay-payment Edge Function
--     (SECURITY DEFINER helper) — clients cannot forge a payment success.
--   • A booking moves to 'payment_pending' when checkout opens and to
--     'accepted' (or its existing accepted state) only after verified signature.
--   • Refund requests go to an admin queue; actual Razorpay refunds are
--     initiated by admin via the Edge Function — learners cannot self-approve.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Payment status enum
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.payment_status as enum (
    'pending', 'captured', 'failed', 'refunded', 'partially_refunded'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.refund_status as enum (
    'requested', 'approved', 'processed', 'rejected'
  );
exception when duplicate_object then null;
end $$;


-- ---------------------------------------------------------------------------
-- 2. Extend bookings: payment tracking columns
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists payment_required   boolean not null default false,
  add column if not exists payment_status     public.payment_status,
  add column if not exists razorpay_order_id  text unique,   -- Razorpay order id (rp_*)
  add column if not exists payment_captured_at timestamptz;

comment on column public.bookings.payment_required is
  'True when a payment was initiated via Razorpay checkout.';
comment on column public.bookings.razorpay_order_id is
  'Set by the create-razorpay-order Edge Function; unique to prevent replay.';


-- ---------------------------------------------------------------------------
-- 3. payments table — immutable ledger
-- ---------------------------------------------------------------------------
-- Records are inserted by the verify-razorpay-payment Edge Function only.
-- No client INSERT is granted. This makes payment records tamper-resistant.
create table if not exists public.payments (
  id                   uuid primary key default gen_random_uuid(),
  booking_id           uuid not null references public.bookings(id),
  learner_id           uuid not null references public.profiles(id),
  provider_id          uuid not null references public.provider_profiles(id),
  amount_paise         int not null,           -- amount in paise (₹ × 100)
  currency             text not null default 'INR',
  razorpay_order_id    text not null unique,
  razorpay_payment_id  text unique,            -- set after capture
  razorpay_signature   text,                   -- HMAC signature verified server-side
  status               public.payment_status not null default 'pending',
  is_test_mode         boolean not null default true,  -- always true for this project
  failure_reason       text,
  captured_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint amount_positive check (amount_paise > 0)
);

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
  before update on public.payments
  for each row execute function public.handle_updated_at();

alter table public.payments enable row level security;

create index if not exists payments_booking_id_idx      on public.payments(booking_id);
create index if not exists payments_learner_id_idx      on public.payments(learner_id);
create index if not exists payments_razorpay_order_idx  on public.payments(razorpay_order_id);

-- RLS: participants can read their own payment records
drop policy if exists "payments: learner read own" on public.payments;
create policy "payments: learner read own"
  on public.payments for select to authenticated
  using (learner_id = auth.uid());

drop policy if exists "payments: provider read own" on public.payments;
create policy "payments: provider read own"
  on public.payments for select to authenticated
  using (
    provider_id in (
      select id from public.provider_profiles where user_id = auth.uid()
    )
  );

drop policy if exists "payments: admin all" on public.payments;
create policy "payments: admin all"
  on public.payments for all to authenticated
  using (public.is_admin());

-- NO grant for INSERT/UPDATE to authenticated — only Edge Function can write
grant select on public.payments to authenticated;
revoke all on public.payments from anon, public;


-- ---------------------------------------------------------------------------
-- 4. Secure payment upsert function (called by Edge Function only)
-- ---------------------------------------------------------------------------
-- This function is SECURITY DEFINER, no public GRANT → only the Edge Function
-- (running as postgres via service role) can call it. Clients cannot invoke it.
create or replace function public._record_payment(
  p_booking_id          uuid,
  p_learner_id          uuid,
  p_provider_id         uuid,
  p_amount_paise        int,
  p_razorpay_order_id   text,
  p_razorpay_payment_id text,
  p_razorpay_signature  text,
  p_status              public.payment_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.payments (
    booking_id, learner_id, provider_id, amount_paise,
    razorpay_order_id, razorpay_payment_id, razorpay_signature,
    status, is_test_mode, captured_at
  )
  values (
    p_booking_id, p_learner_id, p_provider_id, p_amount_paise,
    p_razorpay_order_id, p_razorpay_payment_id, p_razorpay_signature,
    p_status, true,
    case when p_status = 'captured' then now() else null end
  )
  on conflict (razorpay_order_id) do update
    set razorpay_payment_id = excluded.razorpay_payment_id,
        razorpay_signature  = excluded.razorpay_signature,
        status              = excluded.status,
        captured_at         = excluded.captured_at,
        updated_at          = now();

  -- If payment captured, mark booking payment columns
  if p_status = 'captured' then
    update public.bookings
    set payment_required    = true,
        payment_status      = 'captured',
        razorpay_order_id   = p_razorpay_order_id,
        payment_captured_at = now()
    where id = p_booking_id;
  end if;
end;
$$;

-- Explicitly no public grant — Edge Function uses service role
revoke execute on function public._record_payment(uuid,uuid,uuid,int,text,text,text,public.payment_status)
  from public, authenticated, anon;


-- ---------------------------------------------------------------------------
-- 5. refund_requests table
-- ---------------------------------------------------------------------------
create table if not exists public.refund_requests (
  id                   uuid primary key default gen_random_uuid(),
  payment_id           uuid not null references public.payments(id),
  booking_id           uuid not null references public.bookings(id),
  requested_by         uuid not null references public.profiles(id),
  reason               text not null,
  amount_paise         int not null,            -- amount being requested
  status               public.refund_status not null default 'requested',
  admin_note           text,
  razorpay_refund_id   text,                    -- set when Razorpay refund is initiated
  processed_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

drop trigger if exists set_refund_requests_updated_at on public.refund_requests;
create trigger set_refund_requests_updated_at
  before update on public.refund_requests
  for each row execute function public.handle_updated_at();

alter table public.refund_requests enable row level security;

create index if not exists rr_payment_id_idx    on public.refund_requests(payment_id);
create index if not exists rr_requested_by_idx  on public.refund_requests(requested_by);

drop policy if exists "refunds: learner read own" on public.refund_requests;
create policy "refunds: learner read own"
  on public.refund_requests for select to authenticated
  using (requested_by = auth.uid());

drop policy if exists "refunds: learner create" on public.refund_requests;
create policy "refunds: learner create"
  on public.refund_requests for insert to authenticated
  with check (
    requested_by = auth.uid()
    and payment_id in (
      select id from public.payments where learner_id = auth.uid()
    )
  );

drop policy if exists "refunds: admin all" on public.refund_requests;
create policy "refunds: admin all"
  on public.refund_requests for all to authenticated
  using (public.is_admin());

grant select, insert on public.refund_requests to authenticated;
revoke all on public.refund_requests from anon, public;


-- ---------------------------------------------------------------------------
-- 6. Notification trigger on payment capture
-- ---------------------------------------------------------------------------
create or replace function public.notify_payment_captured()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'captured' and (old.status is null or old.status <> 'captured') then
    -- Notify learner
    perform public._notify(
      new.learner_id,
      'system',
      'Payment confirmed',
      'Your payment of ₹' || (new.amount_paise / 100)::text || ' has been received. Your booking is confirmed.',
      '/dashboard/bookings'
    );

    -- Notify provider's user
    perform public._notify(
      (select user_id from public.provider_profiles where id = new.provider_id),
      'booking_accepted',
      'Booking payment received',
      'A learner has paid for their session. Check your bookings.',
      '/provider/bookings'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_payment_captured on public.payments;
create trigger on_payment_captured
  after insert or update on public.payments
  for each row execute function public.notify_payment_captured();
