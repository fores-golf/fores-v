import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useUser } from '../../../context/UserContext';

export function useChirpsData() {
  const { player } = useUser();
  const [chirps, setChirps] = useState([]);
  const [golfers, setGolfers] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Use refs to store latest state arrays to prevent real-time event listener closures from becoming stale
  const golfersRef = useRef([]);
  const channelRef = useRef(null);

  // Sync ref with state updates
  useEffect(() => {
    golfersRef.current = golfers;
  }, [golfers]);

  // Helper formatting function isolated from closure traps
  const formatChirp = (item, derivedProfiles) => {
    const isBotNotification = !item.profile_id || item.message.startsWith('[BROADCAST]');
    const profile = derivedProfiles || item.profiles;
    
    return {
      id: item.id || Math.random().toString(36).substr(2, 9),
      text: item.message,
      timestamp: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: isBotNotification ? 'BROADCAST BOT' : (profile?.name || 'Anonymous'),
      team: isBotNotification ? 'Tournament Officials' : (profile?.team || ''),
      avatar: profile?.avatar_url || '',
      isBot: isBotNotification
    };
  };

  useEffect(() => {
    let isMounted = true;

    async function initializeChatEngine() {
      try {
        setLoading(true);

        // 1. Grab all profile/golfer metadata
        const { data: golfersData } = await supabase
          .from('profiles')
          .select('id, name, team, avatar_url');
        
        if (golfersData && isMounted) {
          setGolfers(golfersData);
        }

        // 2. Fetch last 50 historical messages
        const { data: historicalChirps, error } = await supabase
          .from('chirps')
          .select('id, message, created_at, profile_id, profiles(name, team, avatar_url)')
          .order('created_at', { ascending: true })
          .limit(50);

        if (!error && historicalChirps && isMounted) {
          setChirps(historicalChirps.map(item => formatChirp(item, null)));
        }

        // 3. Setup real-time channel subscription
        channelRef.current = supabase
          .channel('live-chirps')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chirps' }, (payload) => {
            
            // OPTIMIZATION: Look up profile instantly via local reference map instead of making an async DB query on every message stream
            const matchingProfile = golfersRef.current.find(g => g.id === payload.new.profile_id);

            const formatted = formatChirp({
              id: payload.new.id,
              message: payload.new.message,
              created_at: payload.new.created_at,
              profile_id: payload.new.profile_id
            }, matchingProfile);

            // 🎯 PUSH NOTIFICATIONS GATEWAY
            if (payload.new.profile_id !== player?.id && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(`💥 Chirp from ${formatted.sender}`, {
                body: formatted.text.startsWith('[BROADCAST]') ? formatted.text.replace('[BROADCAST]', '').trim() : formatted.text,
                icon: formatted.avatar || '/fores-v-logo.png'
              });
            }

            // Deduplicate safety check
            setChirps(prev => {
              if (prev.some(c => c.id === formatted.id)) return prev;
              return [...prev, formatted];
            });
          })
          .subscribe();

      } catch (err) {
        console.error('Chat engine initialization failure:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (player?.id) {
      initializeChatEngine();
    }

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [player?.id]);

  const sendChirp = async (textString) => {
    try {
      if (!player?.id || !textString.trim()) return;

      const { error } = await supabase.from('chirps').insert({
        profile_id: player.id,
        message: textString.trim()
      });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to broadcast chirp:', err.message);
    }
  };

  const sendSystemBroadcast = async (announcementText) => {
    try {
      await supabase.from('chirps').insert({
        message: `[BROADCAST] ${announcementText}`
      });
    } catch (e) {
      console.error('System broadcast failed:', e.message);
    }
  };

  return { chirps, golfers, loading, sendChirp, sendSystemBroadcast };
}
