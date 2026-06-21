import React, { useState, useEffect } from 'react';
import { TrendingUp, CalendarClock } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { calculatePlayingHandicaps, evaluateMatchStatus } from '../../utils/matchPlayEngine';
import { useUser } from '../../context/UserContext'; // <-- ADD THIS

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
  
  const n1 = Math.max(1, net1);
  const n2 = Math.max(1, net2);

  if (n1 >= 10 || n2 >= 10) return parseInt(`${Math.max(n1, n2)}${Math.min(n1, n2)}`, 10);
  return parseInt(`${Math.min(n1, n2)}${Math.max(n1, n2)}`, 10);
};

// Helper: Simulate a player's gross score using detailed attributes & blue tee yardage
const simulateGross = (player, hole) => {
  if (!player) return null;
  
  const hcp = parseInt(player.handicap, 10) || 0;
  const yardage = hole.yardage_blue || 0;
  const driveDist = player.driving_dist || 240; 
  
  let strokesOnHole = Math.floor(hcp / 18);
  if ((hcp % 18) >= hole.hcp_index) strokesOnHole += 1;
  
  let expectedGross = hole.par + strokesOnHole - 0.25; 
  let stdev = 0.6 + (hcp * 0.04);

  if (yardage > 0) {
    if (hole.par === 3) {
      if (yardage > 200) {
        expectedGross += 0.3;
        if (player.power_rating < 75) expectedGross += 0.15;
      } else if (yardage < 135) {
        expectedGross -= 0.2; 
      }
    } 
    else if (hole.par === 4) {
      const approachDistance = yardage - driveDist;
      
      if (approachDistance < 40) {
        expectedGross -= 0.35; 
        stdev += 0.15; 
      } else if (approachDistance > 200) {
        expectedGross += 0.3; 
        if (player.short_game_rating < 70) expectedGross += 0.2; 
      }
    } 
    else if (hole.par === 5) {
      const approachDistance = yardage - driveDist;
      
      if (approachDistance <= driveDist + 20 || approachDistance < 250) {
        expectedGross -= 0.4; 
        stdev += 0.2; 
      } else if (yardage > 580) {
        expectedGross += 0.2; 
      }
    }
  }

  const avgPutts = parseFloat(player.avg_putts) || 2.0;
  if (avgPutts > 2.1) expectedGross += 0.25; 
  if (avgPutts < 1.8) expectedGross -= 0.15; 

  if (player.gir_percentage > 40) stdev -= 0.15;
  if (player.gir_percentage < 20) stdev += 0.15; 
  
  if (player.short_game_rating > 70) stdev -= 0.1;

  if (player.archetype === 'Wild Card') stdev += 0.3;
  if (player.archetype === 'Grinder') stdev -= 0.2; 

  const variance = (Math.random() + Math.random() + Math.random() - 1.5) * stdev;
  return Math.max(1, Math.round(expectedGross + variance));
};

// Monte Carlo Engine
const runMonteCarloSimulation = async (matchData, iterations = 2500) => {
  const { format, handicapData, unplayedHoles, currentMatchScore, players } = matchData;
  let team1Wins = 0;
  let team2Wins = 0;
  let ties = 0;

  const isVegasFormat = String(format).trim().toLowerCase() === 'vegas';

  for (let i = 0; i < iterations; i++) {
    if (i % 500 === 0) await new Promise(resolve => setTimeout(resolve, 0));

    let simMatchScore = currentMatchScore; 
    let holesRemaining = unplayedHoles.length;

    for (const hole of unplayedHoles) {
      // 🎯 FIX: Because EVERY game is Match Play, any team can mathematically close out a match.
      if (Math.abs(simMatchScore) > holesRemaining) break;
      holesRemaining--;

      const g_t1p1 = simulateGross(players.t1p1, hole);
      const g_t1p2 = simulateGross(players.t1p2, hole);
      const g_t2p1 = simulateGross(players.t2p1, hole);
      const g_t2p2 = simulateGross(players.t2p2, hole);

      let t1Net = Infinity;
      let t2Net = Infinity;

      if (handicapData.type === 'team') { 
        const t1Gross = Math.min(...[g_t1p1, g_t1p2].filter(x => x !== null));
        const t2Gross = Math.min(...[g_t2p1, g_t2p2].filter(x => x !== null));
        
        if (t1Gross !== Infinity && t2Gross !== Infinity) {
          t1Net = getSimNetScore(t1Gross, handicapData.team1Strokes, hole.hcp_index);
          t2Net = getSimNetScore(t2Gross, handicapData.team2Strokes, hole.hcp_index);
        }
      } else if (isVegasFormat) {
        const n_t1p1 = getSimNetScore(g_t1p1, handicapData.team1?.t1p1 ?? 0, hole.hcp_index);
        const n_t1p2 = getSimNetScore(g_t1p2, handicapData.team1?.t1p2 ?? 0, hole.hcp_index);
        const n_t2p1 = getSimNetScore(g_t2p1, handicapData.team2?.t2p1 ?? 0, hole.hcp_index);
        const n_t2p2 = getSimNetScore(g_t2p2, handicapData.team2?.t2p2 ?? 0, hole.hcp_index);

        const t1Vegas = getVegasScore(n_t1p1, n_t1p2);
        const t2Vegas = getVegasScore(n_t2p1, n_t2p2);

        if (t1Vegas !== null && t2Vegas !== null) {
          // 🎯 FIX: Map Vegas scores directly to the net values so they feed into the Match Play tally
          t1Net = t1Vegas;
          t2Net = t2Vegas;
        }
      } else { 
        const t1Nets = [];
        if (g_t1p1 !== null) t1Nets.push(getSimNetScore(g_t1p1, handicapData.team1?.t1p1 ?? 0, hole.hcp_index));
        if (g_t1p2 !== null) t1Nets.push(getSimNetScore(g_t1p2, handicapData.team1?.t1p2 ?? 0, hole.hcp_index));
        
        const t2Nets = [];
        if (g_t2p1 !== null) t2Nets.push(getSimNetScore(g_t2p1, handicapData.team2?.t2p1 ?? 0, hole.hcp_index));
        if (g_t2p2 !== null) t2Nets.push(getSimNetScore(g_t2p2, handicapData.team2?.t2p2 ?? 0, hole.hcp_index));

        if (t1Nets.length > 0) t1Net = Math.min(...t1Nets);
        if (t2Nets.length > 0) t2Net = Math.min(...t2Nets);
      }

      // 🎯 FIX: Universal Match Play Hole Scoring. Everything gets 1 point or -1 point.
      if (t1Net < t2Net) simMatchScore++;
      else if (t2Net < t1Net) simMatchScore--;
    }

    if (simMatchScore > 0) team1Wins++;
    else if (simMatchScore < 0) team2Wins++;
    else ties++;
  }

  const roundedA = Math.round((team1Wins / iterations) * 100);
  const roundedTie = Math.round((ties / iterations) * 100);

  return {
    playerA: roundedA,
    tie: roundedTie,
    playerB: 100 - roundedA - roundedTie,
  };
};

const useMatchData = (matchId, status) => {
  const [matchData, setMatchData] = useState(null);
  const [probabilities, setProbabilities] = useState({ playerA: 0, playerB: 0, tie: 0 });
  const [isCalculating, setIsCalculating] = useState(true);
  const [generationTick, setGenerationTick] = useState(0);

  useEffect(() => {
    if (!matchId) return;

    const oddsSubscription = supabase
      .channel(`live-odds-channel-${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hole_scores', filter: `matchup_id=eq.${matchId}` }, () => {
         setGenerationTick(prev => prev + 1);
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(oddsSubscription);
    };
  }, [matchId]);

  useEffect(() => {
    let isMounted = true;

    const fetchAndProcessData = async () => {
      if (!matchId) return setIsCalculating(false);
      setIsCalculating(true);

      try {
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single();
        if (matchError) throw matchError;

        const { data: profiles, error: profileError } = await supabase
          .from('players')
          .select('id, auth_id, name, handicap, power_rating, short_game_rating, driving_dist, gir_percentage, avg_putts, archetype, team');
          
        if (profileError) throw profileError;

        const resolveGolfer = (refId) => {
          if (!refId) return null;
          const target = String(refId).trim().toLowerCase();
          return profiles.find(p => 
            (p.auth_id && String(p.auth_id).trim().toLowerCase() === target) || 
            (p.id && String(p.id).trim().toLowerCase() === target)
          );
        };

        const players = {
          t1p1: resolveGolfer(match.team1_player1),
          t1p2: resolveGolfer(match.team1_player2),
          t2p1: resolveGolfer(match.team2_player1),
          t2p2: resolveGolfer(match.team2_player2),
        };

        const team1Arr = [];
        if (players.t1p1) team1Arr.push({ id: 't1p1', courseHandicap: parseInt(players.t1p1.handicap, 10) || 0 });
        if (players.t1p2) team1Arr.push({ id: 't1p2', courseHandicap: parseInt(players.t1p2.handicap, 10) || 0 });
        
        const team2Arr = [];
        if (players.t2p1) team2Arr.push({ id: 't2p1', courseHandicap: parseInt(players.t2p1.handicap, 10) || 0 });
        if (players.t2p2) team2Arr.push({ id: 't2p2', courseHandicap: parseInt(players.t2p2.handicap, 10) || 0 });

        const format = match.format || '1v1';
        const handicapData = calculatePlayingHandicaps(format, team1Arr, team2Arr);

        const { data: holes, error: holesError } = await supabase
          .from('holes')
          .select('*')
          .eq('course_id', match.course_id || 1)
          .order('hole_number', { ascending: true });
        if (holesError) throw holesError;

        const { data: scores } = await supabase
          .from('hole_scores')
          .select('*')
          .eq('matchup_id', matchId);
        
        let completedHoleNums = [];
        if (scores && scores.length > 0) {
          completedHoleNums = scores.map(s => s.hole_number);
        }

        const unplayedHoles = status === 'upcoming' || status === 'scheduled' || completedHoleNums.length === 0
          ? holes 
          : holes.filter(h => !completedHoleNums.includes(h.hole_number));

        let currentMatchScore = 0;

        // 🎯 FIX: Since ALL games are Match Play, higher score universally means "Holes Won".
        // No more math inversion for Vegas. We use the match play evaluator, or default to db scores.
        if (scores && scores.length > 0) {
          const liveState = evaluateMatchStatus(format, handicapData, holes, scores);
          currentMatchScore = (liveState.team1Wins || 0) - (liveState.team2Wins || 0);
        } else {
          currentMatchScore = (parseInt(match.team1_score, 10) || 0) - (parseInt(match.team2_score, 10) || 0);
        }

        const processedState = {
          format,
          handicapData,
          players,
          unplayedHoles,
          currentMatchScore,
        };

        if (isMounted) {
          setMatchData(processedState);
          
          const results = await runMonteCarloSimulation(processedState);
          if (isMounted) {
            setProbabilities(results);
            setIsCalculating(false);
          }
        }

      } catch (err) {
        console.error("Error calculating probabilities:", err);
        if (isMounted) setIsCalculating(false);
      }
    };

    fetchAndProcessData();

    return () => { 
      isMounted = false; 
    };
  }, [matchId, status, generationTick]);

  return { matchData, probabilities, isCalculating };
};

export const MatchProbabilityBar = ({ matchId, status, team1Name, team2Name, variant = 'full', staticMode = false }) => {
  const { player } = useUser(); 
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

  const isLive = status === 'live' || matchData.unplayedHoles.length < 18;

  // 🎯 FIX: Only flip to "My Team" if we aren't in Static Mode
  const isMyTeam2 = !staticMode && (
    matchData.players.t2p1?.auth_id === player?.auth_id || matchData.players.t2p1?.id === player?.id ||
    matchData.players.t2p2?.auth_id === player?.auth_id || matchData.players.t2p2?.id === player?.id
  );

  const displayLeft = isMyTeam2 ? probabilities.playerB : probabilities.playerA; 
  const displayRight = isMyTeam2 ? probabilities.playerA : probabilities.playerB;

  const dbTeam1Name = matchData.players.t1p1?.team || matchData.players.t1p2?.team || team1Name || 'Team 1';
  const dbTeam2Name = matchData.players.t2p1?.team || matchData.players.t2p2?.team || team2Name || 'Team 2';

  const resolvedLeftName = isMyTeam2 ? dbTeam2Name : dbTeam1Name;
  const resolvedRightName = isMyTeam2 ? dbTeam1Name : dbTeam2Name;

  if (variant === 'micro') {
    return (
      <div className="flex flex-col w-full gap-1 mt-1.5 pt-1.5 border-t border-slate-800">
        <div className="flex justify-between items-center px-0.5">
          <span className={`text-[8px] font-black ${displayLeft > 50 ? 'text-blue-400' : 'text-slate-500'}`}>
            {displayLeft}%
          </span>
          <span className={`text-[8px] font-black ${displayRight > 50 ? 'text-red-400' : 'text-slate-500'}`}>
            {displayRight}%
          </span>
        </div>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${displayLeft}%` }} />
          <div className="h-full bg-slate-600 transition-all duration-500" style={{ width: `${probabilities.tie}%` }} />
          <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${displayRight}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-2">
      <div className="flex justify-between items-center text-[9px] uppercase tracking-widest font-black">
        {isLive ? (
          <span className="text-orange-400 flex items-center gap-1">
            <TrendingUp size={10} /> Live Win Prob ({18 - matchData.unplayedHoles.length} Played)
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
        <div className="bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500 ease-out border-r border-black/20" style={{ width: `${displayLeft}%` }}></div>
        <div className="bg-slate-600 transition-all duration-500 ease-out border-r border-black/20" style={{ width: `${probabilities.tie}%` }}></div>
        <div className="bg-gradient-to-l from-red-600 to-red-400 transition-all duration-500 ease-out" style={{ width: `${displayRight}%` }}></div>
      </div>

      <div className="flex justify-between items-center text-[10px] font-black tracking-tighter">
        <span className="text-blue-400 truncate max-w-[40%]">
          {resolvedLeftName} {displayLeft}%
        </span>
        <span className="text-slate-500 font-bold text-[9px] uppercase tracking-wider shrink-0">
          Tie {probabilities.tie}%
        </span>
        <span className="text-red-400 truncate max-w-[40%] text-right">
          {displayRight}% {resolvedRightName}
        </span>
      </div>
    </div>
  );
};