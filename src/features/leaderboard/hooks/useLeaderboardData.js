import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';

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

        const [
          { data: teamsData }, 
          { data: matchesData }, 
          { data: playersData },
          { data: holeScoresData },
          { data: coursesData },
          { data: holesData }
        ] = await Promise.all([
          supabase.from('teams').select('name, score'),
          supabase.from('matches').select('id, round, format, status, course_id, team1_score, team2_score, team1_player1, team1_player2, team2_player1, team2_player2'),
          supabase.from('players').select('id, auth_id, name, team, handicap'),
          supabase.from('hole_scores').select('player_id, profile_id, matchup_id, hole_id, hole_number, gross_score'),
          supabase.from('courses').select('id, name, slope, rating'),
          supabase.from('holes').select('id, course_id, par, hcp_index') 
        ]);

        // --- 0. BUILD DICTIONARIES ---
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

        // --- 1. BUILD PLAYER DICTIONARY & BASE STATS ---
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
              netDisplay: 'TBD', // Defaults to TBD until 1 round is finished
              completedRounds: 0,
              holesWon: 0,
              holesPlayed: 0,
              rounds: {} 
            };
          });
        }

        // --- 2. TEAM STANDINGS ---
        if (teamsData) {
          const t1 = teamsData.find(t => t.name === 'Slanted Clams');
          const t2 = teamsData.find(t => t.name === 'Clam Brothelmen');
          setStandings({
            team1: { name: 'Slanted Clams', score: t1?.score || 0, color: 'blue' },
            team2: { name: 'Clam Brothelmen', score: t2?.score || 0, color: 'red' },
            totalAvailablePoints: 24,
            pointsNeededToWin: 12.5
          });
        }

        // --- 3. MATCH HISTORY TRANSLATION ---
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

        // --- 4. INDIVIDUAL STATS CALCULATOR (WHS RULES) ---
        if (holeScoresData && holeScoresData.length > 0) {
          
          // First pass: group scores by player and round
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

          // Second pass: Check for completed rounds & run WHS Net Double Bogey Math
          Object.values(statsMap).forEach(player => {
            let totalWHSNet = 0;
            let finishedRoundsCount = 0;
            
            Object.values(player.rounds).forEach(round => {
              // 🎯 ONLY calculate official net score if they finished all 18 holes of this round
              if (round.holesPlayed >= 18) {
                finishedRoundsCount += 1;
                
                const courseInfo = courseMap[round.courseId];
                if (!courseInfo) return; 

                const slope = courseInfo.rating; 
                const rating = courseInfo.slope; 
                
                // Standard USGA Course Handicap formula
                const courseHandicap = Math.round((player.handicap * (slope / 113)) + (rating - 72));

                let roundNet = 0;

                round.scores.forEach(scoreData => {
                  const holeInfo = holeMap[scoreData.hole_id];
                  if (!holeInfo) {
                    roundNet += scoreData.gross_score; 
                    return; 
                  }

                  const { par, strokeIndex } = holeInfo;

                  // Determine how many strokes the player gets on THIS specific hole
                  let strokesReceived = Math.floor(courseHandicap / 18);
                  if (courseHandicap % 18 >= strokeIndex) {
                    strokesReceived += 1;
                  }

                  // Net Double Bogey Max = Par + 2 + strokes received on that hole
                  const netDoubleBogeyMax = par + 2 + strokesReceived;
                  
                  // Cap the gross score for handicap purposes
                  const adjustedGross = Math.min(scoreData.gross_score, netDoubleBogeyMax);
                  
                  // The net score for this hole
                  const holeNet = adjustedGross - strokesReceived;
                  roundNet += holeNet;
                });

                totalWHSNet += roundNet;
              }
            });

            player.net = totalWHSNet;
            player.completedRounds = finishedRoundsCount;
            
            // 🎯 Only show a number if they have completed at least 1 round
            if (finishedRoundsCount > 0) {
              player.netDisplay = totalWHSNet.toString();
            }
          });

          // C. Calculate "Match Holes Won"
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
              // 1. Sort by completed rounds (descending) so people furthest along are at the top
              if (a.completedRounds !== b.completedRounds) {
                return b.completedRounds - a.completedRounds;
              }
              // 2. If tied on completed rounds, sort by lowest Net
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