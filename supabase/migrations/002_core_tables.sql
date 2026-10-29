-- =============================================================================
-- SkillShare Local — Migration 002: Core Business Tables
-- =============================================================================
-- Tables: provider_profiles, provider_skills, provider_availability,
--         bookings, reviews, conversations, messages, notifications
--
-- Depends on: 001_profiles.sql (profiles table + user_role enum)
-- Apply after 001_profiles.sql in the Supabase SQL editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.experience_level as enum ('beginner', 'intermediate', 'advanced');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.learning_mode as enum ('offline', 'online', 'either');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.booking_status as enum (
    'pending', 'accepted', 'completed', 'cancelled', 'declined'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_type as enum (
    'booking_request', 'booking_accepted', 'booking_declined',
    'new_message', 'session_reminder', 'new_review', 'system'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.day_of_week as enum (
    'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
  );
exception when duplicate_object then null;
end $$;


-- ---------------------------------------------------------------------------
-- 1. provider_profiles
-- ---------------------------------------------------------------------------
-- Extended profile for users with role='provider'.
-- One row per provider, FK to profiles.id.
create table if not exists public.provider_profiles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references public.profiles(id) on delete cascade,
  location              text not null default '',
  city                  text not null default 'Ludhiana',
  bio                   text not null default '',
  primary_skill         text,
  primary_category      text,
  years_teaching        int not null default 0,
  response_time_minutes int not null default 60,
  is_verified           boolean not null default false,
  is_online             boolean not null default false,
  badges                text[] not null default '{}',
  languages             text[] not null default '{}',
  -- Computed / cached fields (updated by triggers)
  rating                numeric(3,2) not null default 0,
  review_count          int not null default 0,
  total_sessions        int not null default 0,
  total_students        int not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

drop trigger if exists set_provider_profiles_updated_at on public.provider_profiles;
create trigger set_provider_profiles_updated_at
  before update on public.provider_profiles
  for each row execute function public.handle_updated_at();

alter table public.provider_profiles enable row level security;

create index if not exists provider_profiles_user_id_idx on public.provider_profiles(user_id);
create index if not exists provider_profiles_city_idx    on public.provider_profiles(city);
create index if not exists provider_profiles_verified_idx on public.provider_profiles(is_verified);

-- RLS
drop policy if exists "provider_profiles: owner read" on public.provider_profiles;
create policy "provider_profiles: owner read"
  on public.provider_profiles for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "provider_profiles: public read" on public.provider_profiles;
create policy "provider_profiles: public read"
  on public.provider_profiles for select to authenticated
  using (true);  -- provider profiles are public-facing

drop policy if exists "provider_profiles: owner update" on public.provider_profiles;
create policy "provider_profiles: owner update"
  on public.provider_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "provider_profiles: owner insert" on public.provider_profiles;
create policy "provider_profiles: owner insert"
  on public.provider_profiles for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "provider_profiles: admin all" on public.provider_profiles;
create policy "provider_profiles: admin all"
  on public.provider_profiles for all to authenticated
  using (public.is_admin());

grant select, insert, update on public.provider_profiles to authenticated;


-- ---------------------------------------------------------------------------
-- 2. provider_skills
-- ---------------------------------------------------------------------------
-- Each skill offering a provider lists.
create table if not exists public.provider_skills (
  id                     uuid primary key default gen_random_uuid(),
  provider_id            uuid not null references public.provider_profiles(id) on delete cascade,
  skill_name             text not null,
  category               text not null default '',
  experience_level       public.experience_level not null default 'intermediate',
  years_of_experience    int not null default 1,
  price_per_session      numeric(10,2) not null,
  session_duration_mins  int not null default 60,
  learning_mode          public.learning_mode not null default 'either',
  description            text not null default '',
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint price_positive check (price_per_session > 0),
  constraint duration_positive check (session_duration_mins > 0)
);

drop trigger if exists set_provider_skills_updated_at on public.provider_skills;
create trigger set_provider_skills_updated_at
  before update on public.provider_skills
  for each row execute function public.handle_updated_at();

alter table public.provider_skills enable row level security;

create index if not exists provider_skills_provider_id_idx on public.provider_skills(provider_id);
create index if not exists provider_skills_name_idx        on public.provider_skills(skill_name);
create index if not exists provider_skills_category_idx    on public.provider_skills(category);

-- RLS
drop policy if exists "provider_skills: public read" on public.provider_skills;
create policy "provider_skills: public read"
  on public.provider_skills for select to authenticated
  using (is_active = true);

drop policy if exists "provider_skills: owner manage" on public.provider_skills;
create policy "provider_skills: owner manage"
  on public.provider_skills for all to authenticated
  using (
    provider_id in (
      select id from public.provider_profiles where user_id = auth.uid()
    )
  )
  with check (
    provider_id in (
      select id from public.provider_profiles where user_id = auth.uid()
    )
  );

drop policy if exists "provider_skills: admin all" on public.provider_skills;
create policy "provider_skills: admin all"
  on public.provider_skills for all to authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.provider_skills to authenticated;


-- ---------------------------------------------------------------------------
-- 3. provider_availability
-- ---------------------------------------------------------------------------
-- Time slots a provider is available per day of week.
create table if not exists public.provider_availability (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  day         public.day_of_week not null,
  slots       text[] not null default '{}',   -- e.g. ['09:00','10:30','14:00']
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (provider_id, day)
);

drop trigger if exists set_provider_availability_updated_at on public.provider_availability;
create trigger set_provider_availability_updated_at
  before update on public.provider_availability
  for each row execute function public.handle_updated_at();

alter table public.provider_availability enable row level security;

create index if not exists provider_avail_provider_id_idx on public.provider_availability(provider_id);

-- RLS
drop policy if exists "provider_avail: public read" on public.provider_availability;
create policy "provider_avail: public read"
  on public.provider_availability for select to authenticated
  using (true);

drop policy if exists "provider_avail: owner manage" on public.provider_availability;
create policy "provider_avail: owner manage"
  on public.provider_availability for all to authenticated
  using (
    provider_id in (
      select id from public.provider_profiles where user_id = auth.uid()
    )
  )
  with check (
    provider_id in (
      select id from public.provider_profiles where user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.provider_availability to authenticated;


-- ---------------------------------------------------------------------------
-- 4. bookings
-- ---------------------------------------------------------------------------
-- Core booking record. Status transitions enforced by trigger.
create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  learner_id        uuid not null references public.profiles(id),
  provider_id       uuid not null references public.provider_profiles(id),
  skill_name        text not null,
  skill_category    text not null default '',
  booking_date      date not null,
  booking_time      time not null,
  duration_minutes  int not null default 60,
  mode              public.learning_mode not null,
  location          text,
  price             numeric(10,2) not null,
  status            public.booking_status not null default 'pending',
  notes             text,
  -- Completion confirmation (both parties must confirm)
  learner_confirmed boolean not null default false,
  provider_confirmed boolean not null default false,
  -- Cancellation
  cancelled_by      uuid references public.profiles(id),
  cancel_reason     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint price_positive check (price > 0),
  constraint duration_positive check (duration_minutes > 0)
);

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
  before update on public.bookings
  for each row execute function public.handle_updated_at();

alter table public.bookings enable row level security;

create index if not exists bookings_learner_id_idx  on public.bookings(learner_id);
create index if not exists bookings_provider_id_idx on public.bookings(provider_id);
create index if not exists bookings_status_idx      on public.bookings(status);
create index if not exists bookings_date_idx        on public.bookings(booking_date);

-- ── Status transition guard ──────────────────────────────────────────────────
-- Valid transitions:
--   pending  → accepted | declined | cancelled
--   accepted → completed | cancelled
--   completed/declined/cancelled → (terminal, no change)
create or replace function public.validate_booking_status()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if old.status = new.status then return new; end if;
  -- Terminal states cannot change
  if old.status in ('completed','declined','cancelled') then
    raise exception 'Booking % is already % and cannot be changed', old.id, old.status;
  end if;
  -- pending → accepted or declined or cancelled
  if old.status = 'pending' and new.status not in ('accepted','declined','cancelled') then
    raise exception 'A pending booking can only be accepted, declined, or cancelled';
  end if;
  -- accepted → completed or cancelled
  if old.status = 'accepted' and new.status not in ('completed','cancelled') then
    raise exception 'An accepted booking can only be completed or cancelled';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_booking_status_transition on public.bookings;
create trigger enforce_booking_status_transition
  before update on public.bookings
  for each row execute function public.validate_booking_status();

-- ── Auto-complete when both parties confirm ──────────────────────────────────
create or replace function public.auto_complete_booking()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.learner_confirmed and new.provider_confirmed
     and new.status = 'accepted' then
    new.status := 'completed';
  end if;
  return new;
end;
$$;

drop trigger if exists auto_complete_on_dual_confirm on public.bookings;
create trigger auto_complete_on_dual_confirm
  before update on public.bookings
  for each row execute function public.auto_complete_booking();

-- ── After booking completes: increment provider total_sessions ───────────────
create or replace function public.update_provider_session_count()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    update public.provider_profiles
    set total_sessions = total_sessions + 1
    where id = new.provider_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_booking_completed on public.bookings;
create trigger on_booking_completed
  after update on public.bookings
  for each row execute function public.update_provider_session_count();

-- RLS
drop policy if exists "bookings: learner read own" on public.bookings;
create policy "bookings: learner read own"
  on public.bookings for select to authenticated
  using (learner_id = auth.uid());

drop policy if exists "bookings: provider read own" on public.bookings;
create policy "bookings: provider read own"
  on public.bookings for select to authenticated
  using (
    provider_id in (
      select id from public.provider_profiles where user_id = auth.uid()
    )
  );

drop policy if exists "bookings: learner create" on public.bookings;
create policy "bookings: learner create"
  on public.bookings for insert to authenticated
  with check (learner_id = auth.uid());

drop policy if exists "bookings: participant update" on public.bookings;
create policy "bookings: participant update"
  on public.bookings for update to authenticated
  using (
    learner_id = auth.uid()
    or provider_id in (
      select id from public.provider_profiles where user_id = auth.uid()
    )
  );

drop policy if exists "bookings: admin all" on public.bookings;
create policy "bookings: admin all"
  on public.bookings for all to authenticated
  using (public.is_admin());

grant select, insert, update on public.bookings to authenticated;


-- ---------------------------------------------------------------------------
-- 5. reviews
-- ---------------------------------------------------------------------------
-- Reviews can only be written by the learner after booking is completed.
-- One review per booking (enforced by unique constraint).
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references public.bookings(id) on delete cascade,
  learner_id  uuid not null references public.profiles(id),
  provider_id uuid not null references public.provider_profiles(id),
  rating      int not null,
  comment     text not null,
  skill_taught text not null default '',
  is_verified boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint rating_range check (rating between 1 and 5)
);

alter table public.reviews enable row level security;

create index if not exists reviews_provider_id_idx on public.reviews(provider_id);
create index if not exists reviews_learner_id_idx  on public.reviews(learner_id);

-- Enforce: booking must be completed and learner must own it
create or replace function public.validate_review_eligibility()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_status public.booking_status;
  v_learner uuid;
begin
  select status, learner_id into v_status, v_learner
  from public.bookings where id = new.booking_id;

  if v_status <> 'completed' then
    raise exception 'Reviews can only be submitted for completed bookings';
  end if;
  if v_learner <> auth.uid() then
    raise exception 'You can only review your own completed bookings';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_review_eligibility on public.reviews;
create trigger enforce_review_eligibility
  before insert on public.reviews
  for each row execute function public.validate_review_eligibility();

-- After a review is inserted: update provider_profiles cached rating
create or replace function public.update_provider_rating()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_avg  numeric(3,2);
  v_cnt  int;
begin
  select avg(rating), count(*)
  into v_avg, v_cnt
  from public.reviews
  where provider_id = new.provider_id;

  update public.provider_profiles
  set rating = coalesce(v_avg, 0),
      review_count = v_cnt
  where id = new.provider_id;

  return new;
end;
$$;

drop trigger if exists on_review_inserted on public.reviews;
create trigger on_review_inserted
  after insert on public.reviews
  for each row execute function public.update_provider_rating();

-- RLS
drop policy if exists "reviews: public read" on public.reviews;
create policy "reviews: public read"
  on public.reviews for select to authenticated
  using (true);

drop policy if exists "reviews: learner insert" on public.reviews;
create policy "reviews: learner insert"
  on public.reviews for insert to authenticated
  with check (learner_id = auth.uid());

drop policy if exists "reviews: admin all" on public.reviews;
create policy "reviews: admin all"
  on public.reviews for all to authenticated
  using (public.is_admin());

grant select, insert on public.reviews to authenticated;


-- ---------------------------------------------------------------------------
-- 6. conversations
-- ---------------------------------------------------------------------------
-- A conversation between a learner and provider.
-- Rule: must have an accepted booking between them (enforced by trigger).
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  learner_id      uuid not null references public.profiles(id),
  provider_id     uuid not null references public.provider_profiles(id),
  booking_id      uuid references public.bookings(id),
  related_skill   text,
  last_message    text not null default '',
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (learner_id, provider_id)
);

alter table public.conversations enable row level security;

create index if not exists conversations_learner_id_idx  on public.conversations(learner_id);
create index if not exists conversations_provider_id_idx on public.conversations(provider_id);

-- Only allow conversation creation when an accepted booking exists
create or replace function public.validate_conversation_booking()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.bookings
    where learner_id = new.learner_id
      and provider_id = new.provider_id
      and status in ('accepted','completed')
  ) then
    raise exception 'Conversations can only be started after a booking is accepted';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_conversation_booking on public.conversations;
create trigger enforce_conversation_booking
  before insert on public.conversations
  for each row execute function public.validate_conversation_booking();

-- RLS: participants only
drop policy if exists "conversations: participant read" on public.conversations;
create policy "conversations: participant read"
  on public.conversations for select to authenticated
  using (
    learner_id = auth.uid()
    or provider_id in (
      select id from public.provider_profiles where user_id = auth.uid()
    )
  );

drop policy if exists "conversations: learner create" on public.conversations;
create policy "conversations: learner create"
  on public.conversations for insert to authenticated
  with check (learner_id = auth.uid());

drop policy if exists "conversations: participant update" on public.conversations;
create policy "conversations: participant update"
  on public.conversations for update to authenticated
  using (
    learner_id = auth.uid()
    or provider_id in (
      select id from public.provider_profiles where user_id = auth.uid()
    )
  );

grant select, insert, update on public.conversations to authenticated;


-- ---------------------------------------------------------------------------
-- 7. messages
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id),
  content         text not null,
  is_read         boolean not null default false,
  msg_type        text not null default 'text',  -- 'text' | 'booking_context' | 'system'
  created_at      timestamptz not null default now()
);

alter table public.messages enable row level security;

create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists messages_sender_id_idx       on public.messages(sender_id);
create index if not exists messages_created_at_idx      on public.messages(created_at);

-- Update conversation.last_message on new message
create or replace function public.update_conversation_last_message()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message    = new.content,
      last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_inserted on public.messages;
create trigger on_message_inserted
  after insert on public.messages
  for each row execute function public.update_conversation_last_message();

-- RLS: conversation participants only
drop policy if exists "messages: participant read" on public.messages;
create policy "messages: participant read"
  on public.messages for select to authenticated
  using (
    conversation_id in (
      select id from public.conversations
      where learner_id = auth.uid()
         or provider_id in (
           select id from public.provider_profiles where user_id = auth.uid()
         )
    )
  );

drop policy if exists "messages: participant insert" on public.messages;
create policy "messages: participant insert"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and conversation_id in (
      select id from public.conversations
      where learner_id = auth.uid()
         or provider_id in (
           select id from public.provider_profiles where user_id = auth.uid()
         )
    )
  );

drop policy if exists "messages: mark read" on public.messages;
create policy "messages: mark read"
  on public.messages for update to authenticated
  using (
    conversation_id in (
      select id from public.conversations
      where learner_id = auth.uid()
         or provider_id in (
           select id from public.provider_profiles where user_id = auth.uid()
         )
    )
  );

grant select, insert, update on public.messages to authenticated;


-- ---------------------------------------------------------------------------
-- 8. notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type        public.notification_type not null,
  title       text not null,
  body        text not null,
  is_read     boolean not null default false,
  action_url  text,
  avatar_url  text,
  actor_name  text,
  created_at  timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index if not exists notifications_recipient_id_idx on public.notifications(recipient_id);
create index if not exists notifications_is_read_idx      on public.notifications(is_read);
create index if not exists notifications_created_at_idx   on public.notifications(created_at desc);

-- RLS: owner only
drop policy if exists "notifications: owner read" on public.notifications;
create policy "notifications: owner read"
  on public.notifications for select to authenticated
  using (recipient_id = auth.uid());

drop policy if exists "notifications: owner update" on public.notifications;
create policy "notifications: owner update"
  on public.notifications for update to authenticated
  using (recipient_id = auth.uid());

-- No client INSERT — notifications created by DB triggers only
-- System can insert via SECURITY DEFINER functions

grant select, update on public.notifications to authenticated;


-- ---------------------------------------------------------------------------
-- 9. Notification triggers
-- ---------------------------------------------------------------------------
-- Create notifications automatically on key events.

-- Helper to insert a notification (SECURITY DEFINER, no public grant)
create or replace function public._notify(
  p_recipient  uuid,
  p_type       public.notification_type,
  p_title      text,
  p_body       text,
  p_action_url text default null,
  p_avatar_url text default null,
  p_actor_name text default null
)
returns void language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.notifications
    (recipient_id, type, title, body, action_url, avatar_url, actor_name)
  values
    (p_recipient, p_type, p_title, p_body, p_action_url, p_avatar_url, p_actor_name);
end;
$$;

revoke execute on function public._notify(
  uuid, public.notification_type, text, text, text, text, text
) from public, authenticated, anon;


-- On new booking: notify provider
create or replace function public.notify_booking_created()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_learner_name text;
  v_provider_user_id uuid;
begin
  select name into v_learner_name from public.profiles where id = new.learner_id;
  select user_id into v_provider_user_id from public.provider_profiles where id = new.provider_id;

  perform public._notify(
    v_provider_user_id,
    'booking_request',
    'New booking request',
    v_learner_name || ' requested a ' || new.skill_name || ' session on ' ||
      to_char(new.booking_date, 'DD Mon YYYY') || ' at ' ||
      to_char(new.booking_time, 'HH24:MI'),
    '/provider/bookings',
    null,
    v_learner_name
  );
  return new;
end;
$$;

drop trigger if exists on_booking_created on public.bookings;
create trigger on_booking_created
  after insert on public.bookings
  for each row execute function public.notify_booking_created();


-- On booking status change: notify the other party
create or replace function public.notify_booking_status_change()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_learner_name    text;
  v_provider_name   text;
  v_provider_user_id uuid;
begin
  if old.status = new.status then return new; end if;

  select name into v_learner_name   from public.profiles where id = new.learner_id;
  select p.user_id, pr.name
    into v_provider_user_id, v_provider_name
    from public.provider_profiles p
    join public.profiles pr on pr.id = p.user_id
    where p.id = new.provider_id;

  if new.status = 'accepted' then
    perform public._notify(
      new.learner_id, 'booking_accepted',
      'Booking confirmed!',
      v_provider_name || ' accepted your ' || new.skill_name || ' session.',
      '/dashboard/bookings', null, v_provider_name
    );
  elsif new.status = 'declined' then
    perform public._notify(
      new.learner_id, 'booking_declined',
      'Booking declined',
      v_provider_name || ' was unable to accept your ' || new.skill_name || ' session.',
      '/dashboard/bookings', null, v_provider_name
    );
  elsif new.status = 'completed' then
    -- Notify learner to leave a review
    perform public._notify(
      new.learner_id, 'new_review',
      'How was your session?',
      'Your ' || new.skill_name || ' session with ' || v_provider_name || ' is complete. Leave a review!',
      '/dashboard/reviews', null, v_provider_name
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_booking_status_changed on public.bookings;
create trigger on_booking_status_changed
  after update on public.bookings
  for each row execute function public.notify_booking_status_change();


-- On new message: notify the recipient
create or replace function public.notify_new_message()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_sender_name   text;
  v_conv          record;
  v_recipient_id  uuid;
begin
  select name into v_sender_name from public.profiles where id = new.sender_id;
  select * into v_conv from public.conversations where id = new.conversation_id;

  -- Recipient is whoever is NOT the sender
  if v_conv.learner_id = new.sender_id then
    -- sender is learner → recipient is provider's user
    select user_id into v_recipient_id
    from public.provider_profiles where id = v_conv.provider_id;
  else
    v_recipient_id := v_conv.learner_id;
  end if;

  perform public._notify(
    v_recipient_id, 'new_message',
    'New message from ' || v_sender_name,
    left(new.content, 100),
    '/dashboard/messages', null, v_sender_name
  );
  return new;
end;
$$;

drop trigger if exists on_message_notify on public.messages;
create trigger on_message_notify
  after insert on public.messages
  for each row execute function public.notify_new_message();


-- ---------------------------------------------------------------------------
-- 10. Trigger: auto-create provider_profile when role becomes 'provider'
-- ---------------------------------------------------------------------------
-- When a user's role is updated to 'provider', automatically create
-- a provider_profiles row if one doesn't exist.
create or replace function public.auto_create_provider_profile()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if new.role = 'provider' and old.role <> 'provider' then
    insert into public.provider_profiles (user_id, city)
    values (new.id, new.city)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_becomes_provider on public.profiles;
create trigger on_profile_becomes_provider
  after update on public.profiles
  for each row execute function public.auto_create_provider_profile();

-- Also create on initial signup if role is already provider
create or replace function public.auto_create_provider_profile_on_signup()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if new.role = 'provider' then
    insert into public.provider_profiles (user_id, city)
    values (new.id, new.city)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_created_as_provider on public.profiles;
create trigger on_profile_created_as_provider
  after insert on public.profiles
  for each row execute function public.auto_create_provider_profile_on_signup();


-- ---------------------------------------------------------------------------
-- 11. Revoke from anon/public for all new tables
-- ---------------------------------------------------------------------------
revoke all on public.provider_profiles   from anon;
revoke all on public.provider_skills     from anon;
revoke all on public.provider_availability from anon;
revoke all on public.bookings            from anon;
revoke all on public.reviews             from anon;
revoke all on public.conversations       from anon;
revoke all on public.messages            from anon;
revoke all on public.notifications       from anon;

revoke all on public.provider_profiles   from public;
revoke all on public.provider_skills     from public;
revoke all on public.provider_availability from public;
revoke all on public.bookings            from public;
revoke all on public.reviews             from public;
revoke all on public.conversations       from public;
revoke all on public.messages            from public;
revoke all on public.notifications       from public;
