import React, { useState } from 'react';
import { useScheduleData } from './hooks/useScheduleData';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../config/supabaseClient';
// Adjust this import path based on where your probability engine file is located relative to this file
import { MatchProbabilityBar } from '../probability/probability_engine'; 

// Metadata mapping for the UI
const ROUND_METADATA = {
  1: { date: 'June 25th', course: 'Quarry' },
  2: { date: 'June 26th', course: 'Quarry' },
  3: { date: 'June 26th', course: 'Legend' },
  4: { date: 'June 27th', course: 'Legend' },
  5: { date: 'June 27th', course: 'Quarry' }
};

export default function ScheduleView({ onBack, onLaunchScoringEngine }) {
  const { player, isAdmin } = useUser();
  const { allMatches, golfers, loading, refreshMatches } = useScheduleData();
  const [activeRound, setActiveRound] = useState(1);
  
  // Admin / Captain State
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Inline Editing State
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editForm, setEditForm] = useState({ t1p1: '', t1p2: '', t2p1: '', t2p2: '', format: '' });

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0f172a] flex items-center justify-center pb-safe">
        <span className="animate-spin h-10 w-10 border-4 border-[#34d399] border-t-transparent rounded-full" />
      </div>
    );
  }

  // --- CAPTAIN AUTHORIZATION ENGINE ---
  const isClamsCaptain = isAdmin || player?.name?.includes('Kevin Gurney');
  const isBrothelmenCaptain = isAdmin || player?.id === '194b99e6-cbe6-40f4-8286-5b939e249274';
  const isAnyCaptain = isClamsCaptain || isBrothelmenCaptain;

  // --- STRICT ROSTER SEGMENTATION ---
  const team1Options = golfers.filter(g => g.team === 'Slanted Clams');
  const team2Options = golfers.filter(g => g.team === 'Clam Brothelmen');

  // --- THE "PRE-SET" SCHEDULE GENERATOR ---
  const handleGenerateSkeleton = async () => {
    if (!window.confirm("Are you sure? This will deploy 20 placeholder matches into the database.")) return;
    
    setIsProcessing(true);
    try {
      const scheduleBlueprint = [
        { round: 1, format: 'TBD', times: ['15:30', '15:40', '15:50', '16:00'] },
        { round: 2, format: 'TBD', times: ['09:00', '09:10', '09:20', '09:30'] },
        { round: 3, format: 'TBD', times: ['15:30', '15:40', '15:50', '16:00'] },
        { round: 4, format: 'TBD', times: ['09:00', '09:10', '09:20', '09:30'] },
        { round: 5, format: '1v1', times: ['15:30', '15:40', '15:50', '16:00'] }
      ];

      let matchCounter = 1;
      const inserts = [];

      scheduleBlueprint.forEach(roundData => {
        roundData.times.forEach(time => {
          inserts.push({
            round: roundData.round,
            match_number: matchCounter++,
            format: roundData.format,
            tee_time: time,
            team1_score: 0,
            team2_score: 0,
            status: 'scheduled',
            is_live: false
          });
        });
      });

      const { error } = await supabase.from('matches').insert(inserts);
      if (error) throw error;
      
      await refreshMatches();
    } catch (err) {
      alert("Error generating schedule: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- UPDATE EXISTING MATCH ROSTER ---
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

      const { error } = await supabase
        .from('matches')
        .update(updates)
        .eq('id', matchId);

      if (error) throw error;

      setEditingMatchId(null);
      await refreshMatches();
    } catch (err) {
      alert("Failed to update roster: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HARD RESET MATCH (ADMIN ONLY) ---
  const handleResetMatch = async (matchId) => {
    if (!window.confirm("WARNING: This will completely wipe the roster, scores, and status for this match slot. Are you sure?")) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          team1_player1: null,
          team1_player2: null,
          team2_player1: null,
          team2_player2: null,
          team1_score: 0,
          team2_score: 0,
          status: 'scheduled',
          is_live: false,
          format: 'TBD'
        })
        .eq('id', matchId);

      if (error) throw error;

      setEditingMatchId(null);
      await refreshMatches();
    } catch (err) {
      alert("Failed to reset match: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const startEditing = (match) => {
    setEditingMatchId(match.id);
    setEditForm({
      t1p1: match.team1_player1 || '',
      t1p2: match.team1_player2 || '',
      t2p1: match.team2_player1 || '',
      t2p2: match.team2_player2 || '',
      format: match.format || 'TBD'
    });
  };

  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return 'TBD';
    const [hours, minutes] = timeStr.split(':');
    const hourInt = parseInt(hours);
    const ampm = hourInt >= 12 ? 'PM' : 'AM';
    const displayHour = hourInt % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getGolferName = (identifier) => {
    if (!identifier) return null;
    if (typeof identifier === 'object' && identifier.name) return identifier.name;
    const safeIdentifier = String(identifier).trim().toLowerCase();
    const found = golfers.find(g => 
      String(g.id).trim().toLowerCase() === safeIdentifier || 
      String(g.name).trim().toLowerCase() === safeIdentifier
    );
    return found ? found.name : identifier; 
  };

  const displayedMatches = allMatches
    .filter(m => m.round === activeRound)
    .sort((a, b) => {
      if (!a.tee_time) return 1;
      if (!b.tee_time) return -1;
      return a.tee_time.localeCompare(b.tee_time);
    });

  const rounds = [1, 2, 3, 4, 5];
  const roundMeta = ROUND_METADATA[activeRound];

  return (
    <div className="min-h-[100dvh] bg-[#090d16] text-white font-sans flex flex-col pb-safe fixed inset-0 z-40 overflow-y-auto style-scrolling-touch">
      
      {/* Top Header */}
      <div className="px-5 py-4 flex justify-between items-center bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20">
        <button onClick={onBack} className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 active:scale-95 transition-transform">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          Hub
        </button>
        <h1 className="font-black text-lg tracking-tight uppercase italic">
          Tournament Log
        </h1>
        <div className="w-12"></div>
      </div>

      {/* Auto-Generate Button */}
      {isAdmin && allMatches.length === 0 && (
        <div className="p-5 bg-amber-500/10 border-b border-amber-500/20 text-center">
          <p className="text-xs text-amber-500 font-bold mb-3 uppercase tracking-wider">Database is currently empty</p>
          <button 
            onClick={handleGenerateSkeleton}
            disabled={isProcessing}
            className="bg-amber-500 text-black font-black uppercase text-xs tracking-widest px-6 py-3 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-95 transition-all"
          >
            {isProcessing ? 'Generating...' : 'Initialize Base Schedule'}
          </button>
        </div>
      )}

      {/* Timeline Round Selector Matrix */}
      <div className="bg-[#0f172a]/95 backdrop-blur-xl border-b border-white/5 sticky top-[60px] z-10">
        <div className="px-5 py-3 flex gap-2 overflow-x-auto max-w-md mx-auto no-scrollbar">
          {rounds.map((r) => (
            <button
              key={r}
              onClick={() => setActiveRound(r)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                activeRound === r 
                  ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                  : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
              }`}
            >
              Round {r}
            </button>
          ))}
        </div>
      </div>

      {/* Round Meta Banner */}
      <div className="text-center pt-5 pb-1 max-w-md mx-auto w-full">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">
          {roundMeta.date} <span className="text-amber-500 px-2">—</span> {roundMeta.course}
        </h2>
      </div>

      {/* Matches Feed Log Timeline */}
      <main className="p-5 flex flex-col gap-4 max-w-md mx-auto w-full flex-1">
        {displayedMatches.length === 0 ? (
          <div className="text-center p-12 bg-white/5 rounded-2xl border border-dashed border-white/10 text-xs text-slate-500 italic">
            No matches scheduled for Round {activeRound} yet.
          </div>
        ) : (
          displayedMatches.map((match) => {
            
            const safePlayerId = player?.id ? String(player.id).trim().toLowerCase() : null;
            const safePlayerName = player?.name ? String(player.name).trim().toLowerCase() : null;
            
            const matchParticipants = [
              match.team1_player1, match.team1_player2,
              match.team2_player1, match.team2_player2
            ].filter(Boolean).map(p => {
              const val = typeof p === 'object' ? (p.id || p.name) : p;
              return String(val).trim().toLowerCase();
            });

            const isMyMatch = matchParticipants.some(p => p === safePlayerId || p === safePlayerName);
            const isEditing = editingMatchId === match.id;

            // Captains can only edit if it hasn't started yet. Admins can edit anytime.
            const canEdit = isAdmin || (isAnyCaptain && match.status === 'scheduled' && !match.is_live);

            return (
              <div 
                key={match.id}
                className={`bg-[#121827] rounded-2xl p-4 border transition-all flex flex-col gap-4 relative overflow-hidden ${
                  isMyMatch && !isEditing ? 'border-[#34d399]/40 shadow-[0_0_20px_rgba(52,211,153,0.05)]' : 'border-white/5'
                }`}
              >
                {isMyMatch && !isEditing && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#34d399] to-emerald-600"></div>}

                {/* Card Header */}
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <div className="flex items-center gap-1.5">
                    {isEditing && isAdmin ? (
                      <select 
                        value={editForm.format} 
                        onChange={(e) => setEditForm({...editForm, format: e.target.value})}
                        className="bg-black/50 border border-white/10 rounded px-2 py-1 text-[#34d399]"
                      >
                        <option value="TBD">TBD</option>
                        <option value="1v1">1v1</option>
                        <option value="Scramble">Scramble</option>
                        <option value="Shamble">Shamble</option>
                        <option value="Vegas">Vegas</option>
                      </select>
                    ) : (
                      <span className={match.format !== 'TBD' ? 'text-[#34d399]' : ''}>{match.format || 'TBD'}</span>
                    )}
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span className="text-slate-300 font-mono text-xs font-bold tracking-tight">{formatDisplayTime(match.tee_time)}</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span className="text-amber-500/80">{roundMeta.course}</span>
                  </div>
                  
                  {canEdit && !isEditing && (
                    <button 
                      onClick={() => startEditing(match)}
                      className="text-amber-500 hover:text-amber-400 bg-amber-500/10 px-2 py-1 rounded transition-colors"
                    >
                      {match.team1_player1 ? 'Edit' : 'Assign'}
                    </button>
                  )}
                  {isEditing && (
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                         <button 
                           onClick={() => handleResetMatch(match.id)}
                           disabled={isProcessing}
                           className="text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded active:scale-95 transition-all"
                         >
                           Reset
                         </button>
                      )}
                      <button 
                        onClick={() => setEditingMatchId(null)}
                        disabled={isProcessing}
                        className="text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded active:scale-95 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleSaveRoster(match.id)}
                        disabled={isProcessing}
                        className="text-black bg-amber-500 px-3 py-1 rounded shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                      >
                        {isProcessing ? '...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>

                {/* --- THE ASSIGNMENT UI MATRIX --- */}
                <div className="grid grid-cols-2 gap-4 items-center bg-black/20 p-3 rounded-xl border border-white/5">
                  
                  {/* SLANTED CLAMS SIDE */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-blue-400">Slanted Clams</span>
                    
                    {isEditing && isClamsCaptain ? (
                      <div className="space-y-2 mt-2">
                        <select value={editForm.t1p1} onChange={(e) => setEditForm({...editForm, t1p1: e.target.value})} className="w-full bg-black/40 border border-blue-500/30 rounded p-1.5 text-xs text-white">
                          <option value="">Select Lead...</option>
                          {team1Options.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        <select value={editForm.t1p2} onChange={(e) => setEditForm({...editForm, t1p2: e.target.value})} className="w-full bg-black/40 border border-blue-500/30 rounded p-1.5 text-xs text-slate-400">
                          <option value="">Partner (Optional)...</option>
                          {team1Options.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm font-black tracking-tight truncate">{getGolferName(match.team1_player1) || 'TBD'}</div>
                        <div className="text-sm font-black tracking-tight truncate text-slate-400">
                           {match.team1_player2 ? getGolferName(match.team1_player2) : (match.team1_player1 ? 'Single Solo' : '')}
                        </div>
                      </>
                    )}
                  </div>

                  {/* CLAM BROTHELMEN SIDE */}
                  <div className="space-y-1 text-right border-l border-white/5 pl-4">
                    <span className="text-[9px] font-black uppercase tracking-wider text-red-400">Clam Brothelmen</span>
                    
                    {isEditing && isBrothelmenCaptain ? (
                      <div className="space-y-2 mt-2">
                        <select value={editForm.t2p1} onChange={(e) => setEditForm({...editForm, t2p1: e.target.value})} className="w-full bg-black/40 border border-red-500/30 rounded p-1.5 text-xs text-white">
                          <option value="">Select Lead...</option>
                          {team2Options.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        <select value={editForm.t2p2} onChange={(e) => setEditForm({...editForm, t2p2: e.target.value})} className="w-full bg-black/40 border border-red-500/30 rounded p-1.5 text-xs text-slate-400">
                          <option value="">Partner (Optional)...</option>
                          {team2Options.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm font-black tracking-tight truncate">{getGolferName(match.team2_player1) || 'TBD'}</div>
                        <div className="text-sm font-black tracking-tight truncate text-slate-400">
                          {match.team2_player2 ? getGolferName(match.team2_player2) : (match.team2_player1 ? 'Single Solo' : '')}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Hide interaction bar when editing so things stay clean */}
                {!isEditing && (
                  <>
                    {match.team1_player1 && match.team2_player1 && (
                      <MatchProbabilityBar 
                        matchId={match.id} 
                        status={match.status} 
                        team1Name={getGolferName(match.team1_player1)}
                        team2Name={getGolferName(match.team2_player1)}
                      />
                    )}

                    <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Match State</span>
                        <span className="text-sm font-black tracking-tighter text-slate-200 tabular-nums">
                          {match.status === 'completed' || match.is_live ? `${match.team1_score} vs ${match.team2_score}` : 'AS // TEE 1'}
                        </span>
                      </div>

                      <button 
                        onClick={() => onLaunchScoringEngine(match.id)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-transform active:scale-95 ${
                          isMyMatch ? 'bg-[#34d399] text-black' : 'bg-white/5 text-slate-300 border border-white/10'
                        }`}
                      >
                        {isMyMatch ? 'Score My Card' : 'View Broadcast'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}