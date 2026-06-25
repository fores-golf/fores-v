import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useUser } from '../../../context/UserContext';

export function useChirpsData() {
  // Extract and safeguard user identity handles
  const context = useUser() || {};
  const fallbackUser = context.user || context.player || {};
  const resolvedUserId = fallbackUser.auth_id || fallbackUser.user_id || fallbackUser.id;

  const [chirps, setChirps] = useState([]);
  const [golfers, setGolfers] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Mobile diagnostics message stream
  const [debugLog, setDebugLog] = useState('Initializing Chirps Engine...');

  const golfersRef = useRef([]);
  const channelRef = useRef(null);

  useEffect(() => {
    golfersRef.current = golfers;
  }, [golfers]);

  // Clean payload formatting handler
  const formatChirp = (item, derivedProfile) => {
    const isBotNotification = !item.profile_id || item.message?.startsWith('[BROADCAST]');
    
    return {
      id: item.id || Math.random().toString(36).substr(2, 9),
      text: item.message || '',
      timestamp: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: isBotNotification ? 'BROADCAST BOT' : (derivedProfile?.name || 'Anonymous'),
      team: isBotNotification ? 'Tournament Officials' : (derivedProfile?.team || ''),
      avatar: derivedProfile?.avatar_url || '',
      isBot: isBotNotification
    };
  };

  useEffect(() => {
    let isMounted = true;

    if (!resolvedUserId) {
      setDebugLog('⚠️ Mobile Check: No active player identity found in UserContext.');
      setLoading(false);
      return;
    }

    async function initializeChatEngine() {
      try {
        setLoading(true);
        setDebugLog(`Connecting to Supabase... User ID detected: ${resolvedUserId}`);

        // 1. Fetch Golfer/Profile Maps
        const { data: golfersData, error: profileErr } = await supabase
          .from('profiles')
          .select('id, name, team, avatar_url');
        
        if (profileErr) {
          setDebugLog(`❌ Profiles Table Failure: ${profileErr.message}`);
          if (isMounted) setLoading(false);
          return;
        }
        if (golfersData && isMounted) setGolfers(golfersData);

        // 2. Fetch Flat Chirp Feed (Avoid relationship joins to prevent schema-mismatch errors)
        const { data: historicalChirps, error: chirpsErr } = await supabase
          .from('chirps')
          .select('id, message, created_at, profile_id')
          .order('created_at', { ascending: true })
          .limit(50);

        if (chirpsErr) {
          setDebugLog(`❌ Chirps Table Failure: ${chirpsErr.message}`);
          if (isMounted) setLoading(false);
          return;
        }

        if (historicalChirps && isMounted) {
          // Manually stitch profiles from local memory mapping
          const mappedChirps = historicalChirps.map(item => {
            const prof = (golfersData || []).find(g => g.id === item.profile_id);
            return formatChirp(item, prof);
          });
          setChirps(mappedChirps);
          setDebugLog(`🚀 Online. Sync complete: ${historicalChirps.length} messages loaded.`);
        }

        // 3. Mount Realtime Pipeline Broadcast
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

            setChirps(prev => {
              if (prev.some(c => c.id === formatted.id)) return prev;
              return [...prev, formatted];
            });
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setDebugLog(`✅ Realtime Pipeline Established.`);
            } else {
              setDebugLog(`Pipeline Network Status: ${status}`);
            }
          });

      } catch (err) {
        setDebugLog(`💥 Critical Initialization Exception: ${err.message}`);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initializeChatEngine();

    return () => {
      isMounted = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [resolvedUserId]);

  const sendChirp = async (textString) => {
    if (!resolvedUserId) {
      setDebugLog('❌ Send Denied: Identity missing.');
      return;
    }

    try {
      setDebugLog(`Dispatching payload message...`);
      
      const { data, error } = await supabase
        .from('chirps')
        .insert({
          profile_id: resolvedUserId, 
          message: textString.trim()
        })
        .select();

      if (error) {
        setDebugLog(`❌ Supabase Database Reject: ${error.message} (Code: ${error.code})`);
        return;
      }

      setDebugLog(`✅ Message written successfully!`);
    } catch (err) {
      setDebugLog(`💥 Thread Level Exception: ${err.message}`);
    }
  };

  const sendSystemBroadcast = async (announcementText) => {
    try {
      await supabase.from('chirps').insert({ message: `[BROADCAST] ${announcementText}` });
    } catch (e) {
      setDebugLog(`💥 Broadcast Err: ${e.message}`);
    }
  };

  return { chirps, golfers, loading, sendChirp, sendSystemBroadcast, debugLog };
}
