import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useUser } from '../../../context/UserContext';

export function useChirpsData() {
  const context = useUser() || {};
  const currentUser = context.player || context.user || {};
  
  // Directly targeting your authentication session string
  const sessionAuthId = currentUser.auth_id || currentUser.user_id || currentUser.id;
  const sessionName = currentUser.name || currentUser.username || 'Anonymous';
  const sessionTeam = currentUser.team || '';

  const [chirps, setChirps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [debugLog, setDebugLog] = useState('Initializing Restructured Engine...');

  const channelRef = useRef(null);
  const userSessionRef = useRef({ id: sessionAuthId, name: sessionName, team: sessionTeam });

  useEffect(() => {
    userSessionRef.current = { id: sessionAuthId, name: sessionName, team: sessionTeam };
  }, [sessionAuthId, sessionName, sessionTeam]);

  const formatChirp = (item) => {
    const isBotNotification = !item.user_id || item.message?.startsWith('[BROADCAST]');
    
    return {
      id: item.id || Math.random().toString(36).substr(2, 9),
      text: item.message || '',
      timestamp: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: isBotNotification ? 'BROADCAST BOT' : (item.sender_name || 'Anonymous'),
      team: isBotNotification ? 'Tournament Officials' : (item.sender_team || ''),
      avatar: '',
      isBot: isBotNotification
    };
  };

  useEffect(() => {
    let isMounted = true;

    if (!sessionAuthId) {
      setDebugLog('⚠️ Mobile Context Hold: Waiting for device login token...');
      setLoading(false);
      return;
    }

    async function initializeChatEngine() {
      try {
        setLoading(true);
        setDebugLog(`Fetching historical data via verified User ID Column...`);

        // Fetch logs utilizing the corrected table structure
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
          setDebugLog(`🚀 Online. Database corrected & synchronized.`);
        }

        // Connect real-time channels
        channelRef.current = supabase
          .channel('live-chirps')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chirps' }, (payload) => {
            const formatted = formatChirp(payload.new);
            setChirps(prev => {
              if (prev.some(c => c.id === formatted.id)) return prev;
              return [...prev, formatted];
            });
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') setDebugLog(`✅ Realtime Pipeline Connected.`);
          });

      } catch (err) {
        setDebugLog(`💥 Initialization Crash: ${err.message}`);
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
      setDebugLog('❌ Send Denied: Missing sessionAuthId.');
      return;
    }

    try {
      setDebugLog(`Pushing row directly into corrected user_id column...`);
      
      const { data, error } = await supabase
        .from('chirps')
        .insert({
          user_id: userSessionRef.current.id, // Successfully pointed to the newly re-linked database column
          message: textString.trim(),
          sender_name: userSessionRef.current.name,
          sender_team: userSessionRef.current.team
        })
        .select();

      if (error) {
        setDebugLog(`❌ DB Reject: ${error.message} (Code: ${error.code})`);
        return;
      }

      setDebugLog(`✅ Message written successfully!`);
    } catch (err) {
      setDebugLog(`💥 Thread Level Write Error: ${err.message}`);
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

  return { chirps, loading, sendChirp, sendSystemBroadcast, debugLog };
}
