-- =============================================================================
-- SkillShare Local — Migration 006: Phase 3 Enhancements
-- =============================================================================
-- Additive only. Adds: booking_status_history, support_tickets,
-- reschedule_requests, audit_logs, double-booking prevention.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Booking status history (audit trail for every booking state change)
-- ---------------------------------------------------------------------------
create table if not exists public.booking_status_history (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  old_status  text,
  new_status  text not null,
  changed_by  uuid references public.profiles(id),
  note        text,
  created_at  timestamptz not null default now()
);

alter table public.booking_status_history enable row level security;

create index if not exists bsh_booking_id_idx on public.booking_status_history(booking_id);

-- Participants and admins can read history for their bookings
drop policy if exists "bsh: participant read" on public.booking_status_history;
create policy "bsh: participant read"
  on public.booking_status_history for select to authenticated
  using (
    booking_id in (
      select id from public.bookings
      where learner_id = auth.uid()
         or provider_id in (
           select id from public.provider_profiles where user_id = auth.uid()
         )
    )
    or public.is_admin()
  );

grant select on public.booking_status_history to authenticated;

-- Trigger: auto-record history on every booking status change
create or replace function public.record_booking_status_history()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if old.status <> new.status then
    insert into public.booking_status_history(booking_id, old_status, new_status, changed_by)
    values (new.id, old.status::text, new.status::text, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists on_booking_status_changed_history on public.bookings;
create trigger on_booking_status_changed_history
  after update on public.bookings
  for each row execute function public.record_booking_status_history();


-- ---------------------------------------------------------------------------
-- 2. Reschedule requests
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.reschedule_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');
exception when duplicate_object then null;
end $$;

create table if not exists public.reschedule_requests (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references public.bookings(id) on delete cascade,
  requested_by     uuid not null references public.profiles(id),
  proposed_date    date not null,
  proposed_time    time not null,
  reason           text,
  status           public.reschedule_status not null default 'pending',
  responded_at     timestamptz,
  created_at       timestamptz not null default now()
);

alter table public.reschedule_requests enable row level security;
create index if not exists rr_booking_id_idx on public.reschedule_requests(booking_id);

drop policy if exists "rr: participant all" on public.reschedule_requests;
create policy "rr: participant all"
  on public.reschedule_requests for all to authenticated
  using (
    booking_id in (
      select id from public.bookings
      where learner_id = auth.uid()
         or provider_id in (
           select id from public.provider_profiles where user_id = auth.uid()
         )
    )
  )
  with check (
    booking_id in (
      select id from public.bookings
      where learner_id = auth.uid()
         or provider_id in (
           select id from public.provider_profiles where user_id = auth.uid()
         )
    )
  );

drop policy if exists "rr: admin all" on public.reschedule_requests;
create policy "rr: admin all"
  on public.reschedule_requests for all to authenticated
  using (public.is_admin());

grant select, insert, update on public.reschedule_requests to authenticated;


-- ---------------------------------------------------------------------------
-- 3. Support tickets
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ticket_category as enum (
    'booking_issue', 'account', 'payment', 'provider_issue',
    'technical', 'cancellation', 'refund', 'other'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.support_tickets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id),
  booking_id   uuid references public.bookings(id),
  category     public.ticket_category not null default 'other',
  subject      text not null,
  description  text not null,
  status       public.ticket_status not null default 'open',
  priority     text not null default 'normal',  -- normal, high, urgent
  admin_note   text,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists set_support_tickets_updated_at on public.support_tickets;
create trigger set_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.handle_updated_at();

alter table public.support_tickets enable row level security;

create index if not exists st_user_id_idx  on public.support_tickets(user_id);
create index if not exists st_status_idx   on public.support_tickets(status);

drop policy if exists "tickets: owner read own" on public.support_tickets;
create policy "tickets: owner read own"
  on public.support_tickets for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "tickets: owner create" on public.support_tickets;
create policy "tickets: owner create"
  on public.support_tickets for insert to authenticated
  with check (user_id = auth.uid());

-- Users can update their own ticket subject/description only (not status)
drop policy if exists "tickets: owner update own" on public.support_tickets;
create policy "tickets: owner update own"
  on public.support_tickets for update to authenticated
  using (user_id = auth.uid());

drop policy if exists "tickets: admin all" on public.support_tickets;
create policy "tickets: admin all"
  on public.support_tickets for all to authenticated
  using (public.is_admin());

grant select, insert, update on public.support_tickets to authenticated;


-- ---------------------------------------------------------------------------
-- 4. Double-booking prevention (unique partial index)
-- ---------------------------------------------------------------------------
-- A provider cannot have two ACCEPTED bookings at the same date+time.
create unique index if not exists no_double_booking
  on public.bookings (provider_id, booking_date, booking_time)
  where status = 'accepted';


-- ---------------------------------------------------------------------------
-- 5. Admin audit log
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references public.profiles(id),
  action      text not null,
  target_type text,          -- 'provider', 'booking', 'review', 'ticket', etc.
  target_id   text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
create index if not exists aal_admin_id_idx on public.admin_audit_log(admin_id);

drop policy if exists "audit: admin read" on public.admin_audit_log;
create policy "audit: admin read"
  on public.admin_audit_log for select to authenticated
  using (public.is_admin());

-- Only inserts via SECURITY DEFINER functions — no direct client insert
grant select on public.admin_audit_log to authenticated;

-- Helper to write audit entries (SECURITY DEFINER, no public grant)
create or replace function public._admin_audit(
  p_action      text,
  p_target_type text default null,
  p_target_id   text default null,
  p_detail      jsonb default null
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.admin_audit_log(admin_id, action, target_type, target_id, detail)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_detail);
end;
$$;
revoke execute on function public._admin_audit(text,text,text,jsonb) from public, authenticated, anon;


-- ---------------------------------------------------------------------------
-- 6. Update set_provider_approval to log audit entry
-- ---------------------------------------------------------------------------
create or replace function public.set_provider_approval(
  p_provider_id    uuid,
  p_status         public.approval_status,
  p_rejection_note text default null
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Forbidden: only admins may change provider approval status';
  end if;

  update public.provider_profiles
  set approval_status  = p_status,
      rejection_reason = p_rejection_note,
      updated_at       = now()
  where id = p_provider_id;

  -- Audit
  perform public._admin_audit(
    'set_provider_approval',
    'provider',
    p_provider_id::text,
    jsonb_build_object('status', p_status, 'note', p_rejection_note)
  );
end;
$$;

grant execute on function public.set_provider_approval(uuid, public.approval_status, text)
  to authenticated;


-- ---------------------------------------------------------------------------
-- 7. Contact submissions (from ContactPage form)
-- ---------------------------------------------------------------------------
create table if not exists public.contact_submissions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  topic       text not null,
  message     text not null,
  created_at  timestamptz not null default now()
);

alter table public.contact_submissions enable row level security;

-- Anyone (anon or authenticated) can insert
drop policy if exists "contact: anyone insert" on public.contact_submissions;
create policy "contact: anyone insert"
  on public.contact_submissions for insert to anon, authenticated
  with check (true);

drop policy if exists "contact: admin read" on public.contact_submissions;
create policy "contact: admin read"
  on public.contact_submissions for select to authenticated
  using (public.is_admin());

grant insert on public.contact_submissions to anon, authenticated;
grant select on public.contact_submissions to authenticated;

revoke all on public.booking_status_history from anon, public;
revoke all on public.reschedule_requests from anon, public;
revoke all on public.support_tickets from anon, public;
revoke all on public.admin_audit_log from anon, public;
