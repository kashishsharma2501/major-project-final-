import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useUnreadNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false)
      .then(({ count }) => {
        if (!cancelled) setUnreadCount(count ?? 0);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  return unreadCount;
}