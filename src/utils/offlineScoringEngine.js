// utils/offlineScoringEngine.js

const OFFLINE_QUEUE_KEY = 'fores_v_pending_scores';

/**
 * Saves a hole score locally to localStorage when network drops
 */
export const saveScoreOffline = (matchId, holeNumber, scorePayload) => {
  const currentQueue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
  
  // Prevent duplicate operations for the same hole by filtering old entries out
  const updatedQueue = currentQueue.filter(
    item => !(item.matchId === matchId && item.holeNumber === holeNumber)
  );

  updatedQueue.push({
    matchId,
    holeNumber,
    scorePayload,
    timestamp: Date.now()
  });

  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
  console.log(`📌 Score cached locally for Hole ${holeNumber} (Offline Mode)`);
};

/**
 * Attempts to push cached local storage updates up to Supabase once coverage is restored
 */
export const syncPendingScoresWithSupabase = async (supabaseInstance) => {
  const currentQueue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
  if (currentQueue.length === 0) return;

  console.log(`🔄 Connection restored. Syncing ${currentQueue.length} cached holes...`);
  
  const failedItems = [];

  for (const item of currentQueue) {
    try {
      // Upsert into your public database table
      const { error } = await supabaseInstance
        .from('hole_scores')
        .upsert({
          matchup_id: item.matchId,
          hole_number: item.holeNumber,
          ...item.scorePayload
        }, { onConflict: 'matchup_id,hole_number' });

      if (error) throw error;
    } catch (err) {
      console.error(`❌ Sync failed for Hole ${item.holeNumber}:`, err.message);
      failedItems.push(item); // Keep it in the queue to try again later
    }
  }

  // Update storage with only items that failed to avoid data loss
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failedItems));
  if (failedItems.length === 0) {
    console.log('✅ All offline scores successfully synchronized.');
  }
};