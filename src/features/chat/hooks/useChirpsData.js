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
  const [golfers, setGolfers] = useState([]); // Restored for autocomplete tracking
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [debugLog, setDebugLog] = useState('Initializing Feature Pack...');

  const channelRef = useRef(null);
  const userSessionRef = useRef({ id: sessionAuthId, name: sessionName, team: sessionTeam });

  useEffect(() => {
    userSessionRef.current = { id: sessionAuthId, name: sessionName, team: sessionTeam };
  }, [sessionAuthId, sessionName, sessionTeam]);

  // Read active platform permission state on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestPlatformPermissions = async () => {
    if (!('Notification' in window)) {
      setDebugLog('⚠️ Notifications not supported on this mobile browser.');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    setDebugLog(`Notification permission: ${permission}`);
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
        setDebugLog('Caching directory & historic feeds...');

        // 1. Safe fetch of participant directories for autocomplete mapping
        // NOTE: If you use a table other than 'profiles' for users, change the table string here!
        const { data: golfersData } = await supabase
          .from('profiles')
          .select('id, name, team')
          .throwOnError();
        
        if (golfersData && isMounted) setGolfers(golfersData);

        // 2. Load historic chat items
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

        if (historicalChirps && isMounted) {
          setChirps(historicalChirps.map(formatChirp));
          setDebugLog('🚀 System active. Live streams established.');
        }

        // 3. Mount Stream Subscription Pipeline
        channelRef.current = supabase
          .channel('live-chirps-feed')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chirps' }, (payload) => {
            if (!isMounted) return;
            const formatted = formatChirp(payload.new);

            // 🎯 NATIVE PUSH NOTIFICATION DISPATCHER
            // Alert rules: Ensure it wasn't sent by yourself, and verify system permissions are enabled
            if (payload.new.user_id !== userSessionRef.current.id && 'Notification' in window && Notification.permission === 'granted') {
              const cleanText = formatted.text.replace('[BROADCAST]', '').trim();
              const standardCleanName = userSessionRef.current.name.replace(/\s+/g, '').toLowerCase();
              
              // Only trigger banner if it's a general official broadcast or if the player's clean username gets tagged
              if (formatted.isBot || cleanText.toLowerCase().includes(`@${standardCleanName}`)) {
                new Notification(`💥 Trash Talk Alert from ${formatted.sender}`, {
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
      setDebugLog('❌ Cancelled Send: Missing authentication session token.');
      return;
    }

    try {
      setDebugLog('Syncing transmission...');
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
