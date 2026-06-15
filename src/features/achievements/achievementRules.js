import { supabase } from '../../config/supabaseClient';

export const CARD_RULES_ENGINE = {
  // 1. OCEANGATE: 2+ water balls on a single hole -> Strictly a 1/1
  checkOceanGate: async (scoreData, currentHole, playerId) => {
    if (scoreData.water >= 2) {
      return {
        cardType: 'oceangate',
        requiresCapture: true,
        templateId: 'tpl-oceangate-id', // Match your database card_templates primary key
        achievementId: 'ach-oceangate-id',
        primaryTier: '1/1',
        primarySerial: '#01/01',
        tiers: [{ tier: '1/1', serial: '#01/01' }]
      };
    }
    return null;
  },

  // 2. WHAMMY CARD: Double Bogey or worse on holes 9 AND 11 in the same round -> Strictly a 1/1
  checkWhammy: async (scoreData, currentHole, par, matchId, playerId) => {
    const isTargetHole = currentHole === 9 || currentHole === 11;
    const isDoubleOrWorse = scoreData.score - par >= 2;

    if (isTargetHole && isDoubleOrWorse) {
      const sisterHoleNum = currentHole === 9 ? 11 : 9;

      // Scan the database to see if this specific player already threw up a double+ on the corresponding sister hole
      const { data: sisterHoleScore } = await supabase
        .from('hole_scores')
        .select('gross_score, hole_id, holes(par)')
        .eq('matchup_id', matchId)
        .eq('profile_id', playerId)
        .eq('hole_number', sisterHoleNum)
        .maybeSingle();

      const sisterPar = sisterHoleScore?.holes?.par || 4;
      const sisterIsDoubleOrWorse = sisterHoleScore ? (sisterHoleScore.gross_score - sisterPar >= 2) : false;

      if (sisterIsDoubleOrWorse) {
        return {
          cardType: 'whammy',
          requiresCapture: true,
          templateId: 'tpl-whammy-id',
          achievementId: 'ach-whammy-id',
          primaryTier: '1/1',
          primarySerial: '#01/01',
          tiers: [{ tier: '1/1', serial: '#01/01' }]
        };
      }
    }
    return null;
  },

  // 3. BANQUET CARD: First birdie total gets 1/1, next 4 get /5, next 5 get /10
  checkBanquetBirdie: async (scoreData, par, playerId) => {
    const isBirdie = scoreData.score - par === -1;
    if (!isBirdie) return null;

    // Count how many total birdie cards have already been minted on this trip across the entire field
    const { count, error } = await supabase
      .from('player_cards')
      .select('id', { count: 'exact', head: true })
      .eq('template_id', 'tpl-banquet-birdie-id'); // Point to your specific template identifier

    const absoluteBirdieIndex = (count || 0) + 1; // Current birdie count sequence position

    if (absoluteBirdieIndex === 1) {
      return {
        cardType: 'banquet',
        requiresCapture: true,
        templateId: 'tpl-banquet-birdie-id',
        achievementId: 'ach-first-birdie-id',
        primaryTier: '1/1',
        primarySerial: '#01/01',
        tiers: [{ tier: '1/1', serial: '#01/01' }]
      };
    } else if (absoluteBirdieIndex >= 2 && absoluteBirdieIndex <= 5) {
      return {
        cardType: 'banquet',
        requiresCapture: true,
        templateId: 'tpl-banquet-birdie-id',
        achievementId: 'ach-subsequent-birdie-id',
        primaryTier: '/5',
        primarySerial: `#0${absoluteBirdieIndex - 1}/05`,
        tiers: [{ tier: '/5', serial: `#0${absoluteBirdieIndex - 1}/05` }]
      };
    } else if (absoluteBirdieIndex >= 6 && absoluteBirdieIndex <= 10) {
      return {
        cardType: 'banquet',
        requiresCapture: true,
        templateId: 'tpl-banquet-birdie-id',
        achievementId: 'ach-subsequent-birdie-id',
        primaryTier: '/10',
        primarySerial: `#0${absoluteBirdieIndex - 5}/10`,
        tiers: [{ tier: '/10', serial: `#0${absoluteBirdieIndex - 5}/10` }]
      };
    }
    return null; // Birdie ceiling maxed out after 10 entries
  }
};