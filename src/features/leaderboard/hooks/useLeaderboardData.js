import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';

export function useLeaderboardData() {
  const [loading, setLoading] = useState(true);
  const [standings, setStandings] = useState({
    team1: { name: 'Slanted Clams', score: 0, color: 'blue' },
    team2: { name: 'Clam Brothelmen', score: 0, color: 'red' },
    totalAvailablePoints: 24, // Baseline structure for the trip
    pointsNeededToWin: 12.5
  });
  const [matchHistory, setMatchHistory] = useState([]);

  useEffect(() => {
    async function loadLeaderboardMetrics() {
      try {
        setLoading(true);

        // 1. Fetch real-time team tournament points
        const { data: teamsData } = await supabase
          .from('teams')
          .select('name, score');

        // 2. Fetch all tournament matches across rounds
        const { data: matchesData } = await supabase
          .from('matches')
          .select('id, round, format, status, team1_score, team2_score, team1_player1, team1_player2, team2_player1, team2_player2');

        // 3. 🎯 FIXED: Fetch all players to translate IDs into Names
        const { data: playersData } = await supabase
          .from('players')
          .select('id, auth_id, name');

        // Build a smart dictionary that maps BOTH id types to the player's name
        // (This protects you whether your match table saved their primary 'id' or their 'auth_id')
        const playerMap = {};
        if (playersData) {
          playersData.forEach(p => {
            if (p.id) playerMap[p.id] = p.name;
            if (p.auth_id) playerMap[p.auth_id] = p.name;
          });
        }

        if (teamsData) {
          const t1 = teamsData.find(t => t.name === 'Slanted Clams');
          const t2 = teamsData.find(t => t.name === 'Clam Brothelmen');
          
          // In a standard 24-point setup, 12.5 points are needed to win outright (> 1/2)
          const totalPoints = 24; 
          
          setStandings({
            team1: { name: 'Slanted Clams', score: t1?.score || 0, color: 'blue' },
            team2: { name: 'Clam Brothelmen', score: t2?.score || 0, color: 'red' },
            totalAvailablePoints: totalPoints,
            pointsNeededToWin: (totalPoints / 2) + 0.5
          });
        }

        if (matchesData) {
          // 🎯 FIXED: Swap out the IDs for actual names using our dictionary before setting state
          const mappedMatches = matchesData.map(match => ({
            ...match,
            // If the ID isn't in the dictionary for some reason, it falls back to whatever was in the database
            team1_player1: playerMap[match.team1_player1] || match.team1_player1,
            team1_player2: playerMap[match.team1_player2] || match.team1_player2,
            team2_player1: playerMap[match.team2_player1] || match.team2_player1,
            team2_player2: playerMap[match.team2_player2] || match.team2_player2,
          }));

          setMatchHistory(mappedMatches);
        }

      } catch (err) {
        console.error('Error compiling tournament leaderboard:', err.message);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboardMetrics();
  }, []);

  return { standings, matchHistory, loading };
}