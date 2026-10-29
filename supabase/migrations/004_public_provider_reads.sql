-- =============================================================================
-- SkillShare Local — Migration 004: Public provider discovery reads
-- =============================================================================
-- Apply only after 001_profiles.sql, 002_core_tables.sql, and 003_skill_catalogue.sql.
-- Adds read-only public access required by Explore and public provider profiles.
-- Does not insert, update, or delete application data.
-- =============================================================================

-- Public identity fields are exposed through this deliberately narrow view.
-- The view owner bypasses profiles RLS, but no email, bio, or languages are exposed.
create or replace view public.public_profiles as
  select id, name, avatar_url, city, role, is_verified
  from public.profiles
  where role = 'provider';

grant select on public.public_profiles to anon, authenticated;

-- Provider details and active offerings are public-facing catalogue data.
drop policy if exists "provider_profiles: public read" on public.provider_profiles;
create policy "provider_profiles: public read"
  on public.provider_profiles for select to anon, authenticated
  using (true);

drop policy if exists "provider_skills: public read" on public.provider_skills;
create policy "provider_skills: public read"
  on public.provider_skills for select to anon, authenticated
  using (is_active = true);

drop policy if exists "provider_avail: public read" on public.provider_availability;
create policy "provider_avail: public read"
  on public.provider_availability for select to anon, authenticated
  using (true);

drop policy if exists "reviews: public read" on public.reviews;
create policy "reviews: public read"
  on public.reviews for select to anon, authenticated
  using (true);

grant select on public.provider_profiles to anon;
grant select on public.provider_skills to anon;
grant select on public.provider_availability to anon;
grant select on public.reviews to anon;

-- Conversations can be created by either participant only after an accepted
-- or completed booking; the existing trigger independently enforces the pair.
drop policy if exists "conversations: learner create" on public.conversations;
drop policy if exists "conversations: participant create" on public.conversations;
create policy "conversations: participant create"
  on public.conversations for insert to authenticated
  with check (
    exists (
      select 1 from public.bookings b
      where b.learner_id = conversations.learner_id
        and b.provider_id = conversations.provider_id
        and b.status in ('accepted', 'completed')
        and (
          b.learner_id = auth.uid()
          or b.provider_id in (
            select id from public.provider_profiles where user_id = auth.uid()
          )
        )
    )
  );