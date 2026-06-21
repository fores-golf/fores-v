import React, { useState, useEffect } from 'react';
import PremiumMapMatrix from '../course/PremiumMapMatrix';
import ScoreEntrySheet from './ScoreEntrySheet';
import MatchScorecardView from './MatchScorecardView'; 
import { supabase } from '../../config/supabaseClient';
import { useUser } from '../../context/UserContext';
import { calculatePlayingHandicaps, evaluateMatchStatus } from '../../utils/matchPlayEngine';

export default function MatchScreen({ matchId, onBack }) {
  const { player } = useUser();
  const [currentHole, setCurrentHole] = useState(1);
  const [isInitializing, setIsInitializing] = useState(true);
  const [par, setPar] = useState(4);
  const [activeHoleData, setActiveHoleData] = useState(null);
  const [allHoles, setAllHoles] = useState([]); 
  const [liveMatchScores, setLiveMatchScores] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isScoreSheetOpen, setIsScoreSheetOpen] = useState(false);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false); 
  
  const [currentScoreData, setCurrentScoreData] = useState(null);
  const [matchInsights, setMatchInsights] = useState({});
  const [playerSlot, setPlayerSlot] = useState(null); 

  const [isMyRoundComplete, setIsMyRoundComplete] = useState(false);
  const [calculatedStrokes, setCalculatedStrokes] = useState({ text: 'Syncing Engine...', color: 'text-slate-500 border-white/5 bg-white/5' });

  const syncMatchStateFromDatabase = (matchRow, allMatchScores, liveProfiles, courseHoles) => {
    if (!matchRow || !liveProfiles) return;

    const findHcp = (refId) => {
      const found = liveProfiles.find(p => String(p.auth_id) === String(refId) || String(p.id) === String(refId));
      return found ? parseInt(found.handicap, 10) || 0 : 0;
    };

    const format = matchRow.format || '1v1';
    const team1Arr = [];
    if (matchRow.team1_player1) team1Arr.push({ id: 't1p1', courseHandicap: findHcp(matchRow.team1_player1) });
    if (matchRow.team1_player2) team1Arr.push({ id: 't1p2', courseHandicap: findHcp(matchRow.team1_player2) });

    const team2Arr = [];
    if (matchRow.team2_player1) team2Arr.push({ id: 't2p1', courseHandicap: findHcp(matchRow.team2_player1) });
    if (matchRow.team2_player2) team2Arr.push({ id: 't2p2', courseHandicap: findHcp(matchRow.team2_player2) });

    const handicapData = calculatePlayingHandicaps(format, team1Arr, team2Arr);

    let displayStatus = "AS";
    let displayThru = 0;

    const holesToEvaluate = courseHoles && courseHoles.length > 0 ? courseHoles : allHoles;

    if (allMatchScores && allMatchScores.length > 0 && holesToEvaluate.length > 0) {
      const matchResult = evaluateMatchStatus(format, handicapData, holesToEvaluate, allMatchScores);
      displayStatus = matchResult.statusStr || "AS";
      displayThru = matchResult.holesPlayed || 0;
    }

    const p1 = liveProfiles.find(p => String(p.id) === String(matchRow.team1_player1) || String(p.auth_id) === String(matchRow.team1_player1));
    const p3 = liveProfiles.find(p => String(p.id) === String(matchRow.team2_player1) || String(p.auth_id) === String(matchRow.team2_player1));

    setMatchInsights({
      matchupId: matchId,
      status: displayStatus,
      thru: displayThru,
      wagerStatus: format.toUpperCase(),
      matchState: matchRow.status,
      isLiveColumn: matchRow.is_live === true || matchRow.is_live === 'true',
      team1Name: p1 ? p1.name : 'TBD',
      team2Name: p3 ? p3.name : 'TBD',
      t1p1: matchRow.team1_player1,
      t1p2: matchRow.team1_player2,
      t2p1: matchRow.team2_player1,
      t2p2: matchRow.team2_player2,
      strokesType: handicapData.type,
      team1Strokes: handicapData.type === 'team' ? handicapData.team1Strokes : 0,
      team2Strokes: handicapData.type === 'team' ? handicapData.team2Strokes : 0,
      t1p1Strokes: handicapData.type === 'individual' ? handicapData.team1?.t1p1 || 0 : 0,
      t1p2Strokes: handicapData.type === 'individual' ? handicapData.team1?.t1p2 || 0 : 0,
      t2p1Strokes: handicapData.type === 'individual' ? handicapData.team2?.t2p1 || 0 : 0,
      t2p2Strokes: handicapData.type === 'individual' ? handicapData.team2?.t2p2 || 0 : 0,
    });

    if (handicapData.type === 'team') {
      if (handicapData.team1Strokes > 0) {
        setCalculatedStrokes({ text: `Clams getting ${handicapData.team1Strokes} strokes`, color: 'text-blue-400 border-blue-500/20 bg-blue-500/5' });
      } else if (handicapData.team2Strokes > 0) {
        setCalculatedStrokes({ text: `Brothelmen getting ${handicapData.team2Strokes} strokes`, color: 'text-red-400 border-red-500/20 bg-red-500/5' });
      } else {
        setCalculatedStrokes({ text: 'Heads Up (Scratch)', color: 'text-slate-400 border-white/5 bg-white/5' });
      }
    } else {
      const maxStrokes = Math.max(...Object.values(handicapData.team1 || {}), ...Object.values(handicapData.team2 || {}));
      if (maxStrokes > 0) {
        setCalculatedStrokes({ text: 'Individual Strokes Applied', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' });
      } else {
        setCalculatedStrokes({ text: 'All Players Scratch', color: 'text-slate-400 border-white/5 bg-white/5' });
      }
    }
  };

  const syncAllScores = async (courseHolesInput) => {
    try {
      const { data: scores } = await supabase.from('hole_scores').select('*').eq('matchup_id', matchId);
      const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single();
      const { data: profiles } = await supabase.from('players').select('id, auth_id, name, handicap');

      const activeHoles = courseHolesInput || allHoles;

      if (scores) setLiveMatchScores([...scores]);
      if (match && profiles && scores) {
        syncMatchStateFromDatabase(match, scores, profiles, activeHoles);
      }
    } catch (err) {
      console.warn(err.message);
    }
  };

  useEffect(() => {
    if (!matchId || !player?.id) return;

    async function initialBootstrap() {
      try {
        const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single();
        const { data: courseHoles } = await supabase.from('holes').select('*').eq('course_id', 1);
        
        let holesCache = [];
        if (courseHoles) {
          setAllHoles(courseHoles);
          holesCache = courseHoles;
        }

        if (match) {
          const isMe = (refId) => {
             if (!refId) return false;
             const target = String(refId).trim().toLowerCase();
             return String(player.auth_id).trim().toLowerCase() === target || String(player.id).trim().toLowerCase() === target;
          };

          let slot = null;
          if (isMe(match.team1_player1)) slot = 'slanted_a';
          else if (isMe(match.team1_player2)) slot = 'slanted_b';
          else if (isMe(match.team2_player1)) slot = 'brothelmen_a';
          else if (isMe(match.team2_player2)) slot = 'brothelmen_b';
          setPlayerSlot(slot);
        }

        await syncAllScores(holesCache);
      } catch (err) {
        console.warn(err.message);
      }
    }

    initialBootstrap();

    const scoresSubscription = supabase
      .channel(`live-scores-${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hole_scores', filter: `matchup_id=eq.${matchId}` }, () => {
        syncAllScores();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(scoresSubscription);
    };
  }, [matchId, player?.id]);

  useEffect(() => {
    if (isInitializing || !playerSlot) return;

    async function fetchHole() {
      try {
        setIsLoading(true);
        const { data } = await supabase.from('holes').select('*').eq('course_id', 1).eq('hole_number', currentHole).maybeSingle();
        if (data) {
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
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHole();
  }, [currentHole, isInitializing, playerSlot]);

  useEffect(() => {
    if (!activeHoleData?.id || !playerSlot || liveMatchScores.length === 0) return;
    const activeRow = liveMatchScores.find(s => s.hole_id === activeHoleData.id);
    if (activeRow && activeRow[`score_${playerSlot}`] !== null) {
      setCurrentScoreData({
        gross_score: activeRow[`score_${playerSlot}`],
        putts: activeRow[`putts_${playerSlot}`],
        accuracy: activeRow[`accuracy_${playerSlot}`],
        penalty_strokes: activeRow[`penalty_strokes_${playerSlot}`],
        water_balls: activeRow[`water_balls_${playerSlot}`],
        drinks: activeRow[`drinks_${playerSlot}`]
      });
    } else {
      setCurrentScoreData(null);
    }
  }, [activeHoleData, liveMatchScores, playerSlot]);

  useEffect(() => {
    if (!playerSlot || !matchId) return;
    async function determineStartingHole() {
      const { data } = await supabase.from('hole_scores').select(`hole_number, score_${playerSlot}`).eq('matchup_id', matchId);
      if (data) {
        const scoredHoles = data.filter(d => d[`score_${playerSlot}`] !== null).map(d => d.hole_number);
        if (scoredHoles.length >= 18) {
          setIsMyRoundComplete(true);
          setCurrentHole(18);
        } else {
          let firstUnscored = 1;
          while (scoredHoles.includes(firstUnscored) && firstUnscored < 18) firstUnscored++;
          setCurrentHole(firstUnscored);
        }
      }
      setIsInitializing(false);
    }
    determineStartingHole();
  }, [matchId, playerSlot]);

  const handleScoreSave = async (scoreData) => {
    if (!activeHoleData || !matchId || !playerSlot) return;

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

    const { error } = await supabase.from('hole_scores').upsert(upsertPayload, { onConflict: 'matchup_id, hole_id' });
    if (error) return alert(error.message);

   try {
      const { data: currentMatch } = await supabase.from('matches').select('*').eq('id', matchId).single();
      const { data: allMatchScores } = await supabase.from('hole_scores').select('*').eq('matchup_id', matchId);
      const { data: liveProfiles } = await supabase.from('players').select('id, auth_id, handicap');

      if (liveProfiles && currentMatch && allMatchScores && allHoles.length > 0) {
        const findHcp = (refId) => {
          const found = liveProfiles.find(p => String(p.auth_id) === String(refId) || String(p.id) === String(refId));
          return found ? parseInt(found.handicap, 10) || 0 : 0;
        };

        const format = currentMatch.format || '1v1';
        const team1Arr = [];
        if (currentMatch.team1_player1) team1Arr.push({ id: 't1p1', courseHandicap: findHcp(currentMatch.team1_player1) });
        if (currentMatch.team1_player2) team1Arr.push({ id: 't1p2', courseHandicap: findHcp(currentMatch.team1_player2) });

        const team2Arr = [];
        if (currentMatch.team2_player1) team2Arr.push({ id: 't2p1', courseHandicap: findHcp(currentMatch.team2_player1) });
        if (currentMatch.team2_player2) team2Arr.push({ id: 't2p2', courseHandicap: findHcp(currentMatch.team2_player2) });

        const handicapData = calculatePlayingHandicaps(format, team1Arr, team2Arr);

        // 🎯 FIX: Explicitly parse and normalize your exact custom row score properties
        const netScoresPayload = allMatchScores.map(scoreRow => {
          const holeMeta = allHoles.find(h => h.id === scoreRow.hole_id || h.hole_number === scoreRow.hole_number);
          const hcpIdx = holeMeta ? holeMeta.hcp_index : 18;

          const getNet = (gross, strokes) => {
            if (gross == null) return null;
            let applied = Math.floor((strokes || 0) / 18);
            if (((strokes || 0) % 18) >= hcpIdx) applied += 1;
            return gross - applied;
          };

          return {
            ...scoreRow,
            t1p1: getNet(scoreRow.score_slanted_a, handicapData.type === 'team' ? handicapData.team1Strokes : handicapData.team1?.t1p1),
            t1p2: getNet(scoreRow.score_slanted_b, handicapData.type === 'team' ? handicapData.team1Strokes : handicapData.team1?.t1p2),
            t2p1: getNet(scoreRow.score_brothelmen_a, handicapData.type === 'team' ? handicapData.team2Strokes : handicapData.team2?.t2p1),
            t2p2: getNet(scoreRow.score_brothelmen_b, handicapData.type === 'team' ? handicapData.team2Strokes : handicapData.team2?.t2p2),
          };
        });

        const matchResult = evaluateMatchStatus(format, handicapData, allHoles, netScoresPayload);
        const isMatchOver = allMatchScores.length >= 18 || matchResult.statusStr.includes('&') || matchResult.statusStr.includes('Won');

        let finalStatusText = matchResult.statusStr;
        if (isMatchOver && !finalStatusText.includes('Clams') && !finalStatusText.includes('Brothelmen')) {
          finalStatusText = matchResult.team1Wins > matchResult.team2Wins ? 'Slanted Clams Won' : 'Clam Brothelmen Won';
        }

        await supabase
          .from('matches')
          .update({
            is_live: !isMatchOver,
            status: isMatchOver ? 'completed' : 'live',
            team1_score: finalStatusText, 
            team2_score: finalStatusText
          })
          .eq('id', matchId);
      }
    } catch (err) {
      console.error(err);
    }

    await syncAllScores();
    if (currentHole < 18) setCurrentHole(prev => prev + 1);
  };

  const handleExitClick = (e) => {
    e.preventDefault();
    if (typeof onBack === 'function') onBack();
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white font-sans overflow-hidden antialiased fixed inset-0 z-50">
      {isMyRoundComplete && <div className="bg-[#34d399] text-black text-center py-1.5 px-4 text-[10px] font-black uppercase tracking-widest z-[99999] relative shrink-0 shadow-md">Your Round is Complete & Locked. Waiting on other players.</div>}
      <header className={`absolute ${isMyRoundComplete ? 'top-10' : 'top-4'} left-4 right-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/60 rounded-2xl flex justify-between items-center px-4 py-2 z-[9999] shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all`}>
        <div className="flex items-center gap-2">
          <button onClick={handleExitClick} className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/5 border border-red-500/20 px-2.5 h-8 rounded-xl flex items-center justify-center gap-1 hover:bg-red-500/10 transition-all active:scale-95 cursor-pointer"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>Exit</button>
          <button onClick={() => setIsScorecardOpen(true)} className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/5 border border-amber-500/20 px-2.5 h-8 rounded-xl flex items-center justify-center gap-1 hover:bg-amber-500/10 transition-all active:scale-95 cursor-pointer">📊 Scorecard</button>
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
           <PremiumMapMatrix holeData={activeHoleData} insights={matchInsights} onLogScoreClick={() => setIsScoreSheetOpen(true)} />
         )}
      </main>
      <ScoreEntrySheet isOpen={isScoreSheetOpen} onClose={() => setIsScoreSheetOpen(false)} currentHole={currentHole} par={par} onSave={handleScoreSave} existingData={currentScoreData} />
      {isScorecardOpen && <MatchScorecardView insights={matchInsights} allHolesData={allHoles} holeScores={liveMatchScores} onClose={() => setIsScorecardOpen(false)} />}
    </div>
  );
}