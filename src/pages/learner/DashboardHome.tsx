import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar, Star, TrendingUp, Clock, Heart, HelpCircle, CheckCircle, BookOpen, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { getBookingsByLearner } from '@/services/bookingService';
import { getProviders } from '@/services/providerService';
import { getCatalogueSkills } from '@/services/catalogueService';
import { getSavedProviderIds } from '@/services/savedItemsService';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Booking, Provider } from '@/types';
import { formatDate, formatTime, formatCurrency } from '@/utils/format';
import { cn } from '@/utils/cn';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function ProfileCompletionCard({ user, bookingsCount }: { user: any; bookingsCount: number }) {
  const steps = [
    { label: 'Account created', done: true },
    { label: 'Profile bio added', done: !!(user?.bio) },
    { label: 'First booking made', done: bookingsCount > 0 },
    { label: 'First session completed', done: false }, // updated by parent
  ];
  const pct = Math.round((steps.filter(s => s.done).length / steps.length) * 100);
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">Profile progress</h3>
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
        <div className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-1.5">
        {steps.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            {s.done
              ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
              : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 dark:border-slate-700 shrink-0" />}
            <span className={s.done ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400 dark:text-slate-600'}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LearnerDashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [skills, setSkills] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firstName = user?.name?.split(' ')[0] || 'there';

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [loadedBookings, loadedProviders, catalogue, savedIds] = await Promise.all([
        getBookingsByLearner(user.id),
        getProviders().catch(() => []),
        getCatalogueSkills(),
        getSavedProviderIds(user.id),
      ]);
      setBookings(loadedBookings);
      setProviders(loadedProviders.slice(0, 4));
      setSkills(catalogue.slice(0, 6).map(s => ({ id: s.id, name: s.name, icon: s.icon })));
      setSavedCount(savedIds.size);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const upcoming   = bookings.filter(b => b.status === 'accepted');
  const pending    = bookings.filter(b => b.status === 'pending');
  const completed  = bookings.filter(b => b.status === 'completed');
  const providersMet = new Set(completed.map(b => b.providerId)).size;
  const allActive  = [...upcoming, ...pending];

  return (
    <DashboardLayout>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300">
          {getGreeting()}, {firstName} 👋
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5">Here's your learning journey at a glance.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Sessions Booked" value={bookings.length} icon={<Calendar className="w-4 h-4" />} accent="indigo"
          trend={{ value: pending.length, label: `${pending.length} pending` }} />
        <StatCard title="Completed" value={completed.length} icon={<TrendingUp className="w-4 h-4" />} accent="teal"
          trend={{ value: completed.length, label: 'All time' }} />
        <StatCard title="Providers Met" value={providersMet} icon={<Star className="w-4 h-4" />} accent="amber" />
        <StatCard title="Saved" value={savedCount} icon={<Heart className="w-4 h-4" />} accent="green"
          trend={{ value: savedCount, label: 'providers' }} />
      </div>

      {error && (
        <div className="card p-4 mb-6 flex items-center gap-3 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">{error}</p>
          <Button size="xs" variant="secondary" onClick={load} className="ml-auto shrink-0">Retry</Button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Upcoming + Pending sessions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[#0F172A] dark:text-slate-100">
                Active Sessions
                {allActive.length > 0 && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 px-2 py-0.5 rounded-full">{allActive.length}</span>}
              </h2>
              <button onClick={() => navigate('/dashboard/bookings')} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                All bookings <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {!loading && allActive.length === 0 ? (
              <div className="card p-8 text-center">
                <Calendar className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm font-medium text-[#0F172A] dark:text-slate-100 mb-1">No active sessions</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Explore skills and book your first session</p>
                <Button size="sm" variant="primary" onClick={() => navigate('/explore')}>Explore Skills</Button>
              </div>
            ) : !loading && (
              <div className="space-y-3">
                {allActive.map(b => (
                  <div key={b.id}
                    className={cn('card p-4 flex items-start gap-3 hover:shadow-card transition-shadow cursor-pointer border-l-4',
                      b.status === 'accepted' ? 'border-l-green-400' : 'border-l-amber-400')}
                    onClick={() => navigate('/dashboard/bookings')}>
                    <Avatar src={b.providerAvatar} name={b.providerName} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">{b.skill}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">with {b.providerName}</p>
                        </div>
                        <StatusBadge status={b.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(b.date)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(b.time)}</span>
                        <span className="font-semibold text-[#0F172A] dark:text-slate-100">{formatCurrency(b.price)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent completions */}
          {completed.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-[#0F172A] dark:text-slate-100">Recent Completions</h2>
                <button onClick={() => navigate('/dashboard/reviews')} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                  Leave reviews <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {completed.slice(0, 3).map(b => (
                  <div key={b.id} className="card p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] dark:text-slate-100 truncate">{b.skill} with {b.providerName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(b.date)} · {formatCurrency(b.price)}</p>
                    </div>
                    <Button size="xs" variant="secondary" onClick={() => navigate(`/dashboard/reviews?newReview=true&bookingId=${b.id}`)}>
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recommended providers */}
          {providers.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-[#0F172A] dark:text-slate-100">Explore Providers</h2>
                <button onClick={() => navigate('/explore')} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                  See all <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {providers.map(p => (
                  <div key={p.id} className="card-hover p-4 cursor-pointer group" onClick={() => navigate(`/providers/${p.id}`)}>
                    <div className="flex items-start gap-3">
                      <Avatar src={p.avatar} name={p.name} size="md" online={p.isOnline} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{p.name}</p>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400">{p.primarySkill}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{p.rating.toFixed(1)}</span>
                          <span>·</span>
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold">{formatCurrency(p.skills[0]?.pricePerSession ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Profile progress */}
          <ProfileCompletionCard user={user} bookingsCount={bookings.length} />

          {/* Quick skill browse */}
          {skills.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-[#0F172A] dark:text-slate-100 mb-3 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-500" /> Explore skills
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {skills.map(s => (
                  <button key={s.id} onClick={() => navigate(`/explore?q=${encodeURIComponent(s.name)}`)}
                    className="flex items-center gap-1.5 p-2 rounded-lg text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-slate-600 dark:text-slate-400 group">
                    <span className="text-sm">{s.icon}</span>
                    <span className="text-xs font-medium truncate">{s.name}</span>
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => navigate('/explore')}>Browse all</Button>
            </div>
          )}

          {/* Saved / Support quick links */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-slate-100 mb-3">Quick links</h3>
            <div className="space-y-1">
              {[
                { icon: <Heart className="w-4 h-4 text-red-400" />, label: `Saved providers (${savedCount})`, path: '/dashboard/saved' },
                { icon: <HelpCircle className="w-4 h-4 text-indigo-400" />, label: 'Support centre', path: '/support' },
              ].map(item => (
                <button key={item.path} onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#0F172A] dark:hover:text-slate-100 transition-colors">
                  {item.icon}
                  {item.label}
                  <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-300 dark:text-slate-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
