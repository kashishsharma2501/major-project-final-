-- =============================================================================
-- SkillShare Local — Migration 005: Smart Discovery & Provider Onboarding
-- =============================================================================
-- Additive only — no existing data is deleted or altered.
-- Adds: approval_status to provider_profiles, provider questionnaire columns,
--       saved_items table, and supporting RLS policies.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Approval status enum
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.approval_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;


-- ---------------------------------------------------------------------------
-- 2. Extend provider_profiles
-- ---------------------------------------------------------------------------
-- approval_status: controls public visibility (only 'approved' shown publicly)
alter table public.provider_profiles
  add column if not exists approval_status public.approval_status not null default 'pending',
  add column if not exists rejection_reason text,
  -- Questionnaire fields
  add column if not exists teaching_style   text,          -- e.g. 'practical', 'theory-first'
  add column if not exists qualifications   text,          -- free-form credentials/experience
  add column if not exists session_format   text[],        -- e.g. ['one-on-one','group']
  add column if not exists min_price        numeric(10,2), -- minimum price across skills
  add column if not exists max_price        numeric(10,2), -- maximum price across skills
  add column if not exists questionnaire_complete boolean not null default false;

comment on column public.provider_profiles.approval_status is
  'pending = submitted questionnaire, not yet reviewed; '
  'approved = visible publicly; rejected = not listed.';

-- Index for filtering approved providers
create index if not exists provider_profiles_approval_idx
  on public.provider_profiles(approval_status);

-- ---------------------------------------------------------------------------
-- Update existing public read policy to show only approved providers
-- ---------------------------------------------------------------------------
drop policy if exists "provider_profiles: public read" on public.provider_profiles;
create policy "provider_profiles: public read"
  on public.provider_profiles for select to anon, authenticated
  using (approval_status = 'approved');

-- Owners can always read their own row regardless of approval status
drop policy if exists "provider_profiles: owner read" on public.provider_profiles;
create policy "provider_profiles: owner read"
  on public.provider_profiles for select to authenticated
  using (user_id = auth.uid());

-- Admins can read all
drop policy if exists "provider_profiles: admin all" on public.provider_profiles;
create policy "provider_profiles: admin all"
  on public.provider_profiles for all to authenticated
  using (public.is_admin());


-- ---------------------------------------------------------------------------
-- 3. saved_items table (favourites)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.saved_item_type as enum ('provider', 'skill');
exception when duplicate_object then null;
end $$;

create table if not exists public.saved_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  item_type   public.saved_item_type not null,
  -- For provider saves: provider_profile_id
  provider_id uuid references public.provider_profiles(id) on delete cascade,
  -- For skill saves: skill catalogue id (text)
  skill_id    text,
  created_at  timestamptz not null default now(),
  -- Prevent duplicate saves
  unique (user_id, provider_id),
  unique (user_id, skill_id),
  -- At least one target must be set
  constraint saved_item_has_target check (
    (provider_id is not null and skill_id is null) or
    (skill_id is not null and provider_id is null)
  )
);

alter table public.saved_items enable row level security;

create index if not exists saved_items_user_id_idx     on public.saved_items(user_id);
create index if not exists saved_items_provider_id_idx on public.saved_items(provider_id);
create index if not exists saved_items_skill_id_idx    on public.saved_items(skill_id);

-- RLS: owner only
drop policy if exists "saved_items: owner all" on public.saved_items;
create policy "saved_items: owner all"
  on public.saved_items for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, delete on public.saved_items to authenticated;
revoke all on public.saved_items from anon;


-- ---------------------------------------------------------------------------
-- 4. Auto-approve helper RPC (admin only)
-- ---------------------------------------------------------------------------
create or replace function public.set_provider_approval(
  p_provider_id    uuid,
  p_status         public.approval_status,
  p_rejection_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
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
end;
$$;

grant execute on function public.set_provider_approval(uuid, public.approval_status, text)
  to authenticated;


-- ---------------------------------------------------------------------------
-- 5. Update public_profiles view to include approval_status
-- ---------------------------------------------------------------------------
-- (recreate; 004 created the original version)
create or replace view public.public_profiles as
  select p.id, p.name, p.avatar_url, p.city, p.role, p.is_verified
  from public.profiles p
  where p.role = 'provider';

grant select on public.public_profiles to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 6. Revoke anon from saved_items (belt and suspenders)
-- ---------------------------------------------------------------------------
revoke all on public.saved_items from public;
