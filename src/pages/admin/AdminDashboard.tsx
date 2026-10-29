import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, Users, Briefcase, BookOpen, CalendarCheck,
  Star, BarChart3, ShieldCheck, CheckCircle, XCircle,
  AlertCircle, Menu, X, ExternalLink, ToggleLeft, ToggleRight,
  TrendingUp, Search, Filter, Clock, HelpCircle, FileText,
} from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import type { CatalogueSkill, EvidenceStatus } from '@/data/skillCatalogue';
import type { Booking, Provider, Review, UserRole } from '@/types';
import { getAllCatalogueSkills } from '@/services/catalogueService';
import { getAllBookings } from '@/services/bookingService';
import { getAllReviews } from '@/services/reviewService';
import { getProviders } from '@/services/providerService';
import { getAllTickets, updateTicketStatus, type SupportTicket } from '@/services/supportService';
import { supabase } from '@/lib/supabase';
import { formatRelativeTime, formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

// ── Admin sidebar nav ─────────────────────────────────────────────────────────

const adminNav = [
  { label: 'Dashboard', href: '/admin',           icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Approvals', href: '/admin/approvals', icon: <CheckCircle className="w-4 h-4" /> },
  { label: 'Users',     href: '/admin/users',     icon: <Users className="w-4 h-4" /> },
  { label: 'Providers', href: '/admin/providers', icon: <Briefcase className="w-4 h-4" /> },
  { label: 'Skills',    href: '/admin/skills',    icon: <BookOpen className="w-4 h-4" /> },
  { label: 'Bookings',  href: '/admin/bookings',  icon: <CalendarCheck className="w-4 h-4" /> },
  { label: 'Reviews',   href: '/admin/reviews',   icon: <Star className="w-4 h-4" /> },
  { label: 'Reports',   href: '/admin/reports',   icon: <BarChart3 className="w-4 h-4" /> },
  { label: 'Support',  href: '/admin/tickets',   icon: <HelpCircle className="w-4 h-4" /> },
  { label: 'Audit Log', href: '/admin/audit',    icon: <FileText className="w-4 h-4" /> },
  { label: 'Settings',  href: '/admin/settings',  icon: <ShieldCheck className="w-4 h-4" /> },
];

interface ProviderSkillSubmission {
  id: string;
  provider_id: string;
  skill_name: string;
  category: string;
  experience_level: string;
  years_of_experience: number;
  price_per_session: number;
  session_duration_mins: number;
  learning_mode: string;
  description: string;
  is_active: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string;
  provider: {
    city: string;
    profiles: { name: string; email: string; avatar_url: string | null } | null;
  } | null;
}

// ── Mock users table ──────────────────────────────────────────────────────────

// ── Evidence badge ────────────────────────────────────────────────────────────

function EvidenceBadge({ status }: { status: EvidenceStatus }) {
  return status === 'verified' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400">
      <CheckCircle className="w-3 h-3" /> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
      <AlertCircle className="w-3 h-3" /> Needs validation
    </span>
  );
}

// ── Admin sidebar ─────────────────────────────────────────────────────────────

function AdminSidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const content = (
    <div className="flex flex-col h-full bg-[#0B1220] w-56 shrink-0">
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
        <Logo light size="sm" />
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        <p className="px-3 py-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1">
          Admin Panel
        </p>
        {adminNav.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/admin'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              )
            }
            onClick={onClose}
          >
            {item.icon} {item.label}
          </NavLink>
        ))}
      </nav>
      {user && (
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <Avatar name={user.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500">Administrator</p>
            </div>
            <button
              onClick={async () => { await logout(); navigate('/'); }}
              className="text-slate-500 hover:text-red-400 transition-colors"
              aria-label="Logout"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex h-screen sticky top-0 shrink-0">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <aside className="relative flex h-full animate-slide-in-right">{content}</aside>
        </div>
      )}
    </>
  );
}

// ── Skills tab ────────────────────────────────────────────────────────────────

function SkillsTab() {
  const { toast } = useToast();
  const [skills, setSkills] = useState<CatalogueSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | EvidenceStatus>('all');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    getAllCatalogueSkills().then(setSkills).catch(e => {
      setError(e instanceof Error ? e.message : 'Could not load catalogue.');
    }).finally(() => setLoading(false));
  }, []);

  const categories = ['all', ...Array.from(new Set(skills.map((s) => s.category)))];

  const filtered = skills.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.field.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || s.evidenceStatus === filterStatus;
    const matchCategory = filterCategory === 'all' || s.category === filterCategory;
    return matchSearch && matchStatus && matchCategory;
  });

  const activeCount = skills.filter((s) => s.isActive).length;
  const verifiedCount = skills.filter((s) => s.evidenceStatus === 'verified').length;
  const needsValCount = skills.filter((s) => s.evidenceStatus === 'needs_validation').length;

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total in catalogue', value: skills.length,  color: 'text-[#0F172A] dark:text-slate-100' },
          { label: 'Active on platform', value: activeCount,    color: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'Verified evidence',  value: verifiedCount,  color: 'text-green-600 dark:text-green-400'   },
          { label: 'Needs validation',   value: needsValCount,  color: 'text-amber-600 dark:text-amber-400'   },
        ].map((stat) => (
          <div key={stat.label} className="card p-4 text-center">
            <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Research note */}
      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
        <strong>Research note:</strong> Evidence counts are LinkedIn India job-market snapshots (Sep 2026) and SWAYAM/NIELIT training data.
        They indicate that demand exists — they are not a precise labour-market census or guarantee of employment.
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills, fields…"
            className="input-base pl-9 py-2 text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="input-base py-2 text-sm w-44"
        >
          <option value="all">All evidence statuses</option>
          <option value="verified">Verified only</option>
          <option value="needs_validation">Needs validation</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input-base py-2 text-sm w-44"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>
          ))}
        </select>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {filtered.length} of {skills.length}
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Skill</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Field</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Evidence</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Source</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
              {filtered.map((skill) => (
                <tr
                  key={skill.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  {/* Skill name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg leading-none shrink-0">{skill.icon}</span>
                      <div>
                        <p className="font-medium text-[#0F172A] dark:text-slate-100">{skill.name}</p>
                        <p className="text-xs text-slate-400 hidden sm:block truncate max-w-[180px]">{skill.description}</p>
                      </div>
                    </div>
                  </td>

                  {/* Field */}
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell max-w-[140px]">
                    <span className="truncate block">{skill.field}</span>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    <Badge variant="indigo">{skill.category}</Badge>
                  </td>

                  {/* Evidence */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <EvidenceBadge status={skill.evidenceStatus} />
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-[200px] line-clamp-2 hidden xl:block">
                        {skill.evidenceSummary}
                      </p>
                    </div>
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {skill.sourceUrl ? (
                      <a
                        href={skill.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {skill.sourceLabel}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">{skill.sourceLabel}</span>
                    )}
                  </td>

                  {/* Read-only status: catalogue writes are migration-managed. */}
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-medium', skill.isActive ? 'text-green-600 dark:text-green-400' : 'text-slate-400')}>
                      {skill.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && <div className="py-8 text-center text-sm text-slate-400" role="status">Loading catalogue…</div>}
          {error && <div className="py-8 text-center text-sm text-red-500">{error}</div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No skills match your current filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reports tab ───────────────────────────────────────────────────────────────

function ReportsTab({
  bookings,
  providers,
  reviews,
  users,
}: {
  bookings: Booking[];
  providers: Provider[];
  reviews: Review[];
  users: { city: string }[];
}) {
  const skillRows = new Map<string, { bookings: number; providers: Set<string>; ratings: number[] }>();
  for (const booking of bookings) {
    const row = skillRows.get(booking.skill) ?? { bookings: 0, providers: new Set<string>(), ratings: [] };
    row.bookings += 1;
    row.providers.add(booking.providerId);
    row.ratings.push(...reviews.filter(review => review.skillTaught === booking.skill).map(review => review.rating));
    skillRows.set(booking.skill, row);
  }
  const topSkills = Array.from(skillRows, ([name, row]) => ({
    name,
    bookings: row.bookings,
    providers: row.providers.size,
    avgRating: row.ratings.length ? row.ratings.reduce((sum, rating) => sum + rating, 0) / row.ratings.length : null,
  })).sort((a, b) => b.bookings - a.bookings).slice(0, 6);
  const maxBookings = Math.max(...topSkills.map((s) => s.bookings));

  const cities = new Map<string, { users: number; providers: number; bookings: number }>();
  for (const user of users) {
    const row = cities.get(user.city) ?? { users: 0, providers: 0, bookings: 0 };
    row.users += 1;
    cities.set(user.city, row);
  }
  for (const provider of providers) {
    const row = cities.get(provider.city) ?? { users: 0, providers: 0, bookings: 0 };
    row.providers += 1;
    cities.set(provider.city, row);
  }
  for (const booking of bookings) {
    const city = providers.find(provider => provider.id === booking.providerId)?.city;
    if (!city) continue;
    const row = cities.get(city) ?? { users: 0, providers: 0, bookings: 0 };
    row.bookings += 1;
    cities.set(city, row);
  }
  const cityStats = Array.from(cities, ([city, values]) => ({ city, ...values }))
    .sort((a, b) => b.bookings - a.bookings).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Top skills by bookings */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-[#0F172A] dark:text-slate-100 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-500" /> Top Skills by Bookings
        </h3>
        <div className="space-y-3">
          {topSkills.map((skill) => (
            <div key={skill.name} className="flex items-center gap-3">
              <span className="text-sm text-slate-600 dark:text-slate-400 w-36 shrink-0 truncate">
                {skill.name}
              </span>
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-500 dark:bg-indigo-400 h-2 rounded-full transition-all"
                  style={{ width: `${(skill.bookings / maxBookings) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-[#0F172A] dark:text-slate-100 w-6 text-right shrink-0">
                {skill.bookings}
              </span>
              <span className="text-xs text-amber-500 flex items-center gap-0.5 w-10 shrink-0">
                <Star className="w-3 h-3 fill-current" />{skill.avgRating?.toFixed(1) ?? '—'}
              </span>
              <span className="text-xs text-slate-400 w-20 shrink-0 hidden sm:block">
                {skill.providers} providers
              </span>
            </div>
          ))}
        </div>
        {topSkills.length === 0 && <p className="text-sm text-slate-500">No booking data available yet.</p>}
      </div>

      {/* City breakdown */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-[#0F172A] dark:text-slate-100 mb-4">
          Activity by City
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B]">
                <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">City</th>
                <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Users</th>
                <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Providers</th>
                <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bookings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
              {cityStats.map((row) => (
                <tr key={row.city}>
                  <td className="py-2.5 font-medium text-[#0F172A] dark:text-slate-100">{row.city}</td>
                  <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">{row.users.toLocaleString()}</td>
                  <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">{row.providers}</td>
                  <td className="py-2.5 text-right font-semibold text-indigo-600 dark:text-indigo-400">{row.bookings.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [skillSubmissions, setSkillSubmissions] = useState<ProviderSkillSubmission[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: UserRole; city: string; created_at: string; is_verified: boolean }[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [auditLog, setAuditLog] = useState<{ id: string; action: string; target_type: string; target_id: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [providerData, bookingData, reviewData, profileResult, ticketData, auditData, submissionsResult] = await Promise.all([
        getProviders(),
        getAllBookings(),
        getAllReviews(),
        supabase.from('profiles').select('id,name,email,role,city,created_at,is_verified').order('created_at', { ascending: false }),
        getAllTickets().catch(() => [] as SupportTicket[]),
        supabase.from('admin_audit_log').select('id,action,target_type,target_id,created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('provider_skills')
          .select('id,provider_id,skill_name,category,experience_level,years_of_experience,price_per_session,session_duration_mins,learning_mode,description,is_active,approval_status,rejection_reason,submitted_at,provider:provider_profiles!provider_skills_provider_id_fkey(city,profiles!provider_profiles_user_id_fkey(name,email,avatar_url))')
          .order('submitted_at', { ascending: false }),
      ]);
      if (profileResult.error) throw new Error(profileResult.error.message);
      if (submissionsResult.error) throw new Error(submissionsResult.error.message);
      setProviders(providerData);
      setBookings(bookingData);
      setReviews(reviewData);
      setUsers((profileResult.data ?? []) as typeof users);
      setTickets(ticketData);
      setAuditLog((auditData.data ?? []) as typeof auditLog);
      setSkillSubmissions((submissionsResult.data ?? []) as unknown as ProviderSkillSubmission[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load admin data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!user || user.role !== 'admin') return <Navigate to="/login" replace />;

  const routeTab = location.pathname === '/admin'
    ? 'dashboard'
    : location.pathname.split('/')[2] ?? 'dashboard';
  const activeTab = ['dashboard', 'approvals', 'providers', 'users', 'skills', 'bookings', 'reviews', 'reports', 'tickets', 'audit', 'settings'].includes(routeTab)
    ? routeTab
    : 'dashboard';

  const setSkillApproval = async (skill: ProviderSkillSubmission, status: 'approved' | 'rejected') => {
    let reason: string | undefined;
    if (status === 'rejected') {
      const enteredReason = prompt('Reason for rejection (shown to provider):');
      if (enteredReason === null) return;
      reason = enteredReason.trim();
      if (!reason) {
        toast('warning', 'A rejection reason is required');
        return;
      }
    }

    const { error: rpcError } = await supabase.rpc('set_provider_skill_approval', {
      p_skill_id: skill.id,
      p_status: status,
      ...(reason ? { p_rejection_note: reason } : {}),
    });
    if (rpcError) { toast('error', `Could not ${status} skill`, rpcError.message); return; }
    setSkillSubmissions(prev => prev.map(item => item.id === skill.id
      ? { ...item, approval_status: status, rejection_reason: reason ?? null }
      : item));
    toast('success', status === 'approved' ? 'Skill approved' : 'Skill rejected');
  };

  const handleTicketStatus = async (ticketId: string, status: 'in_progress' | 'resolved' | 'closed', note?: string) => {
    try {
      await updateTicketStatus(ticketId, status, note);
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status, admin_note: note ?? t.admin_note } : t));
      toast('success', `Ticket marked ${status}`);
    } catch (e: any) { toast('error', 'Could not update ticket', e.message); }
  };

  const verifyProvider = async (id: string) => {
    const { error: updateError } = await supabase.from('provider_profiles').update({ is_verified: true }).eq('id', id);
    if (updateError) {
      toast('error', 'Could not verify provider', updateError.message);
      return;
    }
    setProviders(previous => previous.map(provider => provider.id === id ? { ...provider, isVerified: true } : provider));
    toast('success', 'Provider verified');
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-[#0B1220] overflow-hidden">
      <AdminSidebar mobileOpen={mobileSidebar} onClose={() => setMobileSidebar(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white dark:bg-[#111827] border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-4 px-6 shrink-0">
          <button
            onClick={() => setMobileSidebar(true)}
            className="lg:hidden btn-ghost p-2"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-[#0F172A] dark:text-slate-100">Admin Panel</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="badge bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300">
              Admin Mode
            </span>
            <Avatar name={user.name} size="sm" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <span>{error}</span>
              <Button size="xs" variant="secondary" onClick={load}>Retry</Button>
            </div>
          )}
          {/* Platform stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Users" value={loading ? '…' : users.length}
              icon={<Users className="w-4 h-4" />} accent="indigo"
              trend={{ value: 0, label: 'Live database count' }}
            />
            <StatCard
              title="Active Providers" value={loading ? '…' : providers.length.toString()}
              icon={<Briefcase className="w-4 h-4" />} accent="teal"
              trend={{ value: 0, label: `${providers.filter(p => p.isVerified).length} verified` }}
            />
            <StatCard
              title="Total Bookings" value={loading ? '…' : bookings.length}
              icon={<CalendarCheck className="w-4 h-4" />} accent="green"
              trend={{ value: 0, label: 'Live database count' }}
            />
            <StatCard
              title="Skills Catalogued" value="42"
              icon={<BookOpen className="w-4 h-4" />} accent="amber"
              trend={{ value: 0, label: 'Research catalogue' }}
            />
          </div>

          <Tabs key={activeTab} defaultTab={activeTab}>
            <TabList>
              <Tab value="dashboard">Overview</Tab>
              <Tab value="approvals">
                Session approvals
                {skillSubmissions.filter(skill => skill.approval_status === 'pending').length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">{skillSubmissions.filter(skill => skill.approval_status === 'pending').length}</span>
                )}
              </Tab>
              <Tab value="providers">Providers</Tab>
              <Tab value="users">Users</Tab>
              <Tab value="skills">Skills</Tab>
              <Tab value="bookings">Bookings</Tab>
              <Tab value="reviews">Reviews</Tab>
              <Tab value="tickets">
                Support
                {tickets.filter(t => t.status === 'open').length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">{tickets.filter(t => t.status === 'open').length}</span>
                )}
              </Tab>
              <Tab value="audit">Audit</Tab>
              <Tab value="settings">Settings</Tab>
            </TabList>

            <div className="mt-5">
              {/* ── Admin overview ── */}
              <TabPanel value="dashboard">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    {
                      title: 'Skill submissions to review',
                      count: skillSubmissions.filter(skill => skill.approval_status === 'pending').length,
                      detail: 'Pending approval',
                      href: '/admin/approvals',
                      icon: <BookOpen className="w-5 h-5 text-indigo-600" />,
                    },
                    {
                      title: 'Bookings awaiting action',
                      count: bookings.filter(booking => booking.status === 'pending').length,
                      detail: 'Pending provider response',
                      href: '/admin/bookings',
                      icon: <CalendarCheck className="w-5 h-5 text-amber-600" />,
                    },
                    {
                      title: 'Open support requests',
                      count: tickets.filter(ticket => ticket.status === 'open').length,
                      detail: 'Need admin attention',
                      href: '/admin/tickets',
                      icon: <HelpCircle className="w-5 h-5 text-rose-600" />,
                    },
                  ].map(item => (
                    <button
                      key={item.href}
                      onClick={() => navigate(item.href)}
                      className="card p-5 text-left hover:shadow-card transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">{item.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.detail}</p>
                        </div>
                        {item.icon}
                      </div>
                      <p className="text-3xl font-bold text-[#0F172A] dark:text-slate-100 mt-5">{loading ? '…' : item.count}</p>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-3">
                        Open queue <ExternalLink className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>

                <div className="card mt-5 overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-[#0F172A] dark:text-slate-100">Recent bookings</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Latest learner requests across the platform</p>
                    </div>
                    <Button size="xs" variant="secondary" onClick={() => navigate('/admin/bookings')}>View all</Button>
                  </div>
                  {bookings.length === 0 ? (
                    <p className="p-6 text-sm text-slate-500">No bookings yet.</p>
                  ) : (
                    <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                      {bookings.slice(0, 5).map(booking => (
                        <div key={booking.id} className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <span className="font-medium text-[#0F172A] dark:text-slate-100">{booking.skill}</span>
                          <span className="text-slate-500">{booking.learnerName} → {booking.providerName}</span>
                          <span className="text-xs text-slate-400 ml-auto">{formatDate(booking.date)}</span>
                          <Badge variant={booking.status === 'completed' ? 'teal' : booking.status === 'pending' ? 'warning' : 'indigo'}>
                            {booking.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabPanel>

              {/* ── Skill session approvals ── */}
              <TabPanel value="approvals">
                <div className="space-y-3">
                  {skillSubmissions.length === 0 && <div className="card p-8 text-center text-sm text-slate-500">No skill sessions have been submitted.</div>}
                  {skillSubmissions.map(skill => {
                    const provider = skill.provider;
                    const profile = provider?.profiles;
                    const statusVariant = skill.approval_status === 'approved'
                      ? 'success'
                      : skill.approval_status === 'rejected' ? 'danger' : 'warning';
                    return (
                      <div key={skill.id} className="card p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <Avatar name={profile?.name ?? 'Provider'} src={profile?.avatar_url ?? undefined} size="md" />
                            <div>
                              <p className="font-semibold text-sm text-[#0F172A] dark:text-slate-100">{profile?.name ?? 'Unknown'}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.email} · {provider?.city}</p>
                              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-2">{skill.skill_name} · {skill.category}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {skill.experience_level} · {skill.years_of_experience} years · ₹{skill.price_per_session} · {skill.session_duration_mins} min · {skill.learning_mode}
                              </p>
                              {skill.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">{skill.description}</p>}
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Submitted {formatDate(skill.submitted_at)}</p>
                              {skill.rejection_reason && <p className="text-xs text-red-600 dark:text-red-400 mt-1">Rejection reason: {skill.rejection_reason}</p>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <Badge variant={statusVariant}>{skill.approval_status}</Badge>
                            {!skill.is_active && <Badge variant="slate">Inactive</Badge>}
                            {skill.approval_status === 'pending' && (
                              <div className="flex gap-2 mt-1">
                                <Button size="xs" variant="primary" leftIcon={<CheckCircle className="w-3 h-3" />} onClick={() => setSkillApproval(skill, 'approved')}>Approve</Button>
                                <Button size="xs" variant="danger" leftIcon={<XCircle className="w-3 h-3" />} onClick={() => setSkillApproval(skill, 'rejected')}>Reject</Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabPanel>

              {/* ── Provider verification ── */}
              <TabPanel value="providers">
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Provider</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Skill</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">City</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                        {providers.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Avatar src={p.avatar} name={p.name} size="sm" />
                                <div>
                                  <p className="font-medium text-[#0F172A] dark:text-slate-100">{p.name}</p>
                                  <p className="text-xs text-slate-500 hidden sm:block">{p.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden sm:table-cell">{p.primarySkill}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">{p.city}</td>
                            <td className="px-4 py-3">
                              {p.isVerified ? (
                                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                                  <CheckCircle className="w-3.5 h-3.5" /> Verified
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                                  <AlertCircle className="w-3.5 h-3.5" /> Pending
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {!p.isVerified && (
                                <Button size="xs" variant="primary" onClick={() => verifyProvider(p.id)}>
                                  Verify
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabPanel>

              {/* ── Users ── */}
              <TabPanel value="users">
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Role</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">City</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Verified</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Avatar name={u.name} size="sm" />
                                <div>
                                  <p className="font-medium text-[#0F172A] dark:text-slate-100">{u.name}</p>
                                  <p className="text-xs text-slate-500 hidden sm:block">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <Badge variant="indigo">{u.role}</Badge>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">{u.city}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">{formatDate(u.created_at)}</td>
                            <td className="px-4 py-3">
                              {u.is_verified ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabPanel>

              {/* ── Skills catalogue ── */}
              <TabPanel value="skills">
                <SkillsTab />
              </TabPanel>

              {/* ── Bookings ── */}
              <TabPanel value="bookings">
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Learner</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Provider</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Skill</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                        {bookings.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-[#0F172A] dark:text-slate-100">{b.learnerName}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden sm:table-cell">{b.providerName}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">{b.skill}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">{formatDate(b.date)}</td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={
                                  b.status === 'completed' ? 'teal'
                                  : b.status === 'accepted'  ? 'success'
                                  : b.status === 'pending'   ? 'warning'
                                  : 'danger'
                                }
                              >
                                {b.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabPanel>

              {/* ── Reviews ── */}
              <TabPanel value="reviews">
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="card p-4 flex items-start gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Avatar name={r.learnerName} size="xs" />
                          <span className="text-sm font-medium text-[#0F172A] dark:text-slate-100">{r.learnerName}</span>
                          <span className="text-xs text-slate-400">→</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">{r.providerName}</span>
                          <div className="ml-auto flex items-center gap-0.5">
                            {Array.from({ length: r.rating }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">"{r.comment}"</p>
                        <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(r.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabPanel>

              {/* ── Reports ── */}
              <TabPanel value="reports">
                <ReportsTab bookings={bookings} providers={providers} reviews={reviews} users={users} />
              </TabPanel>

              {/* ── Support Tickets ── */}
              <TabPanel value="tickets">
                <div className="space-y-3">
                  {tickets.length === 0 && (
                    <div className="card p-8 text-center text-sm text-slate-500">No support tickets yet.</div>
                  )}
                  {tickets.map(t => (
                    <div key={t.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-[#0F172A] dark:text-slate-100">{t.subject}</p>
                            <span className={cn('badge text-xs',
                              t.status === 'open' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30' :
                              t.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30' :
                              t.status === 'resolved' ? 'bg-green-100 text-green-700 dark:bg-green-950/30' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-800'
                            )}>{t.status}</span>
                            <span className="badge text-xs bg-slate-100 text-slate-500 dark:bg-slate-800 capitalize">{t.category.replace('_', ' ')}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{t.description}</p>
                          {t.admin_note && (
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1.5 italic">Admin: {t.admin_note}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(t.created_at)}</p>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          {t.status === 'open' && (
                            <Button size="xs" variant="secondary" onClick={() => handleTicketStatus(t.id, 'in_progress')}>
                              <Clock className="w-3 h-3 mr-1" />In progress
                            </Button>
                          )}
                          {(t.status === 'open' || t.status === 'in_progress') && (
                            <Button size="xs" variant="primary" onClick={() => {
                              const note = prompt('Resolution note (optional):') ?? undefined;
                              handleTicketStatus(t.id, 'resolved', note);
                            }}>
                              <CheckCircle className="w-3 h-3 mr-1" />Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabPanel>

              {/* ── Audit Log ── */}
              <TabPanel value="audit">
                <div className="card overflow-hidden">
                  {auditLog.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">No audit entries yet.</div>
                  ) : (
                    <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                      {auditLog.map(entry => (
                        <div key={entry.id} className="px-4 py-3 flex items-center gap-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/30 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[#0F172A] dark:text-slate-100">{entry.action.replace(/_/g, ' ')}</p>
                            {entry.target_type && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {entry.target_type} · {entry.target_id?.slice(0, 8)}…
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 shrink-0">{formatRelativeTime(entry.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabPanel>

              {/* ── Admin settings ── */}
              <TabPanel value="settings">
                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="card p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h2 className="font-semibold text-[#0F172A] dark:text-slate-100">Administrator access</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Current authenticated admin account</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-[#0F172A] dark:text-slate-100">{user.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                    <Badge variant="danger" className="mt-3">Admin role</Badge>
                  </section>
                  <section className="card p-5">
                    <h2 className="font-semibold text-[#0F172A] dark:text-slate-100 mb-3">Operational controls</h2>
                    <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                      <li>Skill approvals and rejections are enforced by the database admin RPC.</li>
                      <li>Only approved, active skill listings are publicly discoverable and bookable.</li>
                      <li>Review administrative actions in the audit log.</li>
                    </ul>
                    <Button size="sm" variant="secondary" leftIcon={<FileText className="w-4 h-4" />}
                      className="mt-4" onClick={() => navigate('/admin/audit')}>
                      Open audit log
                    </Button>
                  </section>
                </div>
              </TabPanel>
            </div>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
