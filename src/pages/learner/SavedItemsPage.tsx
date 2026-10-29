import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, BookOpen, RefreshCw, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { getSavedItems, unsaveProvider, unsaveSkill } from '@/services/savedItemsService';
import { getProviderById } from '@/services/providerService';
import { getCatalogueSkills } from '@/services/catalogueService';
import { formatCurrency } from '@/utils/format';
import type { Provider } from '@/types';
import type { CatalogueSkill } from '@/data/skillCatalogue';
import type { SavedItem } from '@/services/savedItemsService';

export function SavedItemsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [savedProviders, setSavedProviders] = useState<Provider[]>([]);
  const [savedSkillDetails, setSavedSkillDetails] = useState<CatalogueSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const items = await getSavedItems(user.id);
      setSavedItems(items);

      // Load provider details
      const providerIds = items.filter(i => i.item_type === 'provider' && i.provider_id).map(i => i.provider_id!);
      const skillIds = items.filter(i => i.item_type === 'skill' && i.skill_id).map(i => i.skill_id!);

      const [providerResults, allSkills] = await Promise.all([
        Promise.allSettled(providerIds.map(id => getProviderById(id))),
        getCatalogueSkills(),
      ]);

      const providers = providerResults
        .filter((r): r is PromiseFulfilledResult<Provider | null> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter((p): p is Provider => p !== null);

      const skills = allSkills.filter(s => skillIds.includes(s.id));

      setSavedProviders(providers);
      setSavedSkillDetails(skills);
    } catch (e: any) {
      setError(e.message ?? 'Could not load saved items.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const removeProvider = async (providerId: string) => {
    if (!user?.id) return;
    try {
      await unsaveProvider(user.id, providerId);
      setSavedProviders(prev => prev.filter(p => p.id !== providerId));
      toast('info', 'Removed from saved');
    } catch (e: any) {
      toast('error', 'Could not remove', e.message);
    }
  };

  const removeSkill = async (skillId: string) => {
    if (!user?.id) return;
    try {
      await unsaveSkill(user.id, skillId);
      setSavedSkillDetails(prev => prev.filter(s => s.id !== skillId));
      toast('info', 'Removed from saved');
    } catch (e: any) {
      toast('error', 'Could not remove', e.message);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Saved" subtitle="Your saved providers and skills">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Saved" subtitle="Your saved providers and skills">
        <EmptyState icon={<RefreshCw className="w-6 h-6" />} title="Could not load saved items"
          description={error} action={{ label: 'Try Again', onClick: load }} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Saved" subtitle="Your saved providers and skills">
      <Tabs defaultTab="providers">
        <TabList>
          <Tab value="providers" count={savedProviders.length}>Providers</Tab>
          <Tab value="skills" count={savedSkillDetails.length}>Skills</Tab>
        </TabList>

        <div className="mt-5">
          <TabPanel value="providers">
            {savedProviders.length === 0 ? (
              <EmptyState icon={<Heart className="w-6 h-6" />}
                title="No saved providers yet"
                description="Save providers you like by tapping the heart icon on their profile or in Explore."
                action={{ label: 'Explore Providers', onClick: () => navigate('/explore') }} />
            ) : (
              <div className="space-y-3">
                {savedProviders.map(provider => (
                  <div key={provider.id} className="card p-4 flex items-center gap-4">
                    <Avatar src={provider.avatar} name={provider.name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#0F172A] dark:text-slate-100">{provider.name}</p>
                      <p className="text-sm text-indigo-600 dark:text-indigo-400">{provider.primarySkill}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        ⭐ {provider.rating.toFixed(1)} · {provider.city}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="xs" variant="secondary" onClick={() => navigate(`/providers/${provider.id}`)}>
                        View
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => removeProvider(provider.id)}
                        aria-label="Remove from saved">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabPanel>

          <TabPanel value="skills">
            {savedSkillDetails.length === 0 ? (
              <EmptyState icon={<BookOpen className="w-6 h-6" />}
                title="No saved skills yet"
                description="Save skills you're interested in from the Explore page."
                action={{ label: 'Browse Skills', onClick: () => navigate('/explore') }} />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {savedSkillDetails.map(skill => (
                  <div key={skill.id} className="card p-4 flex items-center gap-3">
                    <span className="text-2xl">{skill.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#0F172A] dark:text-slate-100">{skill.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{skill.category}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="xs" variant="secondary"
                        onClick={() => navigate(`/explore?q=${encodeURIComponent(skill.name)}`)}>
                        Find teachers
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => removeSkill(skill.id)}
                        aria-label="Remove from saved">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabPanel>
        </div>
      </Tabs>
    </DashboardLayout>
  );
}
