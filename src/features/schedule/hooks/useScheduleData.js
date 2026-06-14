import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';

export function useScheduleData() {
  const [schedule, setSchedule] = useState({ live: [], upcoming: [], completed: [] });
  const [golfers, setGolfers] = useState([]); // Populated directly from the 'players' table
  const [loading, setLoading] = useState(true);

  const fetchTournamentItinerary = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch real-time tournament roster from the explicit players table
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('name, team');
      
      if (playersError) throw playersError;
      if (playersData) setGolfers(playersData);

      // 2. Fetch all tournament matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: true });

      if (matchesError) throw matchesError;

      if (matchesData) {
        const live = [];
        const upcoming = [];
        const completed = [];

        matchesData.forEach(match => {
          const structuredMatch = {
            ...match,
            tee_time: match.format_rules?.tee_time || "10:00 AM",
            current_hole: match.format_rules?.current_hole || 1,
            course_name: match.format_rules?.course_name || "The Legend"
          };

          if (match.status === 'live') {
            live.push(structuredMatch);
          } else if (match.status === 'completed') {
            completed.push(structuredMatch);
          } else {
            upcoming.push(structuredMatch);
          }
        });

        // Presentation sorts (Live by holes completed descending, upcoming chronologically)
        live.sort((a, b) => b.current_hole - a.current_hole);
        upcoming.sort((a, b) => a.tee_time.localeCompare(b.tee_time));

        setSchedule({ live, upcoming, completed });
      }
    } catch (err) {
      console.error('Failed to load tournament itinerary out of DB:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournamentItinerary();
  }, []);

  const createNewMatch = async (matchPayload) => {
    try {
      // Direct foreign key matching logic to map strings to your holes table architecture
      const derivedCourseId = matchPayload.courseName === 'The Legend' ? 1 : 2;

      const { error } = await supabase.from('matches').insert({
        round: parseInt(matchPayload.round),
        format: matchPayload.format,
        status: 'upcoming',
        team1_player1: matchPayload.t1p1,
        team1_player2: matchPayload.t1p2 || null,
        team2_player1: matchPayload.t2p1,
        team2_player2: matchPayload.t2p2 || null,
        course_id: derivedCourseId, 
        format_rules: {
          tee_time: matchPayload.teeTime,
          course_name: matchPayload.courseName,
          current_hole: 1
        }
      });

      if (error) throw error;
      
      // Refresh state from server to immediately reflect the new row addition
      await fetchTournamentItinerary();
      return { success: true };
    } catch (err) {
      console.error('Error inserting match pairing matrix row:', err.message);
      return { success: false, error: err.message };
    }
  };

  const startMatchLive = async (matchId) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'live' })
        .eq('id', matchId);

      if (error) throw error;
      await fetchTournamentItinerary();
      return { success: true };
    } catch (err) {
      console.error('Error initiating live match configuration:', err.message);
      return { success: false, error: err.message };
    }
  };

  return { schedule, golfers, loading, createNewMatch, startMatchLive };
}