/**
 * PHASE 1 & 2: Baseline everyone to the lowest raw player, THEN apply format rules
 */
export function calculatePlayingHandicaps(format, team1Players, team2Players) {
  // 1. Get raw course handicaps
  const t1p1Raw = team1Players[0]?.courseHandicap || 0;
  const t1p2Raw = team1Players[1]?.courseHandicap || 0;
  const t2p1Raw = team2Players[0]?.courseHandicap || 0;
  const t2p2Raw = team2Players[1]?.courseHandicap || 0;

  // 2. Find the absolute lowest raw handicap across ALL players
  const allRaws = [t1p1Raw, t1p2Raw, t2p1Raw, t2p2Raw];
  const lowestRaw = Math.min(...allRaws);

  // 3. Baseline everyone down to scratch based on that lowest player
  const t1p1Base = t1p1Raw - lowestRaw;
  const t1p2Base = t1p2Raw - lowestRaw;
  const t2p1Base = t2p1Raw - lowestRaw;
  const t2p2Base = t2p2Raw - lowestRaw;

  const upperFormat = (format || '').toUpperCase();

  // 4. Calculate formats using the NEW BASELINED handicaps
  if (upperFormat === 'SCRAMBLE') {
    const t1Hcp = team1Players.length > 1 
      ? (0.35 * Math.min(t1p1Base, t1p2Base)) + (0.15 * Math.max(t1p1Base, t1p2Base)) 
      : t1p1Base;
    
    const t2Hcp = team2Players.length > 1 
      ? (0.35 * Math.min(t2p1Base, t2p2Base)) + (0.15 * Math.max(t2p1Base, t2p2Base)) 
      : t2p1Base;

    const roundedT1 = Math.round(t1Hcp);
    const roundedT2 = Math.round(t2Hcp);
    const lowestTeam = Math.min(roundedT1, roundedT2);

    return {
      team1Strokes: roundedT1 - lowestTeam,
      team2Strokes: roundedT2 - lowestTeam,
      type: 'team'
    };
  }

  // 1v1, Shamble, or Vegas
  const allowance = upperFormat === 'SHAMBLE' ? 0.60 : 1.0;
  const strokes = { team1: {}, team2: {}, type: 'individual' };
  
  if (team1Players[0]) strokes.team1['t1p1'] = Math.round(t1p1Base * allowance);
  if (team1Players[1]) strokes.team1['t1p2'] = Math.round(t1p2Base * allowance);
  if (team2Players[0]) strokes.team2['t2p1'] = Math.round(t2p1Base * allowance);
  if (team2Players[1]) strokes.team2['t2p2'] = Math.round(t2p2Base * allowance);

  return strokes;
}

/**
 * Determines if an allocated stroke lands on a specific hole difficulty index
 */
export function receivesStrokeOnHole(totalStrokesReceived, holeDifficultyIndex) {
  if (totalStrokesReceived <= 0) return false;
  let baseStrokes = Math.floor(totalStrokesReceived / 18);
  const remainder = totalStrokesReceived % 18;
  if (remainder >= holeDifficultyIndex) return true;
  return baseStrokes > 0;
}

/**
 * PHASE 3: Stroke allocation based on Hole Difficulty
 */
function getNetScore(grossScore, strokesReceived, holeDifficultyIndex) {
  if (grossScore == null) return null;
  let strokesOnThisHole = Math.floor(strokesReceived / 18);
  const remainder = strokesReceived % 18;
  if (remainder >= holeDifficultyIndex) strokesOnThisHole += 1;
  return grossScore - strokesOnThisHole;
}

/**
 * Vegas Concatenation Engine
 */
function getVegasScore(net1, net2) {
  if (net1 == null || net2 == null) return null;
  if (net1 >= 10 || net2 >= 10) {
    const higher = Math.max(net1, net2);
    const lower = Math.min(net1, net2);
    return parseInt(`${higher}${lower}`, 10);
  }
  const lower = Math.min(net1, net2);
  const higher = Math.max(net1, net2);
  return parseInt(`${lower}${higher}`, 10);
}

/**
 * Evaluates the entire match status using a standard Match Play tracking index
 */
export function evaluateMatchStatus(format, handicapData, allHolesData, holeScores) {
  // 🎯 FIX: Track match play as a single unified net differential integer relative to square (0)
  let matchDifferential = 0; 
  let holesPlayed = 0;

  const sortedHoles = [...allHolesData].sort((a, b) => a.hole_number - b.hole_number);
  const upperFormat = (format || '').toUpperCase();

  for (const hole of sortedHoles) {
    const holeData = holeScores.find(s => s.hole_id === hole.id || s.hole_number === hole.hole_number);
    if (!holeData) continue; 

    // 🎯 FIX: Check your exact JSON payload score attributes natively
    const s_a = holeData.score_slanted_a;
    const s_b = holeData.score_slanted_b;
    const b_a = holeData.score_brothelmen_a;
    const b_b = holeData.score_brothelmen_b;

    if (s_a == null && s_b == null && b_a == null && b_b == null) continue;

    let t1Net = Infinity;
    let t2Net = Infinity;

    if (handicapData.type === 'team') {
      const t1Gross = Math.min(...[s_a, s_b].filter(s => s != null));
      const t2Gross = Math.min(...[b_a, b_b].filter(s => s != null));
      if (t1Gross !== Infinity && t2Gross !== Infinity) {
        t1Net = getNetScore(t1Gross, handicapData.team1Strokes, hole.hcp_index);
        t2Net = getNetScore(t2Gross, handicapData.team2Strokes, hole.hcp_index);
        holesPlayed++;
      }
    } else if (upperFormat === 'VEGAS') {
      // 🎯 FIX: Guard against hole 18 null entries from your payload data array safely
      if (s_a == null || s_b == null || b_a == null || b_b == null) continue;

      const t1p1Net = getNetScore(s_a, handicapData.team1['t1p1'] || 0, hole.hcp_index);
      const t1p2Net = getNetScore(s_b, handicapData.team1['t1p2'] || 0, hole.hcp_index);
      const t2p1Net = getNetScore(b_a, handicapData.team2['t2p1'] || 0, hole.hcp_index);
      const t2p2Net = getNetScore(b_b, handicapData.team2['t2p2'] || 0, hole.hcp_index);

      const t1Vegas = getVegasScore(t1p1Net, t1p2Net);
      const t2Vegas = getVegasScore(t2p1Net, t2p2Net);

      if (t1Vegas !== null && t2Vegas !== null) {
        t1Net = t1Vegas;
        t2Net = t2Vegas;
        holesPlayed++;
      }
    } else {
      const t1Nets = [];
      if (s_a != null) t1Nets.push(getNetScore(s_a, handicapData.team1['t1p1'] || 0, hole.hcp_index));
      if (s_b != null) t1Nets.push(getNetScore(s_b, handicapData.team1['t1p2'] || 0, hole.hcp_index));

      const t2Nets = [];
      if (b_a != null) t2Nets.push(getNetScore(b_a, handicapData.team2['t2p1'] || 0, hole.hcp_index));
      if (b_b != null) t2Nets.push(getNetScore(b_b, handicapData.team2['t2p2'] || 0, hole.hcp_index));

      if (t1Nets.length > 0 && t2Nets.length > 0) {
        t1Net = Math.min(...t1Nets);
        t2Net = Math.min(...t2Nets);
        holesPlayed++;
      }
    }

    // 🎯 FIX: Adjust the single match differential tracker (+1 for Clam wins, -1 for Brothelmen wins)
    if (t1Net < t2Net) {
      matchDifferential++;
    } else if (t2Net < t1Net) {
      matchDifferential--;
    }
    
    // Check for an early mathematical lock to stop checking holes if a team clinches early
    const currentRemaining = 18 - holesPlayed;
    if (Math.abs(matchDifferential) > currentRemaining) {
      break;
    }
  }

  // Calculate Match Play Status from the single true lead tracker
  const holesRemaining = 18 - holesPlayed;
  let statusStr = "AS";
  let isFinal = false;

  if (matchDifferential > 0) {
    const up = matchDifferential;
    if (up > holesRemaining) {
      statusStr = `Slanted Clams Win ${up} & ${holesRemaining}`;
      isFinal = true;
    } else if (up === holesRemaining && holesRemaining > 0) {
      statusStr = `Clams Dormie ${up}`;
    } else {
      statusStr = `Slanted Clams ${up} UP`;
    }
  } else if (matchDifferential < 0) {
    const up = Math.abs(matchDifferential);
    if (up > holesRemaining) {
      // 🎯 FIX: Calculates proper structural margins (e.g. 5 & 4 instead of 5 & 0)
      statusStr = `Clam Brothelmen Win ${up} & ${holesRemaining}`;
      isFinal = true;
    } else if (up === holesRemaining && holesRemaining > 0) {
      statusStr = `Brothelmen Dormie ${up}`;
    } else {
      statusStr = `Clam Brothelmen ${up} UP`;
    }
  } else if (holesRemaining === 0) {
    statusStr = "Halved";
    isFinal = true;
  }

  // Re-map synthetic return parameters expected by your layout views
  return { 
    team1Wins: matchDifferential > 0 ? matchDifferential : 0, 
    team2Wins: matchDifferential < 0 ? Math.abs(matchDifferential) : 0, 
    statusStr, 
    isFinal,
    holesPlayed 
  };
}