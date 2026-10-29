import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Star, TrendingUp, Clock, Check, X, MessageSquare, Users, CheckCircle, BookOpen, ArrowRight } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getOrCreateProviderProfile } from '@/services/providerSkillsService';
import { getBookingsByProvider, updateBookingStatus } from '@/services/bookingService';
import { formatDate, formatTime, formatCurrency } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Booking } from '@/types';

interface ProviderProfile {
  rating: number;
  review_count: number;
  total_sessions: number;
  questionnaire_complete: boolean;
  bio: string;
  primary_skill: string | null;
}

function ProfileCompletion({ profile, skillCount, availabilityCount, navigate }: {
  profile: ProviderProfile | null; skillCount: number; availabilityCount: number; navigate: (p: string) => void;
}) {
  if (!profile) return null;
  const steps = [
    { label: 'Complete questionnaire', done: profile.questionnaire_complete, path: '/provider/questionnaire' },
    { label: 'Add at least one skill', done: skillCount > 0, path: '/provider/skills' },
    { label: 'Set availability', done: availabilityCount > 0, path: '/provider/availability' },
  ];
  const pct = Math.round((steps.filter(s => s.done).length / steps.length) * 100);
  if (pct === 100) return null;
  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">Profile completion</h3>
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
            <span className={cn(s.done ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500')}>{s.label}</span>
            {!s.done && (
              <button onClick={() => navigate(s.path)} className="ml-auto text-indigo-600 dark:text-indigo-400 hover:underline shrink-0">Fix →</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProviderDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [providerProfileId, setProviderProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [skillCount, setSkillCount] = useState(0);
  const [availabilityCount, setAvailabilityCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const justSubmitted = searchParams.get('submitted') === 'true';

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const pid = await getOrCreateProviderProfile(user.id, user.city);
      if (!pid) return;
      setProviderProfileId(pid);

      const [bData, pData, sData, aData] = await Promise.all([
        getBookingsByProvider(pid),
        supabase.from('provider_profiles')
          .select('rating,review_count,total_sessions,questionnaire_complete,bio,primary_skill')
          .eq('id', pid).single(),
        supabase.from('provider_skills').select('id', { count: 'exact', head: true }).eq('provider_id', pid).eq('is_active', true),
        supabase.from('provider_availability').select('id', { count: 'exact', head: true }).eq('provider_id', pid),
      ]);

      setBookings(bData);
      if (pData.data) setProfile(pData.data as ProviderProfile);
      setSkillCount(sData.count ?? 0);
      setAvailabilityCount(aData.count ?? 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user?.id, user?.city]);

  useEffect(() => { load(); }, [load]);

  const pending  = bookings.filter(b => b.status === 'pending');
  const upcoming = bookings.filter(b => b.status === 'accepted');
  const completedValue = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.price, 0);

  const handleAccept = async (id: string) => {
    try {
      await updateBookingStatus(id, 'accepted');
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'accepted' as const } : b));
      toast('success', 'Booking accepted', 'The learner has been notified.');
    } catch (e: any) { toast('error', 'Could not accept', e.message); }
  };

  const handleDecline = async (id: string) => {
    try {
      await updateBookingStatus(id, 'declined');
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'declined' as const } : b));
      toast('info', 'Booking declined');
    } catch (e: any) { toast('error', 'Could not decline', e.message); }
  };

  if (!providerProfileId && !loading) {
    return (
      <DashboardLayout>
        <EmptyState icon={<Users className="w-6 h-6" />} title="No provider profile"
          description="Set up your provider profile to start teaching."
          action={{ label: 'Set up profile', onClick: () => navigate('/provider/questionnaire') }} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300">
          Provider Dashboard
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5">Manage your sessions, skills, and earnings.</p>
      </div>

      {justSubmitted && (
        <div className="card p-4 mb-6 flex items-center gap-3 border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">Your provider profile is ready. Skill sessions are reviewed individually before appearing in Explore.</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (<>

        <ProfileCompletion profile={profile} skillCount={skillCount} availabilityCount={availabilityCount} navigate={navigate} />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Upcoming" value={upcoming.length} icon={<Calendar className="w-4 h-4" />} accent="indigo" />
          <StatCard title="Pending" value={pending.length} icon={<Clock className="w-4 h-4" />} accent="amber"
            trend={{ value: pending.length, label: 'need response' }} />
          <StatCard title="Avg Rating" value={profile?.rating ? Number(profile.rating).toFixed(1) : '—'}
            icon={<Star className="w-4 h-4" />} accent="green"
            trend={{ value: 1, label: `${profile?.review_count ?? 0} reviews` }} />
          <StatCard title="Session Value" value={formatCurrency(completedValue)}
            icon={<TrendingUp className="w-4 h-4" />} accent="teal"
            trend={{ value: 1, label: 'listed prices only' }} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">

            {/* Pending requests */}
            <section>
              <h2 className="text-base font-semibold text-[#0F172A] dark:text-slate-100 mb-3">
                Pending Requests
                {pending.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 rounded-full">{pending.length}</span>
                )}
              </h2>
              {pending.length === 0 ? (
                <div className="card p-5 text-center text-sm text-slate-500 dark:text-slate-400">No pending requests.</div>
              ) : (
                <div className="space-y-3">
                  {pending.map(b => (
                    <div key={b.id} className="card p-4 border-l-4 border-l-amber-400">
                      <div className="flex items-start gap-3">
                        <Avatar src={b.learnerAvatar} name={b.learnerName} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#0F172A] dark:text-slate-100 text-sm">{b.learnerName}</p>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400">{b.skill}</p>
                          <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(b.date)}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(b.time)}</span>
                            <span className="font-semibold text-[#0F172A] dark:text-slate-100">{formatCurrency(b.price)}</span>
                          </div>
                          {b.notes && <p className="text-xs text-slate-400 mt-1 italic">"{b.notes}"</p>}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                        <Button size="xs" variant="primary" leftIcon={<Check className="w-3 h-3" />} onClick={() => handleAccept(b.id)}>Accept</Button>
                        <Button size="xs" variant="danger" leftIcon={<X className="w-3 h-3" />} onClick={() => handleDecline(b.id)}>Decline</Button>
                        <Button size="xs" variant="secondary" leftIcon={<MessageSquare className="w-3 h-3" />} onClick={() => navigate('/provider/messages')}>Message</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Upcoming sessions */}
            <section>
              <h2 className="text-base font-semibold text-[#0F172A] dark:text-slate-100 mb-3">Upcoming Sessions</h2>
              {upcoming.length === 0 ? (
                <div className="card p-5 text-center text-sm text-slate-500 dark:text-slate-400">No upcoming sessions.</div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map(b => (
                    <div key={b.id} className="card p-4 flex items-start gap-3">
                      <Avatar src={b.learnerAvatar} name={b.learnerName} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[#0F172A] dark:text-slate-100">{b.learnerName}</p>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400">{b.skill}</p>
                        <div className="flex gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>{formatDate(b.date)}</span>
                          <span>{formatTime(b.time)}</span>
                          <span className={cn('capitalize', b.mode === 'online' ? 'text-teal-600' : 'text-violet-600')}>{b.mode}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <StatusBadge status={b.status} />
                        <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 mt-1">{formatCurrency(b.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Quick actions */}
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-[#0F172A] dark:text-slate-100 mb-3">Quick Actions</h3>
              <div className="space-y-1.5">
                {[
                  { label: 'Manage Skills', path: '/provider/skills', icon: <BookOpen className="w-4 h-4" /> },
                  { label: 'All Bookings', path: '/provider/bookings', icon: <Calendar className="w-4 h-4" /> },
                  { label: 'Availability', path: '/provider/availability', icon: <Clock className="w-4 h-4" /> },
                  { label: 'My Profile', path: '/provider/questionnaire', icon: <Users className="w-4 h-4" /> },
                  { label: 'Earnings', path: '/provider/earnings', icon: <TrendingUp className="w-4 h-4" /> },
                ].map(l => (
                  <button key={l.path} onClick={() => navigate(l.path)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#0F172A] dark:hover:text-slate-100 transition-colors">
                    <span className="text-indigo-500">{l.icon}</span>
                    {l.label}
                    <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-300 dark:text-slate-600" />
                  </button>
                ))}
              </div>
            </div>

            {/* Session value disclaimer */}
            <div className="card p-4 bg-slate-50 dark:bg-slate-800/30">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Session Value shows listed booking prices, not verified payouts. Payment processing is not implemented in this version.
              </p>
            </div>
          </div>
        </div>
      </>)}
    </DashboardLayout>
  );
}
