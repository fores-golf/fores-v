import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';

export function useChirpsNotification(isOpen) {
  const [hasUnread, setHasUnread] = useState(false);
  const [latestMessageTime, setLatestMessageTime] = useState(0);

  useEffect(() => {
    async function fetchLatestTimestamp() {
      try {
        // 🎯 FIXED SCHEMA LOOKUP: Pulling created_at from the updated table layout
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
  }, [isOpen]); // Re-verify whenever the user navigates back to the hub or shifts views

  useEffect(() => {
    // 🎯 REALTME SUBSCRIPTION CHANNEL MATCH:
    // This MUST match the exact channel name used in your main view hook ('live-chirps-feed')
    // Splitting or using different names causes connection collision drops on mobile devices!
    const notificationSubscription = supabase
      .channel('live-chirps-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chirps' }, (payload) => {
        if (payload.new && payload.new.created_at) {
          setLatestMessageTime(new Date(payload.new.created_at).getTime());
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationSubscription);
    };
  }, []);

  useEffect(() => {
    // Read the player's last historical view timestamp bookmark from local disk memory
    const lastReadTime = parseInt(localStorage.getItem('f5_last_read_chirps') || '0', 10);
    
    // Evaluate if incoming stream entries are newer than the user's bookmark
    if (latestMessageTime > lastReadTime) {
      setHasUnread(true);
    } else {
      setHasUnread(false);
    }
  }, [latestMessageTime]);

  // Wipes unread alert indicators instantly when the user physically opens the chat interface view
  useEffect(() => {
    if (isOpen) {
      const now = Date.now();
      localStorage.setItem('f5_last_read_chirps', now.toString());
      setHasUnread(false);
    }
  }, [isOpen, latestMessageTime]);

  return hasUnread;
}
