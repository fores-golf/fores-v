import React, { useState, useEffect } from 'react';
import PremiumMapMatrix from '../course/PremiumMapMatrix';
import ScoreEntrySheet from './ScoreEntrySheet';
import MatchScorecardView from './matchScorecardView'; 
import { supabase } from '../../config/supabaseClient';
import { useUser } from '../../context/UserContext';
import { calculatePlayingHandicaps, evaluateMatchStatus } from '../../utils/matchPlayEngine';
import { MatchProbabilityBar } from '../probability/probability_engine'; 

// 🎯 OFFLINE IMPLEMENTATION: Import the fallback storage mechanisms
import { saveScoreOffline } from '../../utils/offlineScoringEngine';

const ROUND_FORMATS = {
  1: 'Vegas',
  2: 'Greensomes',
  3: 'Best Ball',
  4: 'Scramble',
  5: '1v1'
};

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

  const [players, setPlayers] = useState([]);
  const [matchData, setMatchData] = useState(null);

  const [displayNames, setDisplayNames] = useState({ p1: 'TBD', p2: '', p3: 'TBD', p4: '' });

  const syncMatchStateFromDatabase = (matchRow, allMatchScores, liveProfiles, courseHoles) => {
    if (!matchRow || !liveProfiles) return;

    const findHcp = (refId) => {
      const found = liveProfiles.find(p => String(p.auth_id).trim().toLowerCase() === String(refId).trim().toLowerCase() || String(p.id).trim().toLowerCase() === String(refId).trim().toLowerCase());
      return found ? parseInt(found.handicap, 10) || 0 : 0;
    };

    const rawFormat = matchRow.format && matchRow.format !== 'TBD' ? matchRow.format : ROUND_FORMATS[matchRow.round] || '1v1';

    const team1Arr = [];
    if (matchRow.team1_player1) team1Arr.push({ id: 't1p1', courseHandicap: findHcp(matchRow.team1_player1) });
    if (matchRow.team1_player2) team1Arr.push({ id: 't1p2', courseHandicap: findHcp(matchRow.team1_player2) });

    const team2Arr = [];
    if (matchRow.team2_player1) team2Arr.push({ id: 't2p1', courseHandicap: findHcp(matchRow.team2_player1) });
    if (matchRow.team2_player2) team2Arr.push({ id: 't2p2', courseHandicap: findHcp(matchRow.team2_player2) });

    const handicapData = calculatePlayingHandicaps(rawFormat, team1Arr, team2Arr);

    let displayStatus = "AS";
    let displayThru = 0;

    const holesToEvaluate = courseHoles && courseHoles.length > 0 ? courseHoles : allHoles;

    if (allMatchScores && allMatchScores.length > 0 && holesToEvaluate.length > 0) {
      const matchResult = evaluateMatchStatus(rawFormat, handicapData, holesToEvaluate, allMatchScores);
      displayStatus = matchResult.statusStr || "AS";
      displayThru = matchResult.holesPlayed || 0;
    }

    const p1Profile = liveProfiles.find(p => String(p.auth_id).trim().toLowerCase() === String(matchRow.team1_player1).trim().toLowerCase() || String(p.id).trim().toLowerCase() === String(matchRow.team1_player1).trim().toLowerCase());
    const p2Profile = liveProfiles.find(p => String(p.auth_id).trim().toLowerCase() === String(matchRow.team1_player2).trim().toLowerCase() || String(p.id).trim().toLowerCase() === String(matchRow.team1_player2).trim().toLowerCase());
    const p3Profile = liveProfiles.find(p => String(p.auth_id).trim().toLowerCase() === String(matchRow.team2_player1).trim().toLowerCase() || String(p.id).trim().toLowerCase() === String(matchRow.team2_player1).trim().toLowerCase());
    const p4Profile = liveProfiles.find(p => String(p.auth_id).trim().toLowerCase() === String(matchRow.team2_player2).trim().toLowerCase() || String(p.id).trim().toLowerCase() === String(matchRow.team2_player2).trim().toLowerCase());

    setDisplayNames({
      p1: p1Profile ? p1Profile.name : 'TBD',
      p2: p2Profile ? p2Profile.name : '',
      p3: p3Profile ? p3Profile.name : 'TBD',
      p4: p4Profile ? p4Profile.name : ''
    });

    setMatchInsights({
      matchupId: matchId,
      status: displayStatus,
      thru: displayThru,
      wagerStatus: String(rawFormat).toUpperCase(),
      matchState: matchRow.status,
      isLiveColumn: matchRow.is_live === true || matchRow.is_live === 'true',
      team1Name: p1Profile ? p1Profile.name : 'TBD',
      team2Name: p3Profile ? p3Profile.name : 'TBD',
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
    if (!matchId || !player?.auth_id) return;

    async function initialBootstrap() {
      try {
        const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single();
        const { data: courseHoles } = await supabase.from('holes').select('*').eq('course_id', match?.course_id || 1);
        const { data: allPlayersData } = await supabase.from('players').select('id, auth_id, name, handicap');
        
        if (courseHoles) setAllHoles(courseHoles);

        if (match) {
          setMatchData(match);
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

        if (match && allPlayersData) {
          syncMatchStateFromDatabase(match, liveMatchScores, allPlayersData, courseHoles || []);
        }
        await syncAllScores(courseHoles || []);
      } catch (err) {
        console.warn(err.message);
      }
    }

    initialBootstrap();

    const scoresSubscription = supabase.channel(`live-scores-${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hole_scores', filter: `matchup_id=eq.${matchId}` }, () => syncAllScores())
      .subscribe();

    return () => supabase.removeChannel(scoresSubscription);
  }, [matchId, player?.auth_id]);

  useEffect(() => {
    if (isInitializing || !playerSlot || !matchData) return;

    async function fetchHole() {
      try {
        setIsLoading(true);
        const courseIdToUse = matchData?.course_id || 1;
        const { data } = await supabase.from('holes').select('*').eq('course_id', courseIdToUse).eq('hole_number', currentHole).maybeSingle();
        if (data) {
          const convertPostGISToLeaflet = (geoObject) => {
            if (geoObject?.coordinates && Array.isArray(geoObject.coordinates)) return [geoObject.coordinates[1], geoObject.coordinates[0]]; 
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
  }, [currentHole, isInitializing, playerSlot, matchData]);

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
    if (!activeHoleData || !matchId || !playerSlot || !matchData) return;

    const rawFormat = matchData?.format && matchData.format !== 'TBD' ? matchData.format : ROUND_FORMATS[matchData?.round] || '1v1';
    const formatStr = String(rawFormat).trim().toLowerCase();
    const isSingleScoreTeamFormat = formatStr === 'scramble' || formatStr === 'greensomes';

    let partnerSlot = null;
    if (isSingleScoreTeamFormat) {
       if (playerSlot === 'slanted_a') partnerSlot = 'slanted_b';
       else if (playerSlot === 'slanted_b') partnerSlot = 'slanted_a';
       else if (playerSlot === 'brothelmen_a') partnerSlot = 'brothelmen_b';
       else if (playerSlot === 'brothelmen_b') partnerSlot = 'brothelmen_a';
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

    if (isSingleScoreTeamFormat && partnerSlot) {
      upsertPayload[`score_${partnerSlot}`] = scoreData.score;
      upsertPayload[`putts_${partnerSlot}`] = scoreData.putts;
      upsertPayload[`accuracy_${partnerSlot}`] = scoreData.accuracy;
      upsertPayload[`penalty_strokes_${partnerSlot}`] = scoreData.penalties;
      upsertPayload[`water_balls_${partnerSlot}`] = scoreData.water;
      upsertPayload[`drinks_${partnerSlot}`] = scoreData.drinks;
    }

    // 🎯 INTERCEPT PATH: Fall back to local queue storage if connection state drops out
    if (!navigator.onLine) {
      saveScoreOffline(matchId, currentHole, upsertPayload);
      
      // Optimistically update the internal array view locally so users aren't frozen out
      setLiveMatchScores(prev => {
        const next = [...prev];
        const idx = next.findIndex(s => s.hole_id === activeHoleData.id);
        if (idx !== -1) {
          next[idx] = { ...next[idx], ...upsertPayload };
        } else {
          next.push({ id: Math.random(), ...upsertPayload });
        }
        return next;
      });

      setIsScoreSheetOpen(false);
      if (currentHole < 18) setCurrentHole(prev => prev + 1);
      return;
    }

    // Standard online pipeline path
    const { error } = await supabase.from('hole_scores').upsert(upsertPayload, { onConflict: 'matchup_id, hole_id' });
    if (error) return alert(error.message);

    try {
      const { data: currentScores } = await supabase.from('hole_scores').select('id').eq('matchup_id', matchId);
      const isCompleteFallback = currentScores && currentScores.length >= 18;

      await supabase.from('matches').update({
        is_live: !isCompleteFallback,
        status: isCompleteFallback ? 'completed' : 'live'
      }).eq('id', matchId);

      const { data: currentMatch } = await supabase.from('matches').select('*').eq('id', matchId).single();
      const { data: allMatchScores } = await supabase.from('hole_scores').select('*').eq('matchup_id', matchId);
      const { data: liveProfiles } = await supabase.from('players').select('id, auth_id, handicap');

      if (liveProfiles && currentMatch && allMatchScores && allHoles.length > 0) {
        const findHcp = (refId) => {
          const found = liveProfiles.find(p => String(p.auth_id).trim().toLowerCase() === String(refId).trim().toLowerCase() || String(p.id).trim().toLowerCase() === String(refId).trim().toLowerCase());
          return found ? parseInt(found.handicap, 10) || 0 : 0;
        };

        const team1Arr = [];
        if (currentMatch.team1_player1) team1Arr.push({ id: 't1p1', courseHandicap: findHcp(currentMatch.team1_player1) });
        if (currentMatch.team1_player2) team1Arr.push({ id: 't1p2', courseHandicap: findHcp(currentMatch.team1_player2) });

        const team2Arr = [];
        if (currentMatch.team2_player1) team2Arr.push({ id: 't2p1', courseHandicap: findHcp(currentMatch.team2_player1) });
        if (currentMatch.team2_player2) team2Arr.push({ id: 't2p2', courseHandicap: findHcp(currentMatch.team2_player2) });

        const handicapData = calculatePlayingHandicaps(rawFormat, team1Arr, team2Arr);

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

        const matchResult = evaluateMatchStatus(rawFormat, handicapData, allHoles, netScoresPayload);
        
        const activeHolesCount = netScoresPayload.filter(h => h.t1p1 !== null || h.t2p1 !== null || h.t1p2 !== null || h.t2p2 !== null).length;
        const isMatchOver = activeHolesCount >= 18 || matchResult.statusStr.includes('&') || matchResult.statusStr.includes('Won');
        const nextStatus = isMatchOver ? 'completed' : (activeHolesCount > 0 ? 'live' : 'scheduled');
        const nextIsLive = activeHolesCount > 0 && !isMatchOver;

        await supabase.from('matches').update({
          is_live: nextIsLive,
          status: nextStatus,
          team1_score: matchResult.team1Wins || 0,
          team2_score: matchResult.team2Wins || 0
        }).eq('id', matchId);
      }
    } catch (err) {
      console.error(err);
    }

    await syncAllScores();
    setIsScoreSheetOpen(false);
    if (currentHole < 18) setCurrentHole(prev => prev + 1);
  };

  const handleExitClick = (e) => {
    e.preventDefault();
    if (typeof onBack === 'function') onBack();
  };

  if (isLoading || isInitializing || !matchData) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center text-slate-600 font-black animate-pulse uppercase tracking-[0.2em] text-xs">
        Syncing Geospatial Arrays...
      </div>
    );
  }

  const rawFormat = matchData?.format && matchData.format !== 'TBD' ? matchData.format : ROUND_FORMATS[matchData?.round] || '1v1';
  const formatStr = String(rawFormat).trim().toLowerCase();
  
  // Adjusted Scope: Defined cleanly for the general JSX layout render tree
  const isSingleScoreFormat = formatStr === '1v1' || formatStr === 'scramble' || formatStr === 'greensomes';
  const isSingleScoreTeamFormat = formatStr === 'scramble' || formatStr === 'greensomes';

  const p1FirstName = displayNames.p1 !== 'TBD' ? displayNames.p1.split(' ')[0] : 'P1';
  const p2FirstName = displayNames.p2 ? displayNames.p2.split(' ')[0] : null;
  const t1Label = p2FirstName ? `${p1FirstName} & ${p2FirstName}` : p1FirstName;

  const p3FirstName = displayNames.p3 !== 'TBD' ? displayNames.p3.split(' ')[0] : 'P3';
  const p4FirstName = displayNames.p4 ? displayNames.p4.split(' ')[0] : null;
  const t2Label = p4FirstName ? `${p3FirstName} & ${p4FirstName}` : p3FirstName;

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white font-sans overflow-hidden antialiased fixed inset-0 z-50">
      {isMyRoundComplete && <div className="bg-[#34d399] text-black text-center py-1.5 px-4 text-[10px] font-black uppercase tracking-widest z-[99999] relative shrink-0 shadow-md">Your Round is Complete & Locked.</div>}
      
      <header className="flex-none bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/60 flex flex-col z-[50] shadow-md w-full pt-2">
        
        {/* Top Row: Nav & Info */}
        <div className="flex justify-between items-center px-4 py-2.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={handleExitClick} className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2 h-7 rounded-lg flex items-center justify-center gap-1 hover:bg-red-500/20 transition-all active:scale-95 cursor-pointer">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>Exit
            </button>
            <button onClick={() => setIsScorecardOpen(true)} className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 h-7 rounded-lg flex items-center justify-center gap-1 hover:bg-amber-500/20 transition-all active:scale-95 cursor-pointer">
              📊 Scorecard
            </button>
          </div>

          <div className="text-center flex flex-col items-center justify-center select-none absolute left-1/2 -translate-x-1/2 w-32">
             <h1 className="text-sm font-black tracking-widest text-slate-100 uppercase leading-none mt-1">Hole {currentHole}</h1>
             <div className="mt-1">
               <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shadow-sm">PAR {par}</span>
             </div>
          </div>
          
          <div className="w-16"></div> 
        </div>

        {/* Matchup & Probability Section */}
        <div className="flex flex-col bg-black/40 border-t border-white/5">
           <div className="flex justify-between items-center px-4 pt-2 pb-1">
             <div className="flex flex-col w-[42%]">
               <span className="text-[10px] font-black text-blue-400 truncate leading-tight">{t1Label}</span>
               <span className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.15em] mt-0.5">Slanted Clams</span>
             </div>
             
             <div className="shrink-0 flex flex-col items-center">
               <span className="text-[8px] font-black text-slate-600 bg-black/60 px-1.5 py-0.5 rounded uppercase tracking-widest border border-white/5">VS</span>
             </div>
             
             <div className="flex flex-col w-[42%] text-right">
               <span className="text-[10px] font-black text-red-400 truncate leading-tight">{t2Label}</span>
               <span className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.15em] mt-0.5">Brothelmen</span>
             </div>
           </div>

           <div className="px-4 pb-2">
              <MatchProbabilityBar matchId={matchId} status={matchData?.status || 'live'} variant="micro" />
           </div>
        </div>

        <div className="bg-blue-900/20 border-t border-blue-500/20 py-0.5 text-center">
           <span className="text-[7px] font-black uppercase tracking-[0.2em] text-blue-400/80">
             Format: {rawFormat} ({isSingleScoreFormat ? '1 Team Score Needed' : '2 Individual Scores Needed'})
           </span>
        </div>
      </header>
      
      <main className="flex-1 relative w-full h-full z-0 bg-slate-950 overflow-hidden">
         <PremiumMapMatrix holeData={activeHoleData} insights={matchInsights} onLogScoreClick={() => setIsScoreSheetOpen(true)} />
      </main>

      {/* Action Bar with integrated hole navigation */}
      <div className="flex-none bg-slate-900/95 backdrop-blur-md border-t border-white/10 p-4 pb-6 z-[50] shadow-[0_-10px_30px_rgba(0,0,0,0.3)] flex items-center gap-3">
         <button 
           onClick={() => setCurrentHole(Math.max(1, currentHole - 1))} 
           disabled={currentHole === 1} 
           className="w-14 h-14 bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center font-black text-lg border border-white/5 active:scale-95 transition-all disabled:opacity-30 shrink-0"
         >
           ◀
         </button>
         
         <button 
           onClick={() => setIsScoreSheetOpen(true)} 
           className="flex-1 h-14 bg-emerald-400 text-slate-950 text-sm font-black uppercase tracking-widest rounded-xl shadow-[0_0_15px_rgba(52,211,153,0.3)] active:scale-[0.98] transition-all flex flex-col items-center justify-center leading-tight"
         >
           <span>📝 Log Score</span>
           <span className="text-[10px] opacity-80 mt-0.5">Hole {currentHole}</span>
         </button>

         <button 
           onClick={() => setCurrentHole(Math.min(18, currentHole + 1))} 
           disabled={currentHole === 18} 
           className="w-14 h-14 bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center font-black text-lg border border-white/5 active:scale-95 transition-all disabled:opacity-30 shrink-0"
         >
           ▶
         </button>
      </div>

      <ScoreEntrySheet 
        isOpen={isScoreSheetOpen} 
        onClose={() => setIsScoreSheetOpen(false)} 
        currentHole={currentHole} 
        par={par} 
        onSave={handleScoreSave} 
        existingData={currentScoreData} 
        forceSingleScore={isSingleScoreTeamFormat} 
      />

      {isScorecardOpen && <MatchScorecardView insights={matchInsights} allHolesData={allHoles} holeScores={liveMatchScores} onClose={() => setIsScorecardOpen(false)} />}
    </div>
  );
}