import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useUser } from '../../../context/UserContext';

export function useScheduleData() {
  const { player } = useUser();
  const [allMatches, setAllMatches] = useState([]);
  const [myMatches, setMyMatches] = useState([]);
  const [golfers, setGolfers] = useState([]); // Will now load the full 16-player list seamlessly
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    try {
      setLoading(true);

      // 1. Pointed directly to the unconstrained master list
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

      // 3. Keep "My Matches" filtering smoothly
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

  useEffect(() => {
    fetchMatches();
    
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

  return { allMatches, myMatches, golfers, loading, refreshMatches: fetchMatches };
}