-- Move public approval from provider accounts to individual skill listings.
-- Additive: existing profile and booking data is retained.

alter table public.provider_skills
  add column if not exists approval_status public.approval_status,
  add column if not exists rejection_reason text,
  add column if not exists submitted_at timestamptz;

-- Preserve the visibility of listings from previously approved accounts.
-- Rows are backfilled only while their new status is null, so rerunning this
-- migration cannot re-approve a later provider resubmission.
update public.provider_skills s
set approval_status = case
      when p.approval_status = 'approved' then 'approved'::public.approval_status
      else 'pending'::public.approval_status
    end,
    submitted_at = coalesce(s.submitted_at, s.created_at, now())
from public.provider_profiles p
where p.id = s.provider_id
  and (s.approval_status is null or s.submitted_at is null);

alter table public.provider_skills
  alter column approval_status set default 'pending',
  alter column approval_status set not null,
  alter column submitted_at set default now(),
  alter column submitted_at set not null;

alter table public.bookings
  add column if not exists provider_skill_id uuid
    references public.provider_skills(id);

create index if not exists provider_skills_approval_status_idx
  on public.provider_skills(approval_status);

create index if not exists bookings_provider_skill_id_idx
  on public.bookings(provider_skill_id);

-- A provider may read their own submissions, while public reads are limited
-- to active approved listings. The provider-profile policy only exposes
-- profiles that have at least one such listing.
drop policy if exists "provider_profiles: public read" on public.provider_profiles;
create policy "provider_profiles: public read"
  on public.provider_profiles for select to anon, authenticated
  using (
    exists (
      select 1
      from public.provider_skills s
      where s.provider_id = provider_profiles.id
        and s.is_active
        and s.approval_status = 'approved'
    )
  );

drop policy if exists "provider_skills: public read" on public.provider_skills;
create policy "provider_skills: public read"
  on public.provider_skills for select to anon, authenticated
  using (is_active and approval_status = 'approved');

create or replace function public.is_provider_skill_owner(p_provider_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.provider_profiles
    where id = p_provider_id and user_id = auth.uid()
  );
$$;

revoke all on function public.is_provider_skill_owner(uuid) from public, anon;
grant execute on function public.is_provider_skill_owner(uuid) to authenticated;

drop policy if exists "provider_skills: owner manage" on public.provider_skills;
create policy "provider_skills: owner manage"
  on public.provider_skills for all to authenticated
  using (public.is_provider_skill_owner(provider_id))
  with check (public.is_provider_skill_owner(provider_id));

drop policy if exists "provider_skills: owner read" on public.provider_skills;
create policy "provider_skills: owner read"
  on public.provider_skills for select to authenticated
  using (public.is_provider_skill_owner(provider_id));

create or replace function public.enforce_provider_skill_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_details_changed boolean;
begin
  if tg_op = 'INSERT' then
    new.approval_status := 'pending';
    new.rejection_reason := null;
    new.submitted_at := now();
    return new;
  end if;

  v_is_admin := exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );

  v_details_changed :=
    new.skill_name is distinct from old.skill_name
    or new.category is distinct from old.category
    or new.experience_level is distinct from old.experience_level
    or new.years_of_experience is distinct from old.years_of_experience
    or new.price_per_session is distinct from old.price_per_session
    or new.session_duration_mins is distinct from old.session_duration_mins
    or new.learning_mode is distinct from old.learning_mode
    or new.description is distinct from old.description
    or new.is_active is distinct from old.is_active;

  if v_details_changed then
    new.approval_status := 'pending';
    new.rejection_reason := null;
    new.submitted_at := now();
  elsif not v_is_admin then
    new.approval_status := old.approval_status;
    new.rejection_reason := old.rejection_reason;
    new.submitted_at := old.submitted_at;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_provider_skill_approval on public.provider_skills;
create trigger enforce_provider_skill_approval
  before insert or update on public.provider_skills
  for each row execute function public.enforce_provider_skill_approval();

create or replace function public.set_provider_skill_approval(
  p_skill_id uuid,
  p_status public.approval_status,
  p_rejection_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated_id uuid;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Forbidden: only admins may change skill approval status';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Skill status must be approved or rejected';
  end if;

  if p_status = 'rejected' and nullif(btrim(p_rejection_note), '') is null then
    raise exception 'A rejection reason is required';
  end if;

  update public.provider_skills
  set approval_status = p_status,
      rejection_reason = case when p_status = 'rejected' then btrim(p_rejection_note) else null end
  where id = p_skill_id
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'Skill submission not found';
  end if;

  perform public._admin_audit(
    'set_provider_skill_approval',
    'provider_skill',
    p_skill_id::text,
    jsonb_build_object('status', p_status, 'note', p_rejection_note)
  );
end;
$$;

revoke all on function public.set_provider_skill_approval(uuid, public.approval_status, text)
  from public, anon;
grant execute on function public.set_provider_skill_approval(uuid, public.approval_status, text)
  to authenticated;

create or replace function public.validate_booking_skill_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_skill public.provider_skills%rowtype;
begin
  if new.provider_skill_id is null then
    raise exception 'A provider skill listing is required';
  end if;

  select * into v_skill
  from public.provider_skills
  where id = new.provider_skill_id
    and provider_id = new.provider_id
    and is_active
    and approval_status = 'approved';

  if not found then
    raise exception 'This skill listing is not available for booking';
  end if;

  if v_skill.learning_mode <> 'either' and new.mode <> v_skill.learning_mode then
    raise exception 'The selected session mode is not offered for this skill';
  end if;

  new.skill_name := v_skill.skill_name;
  new.skill_category := v_skill.category;
  new.duration_minutes := v_skill.session_duration_mins;
  new.price := v_skill.price_per_session;
  return new;
end;
$$;

drop trigger if exists validate_booking_skill_approval on public.bookings;
create trigger validate_booking_skill_approval
  before insert on public.bookings
  for each row execute function public.validate_booking_skill_approval();
