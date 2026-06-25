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
  const [loading, setLoading] = useState(true);
  const [debugLog, setDebugLog] = useState('Initializing Engine...');

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
      isBot: isBotNotification
    };
  };

  useEffect(() => {
    let isMounted = true;

    if (!sessionAuthId) {
      setDebugLog('⚠️ Waiting for valid User ID configuration...');
      setLoading(false);
      return;
    }

    async function initializeChatEngine() {
      try {
        setLoading(true);
        setDebugLog('Synchronizing database feed...');

        const { data: historicalChirps, error: chirpsErr } = await supabase
          .from('chirps')
          .select('id, message, created_at, user_id, sender_name, sender_team')
          .order('created_at', { ascending: true })
          .limit(50);

        if (chirpsErr) {
          setDebugLog(`❌ Query Denied: ${chirpsErr.message}`);
          if (isMounted) setLoading(false);
          return;
        }

        if (historicalChirps && isMounted) {
          setChirps(historicalChirps.map(formatChirp));
          setDebugLog('🚀 System online and active.');
        }

        channelRef.current = supabase
          .channel('live-chirps-feed')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chirps' }, (payload) => {
            if (!isMounted) return;
            const formatted = formatChirp(payload.new);
            setChirps(prev => {
              if (prev.some(c => c.id === formatted.id)) return prev;
              return [...prev, formatted];
            });
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') setDebugLog('✅ Live channel active.');
          });

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
      setDebugLog('❌ Cancelled Send: Session user_id is missing.');
      return;
    }

    try {
      setDebugLog('Sending message data...');
      
      const { data, error } = await supabase
        .from('chirps')
        .insert({
          user_id: userSessionRef.current.id,
          message: textString.trim(),
          sender_name: userSessionRef.current.name,
          sender_team: userSessionRef.current.team
        })
        .select();

      if (error) {
        setDebugLog(`❌ Reject: ${error.message} (Code: ${error.code})`);
        return;
      }

      setDebugLog('✅ Message saved successfully!');
    } catch (err) {
      setDebugLog(`💥 Thread error: ${err.message}`);
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
      setDebugLog(`💥 Broadcast err: ${e.message}`);
    }
  };

  return { chirps, loading, sendChirp, sendSystemBroadcast, debugLog };
}
