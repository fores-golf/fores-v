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
      const { data: rosterData, error: rosterError } = await supabase
        .from('players')
        .select('id, name, team')
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
      if (player?.name) {
        const golferName = player.name;
        const filteredMyMatches = (scheduleData || []).filter(match => 
          match.team1_player1 === golferName ||
          match.team1_player2 === golferName ||
          match.team2_player1 === golferName ||
          match.team2_player2 === golferName
        );
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
  }, [player?.name]);

  return { 
    allMatches, 
    myMatches, 
    golfers, 
    loading, 
    startMatch, 
    refreshMatches: fetchMatches 
  };
}