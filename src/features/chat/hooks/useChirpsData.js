import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useUser } from '../../../context/UserContext';

export function useChirpsData() {
  const { player } = useUser();
  const [chirps, setChirps] = useState([]);
  const [golfers, setGolfers] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Real-time troubleshooting log for mobile testing
  const [debugLog, setDebugLog] = useState('System initialized. Waiting for action...');

  const golfersRef = useRef([]);
  const channelRef = useRef(null);

  useEffect(() => {
    golfersRef.current = golfers;
  }, [golfers]);

  const formatChirp = (item, derivedProfiles) => {
    const isBotNotification = !item.profile_id || item.message?.startsWith('[BROADCAST]');
    const profile = derivedProfiles || item.profiles;
    
    return {
      id: item.id || Math.random().toString(36).substr(2, 9),
      text: item.message || '',
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
        setDebugLog('Fetching golfers and historical logs...');

        // 1. Fetch Profiles
        const { data: golfersData, error: profileErr } = await supabase
          .from('profiles')
          .select('id, name, team, avatar_url');
        
        if (profileErr) throw new Error(`Profiles Fetch Error: ${profileErr.message}`);
        if (golfersData && isMounted) setGolfers(golfersData);

        // 2. Fetch last 50 chirps
        const { data: historicalChirps, error: chirpsErr } = await supabase
          .from('chirps')
          .select('id, message, created_at, profile_id, profiles(name, team, avatar_url)')
          .order('created_at', { ascending: true })
          .limit(50);

        if (chirpsErr) throw new Error(`Chirps Fetch Error: ${chirpsErr.message}`);
        if (historicalChirps && isMounted) {
          setChirps(historicalChirps.map(item => formatChirp(item, null)));
          setDebugLog(`Successfully loaded ${historicalChirps.length} historical chirps.`);
        }

        // 3. Real-time Subscription Channel
        channelRef.current = supabase
          .channel('live-chirps')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chirps' }, (payload) => {
            const matchingProfile = golfersRef.current.find(g => g.id === payload.new.profile_id);
            const formatted = formatChirp({
              id: payload.new.id,
              message: payload.new.message,
              created_at: payload.new.created_at,
              profile_id: payload.new.profile_id
            }, matchingProfile);

            // Push Notifications Gateway
            if (payload.new.profile_id !== (player?.id || player?.auth_id) && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(`💥 Chirp from ${formatted.sender}`, {
                body: formatted.text.startsWith('[BROADCAST]') ? formatted.text.replace('[BROADCAST]', '').trim() : formatted.text,
                icon: formatted.avatar || '/fores-v-logo.png'
              });
            }

            setChirps(prev => {
              if (prev.some(c => c.id === formatted.id)) return prev;
              return [...prev, formatted];
            });
          })
          .subscribe((status) => {
            setDebugLog(`Realtime subscription status: ${status}`);
          });

      } catch (err) {
        setDebugLog(`💥 Init Error: ${err.message}`);
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    // Support standard database profile IDs or standard Supabase auth handles
    const targetUserId = player?.id || player?.auth_id;
    if (targetUserId) {
      initializeChatEngine();
    } else {
      setDebugLog('⚠️ Blocked Engine: No valid player.id or player.auth_id detected in context.');
      setLoading(false);
    }

    return () => {
      isMounted = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [player?.id, player?.auth_id]);

  const sendChirp = async (textString) => {
    // Dynamic fallbacks to catch exact variations of identity providers
    const activeUserId = player?.id || player?.auth_id;
    
    setDebugLog(`Attempting to send. Message length: ${textString?.length}. User ID: ${activeUserId}`);

    if (!activeUserId) {
      setDebugLog('❌ Send blocked: Both player.id and player.auth_id are missing.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chirps')
        .insert({
          profile_id: activeUserId, // Fallback hooks maps perfectly here
          message: textString.trim()
        })
        .select();

      if (error) {
        setDebugLog(`❌ Database Reject: ${error.message} (Code: ${error.code})`);
        return;
      }

      setDebugLog(`✅ Successfully saved! Payload ID: ${data?.[0]?.id || 'unknown'}`);
    } catch (err) {
      setDebugLog(`💥 Catch Exception: ${err.message}`);
    }
  };

  const sendSystemBroadcast = async (announcementText) => {
    try {
      setDebugLog(`Sending system alert...`);
      const { error } = await supabase
        .from('chirps')
        .insert({ message: `[BROADCAST] ${announcementText}` });

      if (error) setDebugLog(`❌ Broadcast err: ${error.message}`);
    } catch (e) {
      setDebugLog(`💥 Broadcast exception: ${e.message}`);
    }
  };

  return { chirps, golfers, loading, sendChirp, sendSystemBroadcast, debugLog };
}
