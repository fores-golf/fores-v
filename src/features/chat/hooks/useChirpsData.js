import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';

export function useChirpsData() {
  const [chirps, setChirps] = useState([]);
  const [golfers, setGolfers] = useState([]); // Used for autocomplete tagging suggestions
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  useEffect(() => {
    async function initializeChatEngine() {
      try {
        setLoading(true);

        // 1. Fetch all golfers in tournament for tagging index matrix
        const { data: golfersData } = await supabase
          .from('profiles')
          .select('id, username, team_name');
        if (golfersData) setGolfers(golfersData);

        // 2. Fetch past 50 historic chirps
        const { data: historicalChirps, error } = await supabase
          .from('chirps')
          .select('id, message, created_at, profiles(username, team_name, avatar_url)')
          .order('created_at', { ascending: true })
          .limit(50);

        if (!error && historicalChirps) {
          setChirps(historicalChirps.map(formatChirp));
        }

        // 3. Set up REAL-TIME postgres changes subscription
        channelRef.current = supabase
          .channel('live-chirps')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chirps' }, async (payload) => {
            // Fetch profile metrics for the incoming message sender
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username, team_name, avatar_url')
              .eq('id', payload.new.profile_id)
              .single();

            const fullNewChirp = {
              id: payload.new.id,
              message: payload.new.message,
              created_at: payload.new.created_at,
              profiles: profileData
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

  // Helper helper to clean data props
  const formatChirp = (item) => ({
    id: item.id,
    text: item.message,
    timestamp: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    sender: item.profiles?.username || 'Anonymous',
    team: item.profiles?.team_name || '',
    avatar: item.profiles?.avatar_url || ''
  });

  const sendChirp = async (textString) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !textString.trim()) return;

      const { error } = await supabase.from('chirps').insert({
        profile_id: user.id,
        message: textString.trim()
      });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to broadcast chirp:', err.message);
    }
  };

  return { chirps, golfers, loading, sendChirp };
}