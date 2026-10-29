import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, MessageSquare, Star, X, Eye, RefreshCw, CheckCircle } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { getBookingsByLearner, updateBookingStatus, confirmCompletion } from '@/services/bookingService';
import { formatDate, formatTime, formatCurrency, formatDuration } from '@/utils/format';
import type { Booking } from '@/types';

function BookingCard({ booking, onCancel, onReview, onMessage, onConfirmComplete }: {
  booking: Booking;
  onCancel?: (b: Booking) => void;
  onReview?: (b: Booking) => void;
  onMessage?: (b: Booking) => void;
  onConfirmComplete?: (b: Booking) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="card p-5 hover:shadow-card transition-shadow">
      <div className="flex items-start gap-3">
        <Avatar src={booking.providerAvatar} name={booking.providerName} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold text-[#0F172A] dark:text-slate-100">{booking.skill}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">with {booking.providerName}</p>
            </div>
            <StatusBadge status={booking.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(booking.date)}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(booking.time)} · {formatDuration(booking.durationMinutes)}</span>
            <span className="capitalize">{booking.mode === 'either' ? 'Flexible' : booking.mode}</span>
            {booking.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{booking.location}</span>}
          </div>
          {booking.notes && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">"{booking.notes}"</p>
          )}
        </div>
        <p className="text-base font-bold text-[#0F172A] dark:text-slate-100 shrink-0">
          {formatCurrency(booking.price)}
          {(booking as any).payment_status === 'captured' && (
            <span className="block text-xs text-green-600 dark:text-green-400 font-normal mt-0.5 flex items-center gap-0.5">
              ✓ Paid
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B] flex-wrap">
        <Button size="xs" variant="secondary" leftIcon={<Eye className="w-3 h-3" />}
          onClick={() => navigate(`/providers/${booking.providerId}`)}>
          View Provider
        </Button>
        {booking.status === 'accepted' && onMessage && (
          <Button size="xs" variant="secondary" leftIcon={<MessageSquare className="w-3 h-3" />}
            onClick={() => onMessage(booking)}>
            Message
          </Button>
        )}
        {booking.status === 'accepted' && onConfirmComplete && (
          <Button size="xs" variant="teal" leftIcon={<CheckCircle className="w-3 h-3" />}
            onClick={() => onConfirmComplete(booking)}>
            Mark Complete
          </Button>
        )}
        {booking.status === 'completed' && onReview && (
          <Button size="xs" variant="teal" leftIcon={<Star className="w-3 h-3" />}
            onClick={() => onReview(booking)}>
            Leave Review
          </Button>
        )}
        {(booking.status === 'pending' || booking.status === 'accepted') && onCancel && (
          <Button size="xs" variant="danger" leftIcon={<X className="w-3 h-3" />}
            onClick={() => onCancel(booking)} className="ml-auto">
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export function MyBookingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getBookingsByLearner(user.id);
      setBookings(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const upcoming  = bookings.filter(b => b.status === 'accepted');
  const pending   = bookings.filter(b => b.status === 'pending');
  const completed = bookings.filter(b => b.status === 'completed');
  const cancelled = bookings.filter(b => b.status === 'cancelled' || b.status === 'declined');

  const confirmCancel = async () => {
    if (!cancelTarget || !user?.id) return;
    setCancelling(true);
    try {
      await updateBookingStatus(cancelTarget.id, 'cancelled', { cancelled_by: user.id });
      setBookings(prev => prev.map(b => b.id === cancelTarget.id ? { ...b, status: 'cancelled' as const } : b));
      toast('info', 'Booking cancelled');
    } catch (e: any) {
      toast('error', 'Could not cancel booking', e.message);
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  const handleConfirmComplete = async (b: Booking) => {
    try {
      await confirmCompletion(b.id, 'learner');
      toast('success', 'Marked as complete', 'Once the provider also confirms, the session will be completed.');
      load(); // refresh to pick up any status change
    } catch (e: any) {
      toast('error', 'Could not confirm', e.message);
    }
  };

  const handleMessage = (b: Booking) => navigate(`/dashboard/messages?providerId=${b.providerId}&skill=${encodeURIComponent(b.skill)}`);
  const handleReview = (b: Booking) => navigate('/dashboard/reviews?newReview=true&bookingId=' + b.id);

  const EmptyBookings = ({ label }: { label: string }) => (
    <EmptyState
      icon={<Calendar className="w-6 h-6" />}
      title={`No ${label.toLowerCase()} bookings`}
      description="Your bookings will appear here once you start learning."
      action={{ label: 'Explore Skills', onClick: () => navigate('/explore') }}
    />
  );

  if (loading) {
    return (
      <DashboardLayout title="My Bookings" subtitle="Track all your learning sessions">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="My Bookings" subtitle="Track all your learning sessions">
        <EmptyState icon={<RefreshCw className="w-6 h-6" />} title="Could not load bookings"
          description={error} action={{ label: 'Try Again', onClick: load }} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Bookings" subtitle="Track all your learning sessions">
      <Tabs defaultTab="upcoming">
        <TabList>
          <Tab value="upcoming" count={upcoming.length}>Upcoming</Tab>
          <Tab value="pending" count={pending.length}>Pending</Tab>
          <Tab value="completed" count={completed.length}>Completed</Tab>
          <Tab value="cancelled" count={cancelled.length}>Cancelled</Tab>
        </TabList>
        <div className="mt-5">
          <TabPanel value="upcoming">
            {upcoming.length === 0 ? <EmptyBookings label="Upcoming" /> : (
              <div className="space-y-4">
                {upcoming.map(b => (
                  <BookingCard key={b.id} booking={b}
                    onCancel={setCancelTarget}
                    onMessage={handleMessage}
                    onConfirmComplete={handleConfirmComplete} />
                ))}
              </div>
            )}
          </TabPanel>
          <TabPanel value="pending">
            {pending.length === 0 ? <EmptyBookings label="Pending" /> : (
              <div className="space-y-4">
                {pending.map(b => <BookingCard key={b.id} booking={b} onCancel={setCancelTarget} />)}
              </div>
            )}
          </TabPanel>
          <TabPanel value="completed">
            {completed.length === 0 ? <EmptyBookings label="Completed" /> : (
              <div className="space-y-4">
                {completed.map(b => <BookingCard key={b.id} booking={b} onReview={handleReview} onMessage={handleMessage} />)}
              </div>
            )}
          </TabPanel>
          <TabPanel value="cancelled">
            {cancelled.length === 0 ? <EmptyBookings label="Cancelled" /> : (
              <div className="space-y-4">
                {cancelled.map(b => <BookingCard key={b.id} booking={b} />)}
              </div>
            )}
          </TabPanel>
        </div>
      </Tabs>

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        title="Cancel booking?"
        description={`Cancel your ${cancelTarget?.skill} session with ${cancelTarget?.providerName}? This cannot be undone.`}
        confirmLabel={cancelling ? 'Cancelling…' : 'Yes, Cancel'}
        confirmVariant="danger"
      />
    </DashboardLayout>
  );
}
