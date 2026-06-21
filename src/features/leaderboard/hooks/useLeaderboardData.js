import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { calculatePlayingHandicaps, evaluateMatchStatus } from '../../utils/matchPlayEngine';

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
    async function loadLeaderboardMetrics() {
      try {
        setLoading(true);

        // 🎯 FIX: Changed 'score' to 'points' to match your actual database schema and prevent 400 crashes
        const [
          { data: teamsData },
          { data: matchesData }, 
          { data: playersData },
          { data: holeScoresData },
          { data: coursesData },
          { data: holesData }
        ] = await Promise.all([
          supabase.from('teams').select('name, points'),
          supabase.from('matches').select('id, round, format, status, course_id, team1_score, team2_score, team1_player1, team1_player2, team2_player1, team2_player2'),
          supabase.from('players').select('id, auth_id, name, team, handicap'),
          supabase.from('hole_scores').select('*'),
          supabase.from('courses').select('id, name, slope, rating'),
          supabase.from('holes').select('id, course_id, par, hcp_index') 
        ]);

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
        if (matchesData) {
          matchesData.forEach(match => {
            matchCourseMap[match.id] = match.course_id;
          });
        }

        const playerMap = {};
        const statsMap = {};
        if (playersData) {
          playersData.forEach(p => {
            if (p.id) playerMap[p.id] = p.name;
            if (p.auth_id) playerMap[p.auth_id] = p.name;
            
            statsMap[p.id] = {
              id: p.id,
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

        const matchScoresLookup = {};
        if (holeScoresData) {
          holeScoresData.forEach(s => {
            if (!matchScoresLookup[s.matchup_id]) matchScoresLookup[s.matchup_id] = [];
            matchScoresLookup[s.matchup_id].push(s);
          });
        }

        // Tally dynamic points from our standardized engine matrix over final rows
        let dynamicT1Score = 0;
        let dynamicT2Score = 0;

        if (matchesData && holesData) {
          matchesData.forEach(m => {
            const scores = matchScoresLookup[m.id] || [];
            const isFinished = m.status === 'completed' || scores.length >= 18;

            if (isFinished && scores.length > 0) {
              const format = m.format || '1v1';
              const matchHoles = holesData.filter(h => h.course_id === (m.course_id || 1));
              
              const findP = (id) => playersData?.find(p => String(p.id) === String(id) || String(p.auth_id) === String(id));
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
              if (res.team1Wins > res.team2Wins) dynamicT1Score += 1;
              else if (res.team2Wins > res.team1Wins) dynamicT2Score += 1;
              else {
                dynamicT1Score += 0.5;
                dynamicT2Score += 0.5;
              }
            }
          });
        }

        // Parse database values to combine overrides seamlessly
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
          const mappedMatches = matchesData.map(match => ({
            ...match,
            team1_player1: playerMap[match.team1_player1] || match.team1_player1,
            team1_player2: playerMap[match.team1_player2] || match.team1_player2,
            team2_player1: playerMap[match.team2_player1] || match.team2_player1,
            team2_player2: playerMap[match.team2_player2] || match.team2_player2,
          }));
          setMatchHistory(mappedMatches);
        }

        if (holeScoresData && holeScoresData.length > 0) {
          holeScoresData.forEach(score => {
            const pid = score.player_id || score.profile_id;
            const mid = score.matchup_id;

            if (statsMap[pid] && score.gross_score) {
              if (!statsMap[pid].rounds[mid]) {
                statsMap[pid].rounds[mid] = { courseId: matchCourseMap[mid], holesPlayed: 0, scores: [] };
              }
              statsMap[pid].rounds[mid].scores.push(score);
              statsMap[pid].rounds[mid].holesPlayed += 1;
              statsMap[pid].gross += score.gross_score;
              statsMap[pid].holesPlayed += 1;
            }
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
          holeScoresData.forEach(score => {
             const mid = score.matchup_id;
             const hn = score.hole_number;
             if (!mid || !hn) return;
             if (!matchupHoles[mid]) matchupHoles[mid] = {};
             if (!matchupHoles[mid][hn]) matchupHoles[mid][hn] = [];
             matchupHoles[mid][hn].push(score);
          });

          Object.values(matchupHoles).forEach(matchup => {
             Object.values(matchup).forEach(holeScores => {
                if (holeScores.length > 1) {
                   const minScore = Math.min(...holeScores.map(s => s.gross_score));
                   const winners = holeScores.filter(s => s.gross_score === minScore);
                   winners.forEach(w => {
                      const pid = w.player_id || w.profile_id;
                      if (statsMap[pid]) statsMap[pid].holesWon += 1;
                   });
                }
             });
          });

          const finalIndividualStats = Object.values(statsMap)
            .filter(p => p.holesPlayed > 0)
            .sort((a, b) => {
              if (a.completedRounds !== b.completedRounds) return b.completedRounds - a.completedRounds;
              return a.net - b.net;
            });
          setIndividualStats(finalIndividualStats);
        }
      } catch (err) {
        console.error('Error compiling tournament leaderboard:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboardMetrics();
  }, []);

  return { standings, matchHistory, individualStats, loading };
}