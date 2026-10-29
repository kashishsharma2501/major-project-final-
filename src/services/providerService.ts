import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Availability, Provider, ProviderBadge, ProviderSkill } from '@/types';

interface ProviderProfileRow {
  id: string;
  user_id: string;
  location: string;
  city: string;
  bio: string;
  primary_skill: string | null;
  primary_category: string | null;
  years_teaching: number;
  response_time_minutes: number;
  is_verified: boolean;
  is_online: boolean;
  badges: string[];
  languages: string[];
  rating: number;
  review_count: number;
  total_sessions: number;
  total_students: number;
  created_at: string;
}

interface PublicProfileRow {
  id: string;
  name: string;
  avatar_url: string | null;
  city: string;
  is_verified: boolean;
}

interface ProviderSkillRow {
  id: string;
  provider_id: string;
  skill_name: string;
  category: string;
  experience_level: ProviderSkill['experienceLevel'];
  years_of_experience: number;
  price_per_session: number;
  session_duration_mins: number;
  learning_mode: ProviderSkill['learningMode'];
  description: string;
}

interface AvailabilityRow {
  provider_id: string;
  day: Availability['day'];
  slots: string[];
}

const KNOWN_BADGES: ProviderBadge[] = [
  'top_rated', 'reliable', 'highly_recommended', 'new_provider', 'expert',
];

export async function getProviders(filters?: {
  query?: string;
  category?: string;
  distanceKm?: number;
  maxPrice?: number;
  mode?: string;
  minRating?: number;
  experienceLevel?: string;
}): Promise<Provider[]> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured. Add the project URL and anon key to .env.local.');

  const { data: providerRows, error: providerError } = await supabase
    .from('provider_profiles')
    .select('id,user_id,location,city,bio,primary_skill,primary_category,years_teaching,response_time_minutes,is_verified,is_online,badges,languages,rating,review_count,total_sessions,total_students,created_at')
    .order('rating', { ascending: false });
  if (providerError) throw new Error(providerError.message);

  const profiles = (providerRows ?? []) as unknown as ProviderProfileRow[];
  if (!profiles.length) return [];
  const ids = profiles.map(row => row.id);
  const userIds = profiles.map(row => row.user_id);
  const [publicProfiles, skillsResult, availabilityResult] = await Promise.all([
    supabase.from('public_profiles').select('id,name,avatar_url,city,is_verified').in('id', userIds),
    supabase.from('provider_skills').select('id,provider_id,skill_name,category,experience_level,years_of_experience,price_per_session,session_duration_mins,learning_mode,description').in('provider_id', ids).eq('is_active', true).eq('approval_status', 'approved'),
    supabase.from('provider_availability').select('provider_id,day,slots').in('provider_id', ids),
  ]);
  if (publicProfiles.error) throw new Error(publicProfiles.error.message);
  if (skillsResult.error) throw new Error(skillsResult.error.message);
  if (availabilityResult.error) throw new Error(availabilityResult.error.message);

  const profileById = new Map(((publicProfiles.data ?? []) as unknown as PublicProfileRow[]).map(row => [row.id, row]));
  const skillsByProvider = new Map<string, ProviderSkill[]>();
  for (const row of (skillsResult.data ?? []) as unknown as ProviderSkillRow[]) {
    const items = skillsByProvider.get(row.provider_id) ?? [];
    items.push({
      skillId: row.id,
      skillName: row.skill_name,
      category: row.category,
      experienceLevel: row.experience_level,
      yearsOfExperience: row.years_of_experience,
      pricePerSession: Number(row.price_per_session),
      sessionDurationMinutes: row.session_duration_mins,
      learningMode: row.learning_mode,
      description: row.description,
    });
    skillsByProvider.set(row.provider_id, items);
  }
  const availabilityByProvider = new Map<string, Availability[]>();
  for (const row of (availabilityResult.data ?? []) as unknown as AvailabilityRow[]) {
    const items = availabilityByProvider.get(row.provider_id) ?? [];
    items.push({ day: row.day, slots: row.slots });
    availabilityByProvider.set(row.provider_id, items);
  }

  let providers = profiles.flatMap((row): Provider[] => {
    const profile = profileById.get(row.user_id);
    const providerSkills = skillsByProvider.get(row.id) ?? [];
    if (!profile || !providerSkills.length) return [];
    const primaryListing = providerSkills.find(skill => skill.skillName === row.primary_skill) ?? providerSkills[0];
    return [{
      id: row.id,
      userId: row.user_id,
      name: profile.name,
      email: '',
      avatar: profile.avatar_url ?? undefined,
      location: row.location || row.city || profile.city,
      city: row.city || profile.city,
      distanceKm: null,
      bio: row.bio,
      skills: providerSkills,
      primarySkill: primaryListing.skillName,
      primaryCategory: primaryListing.category,
      rating: Number(row.rating),
      reviewCount: row.review_count,
      totalSessions: row.total_sessions,
      totalStudents: row.total_students,
      joinedAt: row.created_at,
      yearsTeaching: row.years_teaching,
      responseTimeMinutes: row.response_time_minutes,
      isVerified: row.is_verified || profile.is_verified,
      isOnline: row.is_online,
      badges: row.badges.filter((badge): badge is ProviderBadge => KNOWN_BADGES.includes(badge as ProviderBadge)),
      portfolio: [],
      availability: availabilityByProvider.get(row.id) ?? [],
      languages: row.languages,
    }];
  });

  if (filters?.query) {
    const query = filters.query.toLowerCase();
    providers = providers.filter(provider => provider.name.toLowerCase().includes(query)
      || provider.primarySkill.toLowerCase().includes(query)
      || provider.skills.some(skill => skill.skillName.toLowerCase().includes(query)));
  }
  if (filters?.category) providers = providers.filter(provider => provider.primaryCategory === filters.category);
  if (filters?.maxPrice !== undefined) providers = providers.filter(provider => provider.skills.some(skill => skill.pricePerSession <= filters.maxPrice!));
  if (filters?.mode && filters.mode !== 'Either') {
    const mode = filters.mode.toLowerCase();
    providers = providers.filter(provider => provider.skills.some(skill => skill.learningMode === mode || skill.learningMode === 'either'));
  }
  if (filters?.minRating !== undefined) providers = providers.filter(provider => provider.rating >= filters.minRating!);
  if (filters?.experienceLevel) providers = providers.filter(provider => provider.skills.some(skill => skill.experienceLevel === filters.experienceLevel!.toLowerCase()));
  return providers;
}

export async function getProviderById(id: string): Promise<Provider | null> {
  const providers = await getProviders();
  return providers.find(provider => provider.id === id || provider.userId === id) ?? null;
}

export async function getRecommendedProviders(_userId: string, skillPreferences: string[]): Promise<Provider[]> {
  const providers = await getProviders();
  if (!skillPreferences.length) return providers.slice(0, 4);
  const preferences = skillPreferences.map(skill => skill.toLowerCase());
  return providers
    .filter(provider => provider.skills.some(skill => preferences.includes(skill.skillName.toLowerCase())))
    .slice(0, 4);
}