import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useUser } from '../../../context/UserContext'; // <-- Injected UserContext

export function useDashboardData() {
  const { player } = useUser(); // <-- Grab the verified player identity
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
        // 1. Fetch Teams
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('name, points');
        
        if (teamsError) throw teamsError;

        if (teamsData && isMounted) {
          const clams = teamsData.find(t => t.name === 'Slanted Clams') || { name: 'Slanted Clams', points: 0 };
          const brothelmen = teamsData.find(t => t.name === 'Clam Brothelmen') || { name: 'Clam Brothelmen', points: 0 };
          setRyderCupState({
            team1: { name: clams.name, score: clams.points },
            team2: { name: brothelmen.name, score: brothelmen.points }
          });
        }

        // 2. Fetch Active Match using the new 'matches' table structure
        if (player) {
          const safePlayerId = player.id ? String(player.id).trim().toLowerCase() : null;
          const safePlayerName = player.name ? String(player.name).trim().toLowerCase() : null;

          // Pull all currently live matches
          const { data: liveMatches, error: matchError } = await supabase
            .from('matches')
            .select('*')
            .eq('is_live', true);

          if (matchError) throw matchError;

          if (liveMatches && liveMatches.length > 0) {
            // Find the one that belongs to the current logged-in player
            const myLiveMatch = liveMatches.find(match => {
              const matchParticipants = [
                match.team1_player1, match.team1_player2,
                match.team2_player1, match.team2_player2
              ].filter(Boolean).map(p => {
                const val = typeof p === 'object' ? (p.id || p.name) : p;
                return String(val).trim().toLowerCase();
              });

              return matchParticipants.includes(safePlayerId) || matchParticipants.includes(safePlayerName);
            });

            if (myLiveMatch && isMounted) {
              setActiveMatch({
                inProgress: true,
                matchId: myLiveMatch.id,
                currentHole: myLiveMatch.current_hole || 1, 
                format: myLiveMatch.format || '1v1',
                opponents: "Live Match" // You could parse out the opponents here if desired!
              });
            } else if (isMounted) {
               setActiveMatch({ inProgress: false });
            }
          }
        }
      } catch (err) {
        console.error("Dashboard error:", err);
        if (isMounted) setError("Failed to load tournament data.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchInitialData();

    // 3. SET UP REAL-TIME SUBSCRIPTION
    const teamSubscription = supabase
      .channel('team-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams' }, (payload) => {
        if (!isMounted) return;
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
  }, [player?.id, player?.name]); // Re-run whenever the player object fully loads

  return { ryderCupState, activeMatch, isLoading, error };
}