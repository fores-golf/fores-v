import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useUser } from '../../../context/UserContext';

export function useScheduleData() {
  const { player } = useUser();
  const [allMatches, setAllMatches] = useState([]);
  const [myMatches, setMyMatches] = useState([]);
  const [golfers, setGolfers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper function to safely evaluate distinct custom database fields
  const safeCompareIds = (idA, idB) => {
    if (!idA || !idB) return false;
    return String(idA).trim().toLowerCase() === String(idB).trim().toLowerCase();
  };

  const fetchMatches = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('matches').select('*');
      if (error) throw error;
      
      if (data) {
        // Clone into a fresh array reference pointer to force immediate re-renders
        setAllMatches([...data]);

        // 🎯 FIX: Bulletproof filter tracking to isolate personal matches for 16-man rosters
        if (player) {
          const personalMatches = data.filter(m => 
            safeCompareIds(m.team1_player1, player.auth_id) ||
            safeCompareIds(m.team1_player1, player.id) ||
            safeCompareIds(m.team1_player2, player.auth_id) ||
            safeCompareIds(m.team1_player2, player.id) ||
            safeCompareIds(m.team2_player1, player.auth_id) ||
            safeCompareIds(m.team2_player1, player.id) ||
            safeCompareIds(m.team2_player2, player.auth_id) ||
            safeCompareIds(m.team2_player2, player.id)
          );
          setMyMatches([...personalMatches]);
        }
      }
    } catch (err) {
      console.error('Error fetching tournament matches:', err.message);
    }
  }, [player]);

  const fetchGolfers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, auth_id, name, handicap, team');
      
      if (error) throw error;
      if (data) {
        setGolfers([...data]);
      }
    } catch (err) {
      console.error('Error fetching tournament golfers:', err.message);
    }
  }, []);

  const refreshMatches = useCallback(async () => {
    await fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    async function bootstrapTournamentData() {
      setLoading(true);
      await Promise.all([fetchMatches(), fetchGolfers()]);
      setLoading(false);
    }
    bootstrapTournamentData();
  }, [fetchMatches, fetchGolfers]);

  return {
    allMatches,
    myMatches, // Safely exposed to DashboardView
    golfers,
    loading,
    refreshMatches
  };
}