import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useUser } from '../../../context/UserContext';

export function useChirpsData() {
  const context = useUser() || {};
  const currentUser = context.player || context.user || {};
  
  const sessionAuthId = currentUser.auth_id || currentUser.user_id || currentUser.id;
  const sessionName = currentUser.name || currentUser.username || 'Anonymous';
  const sessionTeam = currentUser.team || '';

  const [chirps, setChirps] = useState([]);
  const [golfers, setGolfers] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [debugLog, setDebugLog] = useState('Initializing Autocomplete Engine...');

  const channelRef = useRef(null);
  const userSessionRef = useRef({ id: sessionAuthId, name: sessionName, team: sessionTeam });

  useEffect(() => {
    userSessionRef.current = { id: sessionAuthId, name: sessionName, team: sessionTeam };
  }, [sessionAuthId, sessionName, sessionTeam]);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestPlatformPermissions = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const formatChirp = (item) => {
    const isBotNotification = !item.user_id || item.message?.startsWith('[BROADCAST]');
    return {
      id: item.id || Math.random().toString(36).substr(2, 9),
      text: item.message || '',
      timestamp: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: isBotNotification ? 'BROADCAST BOT' : (item.sender_name || 'Anonymous'),
      team: isBotNotification ? 'Tournament Officials' : (item.sender_team || ''),
      isBot: isBotNotification
    };
  };

  useEffect(() => {
    let isMounted = true;

    if (!sessionAuthId) {
      setDebugLog('⚠️ Device identity hold: Syncing auth profile...');
      setLoading(false);
      return;
    }

    async function initializeChatEngine() {
      try {
        setLoading(true);
        setDebugLog('Loading player directories...');

        let compiledDirectory = [];

        // 🎰 TARGET DIRECTORY FIX: Safely pulling fields from your 'players' table
        try {
          const { data: playersData } = await supabase
            .from('players')
            .select('id, name, team, auth_id, user_id')
            .limit(150);
          
          if (playersData && playersData.length > 0) {
            compiledDirectory = playersData.map(p => ({
              id: p.auth_id || p.user_id || p.id,
              name: p.name || 'Unknown Golfer',
              team: p.team || 'Free Agent'
            }));
            setDebugLog(`Directory loaded from 'players' table (${playersData.length} records).`);
          }
        } catch (e) {
          console.warn('Players table read error, enabling backup fallback:', e.message);
        }

        // 2. Fetch Chat History
        const { data: historicalChirps, error: chirpsErr } = await supabase
          .from('chirps')
          .select('id, message, created_at, user_id, sender_name, sender_team')
          .order('created_at', { ascending: true })
          .limit(50);

        if (chirpsErr) {
          setDebugLog(`❌ Database Schema Rejection: ${chirpsErr.message}`);
          if (isMounted) setLoading(false);
          return;
        }

        if (historicalChirps) {
          // 🎰 BACKUP AUTOMATIC FALLBACK: If the players table is empty or missing columns, build directory from historical chat rows
          if (compiledDirectory.length === 0) {
            const uniqueUsersMap = new Map();
            historicalChirps.forEach(c => {
              if (c.user_id && c.sender_name && c.sender_name !== 'BROADCAST BOT') {
                uniqueUsersMap.set(c.user_id, {
                  id: c.user_id,
                  name: c.sender_name,
                  team: c.sender_team || 'Free Agent'
                });
              }
            });
            compiledDirectory = Array.from(uniqueUsersMap.values());
            setDebugLog(`Directory localized via history (${compiledDirectory.length} active players).`);
          }

          if (isMounted) {
            setChirps(historicalChirps.map(formatChirp));
            setGolfers(compiledDirectory);
          }
        }

        // Realtime Subscription Pipeline
        channelRef.current = supabase
          .channel('live-chirps-feed')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chirps' }, (payload) => {
            if (!isMounted) return;
            const formatted = formatChirp(payload.new);

            // Add newly talking players to the autocomplete directory list dynamically
            if (payload.new.user_id && payload.new.sender_name && payload.new.sender_name !== 'BROADCAST BOT') {
              setGolfers(prev => {
                if (prev.some(g => g.id === payload.new.user_id)) return prev;
                return [...prev, {
                  id: payload.new.user_id,
                  name: payload.new.sender_name,
                  team: payload.new.sender_team || 'Free Agent'
                }];
              });
            }

            // Realtime Push Notification for Mentions Filter
            if (payload.new.user_id !== userSessionRef.current.id && 'Notification' in window && Notification.permission === 'granted') {
              const cleanText = formatted.text.replace('[BROADCAST]', '').trim();
              const standardCleanTag = `@${userSessionRef.current.name.replace(/\s+/g, '').toLowerCase()}`;
              
              if (formatted.isBot || cleanText.toLowerCase().includes(standardCleanTag)) {
                new Notification(`💥 Trash Talk from ${formatted.sender}`, {
                  body: cleanText,
                  icon: '/favicon.ico'
                });
              }
            }

            setChirps(prev => {
              if (prev.some(c => c.id === formatted.id)) return prev;
              return [...prev, formatted];
            });
          })
          .subscribe();

      } catch (err) {
        setDebugLog(`💥 Crash: ${err.message}`);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initializeChatEngine();

    return () => {
      isMounted = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [sessionAuthId]);

  const sendChirp = async (textString) => {
    if (!userSessionRef.current.id) {
      setDebugLog('❌ Cancelled Send: Missing authentication token.');
      return;
    }

    try {
      const { error } = await supabase
        .from('chirps')
        .insert({
          user_id: userSessionRef.current.id,
          message: textString.trim(),
          sender_name: userSessionRef.current.name,
          sender_team: userSessionRef.current.team
        });

      if (error) {
        setDebugLog(`❌ Reject: ${error.message}`);
        return;
      }
      setDebugLog('✅ Sent!');
    } catch (err) {
      setDebugLog(`💥 Write Error: ${err.message}`);
    }
  };

  const sendSystemBroadcast = async (announcementText) => {
    try {
      await supabase.from('chirps').insert({ 
        message: `[BROADCAST] ${announcementText}`,
        sender_name: 'BROADCAST BOT',
        sender_team: 'Tournament Officials'
      });
    } catch (e) {
      setDebugLog(`💥 Broadcast failure: ${e.message}`);
    }
  };

  return { 
    chirps, 
    golfers, 
    loading, 
    sendChirp, 
    sendSystemBroadcast, 
    notificationPermission, 
    requestPlatformPermissions, 
    debugLog 
  };
}
