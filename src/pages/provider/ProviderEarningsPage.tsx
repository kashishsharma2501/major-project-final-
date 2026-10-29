import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { getOrCreateProviderProfile } from '@/services/providerSkillsService';
import { getBookingsByProvider } from '@/services/bookingService';
import type { Booking } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';

export function ProviderEarningsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return;
    (async () => {
      try {
        const providerId = await getOrCreateProviderProfile(user.id, user.city);
        if (!providerId) throw new Error('Could not initialise provider profile.');
        const rows = await getBookingsByProvider(providerId);
        if (!cancelled) setBookings(rows.filter(booking => booking.status === 'completed'));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load completed sessions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.city]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().getFullYear().toString();
  const monthBookings = bookings.filter(booking => booking.date.startsWith(currentMonth));
  const yearBookings = bookings.filter(booking => booking.date.startsWith(currentYear));
  const totalValue = (rows: Booking[]) => rows.reduce((total, booking) => total + booking.price, 0);

  if (loading) {
    return <DashboardLayout title="Earnings" subtitle="Completed session value"><div className="py-16 text-center text-sm text-slate-400" role="status">Loading completed sessions…</div></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout title="Earnings"><EmptyState icon={<TrendingUp className="w-6 h-6" />} title="Could not load session history" description={error} /></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Session Value" subtitle="Completed sessions from your booking history">
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        These figures are the listed prices of completed bookings, not verified payouts. Payment processing and settlement are not part of the current database.
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="This Month" value={formatCurrency(totalValue(monthBookings))} icon={<TrendingUp className="w-4 h-4" />} accent="green" />
        <StatCard title="Completed Sessions" value={bookings.length} icon={<TrendingUp className="w-4 h-4" />} accent="teal" />
        <StatCard title="This Year" value={formatCurrency(totalValue(yearBookings))} icon={<TrendingUp className="w-4 h-4" />} accent="indigo" />
        <StatCard title="All-time Value" value={formatCurrency(totalValue(bookings))} icon={<TrendingUp className="w-4 h-4" />} accent="amber" />
      </div>
      {bookings.length === 0 ? (
        <EmptyState icon={<TrendingUp className="w-6 h-6" />} title="No completed sessions yet" description="Completed bookings will appear here." />
      ) : (
        <div className="card overflow-hidden divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
          {bookings.map(booking => (
            <div key={booking.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0F172A] dark:text-slate-100">{booking.learnerName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{booking.skill} · {formatDate(booking.date)}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-[#0F172A] dark:text-slate-100">{formatCurrency(booking.price)}</span>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}