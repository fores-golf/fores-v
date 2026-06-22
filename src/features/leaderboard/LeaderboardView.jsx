import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { MatchProbabilityBar, useTournamentProbability } from '../probability/probability_engine'; 
import { calculatePlayingHandicaps, evaluateMatchStatus } from '../../utils/matchPlayEngine';

const ROUND_METADATA = {
  1: { date: 'June 25th', parseDate: '2026-06-25', course: 'Quarry', format: 'Vegas' },
  2: { date: 'June 26th', parseDate: '2026-06-26', course: 'Quarry', format: 'Greensomes' },
  3: { date: 'June 26th', parseDate: '2026-06-26', course: 'Legend', format: 'Best Ball' },
  4: { date: 'June 27th', parseDate: '2026-06-27', course: 'Legend', format: 'Scramble' },
  5: { date: 'June 27th', parseDate: '2026-06-27', course: 'Quarry', format: '1v1' }
};

export function useLeaderboardData() {
  const [loading, setLoading] = useState(true);
  const [standings, setStandings] = useState({
    team1: { name: 'Slanted Clams', score: 0, color: 'blue' },
    team2: { name: 'Clam Brothelmen', score: 0, color: 'red' },
    totalAvailablePoints: 24,
    pointsNeededToWin: 12.5
  });
  const [matchHistory, setMatchHistory] = useState([]);
  const [individualStats, setIndividualStats] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadLeaderboardMetrics() {
      try {
        const [
          { data: teamsData },
          { data: matchesData }, 
          { data: playersData },
          { data: holeScoresData },
          { data: coursesData },
          { data: holesData }
        ] = await Promise.all([
          supabase.from('teams').select('name, points'),
          supabase.from('matches').select('id, round, format, status, is_live, course_id, team1_score, team2_score, team1_player1, team1_player2, team2_player1, team2_player2'),
          supabase.from('players').select('id, auth_id, name, team, handicap'),
          supabase.from('hole_scores').select('*'),
          supabase.from('courses').select('id, name, slope, rating'),
          supabase.from('holes').select('id, course_id, par, hcp_index') 
        ]);

        if (!isMounted) return;

        const courseMap = {};
        if (coursesData) {
          coursesData.forEach(c => {
            courseMap[c.id] = { name: c.name, slope: Number(c.slope), rating: Number(c.rating) };
          });
        }

        const holeMap = {};
        if (holesData) {
          holesData.forEach(h => {
            holeMap[h.id] = { par: Number(h.par), strokeIndex: Number(h.hcp_index) };
          });
        }

        const matchCourseMap = {};
        const matchFormatMap = {};
        const matchRosterMap = {};
        
        if (matchesData) {
          matchesData.forEach(match => {
            matchCourseMap[match.id] = match.course_id;
            matchFormatMap[match.id] = match.format || '1v1';
            matchRosterMap[match.id] = {
              t1p1: match.team1_player1,
              t1p2: match.team1_player2,
              t2p1: match.team2_player1,
              t2p2: match.team2_player2,
            };
          });
        }

        const playerMap = {};
        const statsMap = {};
        if (playersData) {
          playersData.forEach(p => {
            if (p.auth_id) playerMap[String(p.auth_id).trim().toLowerCase()] = p.name;
            if (p.id) playerMap[String(p.id).trim().toLowerCase()] = p.name;
            
            const statKey = p.auth_id ? String(p.auth_id).trim().toLowerCase() : String(p.id).trim().toLowerCase();
            statsMap[statKey] = {
              id: p.id,
              auth_id: p.auth_id,
              name: p.name,
              team: p.team || 'Unsigned',
              handicap: parseFloat(p.handicap) || 0, 
              gross: 0,
              net: 0, 
              netDisplay: 'TBD', 
              completedRounds: 0,
              holesWon: 0,
              holesPlayed: 0,
              rounds: {} 
            };
          });
        }

        const validHoleScores = holeScoresData ? holeScoresData.filter(s => 
          s.score_slanted_a !== null || 
          s.score_slanted_b !== null || 
          s.score_brothelmen_a !== null || 
          s.score_brothelmen_b !== null
        ) : [];

        const matchScoresLookup = {};
        if (validHoleScores) {
          validHoleScores.forEach(s => {
            if (!matchScoresLookup[s.matchup_id]) matchScoresLookup[s.matchup_id] = [];
            matchScoresLookup[s.matchup_id].push(s);
          });
        }

        let dynamicT1Score = 0;
        let dynamicT2Score = 0;

        if (matchesData && holesData) {
          matchesData.forEach(m => {
            const scores = matchScoresLookup[m.id] || [];
            const format = m.format || '1v1';
            const matchHoles = holesData.filter(h => h.course_id === (m.course_id || 1));
            
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

            const res = evaluateMatchStatus(format, handicapData, matchHoles, EnginePayload);
            
            m.live_team1_score = res.team1Wins || 0;
            m.live_team2_score = res.team2Wins || 0;
            m.live_holesPlayed = res.holesPlayed || 0;
	    m.statusStr = res.statusStr; // 🎯 LOCK THIS LINE IN LEADERBOARDVIEW TO FEED THE TICKER
            
            const isFinished = m.status === 'completed' || res.holesPlayed >= 18 || res.isClosedOut || res.statusStr.includes('&');

            if (isFinished && res.holesPlayed > 0) {
              if (res.team1Wins > res.team2Wins) dynamicT1Score += 1;
              else if (res.team2Wins > res.team1Wins) dynamicT2Score += 1;
              else {
                dynamicT1Score += 0.5;
                dynamicT2Score += 0.5;
              }
            }
          });
        }

        if (teamsData) {
          const dbT1 = teamsData.find(t => t.name === 'Slanted Clams');
          const dbT2 = teamsData.find(t => t.name === 'Clam Brothelmen');
          
          dynamicT1Score = Math.max(dynamicT1Score, Number(dbT1?.points || 0));
          dynamicT2Score = Math.max(dynamicT2Score, Number(dbT2?.points || 0));
        }

        setStandings({
          team1: { name: 'Slanted Clams', score: dynamicT1Score, color: 'blue' },
          team2: { name: 'Clam Brothelmen', score: dynamicT2Score, color: 'red' },
          totalAvailablePoints: 24,
          pointsNeededToWin: 12.5
        });

        if (matchesData) {
          const cleanK = (val) => String(val || '').trim().toLowerCase();
          const mappedMatches = matchesData.map(match => ({
            ...match,
            team1_player1: playerMap[cleanK(match.team1_player1)] || match.team1_player1,
            team1_player2: playerMap[cleanK(match.team1_player2)] || match.team1_player2,
            team2_player1: playerMap[cleanK(match.team2_player1)] || match.team2_player1,
            team2_player2: playerMap[cleanK(match.team2_player2)] || match.team2_player2,
          }));
          setMatchHistory(mappedMatches);
        }

        if (validHoleScores && validHoleScores.length > 0) {
          validHoleScores.forEach(score => {
            const mid = score.matchup_id;
            const format = matchFormatMap[mid] ? String(matchFormatMap[mid]).trim().toLowerCase() : '1v1';
            const isTeamFormat = format === 'scramble' || format === 'greensomes';

            if (isTeamFormat) return;

            const roster = matchRosterMap[mid];
            if (!roster) return;

            const processPlayerScore = (authId, grossScore) => {
              if (!authId || grossScore == null) return;
              const cleanId = String(authId).trim().toLowerCase();

              if (statsMap[cleanId]) {
                if (!statsMap[cleanId].rounds[mid]) {
                  statsMap[cleanId].rounds[mid] = { courseId: matchCourseMap[mid], holesPlayed: 0, scores: [] };
                }
                statsMap[cleanId].rounds[mid].scores.push({ hole_id: score.hole_id, gross_score: grossScore });
                statsMap[cleanId].rounds[mid].holesPlayed += 1;
                statsMap[cleanId].gross += grossScore;
                statsMap[cleanId].holesPlayed += 1;
              }
            };

            processPlayerScore(roster.t1p1, score.score_slanted_a);
            processPlayerScore(roster.t1p2, score.score_slanted_b);
            processPlayerScore(roster.t2p1, score.score_brothelmen_a);
            processPlayerScore(roster.t2p2, score.score_brothelmen_b);
          });

          Object.values(statsMap).forEach(player => {
            let totalWHSNet = 0;
            let finishedRoundsCount = 0;
            
            Object.values(player.rounds).forEach(round => {
              if (round.holesPlayed >= 18) {
                finishedRoundsCount += 1;
                const courseInfo = courseMap[round.courseId];
                if (!courseInfo) return; 

                const slope = courseInfo.rating; 
                const rating = courseInfo.slope; 
                const courseHandicap = Math.round((player.handicap * (slope / 113)) + (rating - 72));
                let roundNet = 0;

                round.scores.forEach(scoreData => {
                  const holeInfo = holeMap[scoreData.hole_id];
                  if (!holeInfo) {
                    roundNet += scoreData.gross_score; 
                    return; 
                  }
                  const { par, strokeIndex } = holeInfo;

                  let strokesReceived = Math.floor(courseHandicap / 18);
                  if (courseHandicap % 18 >= strokeIndex) strokesReceived += 1;

                  const netDoubleBogeyMax = par + 2 + strokesReceived;
                  const adjustedGross = Math.min(scoreData.gross_score, netDoubleBogeyMax);
                  roundNet += (adjustedGross - strokesReceived);
                });
                totalWHSNet += roundNet;
              }
            });

            player.net = totalWHSNet;
            player.completedRounds = finishedRoundsCount;
            if (finishedRoundsCount > 0) player.netDisplay = totalWHSNet.toString();
          });

          const matchupHoles = {};
          validHoleScores.forEach(score => {
             const mid = score.matchup_id;
             const hn = score.hole_number;
             if (!mid || !hn) return;
             if (!matchupHoles[mid]) matchupHoles[mid] = {};
             if (!matchupHoles[mid][hn]) matchupHoles[mid][hn] = [];
             matchupHoles[mid][hn].push(score);
          });

          Object.entries(matchupHoles).forEach(([mid, holeGroup]) => {
             const rawFormat = matchFormatMap[mid] || '1v1';
             const format = String(rawFormat).trim().toLowerCase();
             const roster = matchRosterMap[mid];
             if (!roster) return;

             const isTeamFormat = format === 'scramble' || format === 'greensomes';

             Object.values(holeGroup).forEach(scores => {
                if (scores.length === 0) return;
                const sampleRow = scores[0];

                if (isTeamFormat || format === 'vegas' || format === 'best ball' || format === '1v1') {
                  const t1p1Gross = sampleRow.score_slanted_a;
                  const t1p2Gross = sampleRow.score_slanted_b;
                  const t2p1Gross = sampleRow.score_brothelmen_a;
                  const t2p2Gross = sampleRow.score_brothelmen_b;

                  const holeMeta = holesData?.find(h => h.id === sampleRow.hole_id || h.hole_number === sampleRow.hole_number);
                  const hIdx = holeMeta ? holeMeta.hcp_index : 18;

                  const findP = (authId) => playersData?.find(p => String(p.auth_id).trim().toLowerCase() === String(authId).trim().toLowerCase());
                  const p1 = findP(roster.t1p1);
                  const p2 = findP(roster.t1p2);
                  const p3 = findP(roster.t2p1);
                  const p4 = findP(roster.t2p2);

                  const team1Arr = [];
                  if (p1) team1Arr.push({ id: 't1p1', courseHandicap: parseInt(p1.handicap, 10) || 0 });
                  if (p2) team1Arr.push({ id: 't1p2', courseHandicap: parseInt(p2.handicap, 10) || 0 });
                  const team2Arr = [];
                  if (p3) team2Arr.push({ id: 't2p1', courseHandicap: parseInt(p3.handicap, 10) || 0 });
                  if (p4) team2Arr.push({ id: 't2p2', courseHandicap: parseInt(p4.handicap, 10) || 0 });

                  const handicapData = calculatePlayingHandicaps(rawFormat, team1Arr, team2Arr);

                  const getNet = (gross, strokes) => {
                    if (gross == null) return null;
                    let applied = Math.floor((strokes || 0) / 18);
                    if (((strokes || 0) % 18) >= hIdx) applied += 1;
                    return gross - applied;
                  };

                  const t1p1Net = getNet(t1p1Gross, handicapData.type === 'team' ? handicapData.team1Strokes : handicapData.team1?.t1p1);
                  const t1p2Net = getNet(t1p2Gross, handicapData.type === 'team' ? handicapData.team1Strokes : handicapData.team1?.t1p2);
                  const t2p1Net = getNet(t2p1Gross, handicapData.type === 'team' ? handicapData.team2Strokes : handicapData.team2?.t2p1);
                  const t2p2Net = getNet(t2p2Gross, handicapData.type === 'team' ? handicapData.team2Strokes : handicapData.team2?.t2p2);

                  let t1NetFinal = Infinity;
                  let t2NetFinal = Infinity;

                  if (format === '1v1') {
                    if (t1p1Net !== null) t1NetFinal = t1p1Net;
                    if (t2p1Net !== null) t2NetFinal = t2p1Net;
                  } else if (format === 'vegas') {
                    if (t1p1Net !== null && t1p2Net !== null) {
                      t1NetFinal = Math.min(t1p1Net, t1p2Net) >= 10 ? parseInt(`${Math.max(t1p1Net, t1p2Net)}${Math.min(t1p1Net, t1p2Net)}`, 10) : parseInt(`${Math.min(t1p1Net, t1p2Net)}${Math.max(t1p1Net, t1p2Net)}`, 10);
                    }
                    if (t2p1Net !== null && t2p2Net !== null) {
                      t2NetFinal = Math.min(t2p1Net, t2p2Net) >= 10 ? parseInt(`${Math.max(t2p1Net, t2p2Net)}${Math.min(t2p1Net, t2p2Net)}`, 10) : parseInt(`${Math.min(t2p1Net, t2p2Net)}${Math.max(t2p1Net, t2p2Net)}`, 10);
                    }
                  } else {
                    const validT1 = [t1p1Net, t1p2Net].filter(n => n !== null);
                    const validT2 = [t2p1Net, t2p2Net].filter(n => n !== null);
                    if (validT1.length > 0) t1NetFinal = Math.min(...validT1);
                    if (validT2.length > 0) t2NetFinal = Math.min(...validT2);
                  }

                  const k1 = roster.t1p1 ? String(roster.t1p1).trim().toLowerCase() : null;
                  const k2 = roster.t1p2 ? String(roster.t1p2).trim().toLowerCase() : null;
                  const k3 = roster.t2p1 ? String(roster.t2p1).trim().toLowerCase() : null;
                  const k4 = roster.t2p2 ? String(roster.t2p2).trim().toLowerCase() : null;

                  if (t1NetFinal < t2NetFinal) {
                    if (k1 && statsMap[k1]) statsMap[k1].holesWon += 1;
                    if (k2 && statsMap[k2]) statsMap[k2].holesWon += 1;
                  } else if (t2NetFinal < t1NetFinal) {
                    if (k3 && statsMap[k3]) statsMap[k3].holesWon += 1;
                    if (k4 && statsMap[k4]) statsMap[k4].holesWon += 1;
                  }
                } else {
                  const minScore = Math.min(...scores.map(s => s.gross_score).filter(x => x != null));
                  const winners = scores.filter(s => s.gross_score === minScore);
                  winners.forEach(w => {
                     const pAuthId = String(w.player_id || w.profile_id || '').trim().toLowerCase();
                     if (statsMap[pAuthId]) statsMap[pAuthId].holesWon += 1;
                  });
                }
             });
          });

          const finalIndividualStats = Object.values(statsMap)
            .filter(p => p.holesPlayed > 0 || p.holesWon > 0)
            .sort((a, b) => {
              if (a.completedRounds !== b.completedRounds) return b.completedRounds - a.completedRounds;
              if (a.net !== b.net) return a.net - b.net;
              return b.holesWon - a.holesWon;
            });
          setIndividualStats(finalIndividualStats);
        }
      } catch (err) {
        console.error('Error compiling tournament leaderboard:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    loadLeaderboardMetrics();

    const matchesChannel = supabase.channel('leaderboard-matches-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => { if (isMounted) loadLeaderboardMetrics(); })
      .subscribe();

    const scoresChannel = supabase.channel('leaderboard-scores-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hole_scores' }, () => { if (isMounted) loadLeaderboardMetrics(); })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(scoresChannel);
    };
  }, []);

  return { standings, matchHistory, individualStats, loading };
}

export default function LeaderboardView({ onBack }) {
  const [viewMode, setViewMode] = useState('team'); 
  const { standings, matchHistory, individualStats, loading } = useLeaderboardData();

  const { team1: probT1, team2: probT2, draw: probDraw, loading: probLoading } = useTournamentProbability();

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0f172a] flex items-center justify-center pb-safe">
        <span className="animate-spin h-10 w-10 border-4 border-[#34d399] border-t-transparent rounded-full" />
      </div>
    );
  }

  const t1Pct = (standings.team1.score / standings.totalAvailablePoints) * 100;
  const t2Pct = (standings.team2.score / standings.totalAvailablePoints) * 100;

  const activeMatchesWithPlayers = matchHistory.filter(m => m.team1_player1 || m.team2_player1);

  // 🎯 FIX: Updated sorting algorithm to push completed matches to the bottom
  const sortedMatchHistory = [...activeMatchesWithPlayers].sort((a, b) => {
    const aLive = a.is_live === true || a.is_live === 'true';
    const bLive = b.is_live === true || b.is_live === 'true';
    const aCompleted = a.status === 'completed';
    const bCompleted = b.status === 'completed';

    // 1. Push completed to bottom
    if (aCompleted && !bCompleted) return 1;
    if (!aCompleted && bCompleted) return -1;

    // 2. Pull live to top
    if (aLive && !bLive) return -1;
    if (bLive && !aLive) return 1;

    // 3. Keep the rest chronological
    return a.round - b.round;
  });

  return (
    <div className="min-h-[100dvh] bg-[#090d16] text-white font-sans pb-safe fixed inset-0 z-40 overflow-y-auto style-scrolling-touch">
      <div className="px-5 py-4 flex justify-between items-center bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20">
        <button onClick={onBack} className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 active:scale-95 transition-transform">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          Hub
        </button>
        <h1 className="font-black text-lg tracking-tight uppercase italic flex items-center gap-1.5">
          <svg className="w-5 h-5 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Leaderboard
        </h1>
        <div className="w-8 h-8"></div>
      </div>

      <main className="p-5 flex flex-col gap-6 max-w-md mx-auto relative z-0">
        <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 sticky top-20 z-10 backdrop-blur-md">
          <button className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${viewMode === 'team' ? 'bg-[#34d399] text-black shadow-md' : 'text-slate-500 hover:text-slate-300'}`} onClick={() => setViewMode('team')}>Team Matches</button>
          <button className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${viewMode === 'individual' ? 'bg-[#34d399] text-black shadow-md' : 'text-slate-500 hover:text-slate-300'}`} onClick={() => setViewMode('individual')}>Individual</button>
        </div>

        {viewMode === 'team' ? (
          <>
            <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-3xl p-5 border border-white/5 shadow-2xl relative overflow-hidden flex flex-col gap-5">
              
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 text-center">Race to {standings.pointsNeededToWin} Points</h3>
                
                <div className="flex justify-between items-center mt-3 px-1 text-[11px] font-black tracking-tight uppercase mb-2">
                  <span className="text-blue-400">CLAMS <span className="text-white ml-1">{standings.team1.score}</span></span>
                  <span className="text-slate-500 text-[9px] tracking-widest font-bold">Target Outright Win</span>
                  <span className="text-red-400"><span className="text-white mr-1">{standings.team2.score}</span> BROTHELMEN</span>
                </div>

                <div className="relative w-full h-4 bg-black/40 rounded-full border border-white/5 overflow-hidden flex">
                  <div style={{ width: `${t1Pct}%` }} className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                  <div className="flex-1"></div>
                  <div style={{ width: `${t2Pct}%` }} className="h-full bg-gradient-to-l from-red-600 to-red-400 transition-all duration-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
                </div>
              </div>

              <div className="w-full h-px bg-white/10"></div>

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 text-center">Live Cup Probability</h3>
                
                {probLoading ? (
                   <div className="w-full h-3 bg-slate-800/60 animate-pulse rounded-full" />
                ) : (
                   <>
                      <div className="flex justify-between items-center mb-2 px-1 text-[10px] font-black tracking-tight uppercase">
                        <span className="text-blue-400">CLAMS {probT1}%</span>
                        {probDraw > 0 && <span className="text-slate-500 tracking-widest text-[8px]">Draw {probDraw}%</span>}
                        <span className="text-red-400">BROTHELMEN {probT2}%</span>
                      </div>

                      <div className="relative w-full h-3 bg-black/40 rounded-full border border-white/5 overflow-hidden flex">
                        <div style={{ width: `${probT1}%` }} className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"></div>
                        <div style={{ width: `${probDraw}%` }} className="h-full bg-slate-600 transition-all duration-500"></div>
                        <div style={{ width: `${probT2}%` }} className="h-full bg-gradient-to-l from-red-600 to-red-400 transition-all duration-500"></div>
                      </div>
                   </>
                )}
              </div>

            </div>

            <section className="space-y-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Match Analytics Matrix</h2>
              <div className="flex flex-col gap-3">
                {sortedMatchHistory.length === 0 && (
                   <div className="text-center p-8 bg-white/5 border border-white/5 rounded-2xl text-xs text-slate-500 italic">
                     No matches currently assigned.
                   </div>
                )}
                {sortedMatchHistory.map((match) => {
                  const isCurrentlyLive = match.is_live === true || match.is_live === 'true';
                  
                  return (
                    <div key={match.id} className={`bg-white/5 border border-white/5 rounded-2xl p-4 shadow-md backdrop-blur-md flex flex-col gap-3 transition-opacity ${match.status === 'completed' ? 'opacity-60 grayscale-[50%]' : ''}`}>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">R{match.round} • {match.format}</span>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${match.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : isCurrentlyLive ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse' : 'bg-white/5 text-slate-500 border border-white/10'}`}>
                          {isCurrentlyLive ? 'Live' : (match.status === 'completed' ? 'Final' : 'Scheduled')}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex flex-col text-left w-[42%]"><span className="font-black text-slate-200 truncate">{match.team1_player1 || 'TBD'}</span>{match.team1_player2 && <span className="font-medium text-xs text-slate-500 truncate">{match.team1_player2}</span>}</div>
                        
                        <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-xl border border-white/5 font-black text-base tabular-nums shadow-inner">
                          <span className={Number(match.live_team1_score) > Number(match.live_team2_score) ? "text-blue-400" : "text-slate-400"}>{match.live_team1_score || '0'}</span>
                          <span className="text-xs text-slate-600 font-bold">-</span>
                          <span className={Number(match.live_team2_score) > Number(match.live_team1_score) ? "text-red-400" : "text-slate-400"}>{match.live_team2_score || '0'}</span>
                        </div>
                        
                        <div className="flex flex-col text-right w-[42%]"><span className="font-black text-slate-200 truncate">{match.team2_player1 || 'TBD'}</span>{match.team2_player2 && <span className="font-medium text-xs text-slate-500 truncate">{match.team2_player2}</span>}</div>
                      </div>
                      
                      {match.team1_player1 && match.team2_player1 && (
                        <MatchProbabilityBar matchId={match.id} status={match.status} team1Name={match.team1_player1} team2Name={match.team2_player1} staticMode={true} />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          <section className="space-y-3 animate-fade-in">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex justify-between items-center">
              <span>Individual Standings</span>
              <span className="bg-white/5 px-2 py-1 rounded text-slate-500">Sort: Lowest Net</span>
            </h2>

            <div className="flex flex-col gap-3">
              {individualStats.length === 0 ? (
                <div className="text-center p-8 bg-white/5 border border-white/5 rounded-2xl text-xs text-slate-500 italic">
                  No individual scores logged yet.
                </div>
              ) : (
                individualStats.map((golfer, index) => {
                  const isClams = golfer.team === 'Slanted Clams';
                  
                  return (
                    <div key={golfer.id} className={`bg-white/5 border ${index === 0 ? 'border-amber-400/30 bg-amber-500/5' : 'border-white/5'} rounded-2xl p-4 shadow-md backdrop-blur-md flex items-center justify-between transition-colors hover:bg-white/10`}>
                      <div className="flex items-center gap-4">
                        <div className={`text-xl font-black italic w-6 text-center ${index === 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                          {index + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-100 text-lg tracking-tight leading-none">{golfer.name}</span>
                          <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isClams ? 'text-blue-400' : 'text-red-400'}`}>
                            {golfer.team}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-4 text-right">
                        <div className="flex flex-col items-center justify-center w-10">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Gross</span>
                          <span className="text-sm font-black tabular-nums text-slate-300">{golfer.gross}</span>
                        </div>
                        <div className="w-px bg-white/10 my-1"></div>
                        <div className="flex flex-col items-center justify-center w-12">
                          <span className="text-[8px] font-black uppercase tracking-widest text-[#34d399] mb-1">Net</span>
                          <span className={`font-black tabular-nums leading-none drop-shadow-md ${golfer.completedRounds > 0 ? 'text-lg text-[#34d399]' : 'text-[10px] text-slate-500 mt-1'}`}>
                            {golfer.netDisplay}
                          </span>
                        </div>
                        <div className="w-px bg-white/10 my-1"></div>
                        <div className="flex flex-col items-center justify-center w-10">
                          <span className="text-[8px] font-black uppercase tracking-widest text-amber-400 mb-1">Won</span>
                          <span className="text-sm font-black tabular-nums text-amber-400">{golfer.holesWon}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}