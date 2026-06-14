import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';

export function useDashboardData() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ryderCupState, setRyderCupState] = useState({
    team1: { name: "Slanted Clams", score: 0 },
    team2: { name: "Clam Brothelmen", score: 0 }
  });
  const [activeMatch, setActiveMatch] = useState({ inProgress: false });

  useEffect(() => {
    let isMounted = true;

    async function fetchInitialData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch Teams
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('name, points');
        
        if (teamsError) throw teamsError;

        if (teamsData) {
          const clams = teamsData.find(t => t.name === 'Slanted Clams') || { name: 'Slanted Clams', points: 0 };
          const brothelmen = teamsData.find(t => t.name === 'Clam Brothelmen') || { name: 'Clam Brothelmen', points: 0 };
          setRyderCupState({
            team1: { name: clams.name, score: clams.points },
            team2: { name: brothelmen.name, score: brothelmen.points }
          });
        }

        // 2. Fetch Active Match (Simplified for brevity)
        const { data: matchData, error: matchError } = await supabase
          .from('match_players')
          .select('match_id, matches ( id, format, status, current_hole )')
          .eq('profile_id', user.id)
          .eq('matches.status', 'in_progress')
          .single();

        if (matchData?.matches) {
          setActiveMatch({
            inProgress: true,
            matchId: matchData.matches.id,
            currentHole: matchData.matches.current_hole,
            format: matchData.matches.format,
            opponents: "Opponents" 
          });
        }
      } catch (err) {
        console.error("Dashboard error:", err);
        setError("Failed to load tournament data.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchInitialData();

    // 3. SET UP REAL-TIME SUBSCRIPTION
    const teamSubscription = supabase
      .channel('team-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams' }, (payload) => {
        // When a team updates, dynamically update our state without refreshing!
        const updatedTeam = payload.new;
        setRyderCupState(prevState => {
          const isTeam1 = prevState.team1.name === updatedTeam.name;
          return {
            ...prevState,
            team1: isTeam1 ? { ...prevState.team1, score: updatedTeam.points } : prevState.team1,
            team2: !isTeam1 ? { ...prevState.team2, score: updatedTeam.points } : prevState.team2
          };
        });
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(teamSubscription);
    };
  }, []);

  return { ryderCupState, activeMatch, isLoading, error };
}