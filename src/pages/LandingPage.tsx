import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, MapPin, Star, Users, BookOpen, Award,
  Compass, MessageSquare, CalendarCheck, ChevronRight,
  Sparkles, Shield, Clock, TrendingUp
} from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { RatingDisplay } from '@/components/ui/Rating';
import { getFeaturedSkills, getCatalogueCategories, getCatalogueLoadStatus } from '@/services/catalogueService';
import { getProviders } from '@/services/providerService';
import { skillCatalogue, type CatalogueSkill } from '@/data/skillCatalogue';
import type { Provider } from '@/types';
import { cn } from '@/utils/cn';

const howItWorks = [
  {
    step: '01',
    icon: <Compass className="w-6 h-6" />,
    title: 'Discover',
    description: 'Search for the skill you want to learn and filter by location, experience level, price, and availability.',
  },
  {
    step: '02',
    icon: <Sparkles className="w-6 h-6" />,
    title: 'Match',
    description: 'Our matching system surfaces the most relevant providers based on your preferences and location.',
  },
  {
    step: '03',
    icon: <MessageSquare className="w-6 h-6" />,
    title: 'Connect',
    description: 'Message providers directly, ask questions, and align on what you want to achieve.',
  },
  {
    step: '04',
    icon: <CalendarCheck className="w-6 h-6" />,
    title: 'Learn',
    description: 'Book a session, meet in person or online, and start building a real skill with someone who knows it well.',
  },
];

const whyFeatures = [
  {
    icon: <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
    title: 'Hyperlocal',
    description: "Find providers within walking distance. Learning is more effective when it's convenient.",
  },
  {
    icon: <Shield className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
    title: 'Verified Providers',
    description: 'Every provider profile is reviewed. Ratings and reviews come from verified completed sessions.',
  },
  {
    icon: <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
    title: 'Flexible Sessions',
    description: 'Choose your time, duration, and format — offline, online, or either.',
  },
  {
    icon: <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />,
    title: 'Community Growth',
    description: 'Every session strengthens local skills networks and creates meaningful connections.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredSkills, setFeaturedSkills] = useState<CatalogueSkill[]>(skillCatalogue.filter(skill => skill.isActive && skill.isFeatured));
  const [catalogueCategories, setCatalogueCategories] = useState<{ name: string; icon: string; count: number }[]>([]);
  const [catalogueFallback, setCatalogueFallback] = useState(false);
  const [featuredProviders, setFeaturedProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providerLoadError, setProviderLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getFeaturedSkills(), getCatalogueCategories()]).then(([skills, cats]) => {
      if (cancelled) return;
      setFeaturedSkills(skills);
      setCatalogueCategories(cats);
      setCatalogueFallback(getCatalogueLoadStatus().source === 'fallback');
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getProviders().then(providers => {
      if (!cancelled) setFeaturedProviders(providers.slice(0, 3));
    }).catch(error => {
      if (!cancelled) {
        setFeaturedProviders([]);
        setProviderLoadError(error instanceof Error ? error.message : 'Provider directory is unavailable.');
      }
    }).finally(() => {
      if (!cancelled) setProvidersLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/explore${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`);
  };

  return (
    <PublicLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white dark:bg-[#080E1A]">
        {/* Background decoration — layered gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/40 dark:to-violet-950/30 blur-3xl opacity-70" />
          <div className="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-teal-100 to-emerald-100 dark:from-teal-950/30 dark:to-emerald-950/20 blur-3xl opacity-50" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-violet-100 dark:bg-violet-950/20 blur-3xl opacity-30" />
          {/* Dot grid pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.05]" aria-hidden="true">
            <defs>
              <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="currentColor" className="text-indigo-900 dark:text-indigo-100" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="page-container relative py-24 lg:py-32">
          <div className="max-w-3xl">
            {/* Label pill */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8
                            bg-gradient-to-r from-indigo-50 to-violet-50
                            dark:from-indigo-950/60 dark:to-violet-950/40
                            border border-indigo-200/50 dark:border-indigo-800/50
                            shadow-sm">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 animate-pulse" />
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">
                Now live in Ludhiana, Chandigarh &amp; more
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-hero text-[#0B1220] dark:text-white mb-5 text-balance leading-[1.08]">
              Learn skills from{' '}
              <span className="gradient-text">people around you.</span>
            </h1>

            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-8 max-w-2xl">
              Discover trusted local people who can teach the skills you want to learn — from photography and coding to music, cooking and more. Real people. Real skills. Your neighbourhood.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-8 max-w-xl">
              <div className="flex-1 relative">
                <Compass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="What do you want to learn?"
                  className="input-base pl-10 h-12 text-base shadow-sm"
                  aria-label="Search for a skill"
                />
              </div>
              <Button type="submit" variant="primary" size="lg" className="shrink-0 h-12">
                Explore Skills <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate('/signup?role=provider')}
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
              >
                Share your skill <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {featuredProviders.slice(0, 4).map((p) => (
                    <Avatar key={p.id} src={p.avatar} name={p.name} size="xs" className="ring-2 ring-white dark:ring-[#0B1220]" />
                  ))}
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {providerLoadError ? 'Provider directory unavailable' : `${featuredProviders.length} providers listed`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-teal-600" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'30\' height=\'30\' viewBox=\'0 0 30 30\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'2\' cy=\'2\' r=\'1.5\' fill=\'white\' fill-opacity=\'0.1\'/%3E%3C/svg%3E')]" />
        <div className="page-container py-12 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { value: String(featuredSkills.length ? catalogueCategories.reduce((sum, c) => sum + c.count, 0) : '—'), label: 'Verified skills', icon: '📚' },
              { value: providersLoading ? '…' : providerLoadError ? '—' : String(featuredProviders.length), label: 'Active providers', icon: '🎓' },
              { value: String(catalogueCategories.length || '—'), label: 'Skill categories', icon: '🗂️' },
              { value: 'Live', label: 'Platform status', icon: '✅' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-2xl font-bold text-white tracking-tight">{stat.value}</div>
                <div className="text-sm text-white/70 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Skills ─────────────────────────────────────────────────── */}
      <section className="section-spacing bg-white dark:bg-[#0B1220]" id="skills">
        <div className="page-container">
          <div className="text-center mb-12">
            <p className="section-label mb-2">Popular Skills</p>
            <h2 className="text-display text-[#0B1220] dark:text-white">
              What people are learning
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-lg mx-auto">
              From creative arts to technology, there's a local teacher for almost every skill you want to develop.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {featuredSkills.slice(0, 8).map((skill) => (
              <button
                key={skill.id}
                onClick={() => navigate(`/explore?q=${encodeURIComponent(skill.name)}`)}
                className="group flex items-center gap-3 p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-card transition-all duration-200 text-left"
              >
                <span className="text-2xl shrink-0" role="img" aria-label={skill.name}>{skill.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                    {skill.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{skill.category}</p>
                </div>
              </button>
            ))}
          </div>
          {catalogueFallback && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-3 text-center" role="status">
              Showing the bundled skill catalogue while the database is unavailable.
            </p>
          )}

          <div className="text-center mt-8">
            <Button variant="secondary" onClick={() => navigate('/explore')}>
              Browse all skills <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <section className="section-spacing bg-slate-50 dark:bg-[#111827]" id="how-it-works">
        <div className="page-container">
          <div className="text-center mb-12">
            <p className="section-label mb-2">How It Works</p>
            <h2 className="text-display text-[#0B1220] dark:text-white">
              From search to session in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, index) => (
              <div key={step.step} className="relative">
                {/* Connector line */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-[#E2E8F0] dark:bg-[#1E293B] -z-10" style={{ width: 'calc(100% - 4rem)', left: 'calc(50% + 2rem)' }} aria-hidden="true" />
                )}
                <div className="card p-6 h-full">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      {step.icon}
                    </div>
                    <span className="text-3xl font-bold text-[#E2E8F0] dark:text-[#1E293B] leading-none mt-1 select-none">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#0F172A] dark:text-slate-100 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Providers ─────────────────────────────────────────────── */}
      <section className="section-spacing bg-white dark:bg-[#0B1220]">
        <div className="page-container">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="section-label mb-2">Recommended for You</p>
              <h2 className="text-display text-[#0B1220] dark:text-white">
                Providers near Ludhiana
              </h2>
            </div>
            <Button variant="ghost" onClick={() => navigate('/explore')} className="hidden sm:flex">
              See all <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {!providersLoading && featuredProviders.length === 0 && (
              <p className="col-span-full text-sm text-slate-500 dark:text-slate-400" role={providerLoadError ? 'alert' : 'status'}>
                {providerLoadError ? `Provider profiles could not be loaded: ${providerLoadError}` : 'No provider profiles are available yet.'}
              </p>
            )}
            {featuredProviders.map((provider) => {
              const skill = provider.skills[0];
              return (
                <div
                  key={provider.id}
                  className="card p-5 hover:shadow-elevated transition-all duration-200 cursor-pointer group"
                  onClick={() => navigate(`/providers/${provider.id}`)}
                  role="article"
                  aria-label={`${provider.name} — ${provider.primarySkill}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={provider.avatar} name={provider.name} size="lg" online={provider.isOnline} />
                      <div>
                        <div className="flex items-center gap-1">
                          <h3 className="font-semibold text-[#0F172A] dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {provider.name}
                          </h3>
                          {provider.isVerified && (
                            <svg className="w-4 h-4 text-indigo-600 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-label="Verified">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{provider.primarySkill}</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">{provider.bio}</p>

                  <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <RatingDisplay rating={provider.rating} reviewCount={provider.reviewCount} />
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {provider.city}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-[#0F172A] dark:text-slate-100">
                      ₹{skill.pricePerSession}/session
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-8 sm:hidden">
            <Button variant="secondary" onClick={() => navigate('/explore')}>
              See all providers <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Why SkillShare Local ───────────────────────────────────────────── */}
      <section className="section-spacing bg-slate-50 dark:bg-[#111827]">
        <div className="page-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="section-label mb-3">Why SkillShare Local?</p>
              <h2 className="text-display text-[#0B1220] dark:text-white mb-5">
                The most effective learning is local and personal.
              </h2>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                Online courses are convenient, but they can't replicate sitting with someone who genuinely knows a skill and can adapt to how you learn. SkillShare Local brings that back.
              </p>
              <div className="space-y-4">
                {whyFeatures.map((f) => (
                  <div key={f.title} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-center shrink-0">
                      {f.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">{f.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{f.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual side — skill categories grid */}
            <div className="grid grid-cols-2 gap-3">
              {catalogueCategories.slice(0, 8).map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => navigate(`/explore?category=${cat.name}`)}
                  className="card p-4 hover:shadow-card hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200 text-left group"
                >
                  <span className="text-2xl mb-2 block" role="img" aria-label={cat.name}>{cat.icon}</span>
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{cat.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{cat.count} skill{cat.count !== 1 ? 's' : ''}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Become a Provider ─────────────────────────────────────────────── */}
      <section className="section-spacing bg-white dark:bg-[#0B1220]" id="become-provider">
        <div className="page-container">
          <div className="max-w-4xl mx-auto rounded-2xl bg-[#0B1220] dark:bg-indigo-950/30 dark:border dark:border-indigo-900/30 overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-10">
                <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-4">For Skill Providers</p>
                <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
                  Share what you know. Earn from it.
                </h2>
                <p className="text-slate-400 leading-relaxed mb-6">
                  If you have a skill — whether it's photography, design, coding, music, cooking, or anything else — there are people near you who want to learn it from someone like you.
                </p>
                <ul className="space-y-2 mb-8">
                  {[
                    'Set your own schedule and price',
                    'Teach in person, online, or both',
                    'Build a reputation through reviews',
                    'Connect with learners in your city',
                  ].map((point) => (
                    <li key={point} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-indigo-400" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="primary"
                  onClick={() => navigate('/signup?role=provider')}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  Become a Provider <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="bg-indigo-950/50 p-10 flex flex-col justify-center">
                <div className="space-y-3">
                  {featuredProviders.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                      <Avatar src={p.avatar} name={p.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{p.name}</p>
                        <p className="text-xs text-slate-400 truncate">{p.primarySkill} · {p.city}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-xs text-amber-400">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{p.rating}</span>
                        </div>
                        <p className="text-xs text-slate-400">{p.totalSessions} sessions</p>
                      </div>
                    </div>
                  ))}
                  <div className="text-center pt-2">
                    <span className="text-xs text-slate-500">{featuredProviders.length} profiles listed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="section-spacing bg-indigo-600 dark:bg-indigo-700">
        <div className="page-container text-center">
          <Award className="w-10 h-10 text-indigo-200 mx-auto mb-5" />
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Your next skill could be closer than you think.
          </h2>
          <p className="text-indigo-200 text-lg mb-8 max-w-xl mx-auto">
            Learn locally. Share skills. Grow together.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              className="bg-white text-indigo-700 hover:bg-indigo-50 focus:ring-white/30 font-semibold"
              onClick={() => navigate('/explore')}
            >
              Explore Skills <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="text-white hover:text-white hover:bg-indigo-500 border border-indigo-400"
              onClick={() => navigate('/signup')}
            >
              Create Account
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
