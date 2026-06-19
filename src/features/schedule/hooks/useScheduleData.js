import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useUser } from '../../../context/UserContext';

export function useScheduleData() {
  const { player } = useUser();
  const [allMatches, setAllMatches] = useState([]);
  const [myMatches, setMyMatches] = useState([]);
  const [golfers, setGolfers] = useState([]); // Loads the full 16-player list seamlessly
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    try {
      setLoading(true);

      // 1. Fetch unconstrained master player list 
      // 🎯 THE FIX: Added auth_id and handicap to the global context payload
      const { data: rosterData, error: rosterError } = await supabase
        .from('players')
        .select('id, auth_id, name, team, handicap') 
        .order('name', { ascending: true });
      
      if (rosterError) throw rosterError;
      setGolfers(rosterData || []);

      // 2. Fetch tournament schedule layout
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('matches')
        .select('*')
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });

      if (scheduleError) throw scheduleError;
      setAllMatches(scheduleData || []);

      // 3. Filter "My Matches" dynamically
      if (player) {
        const safePlayerId = player.id ? String(player.id).trim().toLowerCase() : null;
        const safePlayerAuthId = player.auth_id ? String(player.auth_id).trim().toLowerCase() : null;
        const safePlayerName = player.name ? String(player.name).trim().toLowerCase() : null;

        const filteredMyMatches = (scheduleData || []).filter(match => {
          const matchParticipants = [
            match.team1_player1, match.team1_player2,
            match.team2_player1, match.team2_player2
          ].filter(Boolean).map(p => {
            const val = typeof p === 'object' ? (p.id || p.auth_id || p.name) : p;
            return String(val).trim().toLowerCase();
          });

          // 🎯 FIX: Explicitly checks if the match row contains your auth_id, id, or name
          return matchParticipants.includes(safePlayerId) || 
                 matchParticipants.includes(safePlayerAuthId) || 
                 matchParticipants.includes(safePlayerName);
        });
        
        setMyMatches(filteredMyMatches);
      }

    } catch (err) {
      console.error('Error fetching tournament schedule:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- START MATCH ENGINES (FLIPS MATCH TO LIVE STATUS) ---
  const startMatch = async (matchId) => {
    try {
      // 1. Explicitly write both status tracking identifiers to the database
      const { error } = await supabase
        .from('matches')
        .update({ 
          is_live: true, 
          status: 'live' 
        })
        .eq('id', matchId);

      if (error) throw error;
      
      // 2. Local optimistic state updates so it responds immediately
      setAllMatches(prev => prev.map(m => m.id === matchId ? { ...m, is_live: true, status: 'live' } : m));
      setMyMatches(prev => prev.map(m => m.id === matchId ? { ...m, is_live: true, status: 'live' } : m));

    } catch (err) {
      console.error('Error starting match payload mutation:', err.message);
      alert('Failed to initialize match: ' + err.message);
    }
  };

  useEffect(() => {
    fetchMatches();
    
    // Real-time listener channel
    const matchSubscription = supabase
      .channel('live-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(matchSubscription);
    };
  }, [player?.id, player?.auth_id, player?.name]); // 🎯 Added auth_id to dependencies

  return { 
    allMatches, 
    myMatches, 
    golfers, 
    loading, 
    startMatch, 
    refreshMatches: fetchMatches 
  };
}