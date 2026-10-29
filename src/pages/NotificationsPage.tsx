import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Calendar, MessageSquare, Star, AlertCircle, Check, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatRelativeTime } from '@/utils/format';
import { cn } from '@/utils/cn';

interface DbNotification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  action_url: string | null;
  avatar_url: string | null;
  actor_name: string | null;
  created_at: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  booking_request:  <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
  booking_accepted: <Check className="w-4 h-4 text-green-600 dark:text-green-400" />,
  booking_declined: <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />,
  new_message:      <MessageSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
  session_reminder: <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
  new_review:       <Star className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
  system:           <Bell className="w-4 h-4 text-slate-500" />,
};

export function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (err) setError(err.message);
    else setNotifications(data ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const unread = notifications.filter(n => !n.is_read);

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', user.id).eq('is_read', false);
  };

  const handleClick = async (n: DbNotification) => {
    await markRead(n.id);
    if (n.action_url) navigate(n.action_url);
  };

  if (loading) {
    return (
      <DashboardLayout title="Notifications" subtitle="Loading…">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Notifications">
        <EmptyState icon={<RefreshCw className="w-6 h-6" />} title="Could not load notifications"
          description={error} action={{ label: 'Try Again', onClick: load }} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Notifications"
      subtitle={unread.length > 0 ? `${unread.length} unread` : 'All caught up'}
      actions={
        unread.length > 0
          ? <Button size="sm" variant="secondary" onClick={markAllRead}>Mark all as read</Button>
          : undefined
      }
    >
      <div className="max-w-2xl">
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-6 h-6" />}
            title="No notifications"
            description="You're all caught up! Notifications about bookings, messages, and sessions will appear here."
          />
        ) : (
          <div className="card overflow-hidden divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
            {notifications.map(n => (
              <div
                key={n.id}
                className={cn(
                  'flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer',
                  !n.is_read && 'bg-indigo-50/40 dark:bg-indigo-950/10'
                )}
                onClick={() => handleClick(n)}
              >
                {n.avatar_url ? (
                  <Avatar src={n.avatar_url} name={n.actor_name || ''} size="md" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {typeIcons[n.type] || <Bell className="w-4 h-4 text-slate-400" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', !n.is_read ? 'font-semibold text-[#0F172A] dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300')}>
                    {n.title}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{n.body}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formatRelativeTime(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" aria-label="Unread" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
