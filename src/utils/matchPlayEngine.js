// src/utils/matchPlayEngine.js

export const calculatePlayingHandicaps = (formatName, team1, team2) => {
  const format = String(formatName).trim().toLowerCase();

  // -----------------------------------------------------
  // 1. TEAM FORMATS (Scramble & Greensomes)
  // -----------------------------------------------------
  if (format === 'scramble' || format === 'greensomes') {
    const calcTeamHcp = (team, pctLow, pctHigh) => {
      if (!team || team.length === 0) return 0;
      if (team.length === 1) return team[0].courseHandicap; 
      
      const hcps = team.map(p => p.courseHandicap).sort((a, b) => a - b);
      return (hcps[0] * pctLow) + (hcps[1] * pctHigh);
    };

    let t1Hcp = 0;
    let t2Hcp = 0;

    if (format === 'scramble') {
      t1Hcp = calcTeamHcp(team1, 0.35, 0.15);
      t2Hcp = calcTeamHcp(team2, 0.35, 0.15);
    } else if (format === 'greensomes') {
      t1Hcp = calcTeamHcp(team1, 0.60, 0.40);
      t2Hcp = calcTeamHcp(team2, 0.60, 0.40);
    }

    const roundedT1 = Math.round(t1Hcp);
    const roundedT2 = Math.round(t2Hcp);
    const minTeamHcp = Math.min(roundedT1, roundedT2);

    return {
      type: 'team',
      team1Strokes: roundedT1 - minTeamHcp,
      team2Strokes: roundedT2 - minTeamHcp
    };
  } 
  
  // -----------------------------------------------------
  // 2. INDIVIDUAL FORMATS (Best Ball, Vegas, 1v1)
  // -----------------------------------------------------
  else {
    let pct = 1.0;
    if (format === 'best ball') pct = 0.90;
    else if (format === 'vegas' || format === '1v1') pct = 1.0;
    else if (format === 'shamble') pct = 0.75;

    // Build lists with team associations preserved explicitly before losing the reference
    const t1Processed = team1.map(p => ({ id: p.id, hcp: Math.round(p.courseHandicap * pct) }));
    const t2Processed = team2.map(p => ({ id: p.id, hcp: Math.round(p.courseHandicap * pct) }));
    
    const allProcessed = [...t1Processed, ...t2Processed];
    const minHcp = allProcessed.length > 0 ? Math.min(...allProcessed.map(p => p.hcp)) : 0;

    const team1Data = {};
    const team2Data = {};

    // 🎯 FIX: Explicitly assign based on array allocation instead of arbitrary string testing
    t1Processed.forEach(p => { team1Data[p.id] = p.hcp - minHcp; });
    t2Processed.forEach(p => { team2Data[p.id] = p.hcp - minHcp; });

    return {
      type: 'individual',
      team1: team1Data,
      team2: team2Data
    };
  }
};

export const evaluateMatchStatus = (format, handicapData, courseHoles, netScoresPayload) => {
  let team1Wins = 0;
  let team2Wins = 0;
  let holesPlayed = 0;
  let statusStr = 'AS';
  let isClosedOut = false;

  const formatClean = String(format).trim().toLowerCase();
  const isVegas = formatClean === 'vegas';
  const isTeamFormat = formatClean === 'scramble' || formatClean === 'greensomes';

  // 1. Sort scores sequentially by hole number so we can track the match chronologically
  const sortedScores = [...netScoresPayload].sort((a, b) => a.hole_number - b.hole_number);

  for (const row of sortedScores) {
    // 2. If the match is mathematically over, stop counting towards the official match score!
    // (Players can still log holes 16, 17, 18 for fun, but the result is frozen at e.g., 4 & 3)
    if (isClosedOut) continue;

    let t1Net = Infinity;
    let t2Net = Infinity;

    // Resolve the scores based on format
    if (isTeamFormat) {
      if (row.t1p1 !== null) t1Net = row.t1p1;
      if (row.t2p1 !== null) t2Net = row.t2p1;
      // Some team formats might pass the score into p2, grab the minimum valid score
      if (row.t1p2 !== null) t1Net = Math.min(t1Net, row.t1p2);
      if (row.t2p2 !== null) t2Net = Math.min(t2Net, row.t2p2);
    } else if (isVegas) {
      if (row.t1p1 !== null && row.t1p2 !== null) {
        const n1 = Math.max(1, row.t1p1);
        const n2 = Math.max(1, row.t1p2);
        t1Net = Math.min(n1, n2) >= 10 ? parseInt(`${Math.max(n1, n2)}${Math.min(n1, n2)}`, 10) : parseInt(`${Math.min(n1, n2)}${Math.max(n1, n2)}`, 10);
      }
      if (row.t2p1 !== null && row.t2p2 !== null) {
        const n1 = Math.max(1, row.t2p1);
        const n2 = Math.max(1, row.t2p2);
        t2Net = Math.min(n1, n2) >= 10 ? parseInt(`${Math.max(n1, n2)}${Math.min(n1, n2)}`, 10) : parseInt(`${Math.min(n1, n2)}${Math.max(n1, n2)}`, 10);
      }
    } else {
      // Best ball / 1v1
      const t1Nets = [row.t1p1, row.t1p2].filter(n => n !== null);
      const t2Nets = [row.t2p1, row.t2p2].filter(n => n !== null);
      if (t1Nets.length > 0) t1Net = Math.min(...t1Nets);
      if (t2Nets.length > 0) t2Net = Math.min(...t2Nets);
    }

    // 3. Only evaluate if both teams have a valid score for this hole
    if (t1Net !== Infinity && t2Net !== Infinity) {
      holesPlayed++;
      
      if (t1Net < t2Net) team1Wins++;
      else if (t2Net < t1Net) team2Wins++;

      // 4. CHECK FOR CLINCH
      const diff = Math.abs(team1Wins - team2Wins);
      const holesRemaining = 18 - holesPlayed;

      if (diff > holesRemaining) {
        // MATCH IS OVER EARLY (e.g., 4 & 3)
        isClosedOut = true;
        const leader = team1Wins > team2Wins ? 'Clams' : 'Brothelmen';
        statusStr = `${leader} ${diff} & ${holesRemaining}`;
      } else if (holesPlayed === 18) {
        // MATCH WENT THE DISTANCE (e.g., 2 UP or AS)
        isClosedOut = true;
        if (diff === 0) {
          statusStr = 'AS';
        } else {
          const leader = team1Wins > team2Wins ? 'Clams' : 'Brothelmen';
          statusStr = `${leader} ${diff} UP`;
        }
      }
    }
  }

  // 5. If they are currently on the course and the match is live (Not Closed Out)
  if (!isClosedOut) {
    const diff = Math.abs(team1Wins - team2Wins);
    if (diff === 0) {
      statusStr = 'AS';
    } else {
      const leader = team1Wins > team2Wins ? 'Clams' : 'Brothelmen';
      statusStr = `${leader} ${diff} UP`;
    }
  }

  return {
    team1Wins,
    team2Wins,
    holesPlayed,
    isClosedOut,
    statusStr
  };
};