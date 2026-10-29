import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Check, X, MessageSquare, RefreshCw, CheckCircle } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { getOrCreateProviderProfile } from '@/services/providerSkillsService';
import { getBookingsByProvider, updateBookingStatus, confirmCompletion } from '@/services/bookingService';
import { formatDate, formatTime, formatCurrency } from '@/utils/format';
import type { Booking } from '@/types';

export function ProviderBookingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [providerProfileId, setProviderProfileId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const pid = await getOrCreateProviderProfile(user.id, user.city);
      if (!pid) throw new Error('Could not initialise provider profile.');
      setProviderProfileId(pid);
      const data = await getBookingsByProvider(pid);
      setBookings(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.city]);

  useEffect(() => { load(); }, [load]);

  const pending   = bookings.filter(b => b.status === 'pending');
  const upcoming  = bookings.filter(b => b.status === 'accepted');
  const completed = bookings.filter(b => b.status === 'completed');
  const cancelled = bookings.filter(b => b.status === 'cancelled' || b.status === 'declined');

  const accept = async (id: string) => {
    try {
      await updateBookingStatus(id, 'accepted');
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'accepted' as const } : b));
      toast('success', 'Booking accepted', 'The learner has been notified.');
    } catch (e: any) {
      toast('error', 'Could not accept booking', e.message);
    }
  };

  const decline = async (id: string) => {
    try {
      await updateBookingStatus(id, 'declined');
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'declined' as const } : b));
      toast('info', 'Booking declined');
    } catch (e: any) {
      toast('error', 'Could not decline booking', e.message);
    }
  };

  const markComplete = async (id: string) => {
    try {
      await confirmCompletion(id, 'provider');
      toast('success', 'Marked as complete', 'Once the learner also confirms, the session will be completed.');
      load();
    } catch (e: any) {
      toast('error', 'Could not confirm', e.message);
    }
  };

  const BookingRow = ({ b, showActions }: { b: Booking; showActions?: boolean }) => (
    <div className="card p-4 flex items-start gap-3">
      <Avatar src={b.learnerAvatar} name={b.learnerName} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="font-semibold text-[#0F172A] dark:text-slate-100 text-sm">{b.learnerName}</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400">{b.skill}</p>
          </div>
          <StatusBadge status={b.status} />
        </div>
        <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(b.date)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(b.time)}</span>
          <span className="font-semibold text-[#0F172A] dark:text-slate-100">{formatCurrency(b.price)}</span>
        </div>
        {showActions && (
          <div className="flex gap-2 mt-2.5 flex-wrap">
            <Button size="xs" variant="primary" leftIcon={<Check className="w-3 h-3" />} onClick={() => accept(b.id)}>Accept</Button>
            <Button size="xs" variant="danger" leftIcon={<X className="w-3 h-3" />} onClick={() => decline(b.id)}>Decline</Button>
            <Button size="xs" variant="secondary" leftIcon={<MessageSquare className="w-3 h-3" />} onClick={() => navigate('/provider/messages')}>Message</Button>
          </div>
        )}
        {b.status === 'accepted' && (
          <div className="flex gap-2 mt-2.5">
            <Button size="xs" variant="teal" leftIcon={<CheckCircle className="w-3 h-3" />} onClick={() => markComplete(b.id)}>
              Mark Complete
            </Button>
            <Button size="xs" variant="secondary" leftIcon={<MessageSquare className="w-3 h-3" />} onClick={() => navigate('/provider/messages')}>
              Message
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const Empty = ({ label }: { label: string }) => (
    <EmptyState icon={<Calendar className="w-6 h-6" />}
      title={`No ${label.toLowerCase()} bookings`}
      description="Bookings from learners will appear here." />
  );

  if (loading) {
    return (
      <DashboardLayout title="Bookings" subtitle="Manage all your session requests">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Bookings" subtitle="Manage all your session requests">
        <EmptyState icon={<RefreshCw className="w-6 h-6" />} title="Could not load bookings"
          description={error} action={{ label: 'Try Again', onClick: load }} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Bookings" subtitle="Manage all your session requests">
      <Tabs defaultTab="pending">
        <TabList>
          <Tab value="pending" count={pending.length}>Requests</Tab>
          <Tab value="upcoming" count={upcoming.length}>Upcoming</Tab>
          <Tab value="completed" count={completed.length}>Completed</Tab>
          <Tab value="cancelled" count={cancelled.length}>Cancelled</Tab>
        </TabList>
        <div className="mt-5 space-y-3">
          <TabPanel value="pending">
            {pending.length === 0 ? <Empty label="Pending" /> : pending.map(b => <BookingRow key={b.id} b={b} showActions />)}
          </TabPanel>
          <TabPanel value="upcoming">
            {upcoming.length === 0 ? <Empty label="Upcoming" /> : upcoming.map(b => <BookingRow key={b.id} b={b} />)}
          </TabPanel>
          <TabPanel value="completed">
            {completed.length === 0 ? <Empty label="Completed" /> : completed.map(b => <BookingRow key={b.id} b={b} />)}
          </TabPanel>
          <TabPanel value="cancelled">
            {cancelled.length === 0 ? <Empty label="Cancelled" /> : cancelled.map(b => <BookingRow key={b.id} b={b} />)}
          </TabPanel>
        </div>
      </Tabs>
    </DashboardLayout>
  );
}
