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
          const msgTime = new Date(data.created_at).getTime();
          setLatestMessageTime(msgTime);
        }
      } catch (err) {
        console.error('Error fetching chat notification bookmark:', err.message);
      }
    }
    fetchLatestTimestamp();
  }, []);

  useEffect(() => {
    const chatSubscription = supabase
      .channel('chirp-notification-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chirps' }, (payload) => {
        if (payload.new && payload.new.created_at) {
          setLatestMessageTime(new Date(payload.new.created_at).getTime());
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatSubscription);
    };
  }, []);

  useEffect(() => {
    const lastReadTime = parseInt(localStorage.getItem('f5_last_read_chirps') || '0', 10);
    
    if (latestMessageTime > lastReadTime) {
      setHasUnread(true);
    } else {
      setHasUnread(false);
    }
  }, [latestMessageTime]);

  // 🎯 FIX: Wipes read alerts appropriately when the context window is focused/open
  useEffect(() => {
    if (isOpen) {
      const now = Date.now();
      localStorage.setItem('f5_last_read_chirps', now.toString());
      setHasUnread(false);
    }
  }, [isOpen]);

  return hasUnread;
}