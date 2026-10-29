/**
 * Skill catalogue service.
 *
 * Reads from the skill_catalogue DB table (migration 003).
 * Falls back to the local TypeScript catalogue when Supabase is unreachable
 * or the migration hasn't been applied yet — so the app works in both
 * pre-migration and post-migration states.
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { skillCatalogue, type CatalogueSkill } from '@/data/skillCatalogue';

/** All active catalogue skills, ordered by popularity. Cached in module scope. */
let _cached: CatalogueSkill[] | null = null;
let _pending: Promise<CatalogueSkill[]> | null = null;
let _source: 'database' | 'fallback' | null = null;
let _loadError: string | null = null;

export async function getCatalogueSkills(): Promise<CatalogueSkill[]> {
  if (_cached) return _cached;
  if (_pending) return _pending;

  if (!isSupabaseConfigured) {
    _source = 'fallback';
    _loadError = 'Supabase is not configured.';
    _cached = skillCatalogue.filter(s => s.isActive);
    return _cached;
  }

  _pending = (async () => {
    try {
      const { data, error } = await supabase
        .from('skill_catalogue')
        .select('*')
        .eq('is_active', true)
        .order('popularity_rank', { ascending: true });

      if (error) throw new Error(error.message);
      // Map DB snake_case to the CatalogueSkill interface
      _cached = (data ?? []).map(row => ({
        id: row.id,
        name: row.name,
        field: row.field,
        category: row.category,
        icon: row.icon,
        description: row.description,
        evidenceStatus: row.evidence_status as CatalogueSkill['evidenceStatus'],
        evidenceSummary: row.evidence_summary,
        evidenceType: row.evidence_type as CatalogueSkill['evidenceType'],
        exampleOrganisations: row.example_orgs,
        sourceLabel: row.source_label,
        sourceUrl: row.source_url,
        popularityRank: row.popularity_rank,
        isActive: row.is_active,
        isFeatured: row.is_featured,
        tags: row.tags,
      }));
      _source = 'database';
      _loadError = null;
      return _cached;
    } catch (error) {
      _source = 'fallback';
      _loadError = error instanceof Error ? error.message : 'Catalogue request failed.';
      _cached = skillCatalogue.filter(s => s.isActive);
      return _cached;
    } finally {
      _pending = null;
    }
  })();
  return _pending;
}

/** Admin-only read of active and inactive catalogue entries. */
export async function getAllCatalogueSkills(): Promise<CatalogueSkill[]> {
  const { data, error } = await supabase
    .from('skill_catalogue')
    .select('*')
    .order('popularity_rank', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    field: row.field,
    category: row.category,
    icon: row.icon,
    description: row.description,
    evidenceStatus: row.evidence_status as CatalogueSkill['evidenceStatus'],
    evidenceSummary: row.evidence_summary,
    evidenceType: row.evidence_type as CatalogueSkill['evidenceType'],
    exampleOrganisations: row.example_orgs,
    sourceLabel: row.source_label,
    sourceUrl: row.source_url,
    popularityRank: row.popularity_rank,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    tags: row.tags,
  }));
}

export function getCatalogueLoadStatus(): { source: 'database' | 'fallback' | null; error: string | null } {
  return { source: _source, error: _loadError };
}

/** Active categories derived from the catalogue, deduped. */
export async function getCatalogueCategories(): Promise<{ name: string; icon: string; count: number }[]> {
  const skills = await getCatalogueSkills();
  const map = new Map<string, { icon: string; count: number }>();
  for (const s of skills) {
    const existing = map.get(s.category);
    if (existing) {
      existing.count++;
    } else {
      map.set(s.category, { icon: s.icon, count: 1 });
    }
  }
  return Array.from(map.entries())
    .map(([name, { icon, count }]) => ({ name, icon, count }))
    .sort((a, b) => b.count - a.count);
}

/** Unique sorted skill names — used to populate dropdowns in provider skill creation. */
export async function getCatalogueSkillNames(): Promise<string[]> {
  const skills = await getCatalogueSkills();
  return [...new Set(skills.map(s => s.name))].sort();
}

/** Featured skills for landing page / explore hero. */
export async function getFeaturedSkills(): Promise<CatalogueSkill[]> {
  const skills = await getCatalogueSkills();
  return skills.filter(s => s.isFeatured).slice(0, 12);
}

/** Invalidate cache (call after admin updates). */
export function invalidateCatalogueCache(): void {
  _cached = null;
  _source = null;
  _loadError = null;
}
