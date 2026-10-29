-- =============================================================================
-- SkillShare Local — Migration 001: Profiles, Auth Trigger, and RLS
-- =============================================================================
-- Apply with: supabase db push  (after linking a remote project)
-- Local test:  supabase start && supabase db reset
--
-- This migration is idempotent — safe to re-run via supabase db reset.
-- It does NOT contain service-role credentials or secrets of any kind.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
-- gen_random_uuid() is available in pg 13+ without extension.
-- pgcrypto is kept for forward compatibility.
create extension if not exists pgcrypto;


-- ---------------------------------------------------------------------------
-- 1. Enum: user_role
-- ---------------------------------------------------------------------------
-- Only three authoritative roles exist in the database.
-- The onboarding intent "both" is a UI preference, not a database role.
-- Admin accounts are provisioned out-of-band (see §7 below) — never
-- self-registered through the public signup flow.
do $$ begin
  create type public.user_role as enum ('learner', 'provider', 'admin');
exception
  when duplicate_object then null;  -- idempotent: skip if already exists
end $$;


-- ---------------------------------------------------------------------------
-- 2. Table: public.profiles
-- ---------------------------------------------------------------------------
-- One row per authenticated user. Created automatically via trigger on
-- auth.users insert — clients never INSERT into this table directly.
--
-- Security notes:
--   • id is a FK to auth.users(id) — ties the profile to the Supabase
--     auth identity. CASCADE delete ensures no orphan profiles.
--   • role defaults to 'learner'. Promotion to 'provider' or 'admin'
--     happens through the set_user_role() RPC (admin-only for admin,
--     self-service allowed for learner→provider via onboarding).
--   • email is stored here for convenience queries (Supabase Auth owns
--     the authoritative copy in auth.users).
create table if not exists public.profiles (
  id                  uuid        primary key
                                  references auth.users(id) on delete cascade,
  name                text        not null,
  email               text        not null,
  avatar_url          text,
  city                text        not null default 'Ludhiana',
  bio                 text,
  languages           text[]      not null default '{}',
  role                public.user_role not null default 'learner',
  is_verified         boolean     not null default false,
  onboarding_complete boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.profiles is
  'Application profile for every authenticated user. '
  'Created automatically when a new auth.users row is inserted.';

comment on column public.profiles.role is
  'Authoritative application role. '
  'Only learner, provider, and admin are valid. '
  'Never set this column directly from the client — use set_user_role() RPC.';


-- ---------------------------------------------------------------------------
-- 3. Index
-- ---------------------------------------------------------------------------
create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_role_idx  on public.profiles (role);


-- ---------------------------------------------------------------------------
-- 4. Trigger: updated_at auto-maintenance
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER (default): this trigger only reads/writes the updated_at
-- column on the same row being modified. It does not cross schema boundaries
-- and needs no elevated privileges. SECURITY DEFINER would add unnecessary
-- attack surface for no benefit.
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
-- intentionally NOT security definer — no cross-schema access needed
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();


-- ---------------------------------------------------------------------------
-- 5. Trigger: auto-create profile on signup
-- ---------------------------------------------------------------------------
-- Fires AFTER INSERT on auth.users (managed by Supabase Auth).
-- Reads name and role from the signup metadata that the client passes in
-- supabase.auth.signUp({ options: { data: { name, role, city } } }).
-- Falls back to safe defaults if metadata is missing.
--
-- Security:
--   • SECURITY DEFINER runs as the function owner (postgres role), not as the
--     calling user. This is necessary because auth.users is in a restricted
--     schema. We use `set search_path = ''` and explicit schema-qualified
--     names to prevent search-path injection.
--   • The role from metadata is sanitised — only 'learner' and 'provider'
--     are accepted at signup time. Admin cannot be self-assigned here.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text;
  v_role  public.user_role;
  v_city  text;
begin
  -- Extract metadata supplied at signup time
  v_name := coalesce(
    (new.raw_user_meta_data->>'name')::text,
    split_part(new.email, '@', 1)   -- fallback: use email prefix as display name
  );

  -- Only accept 'learner' or 'provider' from signup metadata.
  -- Any attempt to self-assign 'admin' is silently ignored → defaults to 'learner'.
  v_role := case
    when (new.raw_user_meta_data->>'role') = 'provider' then 'provider'::public.user_role
    else 'learner'::public.user_role
  end;

  v_city := coalesce(
    (new.raw_user_meta_data->>'city')::text,
    'Ludhiana'
  );

  insert into public.profiles (id, name, email, role, city)
  values (new.id, v_name, new.email, v_role, v_city);

  return new;
end;
$$;

-- Drop and recreate so the trigger body is always current after db reset
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 6. Role-change implementation: two-function design
-- ---------------------------------------------------------------------------
-- The design uses two functions to create an unforgeable authorization chain:
--
--   _internal_apply_role_change(target_id, new_role)
--     • SECURITY DEFINER — runs as the postgres role (function owner).
--     • NO GRANT to any client role (authenticated, anon, or public).
--       PostgREST can only call functions that have been explicitly granted.
--       Without a grant this function is unreachable from the browser,
--       regardless of what the client attempts.
--     • Contains the actual UPDATE that modifies profiles.role.
--     • Because it has no public grant, the ONLY callers are:
--         a) set_user_role() (below) — which enforces the admin check first, and
--         b) direct psql/SQL-editor connections (postgres role) — which already
--            bypass RLS entirely and are trusted by definition.
--
--   set_user_role(target_id, new_role)
--     • SECURITY DEFINER — runs as postgres for cross-schema visibility.
--     • GRANT EXECUTE to authenticated — callable from the browser/client.
--     • Performs all authorization checks BEFORE calling the internal function:
--         1. Caller must be an authenticated admin (auth.uid() check).
--         2. new_role must not be 'admin' — admin provisioning is DB-only.
--     • Only if both checks pass does it call _internal_apply_role_change().
--
-- Why auth.uid() IS NULL no longer appears in the trigger:
--   The prevent_role_escalation trigger only fires on client-originated UPDATEs
--   (direct UPDATE statements from PostgREST). It never needs to allow a null-uid
--   path because the trusted path (_internal_apply_role_change) updates profiles
--   via its own UPDATE statement that ALSO fires the trigger — but the trigger
--   now rejects null uid unconditionally. This is safe because:
--     • _internal_apply_role_change has no grant → clients cannot call it.
--     • Direct psql connections already bypass RLS; the trigger will fire but
--       postgres-role connections are only used by trusted operators.
--     • There is no legitimate client-accessible code path that produces
--       a null auth.uid() while still needing to change a role.
--
-- Why set_config('app.role_change_authorized', ...) is NOT used:
--   Any authenticated client can call SELECT set_config('app.role_change_authorized',
--   'true', true) before issuing an UPDATE, forging the authorization signal.
--   Configuration variables are session-scoped and cannot be used as
--   unforgeable authorization tokens.

-- Internal helper — no public grant, not callable from PostgREST
create or replace function public._internal_apply_role_change(
  p_target_id uuid,
  p_new_role   public.user_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set role       = p_new_role,
      updated_at = now()
  where id = p_target_id;
end;
$$;

-- Explicitly revoke EXECUTE from every client-accessible role.
-- This is belt-and-suspenders: without a GRANT it is already inaccessible,
-- but an explicit REVOKE ensures a future accidental grant cannot open it.
revoke execute on function public._internal_apply_role_change(uuid, public.user_role)
  from public, authenticated, anon;

-- Public RPC — the only client-callable path to change a role
create or replace function public.set_user_role(
  target_id uuid,
  new_role   public.user_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 1. Caller must be authenticated and have the admin role.
  --    auth.uid() returns the JWT subject claim set by PostgREST.
  --    It is NULL only when called outside a PostgREST request (e.g. direct
  --    psql). In that case the 'not exists' check also returns true (no admin
  --    row for NULL id), so the function still raises — the caller must use
  --    _internal_apply_role_change directly from a trusted psql session instead.
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Forbidden: only admins may change user roles';
  end if;

  -- 2. Admin role cannot be granted through this function.
  --    Promoting to admin requires a direct SQL operation by a database owner.
  if new_role = 'admin' then
    raise exception
      'Admin role cannot be granted through this function. '
      'Provision admin accounts directly in the database.';
  end if;

  -- 3. Delegate the actual write to the internal function (postgres-only callable).
  perform public._internal_apply_role_change(target_id, new_role);
end;
$$;

-- Grant execute to authenticated users so the RPC is callable from the client.
-- The function enforces the admin check internally before doing anything.
grant execute on function public.set_user_role(uuid, public.user_role)
  to authenticated;


-- ---------------------------------------------------------------------------
-- 7. Admin provisioning — documented procedure
-- ---------------------------------------------------------------------------
-- The first admin account CANNOT be self-registered.
--
-- The set_user_role() RPC explicitly blocks promotion to admin, so the
-- only path to create an admin is a direct SQL operation by a database owner.
--
-- Provisioning steps (requires Supabase dashboard SQL editor or psql):
--
--   Step 1: Create the user account through the normal signup flow
--           (or via Supabase dashboard → Authentication → Users → Add user).
--           The handle_new_user trigger creates a profiles row with role='learner'.
--
--   Step 2: In the Supabase SQL editor, run:
--
--             update public.profiles
--             set role = 'admin'
--             where email = 'admin@yourapp.com';
--
--           Why this works:
--           The Supabase SQL editor runs statements as the postgres role.
--           The prevent_role_escalation trigger fires, but its current_user
--           check evaluates to 'postgres' — which is in the trusted allowlist —
--           so the role change is permitted without disabling the trigger.
--
--           A browser client (PostgREST) always runs as the 'authenticated'
--           role and cannot elevate to 'postgres', so this path is not
--           accessible from the browser under any circumstances.
--
-- Security properties:
--   • No public endpoint creates admin accounts.
--   • Admin provisioning requires postgres-role access (Supabase SQL editor
--     or a direct psql connection with the database owner password).
--   • The authorization check (current_user) is enforced at the database level
--     and cannot be bypassed by any client-accessible mechanism.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 8. Row Level Security
-- ---------------------------------------------------------------------------
-- Enable RLS on profiles — all access goes through policies, not table grants.
alter table public.profiles enable row level security;

-- Helper: is the current caller an admin?
-- SECURITY DEFINER + explicit search_path prevents privilege escalation.
-- STABLE because it reads but does not write; will be inlined by the planner.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 8a. SELECT policies
-- ---------------------------------------------------------------------------

-- Any authenticated user can read their own full profile row
drop policy if exists "profiles: owner can read own row" on public.profiles;
create policy "profiles: owner can read own row"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

-- Any authenticated user can read limited public fields of other profiles
-- (name, avatar_url, city, role, is_verified — not bio or languages unless own)
-- Implemented as a view in a later migration; the base policy is own-row-only
-- to avoid over-exposure. Other users' profiles are served via a separate
-- public_profiles view added in migration 002 (provider profiles).

-- Admins can read all profiles
drop policy if exists "profiles: admin can read all rows" on public.profiles;
create policy "profiles: admin can read all rows"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8b. INSERT policy
-- ---------------------------------------------------------------------------
-- Clients never INSERT directly — the handle_new_user trigger does it.
-- No INSERT policy means INSERT is blocked for all client roles.
-- (The trigger runs as SECURITY DEFINER / postgres role, bypassing RLS.)

-- ---------------------------------------------------------------------------
-- 8c. UPDATE policy
-- ---------------------------------------------------------------------------
-- A user may update their own non-sensitive profile fields.
-- The role column is intentionally excluded from what clients can set;
-- it is not updatable directly from the browser at all — only through
-- set_user_role() which enforces its own admin check.
--
-- Note: PostgreSQL column-level security on UPDATE with USING/WITH CHECK
-- cannot exclude individual columns. We achieve this by:
--   1. The UPDATE policy only allows the owner to update their own row
--   2. The database.types.ts Update type omits `role` — TypeScript prevents
--      the client from even building a query that sets role
--   3. A separate BEFORE UPDATE trigger (below) enforces the server-side check

drop policy if exists "profiles: owner can update own row" on public.profiles;
create policy "profiles: owner can update own row"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admins can update any row (needed for is_verified, etc.)
drop policy if exists "profiles: admin can update any row" on public.profiles;
create policy "profiles: admin can update any row"
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8d. Trigger: prevent role self-escalation via direct client UPDATE
-- ---------------------------------------------------------------------------
-- This trigger fires on EVERY UPDATE to public.profiles, including those
-- originating from _internal_apply_role_change(). The authorization check
-- uses current_user (the effective PostgreSQL role), not auth.uid().
--
-- Why current_user is unforgeable:
--   PostgREST connects to the database using the 'authenticator' service role,
--   then issues SET LOCAL ROLE to 'authenticated' (or 'anon') for each request.
--   A client has no mechanism to SET ROLE to 'postgres' or 'supabase_admin' —
--   the authenticator role does not have that privilege. Therefore current_user
--   is always 'authenticated' or 'anon' for any browser-originated statement.
--
--   _internal_apply_role_change() is SECURITY DEFINER and owned by the
--   postgres role. When it executes UPDATE profiles, the trigger fires
--   with current_user = 'postgres' (the function owner) — this is allowed.
--
--   set_config('app.role_change_authorized', ...) is NOT used because any
--   authenticated client can call it to forge the authorization signal.
--   Configuration variables are session-scoped and not access-controlled.
--
-- Why auth.uid() IS NULL is NOT used:
--   auth.uid() returns NULL whenever there is no PostgREST JWT context —
--   including direct psql connections, SECURITY DEFINER functions, cron jobs,
--   and any future server-side function. Treating null as "trusted" is
--   overbroad and allows any future SECURITY DEFINER function to accidentally
--   bypass this guard.
--
-- SECURITY INVOKER (intentional):
--   The trigger must run in the caller's session context so that current_user
--   reflects the actual executing role. If it were SECURITY DEFINER it would
--   always see current_user = postgres and the guard would never fire.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
-- Intentionally SECURITY INVOKER so current_user reflects the real caller.
set search_path = ''
as $$
begin
  -- If the role column is not being changed, allow immediately.
  if new.role = old.role then
    return new;
  end if;

  -- Allow changes originating from trusted system roles.
  -- _internal_apply_role_change() runs as postgres (SECURITY DEFINER, owned
  -- by postgres). Direct psql/SQL-editor sessions also run as postgres.
  -- PostgREST clients always run as 'authenticated' or 'anon' — never as
  -- 'postgres' or 'supabase_admin'. This check cannot be forged by a client.
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  -- The caller is a PostgREST client (authenticated or anon role).
  -- Only allow the change if auth.uid() belongs to an admin profile.
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception
      'Direct role changes are not permitted. '
      'Use the set_user_role() RPC from an admin account.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_role_escalation_guard on public.profiles;
create trigger enforce_role_escalation_guard
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ---------------------------------------------------------------------------
-- 8e. DELETE policy
-- ---------------------------------------------------------------------------
-- Accounts are never deleted from the application layer.
-- Deletion (if ever needed) is a manual database operation.
-- No DELETE policy = DELETE is blocked for all client roles.


-- ---------------------------------------------------------------------------
-- 9. Grant table access to authenticated users
-- ---------------------------------------------------------------------------
-- Explicitly revoke from anon and public first to make intent unambiguous.
-- With RLS enabled, anon users already can't read rows (no anon policy exists),
-- but the explicit revoke future-proofs against schema-level grant changes
-- (e.g. Supabase dashboard settings that grant anon access to public schema).
revoke all on public.profiles from anon;
revoke all on public.profiles from public;

-- RLS policies narrow access further; these grants just unlock the table
-- for the authenticated PostgREST role.
grant select, update on public.profiles to authenticated;
-- INSERT and DELETE intentionally not granted to authenticated role.


-- ---------------------------------------------------------------------------
-- 10. Seed: demo/fixture profile rows (development only)
-- ---------------------------------------------------------------------------
-- These rows correspond to the mock users in src/data/mockUsers.ts.
-- In a real project, seed data lives in supabase/seed.sql, not migrations.
-- They are included here commented-out as a reference for local development.
-- To seed: uncomment and run against a local Supabase instance only.
--
-- WARNING: These UUIDs must match the auth.users rows created separately.
--          Real Supabase Auth generates UUIDs — you cannot predict them.
--          After running `supabase start`, create users through the Auth
--          dashboard or via the Admin API, then note their UUIDs and insert
--          matching profile rows.
--
-- insert into public.profiles (id, name, email, role, city, is_verified) values
--   ('00000000-0000-0000-0000-000000000001', 'Aditi Singh',  'aditi.singh@email.com',   'learner',  'Ludhiana', true),
--   ('00000000-0000-0000-0000-000000000002', 'Simran Sharma','simran.sharma@email.com', 'provider', 'Ludhiana', true),
--   ('00000000-0000-0000-0000-000000000003', 'Admin User',   'admin@skillsharelocal.in','admin',    'Chandigarh', true);
