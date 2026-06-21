// src/utils/matchPlayEngine.js

export const calculatePlayingHandicaps = (formatName, team1, team2) => {
  const format = String(formatName).trim().toLowerCase();
  const allPlayers = [...team1, ...team2];

  // -----------------------------------------------------
  // 1. TEAM FORMATS (Scramble & Greensomes)
  // -----------------------------------------------------
  if (format === 'scramble' || format === 'greensomes') {
    const calcTeamHcp = (team, pctLow, pctHigh) => {
      if (!team || team.length === 0) return 0;
      if (team.length === 1) return team[0].courseHandicap; // Fallback if playing solo
      
      // Sort handicaps lowest to highest
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

    // Normalize to 0 (Lowest team handicap goes to 0)
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
    else if (format === 'shamble') pct = 0.75; // Left in just in case you use it!

    // Calculate percent-cut individual handicaps
    const rawHcps = allPlayers.map(p => ({
      id: p.id,
      hcp: Math.round(p.courseHandicap * pct)
    }));

    // Normalize to 0 (Lowest individual in the group goes to 0)
    const minHcp = rawHcps.length > 0 ? Math.min(...rawHcps.map(p => p.hcp)) : 0;

    const team1Data = {};
    const team2Data = {};

    rawHcps.forEach(p => {
      const finalStrokes = p.hcp - minHcp;
      if (p.id.startsWith('t1')) team1Data[p.id] = finalStrokes;
      if (p.id.startsWith('t2')) team2Data[p.id] = finalStrokes;
    });

    return {
      type: 'individual',
      team1: team1Data,
      team2: team2Data
    };
  }
};

export const evaluateMatchStatus = (formatName, handicapData, matchHoles, netScoresPayload) => {
  const format = String(formatName).trim().toLowerCase();
  let team1Wins = 0;
  let team2Wins = 0;
  let holesPlayed = 0;

  // Sort sequentially to process the match properly
  const sortedScores = [...netScoresPayload].sort((a, b) => a.hole_number - b.hole_number);

  sortedScores.forEach(score => {
    const t1p1 = score.t1p1;
    const t1p2 = score.t1p2;
    const t2p1 = score.t2p1;
    const t2p2 = score.t2p2;

    let t1Net = Infinity;
    let t2Net = Infinity;

    // 1. Single Score Formats (Team plays 1 ball, or 1v1)
    if (format === 'scramble' || format === 'greensomes' || format === '1v1') {
      if (t1p1 !== null) t1Net = t1p1;
      if (t2p1 !== null) t2Net = t2p1;
    } 
    
    // 2. Vegas Concatenation
    else if (format === 'vegas') {
      const getVegas = (n1, n2) => {
        if (n1 == null || n2 == null) return Infinity; // Require both scores
        const min = Math.min(n1, n2);
        const max = Math.max(n1, n2);
        // If a player shoots 10+, flip the order so the penalty hurts more
        if (max >= 10) return parseInt(`${max}${min}`, 10);
        return parseInt(`${min}${max}`, 10);
      };
      t1Net = getVegas(t1p1, t1p2);
      t2Net = getVegas(t2p1, t2p2);
    } 
    
    // 3. Best Ball (Lowest net of the two partners)
    else {
      const validT1 = [t1p1, t1p2].filter(n => n !== null);
      const validT2 = [t2p1, t2p2].filter(n => n !== null);
      if (validT1.length > 0) t1Net = Math.min(...validT1);
      if (validT2.length > 0) t2Net = Math.min(...validT2);
    }

    // Determine Hole Winner
    if (t1Net !== Infinity && t2Net !== Infinity) {
      holesPlayed++;
      if (t1Net < t2Net) team1Wins++;
      else if (t2Net < t1Net) team2Wins++;
    }
  });

  // Calculate Match Play Status String (e.g. "2 & 1")
  let statusStr = 'AS';
  const diff = Math.abs(team1Wins - team2Wins);
  const holesRemaining = 18 - holesPlayed;

  if (diff === 0) {
    statusStr = holesPlayed === 18 ? 'TIE' : 'AS';
  } else {
    const leader = team1Wins > team2Wins ? 'Clams' : 'Brothelmen';
    if (diff > holesRemaining) {
      // Math clinch (e.g. 3 & 2)
      statusStr = `${leader} Won ${diff} & ${holesRemaining}`;
    } else {
      // Standard lead (e.g. 2 UP)
      statusStr = `${leader} ${diff} UP`;
    }
  }

  return {
    team1Wins,
    team2Wins,
    holesPlayed,
    statusStr,
    isClosedOut: diff > holesRemaining
  };
};