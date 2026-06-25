import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';

export function useChirpsNotification(isOpen) {
  const [hasUnread, setHasUnread] = useState(false);
  const [latestMessageTime, setLatestMessageTime] = useState(0);

  useEffect(() => {
    async function fetchLatestTimestamp() {
      try {
        const { data, error } = await supabase
          .from('chirps') 
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setLatestMessageTime(new Date(data.created_at).getTime());
        }
      } catch (err) {
        console.error('Error fetching chat alert markers:', err.message);
      }
    }
    fetchLatestTimestamp();
  }, [isOpen]); // Re-verify whenever user leaves or enters the view context

  useEffect(() => {
    // Shared globally with the main pipeline namespace to prevent thread locks
    const notificationSubscription = supabase
      .channel('live-chirps-feed') 
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chirps' }, (payload) => {
        if (payload.new?.created_at) {
          setLatestMessageTime(new Date(payload.new.created_at).getTime());
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationSubscription);
    };
  }, []);

  useEffect(() => {
    const lastReadTime = parseInt(localStorage.getItem('f5_last_read_chirps') || '0', 10);
    setHasUnread(latestMessageTime > lastReadTime);
  }, [latestMessageTime]);

  useEffect(() => {
    if (isOpen) {
      localStorage.setItem('f5_last_read_chirps', Date.now().toString());
      setHasUnread(false);
    }
  }, [isOpen, latestMessageTime]);

  return hasUnread;
}
