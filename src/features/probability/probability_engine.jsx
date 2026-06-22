import React, { useState, useEffect } from 'react';
import { TrendingUp, CalendarClock, Trophy } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { calculatePlayingHandicaps, evaluateMatchStatus } from '../../utils/matchPlayEngine';
import { useUser } from '../../context/UserContext';

// ==========================================
// 🎯 SEEDED RANDOMNESS & CACHE SYSTEM
// Guarantees 100% identical odds for all users globally
// ==========================================
const matchOddsCache = new Map();
let globalCupCache = null;
let globalCupFingerprint = '';

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const mulberry32 = (a) => {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
};

const getSimNetScore = (grossScore, strokesReceived, holeDifficultyIndex) => {
  if (grossScore == null || strokesReceived == null) return null;
  let strokes = Math.floor(strokesReceived / 18);
  if ((strokesReceived % 18) >= holeDifficultyIndex) strokes += 1;
  return grossScore - strokes;
};

const getVegasScore = (net1, net2) => {
  if (net1 == null || net2 == null) return null;
  const n1 = Math.max(1, net1);
  const n2 = Math.max(1, net2);
  if (n1 >= 10 || n2 >= 10) return parseInt(`${Math.max(n1, n2)}${Math.min(n1, n2)}`, 10);
  return parseInt(`${Math.min(n1, n2)}${Math.max(n1, n2)}`, 10);
};

const simulateGross = (player, hole, randFn) => {
  if (!player) return null;
  
  const hcp = parseInt(player.handicap, 10) || 0;
  const yardage = hole.yardage_blue || 0;
  const driveDist = player.driving_dist || 240; 
  const power = player.power_rating || 50;
  const shortGame = player.short_game_rating || 50;
  const gir = player.gir_percentage || 30;
  const avgPutts = parseFloat(player.avg_putts) || 2.0;
  
  let strokesOnHole = Math.floor(hcp / 18);
  if ((hcp % 18) >= hole.hcp_index) strokesOnHole += 1;
  
  let expectedGross = hole.par + strokesOnHole - 0.25; 
  let stdev = 0.6 + (hcp * 0.04);

  if (yardage > 0) {
    if (hole.par === 3) {
      if (yardage > 200) { expectedGross += 0.3; if (power < 75) expectedGross += 0.15; }
      else if (yardage < 135) expectedGross -= 0.2; 
    } 
    else if (hole.par === 4) {
      const approachDistance = yardage - driveDist;
      if (approachDistance < 40) { expectedGross -= 0.35; stdev += 0.15; }
      else if (approachDistance > 200) { expectedGross += 0.3; if (shortGame < 70) expectedGross += 0.2; }
    } 
    else if (hole.par === 5) {
      const approachDistance = yardage - driveDist;
      if (approachDistance <= driveDist + 20 || approachDistance < 250) { expectedGross -= 0.4; stdev += 0.2; }
      else if (yardage > 580) expectedGross += 0.2; 
    }
  }

  if (avgPutts > 2.1) expectedGross += 0.25; 
  if (avgPutts < 1.8) expectedGross -= 0.15; 
  if (gir > 40) stdev -= 0.15;
  if (gir < 20) stdev += 0.15; 
  if (shortGame > 70) stdev -= 0.1;

  stdev = Math.max(0.15, stdev);

  const variance = (randFn() + randFn() + randFn() - 1.5) * stdev;
  return Math.max(1, Math.round(expectedGross + variance));
};

const runMonteCarloSimulation = async (matchData, iterations = 2500, seedString = 'default') => {
  const { format, handicapData, unplayedHoles, currentMatchScore, players, isCompleted } = matchData;

  if (isCompleted && unplayedHoles.length === 0) {
    if (currentMatchScore > 0) return { playerA: 100, tie: 0, playerB: 0 };
    if (currentMatchScore < 0) return { playerA: 0, tie: 0, playerB: 100 };
    return { playerA: 0, tie: 100, playerB: 0 };
  }

  if (Math.abs(currentMatchScore) > unplayedHoles.length) {
    if (currentMatchScore > 0) return { playerA: 100, tie: 0, playerB: 0 };
    if (currentMatchScore < 0) return { playerA: 0, tie: 0, playerB: 100 };
  }

  const seed = hashString(seedString);
  const getDeterministicRandom = mulberry32(seed);

  let team1Wins = 0;
  let team2Wins = 0;
  let ties = 0;
  
  const formatClean = String(format).trim().toLowerCase();
  const isVegasFormat = formatClean === 'vegas';
  const isTeamFormat = formatClean === 'scramble' || formatClean === 'greensomes';

  let t1RawTeamHcp = 0;
  let t2RawTeamHcp = 0;
  
  if (isTeamFormat) {
    const getHcp = (p) => p ? (parseInt(p.handicap, 10) || 0) : 0;
    const t1Hcps = [getHcp(players.t1p1), getHcp(players.t1p2)].sort((a,b) => a - b);
    const t2Hcps = [getHcp(players.t2p1), getHcp(players.t2p2)].sort((a,b) => a - b);
    
    if (formatClean === 'scramble') {
      t1RawTeamHcp = (t1Hcps[0] * 0.35) + (t1Hcps[1] * 0.15);
      t2RawTeamHcp = (t2Hcps[0] * 0.35) + (t2Hcps[1] * 0.15);
    } else {
      t1RawTeamHcp = (t1Hcps[0] * 0.60) + (t1Hcps[1] * 0.40);
      t2RawTeamHcp = (t2Hcps[0] * 0.60) + (t2Hcps[1] * 0.40);
    }
  }

  for (let i = 0; i < iterations; i++) {
    if (i % 500 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    let simMatchScore = currentMatchScore; 
    let holesRemaining = unplayedHoles.length;

    for (const hole of unplayedHoles) {
      if (Math.abs(simMatchScore) > holesRemaining) break;
      holesRemaining--;

      let t1Net = Infinity;
      let t2Net = Infinity;

      if (isTeamFormat) { 
        const t1Gross = simulateGross({ handicap: t1RawTeamHcp, power_rating: 75, short_game_rating: 75, gir_percentage: 50, avg_putts: 2 }, hole, getDeterministicRandom);
        const t2Gross = simulateGross({ handicap: t2RawTeamHcp, power_rating: 75, short_game_rating: 75, gir_percentage: 50, avg_putts: 2 }, hole, getDeterministicRandom);
        
        t1Net = getSimNetScore(t1Gross, handicapData.team1Strokes ?? 0, hole.hcp_index);
        t2Net = getSimNetScore(t2Gross, handicapData.team2Strokes ?? 0, hole.hcp_index);
      } else {
        const g_t1p1 = simulateGross(players.t1p1, hole, getDeterministicRandom);
        const g_t1p2 = simulateGross(players.t1p2, hole, getDeterministicRandom);
        const g_t2p1 = simulateGross(players.t2p1, hole, getDeterministicRandom);
        const g_t2p2 = simulateGross(players.t2p2, hole, getDeterministicRandom);

        if (isVegasFormat) {
          const n_t1p1 = getSimNetScore(g_t1p1, handicapData.team1?.t1p1 ?? 0, hole.hcp_index);
          const n_t1p2 = getSimNetScore(g_t1p2, handicapData.team1?.t1p2 ?? 0, hole.hcp_index);
          const n_t2p1 = getSimNetScore(g_t2p1, handicapData.team2?.t2p1 ?? 0, hole.hcp_index);
          const n_t2p2 = getSimNetScore(g_t2p2, handicapData.team2?.t2p2 ?? 0, hole.hcp_index);

          const t1Vegas = getVegasScore(n_t1p1, n_t1p2);
          const t2Vegas = getVegasScore(n_t2p1, n_t2p2);
          if (t1Vegas !== null && t2Vegas !== null) { t1Net = t1Vegas; t2Net = t2Vegas; }
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
      }

      if (t1Net < t2Net) simMatchScore++;
      else if (t2Net < t1Net) simMatchScore--;
    }

    if (simMatchScore > 0) team1Wins++;
    else if (simMatchScore < 0) team2Wins++;
    else ties++;
  }

  const roundedA = Math.round((team1Wins / iterations) * 100);
  const roundedTie = Math.round((ties / iterations) * 100);
  return { playerA: roundedA, tie: roundedTie, playerB: 100 - roundedA - roundedTie };
};

export const useMatchData = (matchId, status, staticMode = false) => {
  const [matchData, setMatchData] = useState(null);
  const [probabilities, setProbabilities] = useState({ playerA: 0, playerB: 0, tie: 0 });
  const [isCalculating, setIsCalculating] = useState(true);
  const [generationTick, setGenerationTick] = useState(0);

  useEffect(() => {
    if (!matchId || staticMode) return; 

    const uniqueChannelName = `live-odds-${matchId}-${Math.random().toString(36).substring(7)}`;
    const oddsSubscription = supabase.channel(uniqueChannelName).on('postgres_changes', { event: '*', schema: 'public', table: 'hole_scores', filter: `matchup_id=eq.${matchId}` }, () => {
         setGenerationTick(prev => prev + 1);
    }).subscribe();
      
    return () => { supabase.removeChannel(oddsSubscription); };
  }, [matchId, staticMode]);

  useEffect(() => {
    let isMounted = true;
    const fetchAndProcessData = async () => {
      if (!matchId) return setIsCalculating(false);
      setIsCalculating(true);

      try {
        const { data: match, error: matchError } = await supabase.from('matches').select('*').eq('id', matchId).single();
        if (matchError) throw matchError;

        const { data: profiles, error: profileError } = await supabase.from('players').select('id, auth_id, name, handicap, power_rating, short_game_rating, driving_dist, gir_percentage, avg_putts, team');
        if (profileError) throw profileError;

        const resolveGolfer = (refId) => {
          if (!refId) return null;
          const target = String(refId).trim().toLowerCase();
          return profiles.find(p => (p.auth_id && String(p.auth_id).trim().toLowerCase() === target) || (p.id && String(p.id).trim().toLowerCase() === target));
        };

        const players = { t1p1: resolveGolfer(match.team1_player1), t1p2: resolveGolfer(match.team1_player2), t2p1: resolveGolfer(match.team2_player1), t2p2: resolveGolfer(match.team2_player2) };

        const team1Arr = [];
        if (players.t1p1) team1Arr.push({ id: 't1p1', courseHandicap: parseInt(players.t1p1.handicap, 10) || 0 });
        if (players.t1p2) team1Arr.push({ id: 't1p2', courseHandicap: parseInt(players.t1p2.handicap, 10) || 0 });
        const team2Arr = [];
        if (players.t2p1) team2Arr.push({ id: 't2p1', courseHandicap: parseInt(players.t2p1.handicap, 10) || 0 });
        if (players.t2p2) team2Arr.push({ id: 't2p2', courseHandicap: parseInt(players.t2p2.handicap, 10) || 0 });

        const format = match.format || '1v1';
        const handicapData = calculatePlayingHandicaps(format, team1Arr, team2Arr);

        const { data: holes, error: holesError } = await supabase.from('holes').select('*').eq('course_id', match.course_id || 1).order('hole_number', { ascending: true });
        if (holesError) throw holesError;

        const { data: scores } = await supabase.from('hole_scores').select('*').eq('matchup_id', matchId);
        
        const validScores = scores ? scores.filter(s => 
          s.score_slanted_a !== null || 
          s.score_slanted_b !== null || 
          s.score_brothelmen_a !== null || 
          s.score_brothelmen_b !== null
        ) : [];
        
        let completedHoleNums = [];
        if (validScores.length > 0) {
          completedHoleNums = [...new Set(validScores.map(s => s.hole_number))];
        }

        const isCompleted = match.status === 'completed' || completedHoleNums.length >= 18;

        let currentMatchScore = 0;
        if (validScores.length > 0) {
          
          const netScoresPayload = validScores.map(row => {
            const hMeta = holes.find(h => h.id === row.hole_id || h.hole_number === row.hole_number);
            const hIdx = hMeta ? hMeta.hcp_index : 18;

            const getNet = (gross, strokes) => {
              if (gross == null) return null;
              let applied = Math.floor((strokes || 0) / 18);
              if (((strokes || 0) % 18) >= hIdx) applied += 1;
              return gross - applied;
            };

            return {
              ...row,
              t1p1: getNet(row.score_slanted_a, handicapData.type === 'team' ? handicapData.team1Strokes : handicapData.team1?.t1p1),
              t1p2: getNet(row.score_slanted_b, handicapData.type === 'team' ? handicapData.team1Strokes : handicapData.team1?.t1p2),
              t2p1: getNet(row.score_brothelmen_a, handicapData.type === 'team' ? handicapData.team2Strokes : handicapData.team2?.t2p1),
              t2p2: getNet(row.score_brothelmen_b, handicapData.type === 'team' ? handicapData.team2Strokes : handicapData.team2?.t2p2),
            };
          });

          const liveState = evaluateMatchStatus(format, handicapData, holes, netScoresPayload);
          currentMatchScore = (liveState.team1Wins || 0) - (liveState.team2Wins || 0);

        } else {
          currentMatchScore = (parseInt(match.team1_score, 10) || 0) - (parseInt(match.team2_score, 10) || 0);
        }

        const unplayedHoles = isCompleted && completedHoleNums.length >= 18 ? [] : holes.filter(h => !completedHoleNums.includes(h.hole_number));
        const processedState = { format, handicapData, players, unplayedHoles, currentMatchScore, isCompleted };

        if (isMounted) {
          setMatchData(processedState);
          const simIterations = staticMode ? 400 : 2500;
          const cacheKey = `${matchId}_${currentMatchScore}_${unplayedHoles.length}_${simIterations}`;
          
          if (matchOddsCache.has(cacheKey)) {
            setProbabilities(matchOddsCache.get(cacheKey));
            setIsCalculating(false);
          } else {
            const results = await runMonteCarloSimulation(processedState, simIterations, cacheKey);
            matchOddsCache.set(cacheKey, results);
            
            if (isMounted) {
              setProbabilities(results);
              setIsCalculating(false);
            }
          }
        }
      } catch (err) {
        console.error("Error calculating probabilities:", err);
        if (isMounted) setIsCalculating(false);
      }
    };
    fetchAndProcessData();
    return () => { isMounted = false; };
  }, [matchId, status, generationTick, staticMode]);

  return { matchData, probabilities, isCalculating };
};

// 🎯 UPDATED: The entire Clam Cup probability generator now leverages the live scorecard evaluator!
export const useTournamentProbability = () => {
  const [overallProb, setOverallProb] = useState({ team1: 50, team2: 50, draw: 0, loading: true });
  const [tick, setTick] = useState(0);

  // 🎯 FIX 1: Add Real-Time Supabase Listener to instantly trigger a recalculation when holes are scored
  useEffect(() => {
    const channel = supabase.channel('macro-cup-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hole_scores' }, () => { setTick(t => t + 1); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => { setTick(t => t + 1); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const calculateOverallCupOdds = async () => {
      try {
        const TOTAL_SLOTS = 24; 
        
        // 🎯 FIX 2: Pull the entire required ecosystem to accurately evaluate live match states
        const [
          { data: dbMatches },
          { data: playersData },
          { data: holeScoresData },
          { data: holesData }
        ] = await Promise.all([
          supabase.from('matches').select('*'),
          supabase.from('players').select('id, auth_id, handicap'),
          supabase.from('hole_scores').select('*'),
          supabase.from('holes').select('id, course_id, par, hcp_index')
        ]);

        if (!dbMatches) return;

        const validHoleScores = holeScoresData ? holeScoresData.filter(s => 
          s.score_slanted_a !== null || s.score_slanted_b !== null || 
          s.score_brothelmen_a !== null || s.score_brothelmen_b !== null
        ) : [];

        const matchScoresLookup = {};
        if (validHoleScores) {
          validHoleScores.forEach(s => {
            if (!matchScoresLookup[s.matchup_id]) matchScoresLookup[s.matchup_id] = [];
            matchScoresLookup[s.matchup_id].push(s);
          });
        }

        let confirmedTeam1Points = 0;
        let confirmedTeam2Points = 0;
        let activeMatchSimProbs = [];

        // Evaluate true live score for all active matches
        for (const m of dbMatches) {
          const scores = matchScoresLookup[m.id] || [];
          const format = m.format || '1v1';
          const matchHoles = holesData?.filter(h => h.course_id === (m.course_id || 1)) || [];
          
          const findP = (authId) => playersData?.find(p => String(p.auth_id).trim().toLowerCase() === String(authId).trim().toLowerCase());
          const p1 = findP(m.team1_player1);
          const p2 = findP(m.team1_player2);
          const p3 = findP(m.team2_player1);
          const p4 = findP(m.team2_player2);

          const team1Arr = [];
          if (p1) team1Arr.push({ id: 't1p1', courseHandicap: parseInt(p1.handicap, 10) || 0 });
          if (p2) team1Arr.push({ id: 't1p2', courseHandicap: parseInt(p2.handicap, 10) || 0 });
          const team2Arr = [];
          if (p3) team2Arr.push({ id: 't2p1', courseHandicap: parseInt(p3.handicap, 10) || 0 });
          if (p4) team2Arr.push({ id: 't2p2', courseHandicap: parseInt(p4.handicap, 10) || 0 });

          const handicapData = calculatePlayingHandicaps(format, team1Arr, team2Arr);

          const EnginePayload = scores.map(row => {
            const hMeta = matchHoles.find(h => h.id === row.hole_id || h.hole_number === row.hole_number);
            const hIdx = hMeta ? hMeta.hcp_index : 18;

            const getNet = (gross, strokes) => {
              if (gross == null) return null;
              let applied = Math.floor((strokes || 0) / 18);
              if (((strokes || 0) % 18) >= hIdx) applied += 1;
              return gross - applied;
            };

            return {
              ...row,
              t1p1: getNet(row.score_slanted_a, handicapData.type === 'team' ? handicapData.team1Strokes : handicapData.team1?.t1p1),
              t1p2: getNet(row.score_slanted_b, handicapData.type === 'team' ? handicapData.team1Strokes : handicapData.team1?.t1p2),
              t2p1: getNet(row.score_brothelmen_a, handicapData.type === 'team' ? handicapData.team2Strokes : handicapData.team2?.t2p1),
              t2p2: getNet(row.score_brothelmen_b, handicapData.type === 'team' ? handicapData.team2Strokes : handicapData.team2?.t2p2),
            };
          });

          // 🎯 Run the exact same engine the UI runs!
          const res = evaluateMatchStatus(format, handicapData, matchHoles, EnginePayload);
          const scoreDiff = (res.team1Wins || 0) - (res.team2Wins || 0);
          const isFinished = m.status === 'completed' || res.holesPlayed >= 18 || res.isClosedOut || res.statusStr.includes('&');

          if (isFinished && res.holesPlayed > 0) {
            // Match is closed out (e.g. 4 & 3 or 18 completed) - assign hard point logic
            if (scoreDiff > 0) confirmedTeam1Points += 1.0;
            else if (scoreDiff < 0) confirmedTeam2Points += 1.0;
            else { confirmedTeam1Points += 0.5; confirmedTeam2Points += 0.5; }
          } else if (m.status === 'live' || m.is_live === true || m.is_live === 'true' || res.holesPlayed > 0) {
            // Live Match Probability Injection
            let t1Prob = 0.5;
            if (scoreDiff > 2) t1Prob = 0.85;
            else if (scoreDiff > 0) t1Prob = 0.65;
            else if (scoreDiff < -2) t1Prob = 0.15;
            else if (scoreDiff < 0) t1Prob = 0.35;
            activeMatchSimProbs.push(t1Prob);
          } else {
            activeMatchSimProbs.push(0.5); 
          }
        }

        // Cache check
        const fingerprint = `${confirmedTeam1Points}-${confirmedTeam2Points}-${activeMatchSimProbs.join(',')}`;
        if (globalCupCache && globalCupFingerprint === fingerprint) {
           if (isMounted) setOverallProb(globalCupCache);
           return;
        }

        const remainingSlotsCount = Math.max(0, TOTAL_SLOTS - dbMatches.length);
        for (let i = 0; i < remainingSlotsCount; i++) activeMatchSimProbs.push(0.5);

        let t1CupWins = 0;
        let t2CupWins = 0;
        let cupDraws = 0;
        const runs = 1000;
        const getDeterministicRandom = mulberry32(hashString(fingerprint));

        for (let r = 0; r < runs; r++) {
          let simT1Points = confirmedTeam1Points;
          let simT2Points = confirmedTeam2Points;

          activeMatchSimProbs.forEach(t1WinChance => {
            const rand = getDeterministicRandom();
            if (rand < t1WinChance - 0.05) simT1Points += 1.0;
            else if (rand > t1WinChance + 0.05) simT2Points += 1.0;
            else { simT1Points += 0.5; simT2Points += 0.5; }
          });

          if (simT1Points >= 12.5) t1CupWins++;
          else if (simT2Points >= 12.5) t2CupWins++;
          else cupDraws++;
        }

        if (isMounted) {
          const t1Pct = Math.round((t1CupWins / runs) * 100);
          const drawPct = Math.round((cupDraws / runs) * 100);
          const newProb = { team1: t1Pct, draw: drawPct, team2: 100 - t1Pct - drawPct, loading: false };
          
          globalCupFingerprint = fingerprint;
          globalCupCache = newProb;
          
          setOverallProb(newProb);
        }
      } catch (err) {
        console.error("Error running macro tournament simulation:", err);
      }
    };

    calculateOverallCupOdds();
    const interval = setInterval(calculateOverallCupOdds, 45000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [tick]);

  return overallProb;
};

export const TournamentProbabilityBar = () => {
  const { team1, team2, draw, loading } = useTournamentProbability();
  if (loading) return <div className="h-2 w-full bg-slate-800/60 animate-pulse rounded-full" />;

  return (
    <div className="w-full flex flex-col gap-1.5 bg-black/30 p-2.5 rounded-xl border border-white/5">
      <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-slate-400">
        <span className="flex items-center gap-1 text-blue-400"><Trophy size={11} /> CLAMS CUP IMPACT</span>
        <span className="text-slate-500 font-mono">12.5 pts to Clinch</span>
      </div>
      <div className="relative h-2.5 bg-slate-900 rounded-full overflow-hidden flex w-full border border-white/5 shadow-inner">
        <div className="bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700" style={{ width: `${team1}%` }} />
        <div className="bg-slate-600 transition-all duration-700" style={{ width: `${draw}%` }} />
        <div className="bg-gradient-to-l from-red-600 to-red-400 transition-all duration-700" style={{ width: `${team2}%` }} />
      </div>
      <div className="flex justify-between items-center text-[11px] font-black tracking-tight font-mono">
        <span className="text-blue-400">CLAMS {team1}%</span>
        {draw > 0 && <span className="text-slate-500 text-[9px] uppercase">Retain Draw {draw}%</span>}
        <span className="text-red-400">BROTHELMEN {team2}%</span>
      </div>
    </div>
  );
};

export const MicroTournamentBar = () => {
  const { team1, team2, loading } = useTournamentProbability();
  if (loading) return <div className="h-1 w-full bg-slate-800 rounded-full animate-pulse mt-0.5" />;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between items-center px-0.5">
        <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider">Cup Outlook</span>
        <span className="text-[7px] font-mono font-bold text-slate-400">
          Clams <span className="text-blue-400 font-black">{team1}%</span> to Win Cup
        </span>
      </div>
      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden flex border border-white/5">
        <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500" style={{ width: `${team1}%` }} />
        <div className="h-full bg-gradient-to-l from-red-600 to-red-400 transition-all duration-500" style={{ width: `${team2}%` }} />
      </div>
    </div>
  );
};

export const MatchProbabilityBar = ({ matchId, status, team1Name, team2Name, variant = 'full', staticMode = false }) => {
  const { matchData, probabilities, isCalculating } = useMatchData(matchId, status, staticMode);

  if (isCalculating || !matchData) {
    if (variant === 'ticker') {
      return (
        <div className="flex items-center gap-1.5 w-32 ml-2 pl-2 border-l border-white/10 shrink-0 opacity-50">
          <span className="text-[9px] font-black tabular-nums text-slate-500">--%</span>
          <div className="flex-1 h-1.5 bg-slate-800 animate-pulse rounded-full" />
          <span className="text-[9px] font-black tabular-nums text-slate-500">--%</span>
        </div>
      );
    }
    if (variant === 'micro') return <div className="h-2 mt-2 mb-1 w-full bg-slate-800 animate-pulse rounded-full" />;
    return <div className="mt-4 pt-3 border-t border-white/5 animate-pulse"><div className="h-1.5 bg-white/10 rounded-full w-full"></div></div>;
  }

  const isFinalResult = matchData.isCompleted || probabilities.playerA === 100 || probabilities.playerB === 100;
  const isLive = !isFinalResult && (status === 'live' || matchData.unplayedHoles.length < 18);

  const dbTeam1Name = matchData.players.t1p1?.team || matchData.players.t1p2?.team || team1Name || 'Slanted Clams';
  const dbTeam2Name = matchData.players.t2p1?.team || matchData.players.t2p2?.team || team2Name || 'Brothelmen';

  const displayLeft = probabilities.playerA; 
  const displayRight = probabilities.playerB;

  const resolvedLeftName = dbTeam1Name;
  const resolvedRightName = dbTeam2Name;

  const leftBarColor = 'bg-blue-500';
  const rightBarColor = 'bg-red-500';
  const leftGradient = 'from-blue-600 to-blue-400';
  const rightGradient = 'from-red-600 to-red-400';
  const leftTextColor = 'text-blue-400';
  const rightTextColor = 'text-red-400';

  if (variant === 'ticker') {
    return (
      <div className="flex items-center gap-1.5 w-32 ml-2 pl-2 border-l border-white/10 shrink-0">
        <span className={`text-[9px] font-black tabular-nums ${leftTextColor}`}>{displayLeft}%</span>
        <div className="flex-1 h-1.5 bg-black/60 rounded-full overflow-hidden flex shadow-inner border border-white/5">
          <div className={`h-full ${leftBarColor} transition-all duration-500`} style={{ width: `${displayLeft}%` }} />
          <div className="h-full bg-slate-600 transition-all duration-500" style={{ width: `${probabilities.tie}%` }} />
          <div className={`h-full ${rightBarColor} transition-all duration-500`} style={{ width: `${displayRight}%` }} />
        </div>
        <span className={`text-[9px] font-black tabular-nums ${rightTextColor}`}>{displayRight}%</span>
      </div>
    );
  }

  if (variant === 'micro') {
    return (
      <div className="flex flex-col w-full gap-2 mt-1.5 pt-1.5 border-t border-slate-800">
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between items-center px-0.5">
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider">Match Odds</span>
            <span className={`text-[8px] font-mono font-black ${displayLeft >= displayRight ? leftTextColor : rightTextColor}`}>
              {displayLeft >= displayRight ? `Clams ${displayLeft}%` : `Brothelmen ${displayRight}%`}
            </span>
          </div>
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden flex border border-white/5">
            <div className={`h-full ${leftBarColor} transition-all duration-500`} style={{ width: `${displayLeft}%` }} />
            <div className="h-full bg-slate-600 transition-all duration-500" style={{ width: `${probabilities.tie}%` }} />
            <div className={`h-full ${rightBarColor} transition-all duration-500`} style={{ width: `${displayRight}%` }} />
          </div>
        </div>

        <MicroTournamentBar />
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-2">
      <div className="flex justify-between items-center text-[9px] uppercase tracking-widest font-black">
        {isFinalResult ? (
          <span className="text-emerald-400 flex items-center gap-1"><TrendingUp size={10} /> Match Final</span>
        ) : isLive ? (
          <span className="text-orange-400 flex items-center gap-1"><TrendingUp size={10} /> Live Win Prob ({18 - matchData.unplayedHoles.length} Played)</span>
        ) : (
          <span className="text-slate-400 flex items-center gap-1"><CalendarClock size={10} /> Pre-Match Odds</span>
        )}
      </div>

      <div className="relative h-2 bg-black/40 rounded-full overflow-hidden flex w-full border border-white/5 shadow-inner">
        <div className={`bg-gradient-to-r ${leftGradient} transition-all duration-500 ease-out border-r border-black/20`} style={{ width: `${displayLeft}%` }}></div>
        <div className="bg-slate-600 transition-all duration-500 ease-out border-r border-black/20" style={{ width: `${probabilities.tie}%` }}></div>
        <div className={`bg-gradient-to-l ${rightGradient} transition-all duration-500 ease-out`} style={{ width: `${displayRight}%` }}></div>
      </div>

      <div className="flex justify-between items-center text-[10px] font-black tracking-tighter">
        <span className={`${leftTextColor} truncate max-w-[40%]`}>{resolvedLeftName} {displayLeft}%</span>
        <span className="text-slate-500 font-bold text-[9px] uppercase tracking-wider shrink-0">{probabilities.tie > 0 ? `Tie ${probabilities.tie}%` : ' '}</span>
        <span className={`${rightTextColor} truncate max-w-[40%] text-right`}>{displayRight}% {resolvedRightName}</span>
      </div>
    </div>
  );
};