import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useUser } from '../../../context/UserContext';

export function useChirpsData() {
  const { player } = useUser();
  const [chirps, setChirps] = useState([]);
  const [golfers, setGolfers] = useState([]); 
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  useEffect(() => {
    async function initializeChatEngine() {
      try {
        setLoading(true);

        // 1. Fetch golfers for tagging index matrix
        const { data: golfersData } = await supabase
          .from('profiles')
          .select('id, name, team');
        if (golfersData) setGolfers(golfersData);

        // 2. Fetch historic chirps
        const { data: historicalChirps, error } = await supabase
          .from('chirps')
          .select('id, message, created_at, profile_id, profiles(name, team, avatar_url)')
          .order('created_at', { ascending: true })
          .limit(50);

        if (!error && historicalChirps) {
          setChirps(historicalChirps.map(formatChirp));
        }

        // 3. Realtime pipeline
        channelRef.current = supabase
          .channel('live-chirps')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chirps' }, async (payload) => {
            let profileData = null;

            // Only attempt lookup if the chirp belongs to a real profile user
            if (payload.new.profile_id) {
              const { data } = await supabase
                .from('profiles')
                .select('name, team, avatar_url')
                .eq('id', payload.new.profile_id)
                .single();
              profileData = data;
            }

            const fullNewChirp = {
              id: payload.new.id,
              message: payload.new.message,
              created_at: payload.new.created_at,
              profiles: profileData,
              profile_id: payload.new.profile_id
            };

            setChirps(prev => [...prev, formatChirp(fullNewChirp)]);
          })
          .subscribe();

      } catch (err) {
        console.error('Chat engine initialization failure:', err.message);
      } finally {
        setLoading(false);
      }
    }

    initializeChatEngine();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const formatChirp = (item) => {
    const isBotNotification = !item.profile_id || item.message.startsWith('[BROADCAST]');
    
    return {
      id: item.id,
      text: item.message,
      timestamp: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: isBotNotification ? 'BROADCAST BOT' : (item.profiles?.name || 'Anonymous'),
      team: isBotNotification ? 'Tournament Officials' : (item.profiles?.team || ''),
      avatar: item.profiles?.avatar_url || '',
      isBot: isBotNotification
    };
  };

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

  // The live broadcast generator can now save without a profile_id
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