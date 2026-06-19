/**
 * PHASE 1 & 2: Calculate the adjusted strokes everyone gets off the lowest player/team
 */
export function calculatePlayingHandicaps(format, team1Players, team2Players) {
  const t1p1 = team1Players[0]?.courseHandicap || 0;
  const t1p2 = team1Players[1]?.courseHandicap || 0;
  const t2p1 = team2Players[0]?.courseHandicap || 0;
  const t2p2 = team2Players[1]?.courseHandicap || 0;

  const upperFormat = (format || '').toUpperCase();

  if (upperFormat === 'SCRAMBLE') {
    const t1Hcp = team1Players.length > 1 
      ? (0.35 * Math.min(t1p1, t1p2)) + (0.15 * Math.max(t1p1, t1p2)) 
      : t1p1;
    
    const t2Hcp = team2Players.length > 1 
      ? (0.35 * Math.min(t2p1, t2p2)) + (0.15 * Math.max(t2p1, t2p2)) 
      : t2p1;

    const roundedT1 = Math.round(t1Hcp);
    const roundedT2 = Math.round(t2Hcp);

    const lowest = Math.min(roundedT1, roundedT2);
    
    return {
      team1Strokes: roundedT1 - lowest,
      team2Strokes: roundedT2 - lowest,
      type: 'team'
    };
  }

  // 1v1, Shamble, or Vegas
  // Shamble gets 60%. Vegas and 1v1 get 100% (1.0).
  const allowance = upperFormat === 'SHAMBLE' ? 0.60 : 1.0;

  const rawHcps = [
    { id: 't1p1', hcp: Math.round(t1p1 * allowance) },
    { id: 't1p2', hcp: Math.round(t1p2 * allowance) },
    { id: 't2p1', hcp: Math.round(t2p1 * allowance) },
    { id: 't2p2', hcp: Math.round(t2p2 * allowance) }
  ].filter(p => p.hcp !== null && p.hcp !== undefined && !isNaN(p.hcp));

  const lowest = rawHcps.length > 0 ? Math.min(...rawHcps.map(p => p.hcp)) : 0;

  const strokes = { team1: {}, team2: {}, type: 'individual' };
  
  rawHcps.forEach(p => {
    if (p.id.startsWith('t1')) strokes.team1[p.id] = p.hcp - lowest;
    if (p.id.startsWith('t2')) strokes.team2[p.id] = p.hcp - lowest;
  });

  return strokes;
}

/**
 * PHASE 3: Stroke allocation based on Hole Difficulty
 */
function getNetScore(grossScore, strokesReceived, holeDifficultyIndex) {
  if (!grossScore) return null; // Return null instead of 99 so we know it's unplayed

  let strokesOnThisHole = Math.floor(strokesReceived / 18);
  const remainder = strokesReceived % 18;
  
  if (remainder >= holeDifficultyIndex) {
    strokesOnThisHole += 1;
  }

  return grossScore - strokesOnThisHole;
}

/**
 * NEW: Vegas Concatenation Engine
 */
function getVegasScore(net1, net2) {
  // Vegas requires BOTH players to finish the hole to generate a team score
  if (net1 == null || net2 == null) return null;

  // Blow-up rule: If anyone shoots 10 or worse, the high score goes first!
  if (net1 >= 10 || net2 >= 10) {
    const higher = Math.max(net1, net2);
    const lower = Math.min(net1, net2);
    return parseInt(`${higher}${lower}`, 10);
  }

  // Standard rule: Low score goes first
  const lower = Math.min(net1, net2);
  const higher = Math.max(net1, net2);
  return parseInt(`${lower}${higher}`, 10);
}

/**
 * Evaluates the entire match status based on the single-row schema
 */
export function evaluateMatchStatus(format, handicapData, allHolesData, holeScores) {
  let team1Wins = 0;
  let team2Wins = 0;
  let holesPlayed = 0;

  const sortedHoles = [...allHolesData].sort((a, b) => a.hole_number - b.hole_number);
  const upperFormat = (format || '').toUpperCase();

  for (const hole of sortedHoles) {
    const holeData = holeScores.find(s => s.hole_id === hole.id);
    if (!holeData) continue; 

    const s_a = holeData.score_slanted_a;
    const s_b = holeData.score_slanted_b;
    const b_a = holeData.score_brothelmen_a;
    const b_b = holeData.score_brothelmen_b;

    if (s_a == null && s_b == null && b_a == null && b_b == null) continue;

    let t1Net = Infinity;
    let t2Net = Infinity;

    if (handicapData.type === 'team') {
      // SCRAMBLE
      const t1Gross = Math.min(...[s_a, s_b].filter(s => s != null));
      const t2Gross = Math.min(...[b_a, b_b].filter(s => s != null));

      if (t1Gross !== Infinity && t2Gross !== Infinity) {
        t1Net = getNetScore(t1Gross, handicapData.team1Strokes, hole.hcp_index);
        t2Net = getNetScore(t2Gross, handicapData.team2Strokes, hole.hcp_index);
        holesPlayed++;
      }
    } else if (upperFormat === 'VEGAS') {
      // VEGAS: Must have both scores to concatenate
      const t1p1Net = getNetScore(s_a, handicapData.team1['t1p1'], hole.hcp_index);
      const t1p2Net = getNetScore(s_b, handicapData.team1['t1p2'], hole.hcp_index);
      const t2p1Net = getNetScore(b_a, handicapData.team2['t2p1'], hole.hcp_index);
      const t2p2Net = getNetScore(b_b, handicapData.team2['t2p2'], hole.hcp_index);

      const t1Vegas = getVegasScore(t1p1Net, t1p2Net);
      const t2Vegas = getVegasScore(t2p1Net, t2p2Net);

      // Only evaluate if BOTH teams have their full Vegas score calculated
      if (t1Vegas !== null && t2Vegas !== null) {
        t1Net = t1Vegas;
        t2Net = t2Vegas;
        holesPlayed++;
      }
    } else {
      // 1V1 / SHAMBLE: Best Ball
      const t1Nets = [];
      if (s_a != null) t1Nets.push(getNetScore(s_a, handicapData.team1['t1p1'], hole.hcp_index));
      if (s_b != null) t1Nets.push(getNetScore(s_b, handicapData.team1['t1p2'], hole.hcp_index));

      const t2Nets = [];
      if (b_a != null) t2Nets.push(getNetScore(b_a, handicapData.team2['t2p1'], hole.hcp_index));
      if (b_b != null) t2Nets.push(getNetScore(b_b, handicapData.team2['t2p2'], hole.hcp_index));

      if (t1Nets.length > 0 && t2Nets.length > 0) {
        t1Net = Math.min(...t1Nets);
        t2Net = Math.min(...t2Nets);
        holesPlayed++;
      }
    }

    // Determine Hole Winner
    if (t1Net < t2Net) team1Wins++;
    else if (t2Net < t1Net) team2Wins++;
  }

  // Calculate Match Play Status
  const holesRemaining = 18 - holesPlayed;
  let statusStr = "AS";
  let isFinal = false;

  if (team1Wins > team2Wins) {
    const up = team1Wins - team2Wins;
    if (up > holesRemaining) {
      statusStr = `Clams Win ${up} & ${holesRemaining}`;
      isFinal = true;
    } else if (up === holesRemaining && holesRemaining > 0) {
      statusStr = `Clams Dormie ${up}`;
    } else {
      statusStr = `Clams ${up} UP`;
    }
  } else if (team2Wins > team1Wins) {
    const up = team2Wins - team1Wins;
    if (up > holesRemaining) {
      statusStr = `Brothelmen Win ${up} & ${holesRemaining}`;
      isFinal = true;
    } else if (up === holesRemaining && holesRemaining > 0) {
      statusStr = `Brothelmen Dormie ${up}`;
    } else {
      statusStr = `Brothelmen ${up} UP`;
    }
  } else if (holesRemaining === 0) {
    statusStr = "Halved";
    isFinal = true;
  }

  return { team1Wins, team2Wins, statusStr, isFinal };
}