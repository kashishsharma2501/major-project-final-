/**
 * Saved items (favourites) service — Supabase implementation.
 * RLS ensures users can only access their own saved items.
 */
import { supabase } from '@/lib/supabase';

export interface SavedItem {
  id: string;
  user_id: string;
  item_type: 'provider' | 'skill';
  provider_id: string | null;
  skill_id: string | null;
  created_at: string;
}

export async function getSavedItems(userId: string): Promise<SavedItem[]> {
  const { data, error } = await supabase
    .from('saved_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as SavedItem[];
}

export async function saveProvider(userId: string, providerProfileId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_items')
    .insert({ user_id: userId, item_type: 'provider', provider_id: providerProfileId });

  if (error && !error.message.includes('unique')) throw new Error(error.message);
}

export async function unsaveProvider(userId: string, providerProfileId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_items')
    .delete()
    .eq('user_id', userId)
    .eq('provider_id', providerProfileId);

  if (error) throw new Error(error.message);
}

export async function toggleSaveProvider(
  userId: string,
  providerProfileId: string,
  currentlySaved: boolean
): Promise<boolean> {
  if (currentlySaved) {
    await unsaveProvider(userId, providerProfileId);
    return false;
  } else {
    await saveProvider(userId, providerProfileId);
    return true;
  }
}

export async function saveSkill(userId: string, skillId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_items')
    .insert({ user_id: userId, item_type: 'skill', skill_id: skillId });

  if (error && !error.message.includes('unique')) throw new Error(error.message);
}

export async function unsaveSkill(userId: string, skillId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_items')
    .delete()
    .eq('user_id', userId)
    .eq('skill_id', skillId);

  if (error) throw new Error(error.message);
}

export async function getSavedProviderIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('saved_items')
    .select('provider_id')
    .eq('user_id', userId)
    .eq('item_type', 'provider')
    .not('provider_id', 'is', null);

  if (error) return new Set();
  return new Set((data ?? []).map(r => r.provider_id as string));
}

export async function getSavedSkillIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('saved_items')
    .select('skill_id')
    .eq('user_id', userId)
    .eq('item_type', 'skill')
    .not('skill_id', 'is', null);

  if (error) return new Set();
  return new Set((data ?? []).map(r => r.skill_id as string));
}
