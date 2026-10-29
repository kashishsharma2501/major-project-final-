/**
 * Provider skills service — Supabase implementation.
 *
 * All operations scope to the authenticated user's provider_profile.
 * RLS in the DB enforces ownership; these functions are convenience wrappers.
 */
import { supabase } from '@/lib/supabase';

export interface DbProviderSkill {
  id: string;
  provider_id: string;
  skill_name: string;
  category: string;
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  years_of_experience: number;
  price_per_session: number;
  session_duration_mins: number;
  learning_mode: 'offline' | 'online' | 'either';
  description: string;
  is_active: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface SkillInput {
  skill_name: string;
  category: string;
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  years_of_experience: number;
  price_per_session: number;
  session_duration_mins: number;
  learning_mode: 'offline' | 'online' | 'either';
  description: string;
}

/** Get or create the provider_profile row for the current user. Returns the provider id. */
export async function getOrCreateProviderProfile(userId: string, city: string): Promise<string | null> {
  // Check existing
  const { data: existing } = await supabase
    .from('provider_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing?.id) return existing.id;

  // Create
  const { data: created, error } = await supabase
    .from('provider_profiles')
    .insert({ user_id: userId, city })
    .select('id')
    .single();

  if (error || !created) return null;
  return created.id;
}

/** List all skills, including pending and rejected submissions, for the owner. */
export async function getProviderSkills(providerId: string): Promise<DbProviderSkill[]> {
  const { data, error } = await supabase
    .from('provider_skills')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Insert a new skill. Returns the created row. */
export async function createProviderSkill(
  providerId: string,
  input: SkillInput
): Promise<DbProviderSkill> {
  const { data, error } = await supabase
    .from('provider_skills')
    .insert({ provider_id: providerId, ...input })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** Update an existing skill by id. */
export async function updateProviderSkill(
  skillId: string,
  input: Partial<SkillInput>
): Promise<DbProviderSkill> {
  const { data, error } = await supabase
    .from('provider_skills')
    .update(input)
    .eq('id', skillId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** Soft-delete: set is_active=false. Hard delete not exposed to clients. */
export async function deleteProviderSkill(skillId: string): Promise<void> {
  const { error } = await supabase
    .from('provider_skills')
    .update({ is_active: false })
    .eq('id', skillId);

  if (error) throw new Error(error.message);
}
