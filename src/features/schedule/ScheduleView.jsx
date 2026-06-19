import React, { useState } from 'react';
import { useScheduleData } from './hooks/useScheduleData';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../config/supabaseClient';
import { calculatePlayingHandicaps } from '../../utils/matchPlayEngine';
import { MatchProbabilityBar } from '../probability/probability_engine'; 

const ROUND_METADATA = {
  1: { date: 'June 25th', parseDate: '2026-06-25', course: 'Quarry' },
  2: { date: 'June 26th', parseDate: '2026-06-26', course: 'Quarry' },
  3: { date: 'June 26th', parseDate: '2026-06-26', course: 'Legend' },
  4: { date: 'June 27th', parseDate: '2026-06-27', course: 'Legend' },
  5: { date: 'June 27th', parseDate: '2026-06-27', course: 'Quarry' }
};

export default function ScheduleView({ onBack, onLaunchScoringEngine }) {
  const { player, isAdmin } = useUser();
  const { allMatches, golfers, loading, refreshMatches } = useScheduleData();
  const [activeRound, setActiveRound] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editForm, setEditForm] = useState({ t1p1: '', t1p2: '', t2p1: '', t2p2: '', format: '' });

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0f172a] flex items-center justify-center pb-safe">
        <span className="animate-spin h-10 w-10 border-4 border-[#34d399] border-t-transparent rounded-full" />
      </div>
    );
  }

  const isClamsCaptain = isAdmin || player?.name?.includes('Kevin Gurney');
  const isBrothelmenCaptain = isAdmin || player?.id === '194b99e6-cbe6-40f4-8286-5b939e249274';
  const isAnyCaptain = isClamsCaptain || isBrothelmenCaptain;

  const team1Options = golfers.filter(g => g.team === 'Slanted Clams');
  const team2Options = golfers.filter(g => g.team === 'Clam Brothelmen');

  const isMatchReadyToStart = (round, teeTime) => {
    if (!teeTime) return false;
    const meta = ROUND_METADATA[round];
    if (!meta || !meta.parseDate) return true;
    const matchDateStr = `${meta.parseDate}T${teeTime}-05:00`;
    return new Date().getTime() >= (new Date(matchDateStr).getTime() - (30 * 60 * 1000));
  };

  // 🎯 CORE FIX: The universal lookup tool. Checks auth_id first, fallback to id.
  const resolveGolfer = (refId) => {
    if (!refId) return null;
    const target = String(refId).trim().toLowerCase();
    return golfers.find(g => 
      (g.auth_id && String(g.auth_id).trim().toLowerCase() === target) || 
      (g.id && String(g.id).trim().toLowerCase() === target)
    );
  };

  const getGolferName = (refId) => {
    const golfer = resolveGolfer(refId);
    return golfer ? golfer.name : 'TBD';
  };

  // Maps the current match value to the dropdown correctly so it doesn't show blank
  const getDropdownValue = (refId) => {
    const golfer = resolveGolfer(refId);
    return golfer ? (golfer.auth_id || golfer.id) : '';
  };

  const handleGenerateSkeleton = async () => { /* ... unchanged ... */ };
  
  const handleSaveRoster = async (matchId) => {
    setIsProcessing(true);
    try {
      const updates = {};
      if (isClamsCaptain) {
        updates.team1_player1 = editForm.t1p1 || null;
        updates.team1_player2 = editForm.t1p2 || null;
      }
      if (isBrothelmenCaptain) {
        updates.team2_player1 = editForm.t2p1 || null;
        updates.team2_player2 = editForm.t2p2 || null;
      }
      if (isAdmin) {
        updates.format = editForm.format || 'TBD';
      }

      const { error } = await supabase.from('matches').update(updates).eq('id', matchId);
      if (error) throw error;

      setEditingMatchId(null);
      await refreshMatches();
    } catch (err) {
      alert("Failed to update roster: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetMatch = async (matchId) => { /* ... unchanged ... */ };

  const startEditing = (match) => {
    setEditingMatchId(match.id);
    setEditForm({
      t1p1: getDropdownValue(match.team1_player1),
      t1p2: getDropdownValue(match.team1_player2),
      t2p1: getDropdownValue(match.team2_player1),
      t2p2: getDropdownValue(match.team2_player2),
      format: match.format || 'TBD'
    });
  };

  const formatDisplayTime = (t) => t ? new Date(`2000-01-01T${t}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD';

  const getStrokeChipLayout = (match) => {
    if (!golfers || golfers.length === 0) return <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-500 animate-pulse">Syncing...</span>;
    if (!match.team1_player1 && !match.team2_player1) return <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-white/5 bg-white/5 text-slate-500">Unassigned</span>;

    const t1p1 = resolveGolfer(match.team1_player1);
    const t1p2 = resolveGolfer(match.team1_player2);
    const t2p1 = resolveGolfer(match.team2_player1);
    const t2p2 = resolveGolfer(match.team2_player2);

    const team1Arr = [];
    if (t1p1) team1Arr.push({ id: 't1p1', courseHandicap: parseInt(t1p1.handicap, 10) || 0 });
    if (t1p2) team1Arr.push({ id: 't1p2', courseHandicap: parseInt(t1p2.handicap, 10) || 0 });

    const team2Arr = [];
    if (t2p1) team2Arr.push({ id: 't2p1', courseHandicap: parseInt(t2p1.handicap, 10) || 0 });
    if (t2p2) team2Arr.push({ id: 't2p2', courseHandicap: parseInt(t2p2.handicap, 10) || 0 });

    const format = match.format || '1v1';
    const handicapData = calculatePlayingHandicaps(format, team1Arr, team2Arr);

    if (handicapData.type === 'team') {
      if (handicapData.team1Strokes > 0) return <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/5 text-blue-400">Clams +{handicapData.team1Strokes} Strokes</span>;
      if (handicapData.team2Strokes > 0) return <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/5 text-red-400">Brothelmen +{handicapData.team2Strokes} Strokes</span>;
    } else {
      const t1Max = handicapData.team1 ? Math.max(...Object.values(handicapData.team1), 0) : 0;
      const t2Max = handicapData.team2 ? Math.max(...Object.values(handicapData.team2), 0) : 0;
      if (t1Max > 0 || t2Max > 0) {
        if (t1Max >= t2Max) return <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/5 text-blue-400">Clams getting up to {t1Max} stks</span>;
        return <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/5 text-red-400">Brothelmen getting up to {t2Max} stks</span>;
      }
    }
    return <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-white/5 bg-white/5 text-slate-500">Scratch Match</span>;
  };

  const displayedMatches = allMatches.filter(m => m.round === activeRound).sort((a, b) => (a.tee_time || '').localeCompare(b.tee_time || ''));

  return (
    <div className="min-h-[100dvh] bg-[#090d16] text-white font-sans flex flex-col pb-safe fixed inset-0 z-40 overflow-y-auto style-scrolling-touch">
      <div className="px-5 py-4 flex justify-between items-center bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20">
        <button onClick={onBack} className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 active:scale-95 transition-transform">◀ Hub</button>
        <h1 className="font-black text-lg tracking-tight uppercase italic">Tournament Log</h1>
        <div className="w-12"></div>
      </div>

      <div className="bg-[#0f172a]/95 backdrop-blur-xl border-b border-white/5 sticky top-[60px] z-10">
        <div className="px-5 py-3 flex gap-2 overflow-x-auto max-w-md mx-auto no-scrollbar">
          {[1,2,3,4,5].map((r) => (
            <button key={r} onClick={() => setActiveRound(r)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${activeRound === r ? 'bg-amber-500 text-black shadow-lg' : 'bg-white/5 text-slate-400 border border-white/5'}`}>Round {r}</button>
          ))}
        </div>
      </div>

      <main className="p-5 flex flex-col gap-4 max-w-md mx-auto w-full flex-1">
        {displayedMatches.map((match) => {
          // Verify if the current user is in this match using the universal resolver
          const me = resolveGolfer(player?.auth_id || player?.id);
          const isMyMatch = me && [match.team1_player1, match.team1_player2, match.team2_player1, match.team2_player2].some(ref => {
            const g = resolveGolfer(ref);
            return g && g.id === me.id;
          });
          
          const isMatchTimeReady = isMatchReadyToStart(match.round, match.tee_time);
          const isEditing = editingMatchId === match.id;
          const canEdit = isAdmin || (isAnyCaptain && match.status === 'scheduled' && !match.is_live);

          return (
            <div key={match.id} className={`bg-[#121827] rounded-2xl p-4 border relative overflow-hidden flex flex-col gap-4 transition-all ${isMyMatch && !isEditing ? 'border-[#34d399]/40 shadow-lg' : 'border-white/5'}`}>
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isEditing ? (
                    <select value={editForm.format} onChange={(e) => setEditForm({...editForm, format: e.target.value})} className="bg-black/50 border border-white/10 rounded px-2 py-1 text-[#34d399]">
                      <option value="TBD">TBD</option><option value="1v1">1v1</option><option value="Scramble">Scramble</option><option value="Shamble">Shamble</option><option value="Vegas">Vegas</option>
                    </select>
                  ) : <span className="text-[#34d399] font-black">{match.format || 'TBD'}</span>}
                  <span className="text-slate-700 font-black">•</span>
                  <span className="text-slate-300 font-mono font-bold">{formatDisplayTime(match.tee_time)}</span>
                  <span className="text-slate-700 font-black">•</span>
                  <span className="text-amber-500/80 mr-1">{ROUND_METADATA[activeRound]?.course}</span>
                  {!isEditing && getStrokeChipLayout(match)}
                </div>
                
                {!isEditing && canEdit && <button onClick={() => startEditing(match)} className="text-amber-500 hover:text-amber-400 bg-amber-500/10 px-2 py-1 rounded transition-colors">{match.team1_player1 ? 'Edit' : 'Assign'}</button>}
                {isEditing && (
                  <div className="flex items-center gap-2">
                    {isAdmin && <button onClick={() => handleResetMatch(match.id)} disabled={isProcessing} className="text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded active:scale-95 transition-all">Reset</button>}
                    <button onClick={() => setEditingMatchId(null)} disabled={isProcessing} className="text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded active:scale-95 transition-all">Cancel</button>
                    <button onClick={() => handleSaveRoster(match.id)} disabled={isProcessing} className="text-black bg-amber-500 px-3 py-1 rounded shadow-lg active:scale-95 transition-all">{isProcessing ? '...' : 'Save'}</button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 items-center bg-black/20 p-3 rounded-xl border border-white/5">
                <div>
                  <span className="text-[9px] font-black uppercase text-blue-400 block">Slanted Clams</span>
                  {isEditing && isClamsCaptain ? (
                    <div className="space-y-2 mt-2">
                      <select value={editForm.t1p1} onChange={(e) => setEditForm({...editForm, t1p1: e.target.value})} className="w-full bg-black/40 border border-blue-500/30 rounded p-1.5 text-xs text-white">
                        <option value="">Select Lead...</option>
                        {team1Options.map(g => <option key={g.id} value={g.auth_id || g.id}>{g.name}</option>)}
                      </select>
                      <select value={editForm.t1p2} onChange={(e) => setEditForm({...editForm, t1p2: e.target.value})} className="w-full bg-black/40 border border-blue-500/30 rounded p-1.5 text-xs text-slate-400">
                        <option value="">Partner (Optional)...</option>
                        {team1Options.map(g => <option key={g.id} value={g.auth_id || g.id}>{g.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-black text-white truncate">{getGolferName(match.team1_player1)}</div>
                      <div className="text-xs text-slate-400 truncate">{match.team1_player2 ? getGolferName(match.team1_player2) : ''}</div>
                    </>
                  )}
                </div>
                <div className="text-right border-l border-white/5 pl-4">
                  <span className="text-[9px] font-black uppercase text-red-400 block">Brothelmen</span>
                  {isEditing && isBrothelmenCaptain ? (
                    <div className="space-y-2 mt-2">
                      <select value={editForm.t2p1} onChange={(e) => setEditForm({...editForm, t2p1: e.target.value})} className="w-full bg-black/40 border border-red-500/30 rounded p-1.5 text-xs text-white">
                        <option value="">Select Lead...</option>
                        {team2Options.map(g => <option key={g.id} value={g.auth_id || g.id}>{g.name}</option>)}
                      </select>
                      <select value={editForm.t2p2} onChange={(e) => setEditForm({...editForm, t2p2: e.target.value})} className="w-full bg-black/40 border border-red-500/30 rounded p-1.5 text-xs text-slate-400">
                        <option value="">Partner (Optional)...</option>
                        {team2Options.map(g => <option key={g.id} value={g.auth_id || g.id}>{g.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-black text-white truncate">{getGolferName(match.team2_player1)}</div>
                      <div className="text-xs text-slate-400 truncate">{match.team2_player2 ? getGolferName(match.team2_player2) : ''}</div>
                    </>
                  )}
                </div>
              </div>

              {!isEditing && match.team1_player1 && match.team2_player1 && (
                <MatchProbabilityBar matchId={match.id} status={match.status} team1Name={getGolferName(match.team1_player1)} team2Name={getGolferName(match.team2_player1)} />
              )}

              {!isEditing && (
                <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-1">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-500 uppercase">Match State</span>
                    <span className="text-sm font-black text-slate-200">{match.status === 'completed' || match.status === 'live' ? `${match.team1_score} vs ${match.team2_score}` : 'AS // TEE 1'}</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (isMyMatch && match.status === 'scheduled' && !isMatchTimeReady) {
                        alert("Too early to launch scoring. The engine unlocks 30 minutes before your tee time.");
                        return;
                      }
                      onLaunchScoringEngine(match.id);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-transform active:scale-95 ${isMyMatch ? (match.status === 'scheduled' && !isMatchTimeReady ? 'bg-slate-800 text-slate-500 border border-slate-700' : 'bg-[#34d399] text-black') : 'bg-white/5 text-slate-300'}`}
                  >
                    {isMyMatch ? (match.status === 'scheduled' && !isMatchTimeReady ? 'Too Early to Start' : 'Score My Card') : (match.status === 'scheduled' ? 'Match Preview' : 'View Broadcast')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}