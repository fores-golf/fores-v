import React, { useState, useEffect } from 'react';
import { TrendingUp, CalendarClock } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';

const getStrokesForHole = (playingHcp, holeHcpIndex) => {
  let strokes = 0;
  let h = playingHcp;
  while (h >= 18) { strokes++; h -= 18; }
  if (holeHcpIndex <= h) strokes++;
  return strokes;
};

const runMonteCarloSimulation = (matchData, iterations = 2500) => {
  const { playerA, playerB, unplayedHoles, currentMatchScore } = matchData;
  let playerAWins = 0;
  let playerBWins = 0;
  let ties = 0;

  const baseHcp = Math.min(playerA.handicap, playerB.handicap);
  const playHcpA = Math.max(0, playerA.handicap - baseHcp);
  const playHcpB = Math.max(0, playerB.handicap - baseHcp);

  for (let i = 0; i < iterations; i++) {
    let simMatchScore = currentMatchScore; 
    let holesRemaining = unplayedHoles.length;

    for (const hole of unplayedHoles) {
      if (Math.abs(simMatchScore) > holesRemaining) break; 
      holesRemaining--;

      let expectedGrossA = hole.par + (playHcpA / 18);
      let expectedGrossB = hole.par + (playHcpB / 18);

      if (hole.par === 5) {
        if (playerA.power_rating > 80) expectedGrossA -= 0.15;
        if (playerB.power_rating > 80) expectedGrossB -= 0.15;
      }
      
      const stdevA = 0.8 + (playHcpA * 0.05) - (playerA.short_game_rating > 70 ? 0.2 : 0);
      const stdevB = 0.8 + (playHcpB * 0.05) - (playerB.short_game_rating > 70 ? 0.2 : 0);
      
      const varA = (Math.random() + Math.random() + Math.random() - 1.5) * stdevA;
      const varB = (Math.random() + Math.random() + Math.random() - 1.5) * stdevB;

      const grossA = Math.max(1, Math.round(expectedGrossA + varA));
      const grossB = Math.max(1, Math.round(expectedGrossB + varB));

      const strokesA = getStrokesForHole(playHcpA, hole.hcp_index);
      const strokesB = getStrokesForHole(playHcpB, hole.hcp_index);
      
      const netA = grossA - strokesA;
      const netB = grossB - strokesB;

      if (netA < netB) simMatchScore++;
      else if (netB < netA) simMatchScore--;
    }

    if (simMatchScore > 0) playerAWins++;
    else if (simMatchScore < 0) playerBWins++;
    else ties++;
  }

  return {
    playerA: Math.round((playerAWins / iterations) * 100),
    playerB: Math.round((playerBWins / iterations) * 100),
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

        // 2. Extract the profile UUIDs from the match
        const idA = match.team1_player1_id || match.team1_player1;
        const idB = match.team2_player1_id || match.team2_player1;

        // 3. Fetch profiles BY ID instead of name
        const { data: profiles, error: profileError } = await supabase
          .from('players')
          .select('id, name, handicap, power_rating, short_game_rating')
          .in('id', [idA, idB]);
        if (profileError) throw profileError;

        // Match profiles based on the fetched UUIDs
        const pA = profiles?.find(p => p.id === idA);
        const pB = profiles?.find(p => p.id === idB);

        // Fail-safe if DB relationships are disconnected so UI doesn't crash
        if (!pA || !pB) {
            console.warn("Could not find matching profiles for IDs:", idA, idB);
            if (isMounted) setIsCalculating(false);
            return;
        }

        // 4. Fetch Course Data
        const { data: holes, error: holesError } = await supabase
          .from('holes')
          .select('*')
          .eq('course_id', match.course_id || 1)
          .order('hole_number', { ascending: true });
        if (holesError) throw holesError;

        const baseHcp = Math.min(pA.handicap, pB.handicap);
        const playHcpA = Math.max(0, pA.handicap - baseHcp);
        const playHcpB = Math.max(0, pB.handicap - baseHcp);

        let currentMatchScore = 0; 
        let lastPlayedHole = 0;

        // 5. Connect live scores via profile.id
        if (status === 'live') {
          const { data: scores, error: scoresError } = await supabase
            .from('hole_scores')
            .select('*')
            .eq('matchup_id', matchId);
          if (scoresError) throw scoresError;

          if (scores && scores.length > 0) {
              for (const hole of holes) {
                // Match the score record to the correct player's UUID
                const scoreA = scores.find(s => s.hole_number === hole.hole_number && s.id === pA.id);
                const scoreB = scores.find(s => s.hole_number === hole.hole_number && s.id === pB.id);

                if (scoreA && scoreB && scoreA.gross_score && scoreB.gross_score) {
                  lastPlayedHole = hole.hole_number;
                  const netA = scoreA.gross_score - getStrokesForHole(playHcpA, hole.hcp_index);
                  const netB = scoreB.gross_score - getStrokesForHole(playHcpB, hole.hcp_index);
                  
                  if (netA < netB) currentMatchScore++;
                  if (netB < netA) currentMatchScore--;
                }
              }
          }
        }

        const unplayedHoles = status === 'upcoming' || status === 'scheduled'
          ? holes 
          : holes.filter(h => h.hole_number > lastPlayedHole);

        const processedState = {
          playerA: pA,
          playerB: pB,
          playHcpA,
          playHcpB,
          unplayedHoles,
          currentMatchScore,
          lastPlayedHole,
          holesRemaining: unplayedHoles.length
        };

        if (isMounted) {
          setMatchData(processedState);
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
             ({matchData.playerA.name.split(' ')[0]} gets {matchData.playHcpA}, {matchData.playerB.name.split(' ')[0]} gets {matchData.playHcpB})
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