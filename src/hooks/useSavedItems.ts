/**
 * useSavedItems — manages the current user's saved providers and skills.
 * Loads once on mount; exposes toggle functions that optimistically update
 * local state while persisting to Supabase in the background.
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getSavedProviderIds,
  getSavedSkillIds,
  toggleSaveProvider,
  saveSkill,
  unsaveSkill,
} from '@/services/savedItemsService';

export function useSavedItems() {
  const { user, initialising } = useAuth();
  const [savedProviders, setSavedProviders] = useState<Set<string>>(new Set());
  const [savedSkills, setSavedSkills] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (initialising) return;
    if (!user?.id) {
      setSavedProviders(new Set());
      setSavedSkills(new Set());
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [provIds, skillIds] = await Promise.all([
        getSavedProviderIds(user.id),
        getSavedSkillIds(user.id),
      ]);
      setSavedProviders(provIds);
      setSavedSkills(skillIds);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load saved items.');
    } finally {
      setLoading(false);
    }
  }, [initialising, user?.id]);

  useEffect(() => { load(); }, [load]);

  const toggleProvider = useCallback(async (providerProfileId: string) => {
    if (!user?.id) return;
    const isSaved = savedProviders.has(providerProfileId);
    // Optimistic update
    setSavedProviders(prev => {
      const next = new Set(prev);
      isSaved ? next.delete(providerProfileId) : next.add(providerProfileId);
      return next;
    });
    try {
      await toggleSaveProvider(user.id, providerProfileId, isSaved);
    } catch (e) {
      // Rollback on failure
      setSavedProviders(prev => {
        const next = new Set(prev);
        isSaved ? next.add(providerProfileId) : next.delete(providerProfileId);
        return next;
      });
      throw e;
    }
  }, [user?.id, savedProviders]);

  const toggleSkill = useCallback(async (skillId: string) => {
    if (!user?.id) return;
    const isSaved = savedSkills.has(skillId);
    setSavedSkills(prev => {
      const next = new Set(prev);
      isSaved ? next.delete(skillId) : next.add(skillId);
      return next;
    });
    try {
      if (isSaved) await unsaveSkill(user.id, skillId);
      else await saveSkill(user.id, skillId);
    } catch (e) {
      setSavedSkills(prev => {
        const next = new Set(prev);
        isSaved ? next.add(skillId) : next.delete(skillId);
        return next;
      });
      throw e;
    }
  }, [user?.id, savedSkills]);

  return {
    savedProviders,
    savedSkills,
    loading,
    error,
    toggleProvider,
    toggleSkill,
    isProviderSaved: (id: string) => savedProviders.has(id),
    isSkillSaved: (id: string) => savedSkills.has(id),
    reload: load,
  };
}
