import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Clock, Star, MessageSquare, Calendar, Shield,
  Award, Users, BookOpen, ChevronDown, ChevronUp,
  Globe, CheckCircle, ExternalLink
} from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, ProviderBadgeChip } from '@/components/ui/Badge';
import { RatingDisplay } from '@/components/ui/Rating';
import { MatchScore } from '@/components/ui/MatchScore';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { getProviderById } from '@/services/providerService';
import { getReviewsByProvider } from '@/services/reviewService';
import type { Provider } from '@/types';
import { formatCurrency, formatDuration, formatRelativeTime, capitalise } from '@/utils/format';
import { cn } from '@/utils/cn';

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

export function ProviderProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bioExpanded, setBioExpanded] = useState(false);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [reviews, setReviews] = useState<Awaited<ReturnType<typeof getReviewsByProvider>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    setLoading(true);
    Promise.all([getProviderById(id), getReviewsByProvider(id)]).then(([loadedProvider, loadedReviews]) => {
      if (cancelled) return;
      setProvider(loadedProvider);
      setReviews(loadedReviews);
      setError(null);
    }).catch(e => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load provider profile.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return <PublicLayout><div className="page-container py-20 text-center" role="status">Loading provider profile…</div></PublicLayout>;
  }

  if (error || !provider) {
    return (
      <PublicLayout>
        <div className="page-container py-20">
          <EmptyState
            title="Provider not found"
            description={error ?? "This provider profile doesn't exist or has been removed."}
            action={{ label: 'Browse Providers', onClick: () => navigate('/explore') }}
          />
        </div>
      </PublicLayout>
    );
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : provider.rating.toFixed(1);

  const responseLabel = provider.responseTimeMinutes < 60
    ? `~${provider.responseTimeMinutes} min`
    : `~${Math.round(provider.responseTimeMinutes / 60)}h`;

  return (
    <PublicLayout>
      <div className="bg-[#F4F6FB] dark:bg-[#080E1A] min-h-screen">
        {/* Hero header */}
        <div className="relative overflow-hidden bg-white dark:bg-[#0F1929] border-b border-[#E2E8F0] dark:border-[#1E293B]">
          {/* Gradient blobs */}
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-gradient-to-bl from-indigo-100 to-violet-100 dark:from-indigo-950/30 dark:to-violet-950/20 blur-3xl opacity-60 pointer-events-none" />
          <div className="page-container py-8 relative">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar with gradient ring */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 blur-sm opacity-30 scale-110" />
                <Avatar src={provider.avatar} name={provider.name} size="2xl" online={provider.isOnline} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300">{provider.name}</h1>
                      {provider.isVerified && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      )}
                      {provider.isOnline && (
                        <span className="badge bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          Online
                        </span>
                      )}
                    </div>
                    <p className="text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">{provider.primarySkill}</p>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{provider.location}{provider.distanceKm !== null ? ` · ${provider.distanceKm} km away` : ''}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Replies in {responseLabel}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe className="w-4 h-4" />
                        <span>{provider.languages.join(', ')}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {provider.badges.map((b) => <ProviderBadgeChip key={b} badge={b} />)}
                    </div>
                  </div>

                  {/* Match + CTA */}
                  <div className="flex flex-col items-end gap-3">
                    {provider.matchScore && <MatchScore score={provider.matchScore} size="md" showBreakdown />}
                    <div className="flex gap-2">
                      <Button variant="secondary" size="md" leftIcon={<MessageSquare className="w-4 h-4" />}
                        onClick={() => navigate(`/dashboard/messages?providerId=${provider.id}&skill=${encodeURIComponent(provider.primarySkill)}`)}>
                        Message
                      </Button>
                      <Button variant="primary" size="md" leftIcon={<Calendar className="w-4 h-4" />}
                        onClick={() => navigate(`/booking/${provider.id}`)}>
                        Request Session
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                  {[
                    { icon: <Star className="w-4 h-4 fill-amber-400 text-amber-400" />, value: avgRating, label: `${reviews.length || provider.reviewCount} reviews` },
                    { icon: <BookOpen className="w-4 h-4 text-indigo-500" />, value: provider.totalSessions, label: 'Sessions' },
                    { icon: <Users className="w-4 h-4 text-teal-500" />, value: provider.totalStudents, label: 'Students' },
                    { icon: <Award className="w-4 h-4 text-amber-500" />, value: `${provider.yearsTeaching}y`, label: 'Teaching exp.' },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div className="flex justify-center mb-1">{stat.icon}</div>
                      <p className="text-lg font-bold text-[#0F172A] dark:text-slate-100">{stat.value}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="page-container py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main */}
            <div className="lg:col-span-2 space-y-2">
              <Tabs defaultTab="about">
                <TabList>
                  <Tab value="about">About</Tab>
                  <Tab value="skills">Skills & Pricing</Tab>
                  <Tab value="portfolio">Portfolio</Tab>
                  <Tab value="reviews" count={reviews.length || provider.reviewCount}>Reviews</Tab>
                  <Tab value="availability">Availability</Tab>
                </TabList>

                {/* About */}
                <TabPanel value="about" className="mt-5">
                  <div className="card p-6">
                    <h2 className="text-base font-semibold text-[#0F172A] dark:text-slate-100 mb-3">About {provider.name}</h2>
                    <div className={cn('text-sm text-slate-600 dark:text-slate-400 leading-relaxed', !bioExpanded && 'line-clamp-4')}>
                      {provider.bio}
                    </div>
                    {provider.bio.length > 200 && (
                      <button onClick={() => setBioExpanded(!bioExpanded)}
                        className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
                        {bioExpanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
                      </button>
                    )}
                  </div>
                </TabPanel>

                {/* Skills */}
                <TabPanel value="skills" className="mt-5 space-y-4">
                  {provider.skills.map((skill) => (
                    <div key={skill.skillId} className="card p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-[#0F172A] dark:text-slate-100 text-base">{skill.skillName}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{skill.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-[#0F172A] dark:text-slate-100">{formatCurrency(skill.pricePerSession)}</p>
                          <p className="text-xs text-slate-400">per session · {formatDuration(skill.sessionDurationMinutes)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">{skill.description}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="indigo">{capitalise(skill.experienceLevel)} level</Badge>
                        <Badge variant="teal">{skill.yearsOfExperience}y experience</Badge>
                        <Badge variant="default">{skill.learningMode === 'either' ? 'Online / Offline' : capitalise(skill.learningMode)}</Badge>
                      </div>
                      <Button variant="primary" size="sm" className="mt-4"
                        onClick={() => navigate(`/booking/${provider.id}`)}>
                        Book {skill.skillName} Session
                      </Button>
                    </div>
                  ))}
                </TabPanel>

                {/* Portfolio */}
                <TabPanel value="portfolio" className="mt-5">
                  {provider.portfolio.length === 0 ? (
                    <EmptyState title="No portfolio yet" description="This provider hasn't added portfolio items yet." />
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {provider.portfolio.map((item) => (
                        <div key={item.id} className="card p-5 hover:shadow-card transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                              item.type === 'certificate' ? 'bg-amber-50 dark:bg-amber-950/30' :
                              item.type === 'project' ? 'bg-indigo-50 dark:bg-indigo-950/30' :
                              'bg-teal-50 dark:bg-teal-950/30'
                            )}>
                              {item.type === 'certificate' ? <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" /> :
                               item.type === 'project' ? <ExternalLink className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> :
                               <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">{item.title}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                              <Badge variant="slate" className="mt-2 capitalize">{item.type}</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabPanel>

                {/* Reviews */}
                <TabPanel value="reviews" className="mt-5">
                  {/* Rating summary */}
                  <div className="card p-5 mb-5">
                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-[#0F172A] dark:text-slate-100">{avgRating}</p>
                        <RatingDisplay rating={Number(avgRating)} reviewCount={reviews.length || provider.reviewCount} size="md" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = reviews.filter((r) => r.rating === star).length || (star === 5 ? 38 : star === 4 ? 8 : star === 3 ? 2 : 0);
                          const total = reviews.length || provider.reviewCount || 1;
                          const pct = Math.round((count / total) * 100);
                          return (
                            <div key={star} className="flex items-center gap-2 text-xs">
                              <span className="w-3 text-right text-slate-500">{star}</span>
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-6 text-slate-500">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {reviews.length === 0 ? (
                    <EmptyState title="No reviews yet" description="Be the first to review this provider after a session." />
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="card p-5">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <Avatar src={review.learnerAvatar} name={review.learnerName} size="sm" />
                              <div>
                                <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">{review.learnerName}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{formatRelativeTime(review.createdAt)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">"{review.comment}"</p>
                          {review.isVerified && (
                            <div className="flex items-center gap-1 mt-3 text-xs text-green-600 dark:text-green-400">
                              <CheckCircle className="w-3 h-3" /> Verified session
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabPanel>

                {/* Availability */}
                <TabPanel value="availability" className="mt-5">
                  <div className="card p-6">
                    <h2 className="text-base font-semibold text-[#0F172A] dark:text-slate-100 mb-4">Weekly Availability</h2>
                    {provider.availability.length === 0 ? (
                      <p className="text-sm text-slate-500">No availability set. Contact the provider to arrange a time.</p>
                    ) : (
                      <div className="space-y-4">
                        {provider.availability.map((avail) => (
                          <div key={avail.day} className="flex items-start gap-4">
                            <div className="w-12 shrink-0">
                              <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                                {DAY_LABELS[avail.day]}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {avail.slots.map((slot) => (
                                <button
                                  key={slot}
                                  onClick={() => navigate(`/booking/${provider.id}?day=${avail.day}&time=${slot}`)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                >
                                  {slot.replace(':00', ':00').replace(/^(\d):/, '0$1:')} {Number(slot.split(':')[0]) < 12 ? 'AM' : 'PM'}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button variant="primary" className="mt-6 w-full sm:w-auto"
                      onClick={() => navigate(`/booking/${provider.id}`)}>
                      <Calendar className="w-4 h-4" /> Book a Session
                    </Button>
                  </div>
                </TabPanel>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Book CTA */}
              <div className="card p-5">
                <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100 mb-1">Starting from</p>
                <p className="text-3xl font-bold text-[#0F172A] dark:text-slate-100 mb-0.5">
                  {formatCurrency(Math.min(...provider.skills.map((s) => s.pricePerSession)))}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">per session</p>
                <Button variant="primary" className="w-full mb-2" size="lg"
                  onClick={() => navigate(`/booking/${provider.id}`)}>
                  <Calendar className="w-4 h-4" /> Request Session
                </Button>
                <Button variant="secondary" className="w-full"
                  onClick={() => navigate(`/dashboard/messages?providerId=${provider.id}&skill=${encodeURIComponent(provider.primarySkill)}`)}>
                  <MessageSquare className="w-4 h-4" /> Message {provider.name.split(' ')[0]}
                </Button>
                <p className="text-xs text-slate-400 text-center mt-3">
                  Typically replies in {responseLabel}
                </p>
              </div>

              {/* Provider details */}
              <div className="card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">Provider details</h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Member since</span>
                    <span className="font-medium text-[#0F172A] dark:text-slate-100">
                      {new Date(provider.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Sessions done</span>
                    <span className="font-medium text-[#0F172A] dark:text-slate-100">{provider.totalSessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Response time</span>
                    <span className="font-medium text-[#0F172A] dark:text-slate-100">{responseLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Location</span>
                    <span className="font-medium text-[#0F172A] dark:text-slate-100">{provider.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Languages</span>
                    <span className="font-medium text-[#0F172A] dark:text-slate-100 text-right">{provider.languages.join(', ')}</span>
                  </div>
                </div>
              </div>

              {/* Location placeholder map */}
              <div className="card overflow-hidden">
                <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center relative">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-indigo-400 mx-auto mb-1" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">{provider.location}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{provider.distanceKm === null ? 'Distance unavailable' : `${provider.distanceKm} km from you`}</p>
                  </div>
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(79,70,229,0.03)_10px,rgba(79,70,229,0.03)_11px)]" />
                </div>
                <div className="p-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Exact address shared after booking
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
