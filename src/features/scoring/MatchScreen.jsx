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

  const [isMyRoundComplete, setIsMyRoundComplete] = useState(false);
  const [calculatedStrokes, setCalculatedStrokes] = useState({ text: 'Syncing Engine...', color: 'text-slate-500 border-white/5 bg-white/5' });

  useEffect(() => {
    if (!matchId || !player?.id) return;

    async function fetchLiveInsights() {
      try {
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single();

        if (matchError || !match) throw matchError;

        // 🎯 CORE FIX: Checks player.id OR player.auth_id aggressively against the match fields
        const isMe = (refId) => {
           if (!refId) return false;
           const target = String(refId).trim().toLowerCase();
           return (player.auth_id && String(player.auth_id).trim().toLowerCase() === target) ||
                  (player.id && String(player.id).trim().toLowerCase() === target);
        };

        let slot = null;
        if (isMe(match.team1_player1)) slot = 'slanted_a';
        else if (isMe(match.team1_player2)) slot = 'slanted_b';
        else if (isMe(match.team2_player1)) slot = 'brothelmen_a';
        else if (isMe(match.team2_player2)) slot = 'brothelmen_b';
        
        setPlayerSlot(slot);

        // Fetch live profiles and explicitly pull name and auth_id
        const { data: profiles } = await supabase.from('players').select('id, auth_id, name, handicap');

        const getProfile = (refId) => {
          if (!refId || !profiles) return null;
          const target = String(refId).trim().toLowerCase();
          return profiles.find(p => 
            (p.auth_id && String(p.auth_id).trim().toLowerCase() === target) ||
            (p.id && String(p.id).trim().toLowerCase() === target)
          );
        };

        const p1 = getProfile(match.team1_player1);
        const p2 = getProfile(match.team1_player2);
        const p3 = getProfile(match.team2_player1);
        const p4 = getProfile(match.team2_player2);

        const format = match.format || '1v1';

        if (profiles && profiles.length > 0) {
          const team1Arr = [];
          if (p1) team1Arr.push({ id: 't1p1', courseHandicap: parseInt(p1.handicap, 10) || 0 });
          if (p2) team1Arr.push({ id: 't1p2', courseHandicap: parseInt(p2.handicap, 10) || 0 });

          const team2Arr = [];
          if (p3) team2Arr.push({ id: 't2p1', courseHandicap: parseInt(p3.handicap, 10) || 0 });
          if (p4) team2Arr.push({ id: 't2p2', courseHandicap: parseInt(p4.handicap, 10) || 0 });

          const handicapData = calculatePlayingHandicaps(format, team1Arr, team2Arr);

          // 🎯 MERGE STROKES DIRECTLY INTO INSIGHTS
          setMatchInsights({
            matchupId: matchId,
            status: `${match.team1_score || 0} vs ${match.team2_score || 0}`,
            wagerStatus: format.toUpperCase(),
            matchState: match.status,
            team1Name: p1 ? p1.name : 'TBD',
            team2Name: p3 ? p3.name : 'TBD',
            t1p1: p1 ? p1.id : null,
            t1p2: p2 ? p2.id : null,
            t2p1: p3 ? p3.id : null,
            t2p2: p4 ? p4.id : null,
            // --- Stroke Data for Child Components ---
            strokesType: handicapData.type,
            team1Strokes: handicapData.type === 'team' ? handicapData.team1Strokes : 0,
            team2Strokes: handicapData.type === 'team' ? handicapData.team2Strokes : 0,
            t1p1Strokes: handicapData.type === 'individual' ? handicapData.team1?.t1p1 || 0 : 0,
            t1p2Strokes: handicapData.type === 'individual' ? handicapData.team1?.t1p2 || 0 : 0,
            t2p1Strokes: handicapData.type === 'individual' ? handicapData.team2?.t2p1 || 0 : 0,
            t2p2Strokes: handicapData.type === 'individual' ? handicapData.team2?.t2p2 || 0 : 0,
          });

          // UPDATE HEADER BADGE
          if (handicapData.type === 'team') {
            if (handicapData.team1Strokes > 0) {
              setCalculatedStrokes({ text: `Clams getting ${handicapData.team1Strokes} strokes`, color: 'text-blue-400 border-blue-500/20 bg-blue-500/5' });
            } else if (handicapData.team2Strokes > 0) {
              setCalculatedStrokes({ text: `Brothelmen getting ${handicapData.team2Strokes} strokes`, color: 'text-red-400 border-red-500/20 bg-red-500/5' });
            } else {
              setCalculatedStrokes({ text: 'Heads Up (Scratch)', color: 'text-slate-400 border-white/5 bg-white/5' });
            }
          } else {
            const maxStrokes = Math.max(
              ...Object.values(handicapData.team1 || {}), 
              ...Object.values(handicapData.team2 || {})
            );

            if (maxStrokes > 0) {
              setCalculatedStrokes({ text: 'Individual Strokes Applied', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' });
            } else {
              setCalculatedStrokes({ text: 'All Players Scratch', color: 'text-slate-400 border-white/5 bg-white/5' });
            }
          }
        }
      } catch (err) {
        console.warn('Insights background engine calculation skipped:', err.message);
      }
    }
    fetchLiveInsights();
  }, [matchId, player?.id]);

  useEffect(() => {
    if (!matchId || !playerSlot) {
      setIsInitializing(false);
      return;
    }

    async function determineStartingHole() {
      try {
        const { data, error } = await supabase
          .from('hole_scores')
          .select(`hole_number, score_${playerSlot}`)
          .eq('matchup_id', matchId);

        if (!error && data) {
          const scoredHoles = data.filter(d => d[`score_${playerSlot}`] !== null).map(d => d.hole_number);
          
          if (scoredHoles.length >= 18) {
            setIsMyRoundComplete(true);
            setCurrentHole(18);
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

    try {
      const { data: allHoles } = await supabase.from('holes').select('id, hole_number, hcp_index').eq('course_id', activeHoleData.course_id || 1);
      const { data: allMatchScores } = await supabase.from('hole_scores').select('*').eq('matchup_id', matchId);
      const { data: liveProfiles } = await supabase.from('players').select('id, auth_id, handicap');

      if (liveProfiles) {
        const findHcp = (refId) => {
          const found = liveProfiles.find(p => String(p.auth_id) === String(refId) || String(p.id) === String(refId));
          return found ? parseInt(found.handicap, 10) || 0 : 0;
        };

        const activeTeam1 = [];
        if (matchInsights.t1p1) activeTeam1.push({ id: 't1p1', courseHandicap: findHcp(matchInsights.t1p1) });
        if (matchInsights.t1p2) activeTeam1.push({ id: 't1p2', courseHandicap: findHcp(matchInsights.t1p2) });

        const activeTeam2 = [];
        if (matchInsights.t2p1) activeTeam2.push({ id: 't2p1', courseHandicap: findHcp(matchInsights.t2p1) });
        if (matchInsights.t2p2) activeTeam2.push({ id: 't2p2', courseHandicap: findHcp(matchInsights.t2p2) });

        const format = matchInsights.wagerStatus || '1V1';
        const handicapData = calculatePlayingHandicaps(format, activeTeam1, activeTeam2);
        const matchResult = evaluateMatchStatus(format, handicapData, allHoles || [], allMatchScores || []);

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
      }

      const myScoresCount = allMatchScores.filter(s => s[`score_${playerSlot}`] !== null).length;
      if (myScoresCount >= 18 || (currentHole === 18 && myScoresCount === 17)) {
        setIsMyRoundComplete(true);
      }

    } catch (engineError) {
      console.error("Match Play Engine failed:", engineError);
    }

    if (currentHole < 18) setCurrentHole(prev => prev + 1);
  };

  const handleExitClick = (e) => {
    e.preventDefault();
    if (typeof onBack === 'function') onBack();
  };

  if (matchInsights.matchState === 'scheduled' && !playerSlot && !isInitializing) {
    return (
      <div className="flex flex-col h-[100dvh] bg-slate-950 text-white font-sans items-center justify-center p-6 relative z-50">
        <button onClick={handleExitClick} className="absolute top-6 left-6 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl hover:bg-white/10 transition-all active:scale-95 flex items-center gap-1">◀ Back</button>
        <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
          <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        </div>
        <h1 className="text-3xl font-black italic uppercase tracking-tight mb-3 text-center bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">Match Preview</h1>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center max-w-[250px] leading-relaxed">Tee time approaches. Tale of the tape and pre-match analytics will live here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white font-sans overflow-hidden antialiased fixed inset-0 z-50">
      {isMyRoundComplete && <div className="bg-[#34d399] text-black text-center py-1.5 px-4 text-[10px] font-black uppercase tracking-widest z-[99999] relative shrink-0 shadow-md">Your Round is Complete & Locked. Waiting on other players.</div>}
      <header className={`absolute ${isMyRoundComplete ? 'top-10' : 'top-4'} left-4 right-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/60 rounded-2xl flex justify-between items-center px-4 py-2 z-[9999] shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all`}>
        <div className="flex items-center gap-2">
          <button onClick={handleExitClick} className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/5 border border-red-500/20 px-2.5 h-8 rounded-xl flex items-center justify-center gap-1 hover:bg-red-500/10 transition-all active:scale-95 cursor-pointer"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>Exit</button>
          <button onClick={() => setCurrentHole(Math.max(1, currentHole - 1))} disabled={currentHole === 1 || isInitializing} className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-950/40 border border-slate-800/40 w-8 h-8 rounded-xl flex items-center justify-center hover:text-white hover:border-slate-700 transition-all active:scale-95 disabled:opacity-30 cursor-pointer">◀</button>
        </div>
        <div className="text-center flex flex-col items-center justify-center select-none">
          <h1 className="text-base font-black tracking-widest text-slate-100 uppercase leading-none">Hole {currentHole}</h1>
          <div className="flex gap-1.5 mt-1 items-center">
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">PAR {par}</span>
            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-md ${calculatedStrokes.color}`}>{calculatedStrokes.text}</span>
          </div>
        </div>
        <button onClick={() => setCurrentHole(Math.min(18, currentHole + 1))} disabled={currentHole === 18 || isInitializing} className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-950/40 border border-slate-800/40 w-10 h-8 rounded-xl flex items-center justify-center hover:text-white hover:border-slate-700 transition-all active:scale-95 disabled:opacity-30 cursor-pointer">▶</button>
      </header>
      <main className="flex-1 relative w-full h-full z-0 bg-slate-950">
         {isLoading || isInitializing || !activeHoleData ? (
           <div className="h-full flex items-center justify-center text-slate-600 font-black animate-pulse uppercase tracking-[0.2em] text-xs">Syncing Geospatial Arrays...</div>
         ) : (
           <PremiumMapMatrix holeData={activeHoleData} insights={matchInsights} onLogScoreClick={() => { if (isMyRoundComplete) { alert("Your scorecard is locked for this round. Waiting on other players to finish."); } else { setIsScoreSheetOpen(true); } }} />
         )}
      </main>
      <ScoreEntrySheet isOpen={isScoreSheetOpen} onClose={() => setIsScoreSheetOpen(false)} currentHole={currentHole} par={par} onSave={handleScoreSave} existingData={currentScoreData} />
    </div>
  );
}