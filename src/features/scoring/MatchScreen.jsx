import React, { useState, useEffect } from 'react';
import PremiumMapMatrix from '../course/PremiumMapMatrix';
import ScoreEntrySheet from './ScoreEntrySheet';
import CardMintingProtocol from '../achievements/CardMintingProtocol';
import { CARD_RULES_ENGINE } from '../achievements/achievementRules';
import { supabase } from '../../config/supabaseClient';
import { useUser } from '../../context/UserContext';
import { calculatePlayingHandicaps, evaluateMatchStatus } from '../../utils/matchPlayEngine';

export default function MatchScreen({ matchId, onBack }) {
  const ENABLE_CARD_MINTING = false;

  const { player } = useUser();
  const [currentHole, setCurrentHole] = useState(1);
  const [isInitializing, setIsInitializing] = useState(true);
  const [par, setPar] = useState(4);
  const [activeHoleData, setActiveHoleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScoreSheetOpen, setIsScoreSheetOpen] = useState(false);
  
  const [mintPayload, setMintPayload] = useState(null);
  const [isMintingActive, setIsMintingActive] = useState(false);
  const [currentScoreData, setCurrentScoreData] = useState(null);

  const [matchInsights, setMatchInsights] = useState({});
  const [playerSlot, setPlayerSlot] = useState(null); 

  // --- NEW: INDIVIDUAL LOCK STATE ---
  const [isMyRoundComplete, setIsMyRoundComplete] = useState(false);

  // 1. FETCH MATCH INSIGHTS & DETERMINE PLAYER SLOT
  useEffect(() => {
    if (!matchId || !player?.id) return;

    async function fetchLiveInsights() {
      try {
        const { data, error } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single();

        if (!error && data) {
          let slot = null;
          if (player.id === data.team1_player1) slot = 'slanted_a';
          else if (player.id === data.team1_player2) slot = 'slanted_b';
          else if (player.id === data.team2_player1) slot = 'brothelmen_a';
          else if (player.id === data.team2_player2) slot = 'brothelmen_b';
          
          setPlayerSlot(slot);

          setMatchInsights({
            matchupId: matchId,
            status: `${data.team1_score || 0} vs ${data.team2_score || 0}`,
            wagerStatus: (data.format || 'LIVE').toUpperCase(),
            team1Handicap: data.team1_playing_handicap,
            team2Handicap: data.team2_playing_handicap,
            team1Name: data.team1_player1,
            team2Name: data.team2_player1,
            t1p1: data.team1_player1,
            t1p2: data.team1_player2,
            t2p1: data.team2_player1,
            t2p2: data.team2_player2,
          });
        }
      } catch (err) {
        console.warn('Insights update failed:', err.message);
      }
    }
    fetchLiveInsights();
  }, [matchId, player?.id]);

  // 2. SMART RESUME & INDIVIDUAL LOCK DETECTION
  useEffect(() => {
    if (!matchId || !playerSlot) return;

    async function determineStartingHole() {
      try {
        const { data, error } = await supabase
          .from('hole_scores')
          .select(`hole_number, score_${playerSlot}`)
          .eq('matchup_id', matchId);

        if (!error && data) {
          const scoredHoles = data.filter(d => d[`score_${playerSlot}`] !== null).map(d => d.hole_number);
          
          // Check if this specific player has logged all 18 holes
          if (scoredHoles.length >= 18) {
            setIsMyRoundComplete(true);
            setCurrentHole(18); // Default their view to the 18th hole
          } else {
            let firstUnscored = 1;
            while (scoredHoles.includes(firstUnscored) && firstUnscored < 18) {
              firstUnscored++;
            }
            setCurrentHole(firstUnscored);
          }
        }
      } catch (err) {
        console.warn('Smart resume failed:', err.message);
      } finally {
        setIsInitializing(false);
      }
    }
    determineStartingHole();
  }, [matchId, playerSlot]);

  // 3. FETCH ACTIVE HOLE GPS
  useEffect(() => {
    if (isInitializing) return;

    async function fetchHole() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('holes')
          .select('*')
          .eq('course_id', 1) 
          .eq('hole_number', currentHole)
          .maybeSingle(); 

        if (!error && data) {
          const convertPostGISToLeaflet = (geoObject) => {
            if (geoObject?.coordinates && Array.isArray(geoObject.coordinates)) {
              return [geoObject.coordinates[1], geoObject.coordinates[0]]; 
            }
            return [47.5142, -92.2372]; 
          };

          setActiveHoleData({
            ...data,
            leafletCenter: convertPostGISToLeaflet(data.green_center_geo),
            leafletFront: convertPostGISToLeaflet(data.green_front_geo),
            leafletBack: convertPostGISToLeaflet(data.green_back_geo)
          });
          setPar(data.par || 4);
        }
      } catch (err) {
        console.error('GPS Data fetch failure:', err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHole();
  }, [currentHole, isInitializing]);

  // 4. FETCH EXISTING SCORE
  useEffect(() => {
    if (!activeHoleData?.id || !matchId || !playerSlot) {
      setCurrentScoreData(null);
      return;
    }

    async function fetchExistingScore() {
      try {
        const { data, error } = await supabase
          .from('hole_scores')
          .select('*')
          .eq('matchup_id', matchId)
          .eq('hole_id', activeHoleData.id)
          .maybeSingle(); 

        if (!error && data && data[`score_${playerSlot}`] !== null) {
          setCurrentScoreData({
            gross_score: data[`score_${playerSlot}`],
            putts: data[`putts_${playerSlot}`],
            accuracy: data[`accuracy_${playerSlot}`],
            penalty_strokes: data[`penalty_strokes_${playerSlot}`],
            water_balls: data[`water_balls_${playerSlot}`],
            drinks: data[`drinks_${playerSlot}`]
          });
        } else {
          setCurrentScoreData(null); 
        }
      } catch (err) {
        console.warn('Could not fetch existing score:', err.message);
      }
    }
    fetchExistingScore();
  }, [activeHoleData, matchId, playerSlot]);


  // ==========================================
  // 🏆 MASTER SCORE SAVE & EVALUATION ENGINE 🏆
  // ==========================================
  const handleScoreSave = async (scoreData) => {
    if (!activeHoleData || !matchId || !playerSlot) {
      alert('Missing validation markers. Cannot save score.');
      return;
    }

    const upsertPayload = {
      matchup_id: matchId,        
      hole_id: activeHoleData.id,
      hole_number: currentHole,
      [`score_${playerSlot}`]: scoreData.score,
      [`putts_${playerSlot}`]: scoreData.putts,
      [`accuracy_${playerSlot}`]: scoreData.accuracy,
      [`penalty_strokes_${playerSlot}`]: scoreData.penalties,
      [`water_balls_${playerSlot}`]: scoreData.water,
      [`drinks_${playerSlot}`]: scoreData.drinks
    };

    const { error: upsertError } = await supabase
      .from('hole_scores')
      .upsert(upsertPayload, { onConflict: 'matchup_id, hole_id' });

    if (upsertError) {
      alert("Database transmission failed: " + upsertError.message);
      return; 
    }

    setCurrentScoreData({ 
      gross_score: scoreData.score,
      putts: scoreData.putts,
      accuracy: scoreData.accuracy,
      penalty_strokes: scoreData.penalties,
      water_balls: scoreData.water,
      drinks: scoreData.drinks
    });

    // ---------------------------------------------------------
    // ⚙️ BACKGROUND PROCESS: RUN THE MATCH PLAY ENGINE
    // ---------------------------------------------------------
    try {
      const { data: allHoles } = await supabase
        .from('holes')
        .select('id, hole_number, hcp_index')
        .eq('course_id', activeHoleData.course_id || 1);

      const { data: allMatchScores } = await supabase
        .from('hole_scores')
        .select('*')
        .eq('matchup_id', matchId);

      const mockTeam1 = [{ id: 't1p1', courseHandicap: 10 }, { id: 't1p2', courseHandicap: 15 }];
      const mockTeam2 = [{ id: 't2p1', courseHandicap: 8 }, { id: 't2p2', courseHandicap: 18 }];

      const format = matchInsights.wagerStatus || '1V1';
      const handicapData = calculatePlayingHandicaps(format, mockTeam1, mockTeam2);
      const matchResult = evaluateMatchStatus(format, handicapData, allHoles || [], allMatchScores || []);

      // 🎯 UPDATED: We only update the scores now. We purposefully do NOT update 
      // the status to 'completed' here so that the match stays live for everyone else.
      await supabase
        .from('matches')
        .update({
          team1_score: matchResult.team1Wins,
          team2_score: matchResult.team2Wins
        })
        .eq('id', matchId);

      setMatchInsights(prev => ({
        ...prev,
        status: `${matchResult.team1Wins} vs ${matchResult.team2Wins}`
      }));

      // Check if this was their 18th hole saved
      const myScoresCount = allMatchScores.filter(s => s[`score_${playerSlot}`] !== null).length;
      if (myScoresCount >= 18 || (currentHole === 18 && myScoresCount === 17)) {
        setIsMyRoundComplete(true);
      }

    } catch (engineError) {
      console.error("Match Play Engine failed:", engineError);
    }

    // ---------------------------------------------------------
    // 🃏 ADVANCE LOGIC
    // ---------------------------------------------------------
    if (ENABLE_CARD_MINTING) {
      let matchedCardConfig = await CARD_RULES_ENGINE.checkOceanGate(scoreData, currentHole, player.id);
      if (!matchedCardConfig) matchedCardConfig = await CARD_RULES_ENGINE.checkWhammy(scoreData, currentHole, par, matchId, player.id);
      if (!matchedCardConfig) matchedCardConfig = await CARD_RULES_ENGINE.checkBanquetBirdie(scoreData, par, player.id);

      if (matchedCardConfig) {
        const completePayload = {
          ...matchedCardConfig,
          player: player.name || 'Clubhouse Golfer',
          earnedByUserId: player.id,
          hole: currentHole,
          courseName: "Fores V Master Course"
        };
        setMintPayload(completePayload);
        setIsMintingActive(true);
      } else {
        if (currentHole < 18) setCurrentHole(prev => prev + 1);
      }
    } else {
      if (currentHole < 18) setCurrentHole(prev => prev + 1);
    }
  };

  const handleExitClick = (e) => {
    e.preventDefault();
    if (typeof onBack === 'function') onBack();
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white font-sans overflow-hidden antialiased fixed inset-0 z-50">
      
      {/* 🎯 NEW: ROUND COMPLETE BANNER */}
      {isMyRoundComplete && (
        <div className="bg-[#34d399] text-black text-center py-1.5 px-4 text-[10px] font-black uppercase tracking-widest z-[99999] relative shrink-0 shadow-md">
          Your Round is Complete & Locked. Waiting on other players.
        </div>
      )}

      {/* HUD HEADER */}
      <header className={`absolute ${isMyRoundComplete ? 'top-10' : 'top-4'} left-4 right-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/60 rounded-2xl flex justify-between items-center px-4 py-2 z-[9999] shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all`}>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExitClick}
            className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/5 border border-red-500/20 px-2.5 h-8 rounded-xl flex items-center justify-center gap-1 hover:bg-red-500/10 transition-all active:scale-95 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            Exit
          </button>
          
          <button 
            onClick={() => setCurrentHole(Math.max(1, currentHole - 1))}
            disabled={currentHole === 1 || isInitializing}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-950/40 border border-slate-800/40 w-8 h-8 rounded-xl flex items-center justify-center hover:text-white hover:border-slate-700 transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
          >◀</button>
        </div>
        
        <div className="text-center flex flex-col items-center justify-center select-none">
          <h1 className="text-base font-black tracking-widest text-slate-100 uppercase leading-none">Hole {currentHole}</h1>
          <div className="flex gap-1.5 mt-1 items-center">
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              PAR {par}
            </span>
            {currentScoreData?.gross_score && (
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                SCORE: {currentScoreData.gross_score}
              </span>
            )}
          </div>
        </div>
        
        <button 
          onClick={() => setCurrentHole(Math.min(18, currentHole + 1))}
          disabled={currentHole === 18 || isInitializing}
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-950/40 border border-slate-800/40 w-10 h-8 rounded-xl flex items-center justify-center hover:text-white hover:border-slate-700 transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
        >▶</button>
      </header>

      <main className="flex-1 relative w-full h-full z-0 bg-slate-950">
         {isLoading || isInitializing || !activeHoleData ? (
           <div className="h-full flex items-center justify-center text-slate-600 font-black animate-pulse uppercase tracking-[0.2em] text-xs">
             Syncing Geospatial Arrays...
           </div>
         ) : (
           <PremiumMapMatrix 
             holeData={activeHoleData} 
             insights={matchInsights} 
             onLogScoreClick={() => {
               // Prevent opening the score entry sheet if they are locked out
               if (isMyRoundComplete) {
                 alert("Your scorecard is locked for this round. Waiting on other players to finish.");
               } else {
                 setIsScoreSheetOpen(true);
               }
             }} 
           />
         )}
      </main>

      <ScoreEntrySheet 
        isOpen={isScoreSheetOpen} 
        onClose={() => setIsScoreSheetOpen(false)} 
        currentHole={currentHole}
        par={par}
        onSave={handleScoreSave}
        existingData={currentScoreData} 
      />

      {isMintingActive && mintPayload && (
        <CardMintingProtocol 
          mintData={mintPayload}
          onComplete={() => {
            setIsMintingActive(false);
            setMintPayload(null);
            if (currentHole < 18) {
              setCurrentHole(prev => prev + 1);
            }
          }}
        />
      )}
    </div>
  );
}