import React, { useState, useEffect } from 'react';
import { TrendingUp, CalendarClock } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { calculatePlayingHandicaps } from '../../utils/matchPlayEngine';

// Helper: Calculate net score for a simulated hole
const getSimNetScore = (grossScore, strokesReceived, holeDifficultyIndex) => {
  if (grossScore == null || strokesReceived == null) return null;
  let strokes = Math.floor(strokesReceived / 18);
  if ((strokesReceived % 18) >= holeDifficultyIndex) strokes += 1;
  return grossScore - strokes;
};

// Helper: Vegas Concatenation
const getVegasScore = (net1, net2) => {
  if (net1 == null || net2 == null) return null;
  if (net1 >= 10 || net2 >= 10) return parseInt(`${Math.max(net1, net2)}${Math.min(net1, net2)}`, 10);
  return parseInt(`${Math.min(net1, net2)}${Math.max(net1, net2)}`, 10);
};

// Helper: Simulate a player's gross score using their attributes
const simulateGross = (player, hole) => {
  if (!player) return null;
  
  // 🎯 FIX: Explicitly parse handicap to an integer so the math doesn't break
  const hcp = parseInt(player.handicap, 10) || 0;
  
  let expectedGross = hole.par + (hcp / 18);
  if (hole.par === 5 && player.power_rating > 80) expectedGross -= 0.15;
  
  const stdev = 0.8 + (hcp * 0.05) - (player.short_game_rating > 70 ? 0.2 : 0);
  const variance = (Math.random() + Math.random() + Math.random() - 1.5) * stdev;
  
  return Math.max(1, Math.round(expectedGross + variance));
};

const runMonteCarloSimulation = (matchData, iterations = 2500) => {
  const { format, handicapData, unplayedHoles, currentMatchScore, players } = matchData;
  let team1Wins = 0;
  let team2Wins = 0;
  let ties = 0;

  const upperFormat = (format || '').toUpperCase();

  for (let i = 0; i < iterations; i++) {
    let simMatchScore = currentMatchScore; // Positive = Team 1 UP, Negative = Team 2 UP
    let holesRemaining = unplayedHoles.length;

    for (const hole of unplayedHoles) {
      if (Math.abs(simMatchScore) > holesRemaining) break; // Match mathematically over
      holesRemaining--;

      // 1. Simulate Gross Scores for all 4 players
      const g_t1p1 = simulateGross(players.t1p1, hole);
      const g_t1p2 = simulateGross(players.t1p2, hole);
      const g_t2p1 = simulateGross(players.t2p1, hole);
      const g_t2p2 = simulateGross(players.t2p2, hole);

      let t1Net = Infinity;
      let t2Net = Infinity;

      // 2. Apply Format Logic
      if (handicapData.type === 'team') { 
        // --- SCRAMBLE ---
        const t1Gross = Math.min(...[g_t1p1, g_t1p2].filter(x => x !== null));
        const t2Gross = Math.min(...[g_t2p1, g_t2p2].filter(x => x !== null));
        
        if (t1Gross !== Infinity && t2Gross !== Infinity) {
          t1Net = getSimNetScore(t1Gross, handicapData.team1Strokes, hole.hcp_index);
          t2Net = getSimNetScore(t2Gross, handicapData.team2Strokes, hole.hcp_index);
        }
      } else if (upperFormat === 'VEGAS') {
        // --- VEGAS ---
        const n_t1p1 = getSimNetScore(g_t1p1, handicapData.team1.t1p1, hole.hcp_index);
        const n_t1p2 = getSimNetScore(g_t1p2, handicapData.team1.t1p2, hole.hcp_index);
        const n_t2p1 = getSimNetScore(g_t2p1, handicapData.team2.t2p1, hole.hcp_index);
        const n_t2p2 = getSimNetScore(g_t2p2, handicapData.team2.t2p2, hole.hcp_index);

        const t1Vegas = getVegasScore(n_t1p1, n_t1p2);
        const t2Vegas = getVegasScore(n_t2p1, n_t2p2);

        if (t1Vegas !== null && t2Vegas !== null) {
          t1Net = t1Vegas;
          t2Net = t2Vegas;
        }
      } else { 
        // --- BEST BALL (Shamble / 1v1) ---
        const t1Nets = [];
        if (g_t1p1 !== null) t1Nets.push(getSimNetScore(g_t1p1, handicapData.team1.t1p1, hole.hcp_index));
        if (g_t1p2 !== null) t1Nets.push(getSimNetScore(g_t1p2, handicapData.team1.t1p2, hole.hcp_index));
        
        const t2Nets = [];
        if (g_t2p1 !== null) t2Nets.push(getSimNetScore(g_t2p1, handicapData.team2.t2p1, hole.hcp_index));
        if (g_t2p2 !== null) t2Nets.push(getSimNetScore(g_t2p2, handicapData.team2.t2p2, hole.hcp_index));

        if (t1Nets.length > 0) t1Net = Math.min(...t1Nets);
        if (t2Nets.length > 0) t2Net = Math.min(...t2Nets);
      }

      // 3. Tally simulated hole
      if (t1Net < t2Net) simMatchScore++;
      else if (t2Net < t1Net) simMatchScore--;
    }

    // 4. Tally overall iteration
    if (simMatchScore > 0) team1Wins++;
    else if (simMatchScore < 0) team2Wins++;
    else ties++;
  }

  return {
    playerA: Math.round((team1Wins / iterations) * 100),
    playerB: Math.round((team2Wins / iterations) * 100),
    tie: Math.round((ties / iterations) * 100),
  };
};

const useMatchData = (matchId, status) => {
  const [matchData, setMatchData] = useState(null);
  const [probabilities, setProbabilities] = useState({ playerA: 0, playerB: 0, tie: 0 });
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchAndProcessData = async () => {
      if (!matchId) return setIsCalculating(false);
      setIsCalculating(true);

      try {
        // 1. Fetch the match
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single();
        if (matchError) throw matchError;

        // 2. 🎯 FIX: Fetch profiles universally so we capture both auth_id and id for the mapping tool
        const { data: profiles, error: profileError } = await supabase
          .from('players')
          .select('id, auth_id, name, handicap, power_rating, short_game_rating');
          
        if (profileError) throw profileError;

        // 🎯 FIX: The universal lookup tool, checking auth_id first
        const resolveGolfer = (refId) => {
          if (!refId) return null;
          const target = String(refId).trim().toLowerCase();
          return profiles.find(p => 
            (p.auth_id && String(p.auth_id).trim().toLowerCase() === target) || 
            (p.id && String(p.id).trim().toLowerCase() === target)
          );
        };

        // Map players
        const players = {
          t1p1: resolveGolfer(match.team1_player1),
          t1p2: resolveGolfer(match.team1_player2),
          t2p1: resolveGolfer(match.team2_player1),
          t2p2: resolveGolfer(match.team2_player2),
        };

        // 3. Format arrays for the Handicap Engine with explicit integer parsing
        const team1Arr = [];
        if (players.t1p1) team1Arr.push({ id: 't1p1', courseHandicap: parseInt(players.t1p1.handicap, 10) || 0 });
        if (players.t1p2) team1Arr.push({ id: 't1p2', courseHandicap: parseInt(players.t1p2.handicap, 10) || 0 });
        
        const team2Arr = [];
        if (players.t2p1) team2Arr.push({ id: 't2p1', courseHandicap: parseInt(players.t2p1.handicap, 10) || 0 });
        if (players.t2p2) team2Arr.push({ id: 't2p2', courseHandicap: parseInt(players.t2p2.handicap, 10) || 0 });

        const format = match.format || '1v1';
        const handicapData = calculatePlayingHandicaps(format, team1Arr, team2Arr);

        // 4. Fetch Course Holes
        const { data: holes, error: holesError } = await supabase
          .from('holes')
          .select('*')
          .eq('course_id', match.course_id || 1)
          .order('hole_number', { ascending: true });
        if (holesError) throw holesError;

        // 5. Determine holes left to play
        let lastPlayedHole = 0;
        if (status === 'live') {
          const { data: scores } = await supabase
            .from('hole_scores')
            .select('hole_number')
            .eq('matchup_id', matchId);
          
          if (scores && scores.length > 0) {
            lastPlayedHole = Math.max(...scores.map(s => s.hole_number));
          }
        }

        const unplayedHoles = status === 'upcoming' || status === 'scheduled'
          ? holes 
          : holes.filter(h => h.hole_number > lastPlayedHole);

        // Calculate real-time score straight from the master match table
        const currentMatchScore = (match.team1_score || 0) - (match.team2_score || 0);

        const processedState = {
          format,
          handicapData,
          players,
          unplayedHoles,
          currentMatchScore,
        };

        if (isMounted) {
          setMatchData(processedState);
          
          // Execute Monte Carlo in background
          setTimeout(() => {
            if (isMounted) {
              const results = runMonteCarloSimulation(processedState);
              setProbabilities(results);
              setIsCalculating(false);
            }
          }, 10);
        }

      } catch (err) {
        console.error("Error calculating probabilities:", err);
        if (isMounted) setIsCalculating(false);
      }
    };

    fetchAndProcessData();
    return () => { isMounted = false; };
  }, [matchId, status]);

  return { matchData, probabilities, isCalculating };
};

export const MatchProbabilityBar = ({ matchId, status, team1Name, team2Name, variant = 'full' }) => {
  if (status === 'completed') return null;

  const { matchData, probabilities, isCalculating } = useMatchData(matchId, status);

  if (isCalculating || !matchData) {
    if (variant === 'micro') {
      return <div className="h-2 mt-2 mb-1 w-full bg-slate-800 animate-pulse rounded-full" />;
    }
    return (
      <div className="mt-4 pt-3 border-t border-white/5 animate-pulse">
        <div className="h-1.5 bg-white/10 rounded-full w-full"></div>
      </div>
    );
  }

  const isLive = status === 'live';

  if (variant === 'micro') {
    return (
      <div className="flex flex-col w-full gap-1 mt-1.5 pt-1.5 border-t border-slate-800">
        <div className="flex justify-between items-center px-0.5">
          <span className={`text-[8px] font-black ${probabilities.playerA > 50 ? 'text-blue-400' : 'text-slate-500'}`}>
            {probabilities.playerA}%
          </span>
          <span className={`text-[8px] font-black ${probabilities.playerB > 50 ? 'text-red-400' : 'text-slate-500'}`}>
            {probabilities.playerB}%
          </span>
        </div>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${probabilities.playerA}%` }} />
          <div className="h-full bg-slate-600 transition-all duration-1000" style={{ width: `${probabilities.tie}%` }} />
          <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${probabilities.playerB}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-2">
      <div className="flex justify-between items-center text-[9px] uppercase tracking-widest font-black">
        {isLive ? (
          <span className="text-red-400 flex items-center gap-1">
            <TrendingUp size={10} /> Live Win Prob
          </span>
        ) : (
          <span className="text-slate-400 flex items-center gap-1">
            <CalendarClock size={10} /> Pre-Match Odds
          </span>
        )}
        {!isLive && (
          <span className="text-slate-500 lowercase normal-case tracking-normal font-medium">
            (Calculated using {matchData.format} analytics)
          </span>
        )}
      </div>

      <div className="relative h-2 bg-black/40 rounded-full overflow-hidden flex w-full border border-white/5 shadow-inner">
        <div className="bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000 ease-out border-r border-black/20" style={{ width: `${probabilities.playerA}%` }}></div>
        <div className="bg-slate-600 transition-all duration-1000 ease-out border-r border-black/20" style={{ width: `${probabilities.tie}%` }}></div>
        <div className="bg-gradient-to-l from-red-600 to-red-400 transition-all duration-1000 ease-out" style={{ width: `${probabilities.playerB}%` }}></div>
      </div>

      <div className="flex justify-between items-center text-[10px] font-black tracking-tighter">
        <span className="text-blue-400">{probabilities.playerA}%</span>
        <span className="text-slate-500 font-bold text-[9px] uppercase tracking-wider">Tie {probabilities.tie}%</span>
        <span className="text-red-400">{probabilities.playerB}%</span>
      </div>
    </div>
  );
};