import React, { useState } from 'react';
import { useScheduleData } from './hooks/useScheduleData';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../config/supabaseClient';
// Adjust this import path based on where your probability engine file is located relative to this file
import { MatchProbabilityBar } from '../probability/probability_engine'; 

export default function ScheduleView({ onBack, onLaunchScoringEngine }) {
  const { player, isAdmin } = useUser();
  const { allMatches, golfers, loading, refreshMatches } = useScheduleData();
  const [activeRound, setActiveRound] = useState(1);
  
  // Admin Panel UI State
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // New Match Form State
  const [selectedRound, setSelectedRound] = useState('1');
  const [matchFormat, setMatchFormat] = useState('1v1');
  const [teeTime, setTeeTime] = useState(''); 
  const [t1p1, setT1p1] = useState('');
  const [t1p2, setT1p2] = useState('');
  const [t2p1, setT2p1] = useState('');
  const [t2p2, setT2p2] = useState('');

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0f172a] flex items-center justify-center pb-safe">
        <span className="animate-spin h-10 w-10 border-4 border-[#34d399] border-t-transparent rounded-full" />
      </div>
    );
  }

  // --- STRICT ROSTER SEGMENTATION ENGINE ---
  const team1Options = golfers.filter(g => g.team === 'Slanted Clams');
  const team2Options = golfers.filter(g => g.team === 'Clam Brothelmen');

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (!t1p1 || !t2p1 || !teeTime) {
      alert('Tee Time, Team 1 Lead, and Team 2 Lead are required parameters.');
      return;
    }

    try {
      setIsCreating(true);

      const nextMatchNumber = allMatches.length + 1;
      
      const { error } = await supabase.from('matches').insert({
        round: parseInt(selectedRound),
        match_number: nextMatchNumber,
        format: matchFormat,
        tee_time: teeTime, 
        team1_player1: t1p1,
        team1_player2: t1p2 || null,
        team2_player1: t2p1,
        team2_player2: t2p2 || null,
        team1_score: 0,
        team2_score: 0,
        status: 'scheduled',
        is_live: false
      });

      if (error) throw error;

      // Reset form variables
      setT1p1(''); setT1p2(''); setT2p1(''); setT2p2(''); setTeeTime('');
      setShowAdminPanel(false);
      await refreshMatches(); 

    } catch (err) {
      alert('Failed to deploy match matrix: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return 'TBD';
    const [hours, minutes] = timeStr.split(':');
    const hourInt = parseInt(hours);
    const ampm = hourInt >= 12 ? 'PM' : 'AM';
    const displayHour = hourInt % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // --- BULLETPROOF ID TRANSLATION ---
  const getGolferName = (identifier) => {
    if (!identifier) return null;
    
    // Defensive catch: If Supabase auto-joined the profile object, grab the name directly
    if (typeof identifier === 'object' && identifier.name) {
      return identifier.name;
    }

    // Aggressively normalize the string to avoid case or whitespace mismatches
    const safeIdentifier = String(identifier).trim().toLowerCase();
    
    const found = golfers.find(g => 
      String(g.id).trim().toLowerCase() === safeIdentifier || 
      String(g.name).trim().toLowerCase() === safeIdentifier
    );
    
    return found ? found.name : identifier; 
  };

  // Filter matches for the active round, then sort them chronologically by tee_time
  const displayedMatches = allMatches
    .filter(m => m.round === activeRound)
    .sort((a, b) => {
      if (!a.tee_time) return 1;
      if (!b.tee_time) return -1;
      return a.tee_time.localeCompare(b.tee_time);
    });

  const rounds = [1, 2, 3, 4, 5];

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
        
        {isAdmin ? (
          <button 
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className={`text-[10px] font-black tracking-widest uppercase border px-3 py-1.5 rounded-xl transition-all ${
              showAdminPanel 
                ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                : 'text-amber-500 border-amber-500/30 bg-amber-500/5'
            }`}
          >
            {showAdminPanel ? 'Cancel' : '+ New Match'}
          </button>
        ) : (
          <div className="w-8 h-8"></div>
        )}
      </div>

      {/* --- RECONFIGURED COMMISSIONER DRAWER --- */}
      {isAdmin && showAdminPanel && (
        <div className="bg-[#111726] border-b border-amber-500/20 p-5 animate-fade-in relative z-20 shadow-2xl">
          <div className="max-w-md mx-auto">
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-4 flex items-center gap-1.5">
              <span>🛠️</span> Commissioner Command Deck
            </h2>
            
            <form onSubmit={handleCreateMatch} className="space-y-4">
              
              {/* Row 1: Round Selector & Game Format Selector */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Target Round</label>
                  <select value={selectedRound} onChange={(e) => setSelectedRound(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white font-bold focus:outline-none focus:border-amber-500/50">
                    <option value="1">Round 1</option>
                    <option value="2">Round 2</option>
                    <option value="3">Round 3</option>
                    <option value="4">Round 4</option>
                    <option value="5">Round 5</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Game Format</label>
                  <select value={matchFormat} onChange={(e) => setMatchFormat(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white font-bold focus:outline-none focus:border-amber-500/50">
                    <option value="1v1">1v1 Match Play</option>
                    <option value="Scramble">2-Man Scramble</option>
                    <option value="Shamble">2-Man Shamble</option>
                  </select>
                </div>
              </div>

              {/* Row 2: NATIVE TIME SELECTOR INPUT */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Tee Time</label>
                <input 
                  type="time" 
                  value={teeTime}
                  onChange={(e) => setTeeTime(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-amber-500/50 block color-scheme-dark"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Row 3: SEGMENTED PAIRINGS MATRIX */}
              <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                
                {/* Segmented Team 1 - Slanted Clams Only */}
                <div className="space-y-2.5">
                  <span className="text-[9px] font-black uppercase text-blue-400 block tracking-widest">Slanted Clams</span>
                  <select value={t1p1} onChange={(e) => setT1p1(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-blue-500/50">
                    <option value="">Lead Player...</option>
                    {team1Options.map(g => <option key={g.id} value={g.id} className="bg-[#0f172a]">{g.name}</option>)}
                  </select>
                  <select value={t1p2} onChange={(e) => setT1p2(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-slate-400 font-bold focus:outline-none focus:border-blue-500/50">
                    <option value="">Partner (Optional)...</option>
                    {team1Options.map(g => <option key={g.id} value={g.id} className="bg-[#0f172a]">{g.name}</option>)}
                  </select>
                </div>

                {/* Segmented Team 2 - Clam Brothelmen Only */}
                <div className="space-y-2.5 border-l border-white/5 pl-4">
                  <span className="text-[9px] font-black uppercase text-red-400 block tracking-widest">Clam Brothelmen</span>
                  <select value={t2p1} onChange={(e) => setT2p1(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-red-500/50">
                    <option value="">Lead Player...</option>
                    {team2Options.map(g => <option key={g.id} value={g.id} className="bg-[#0f172a]">{g.name}</option>)}
                  </select>
                  <select value={t2p2} onChange={(e) => setT2p2(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-slate-400 font-bold focus:outline-none focus:border-red-500/50">
                    <option value="">Partner (Optional)...</option>
                    {team2Options.map(g => <option key={g.id} value={g.id} className="bg-[#0f172a]">{g.name}</option>)}
                  </select>
                </div>

              </div>

              <button 
                type="submit"
                disabled={isCreating}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black py-3.5 rounded-xl transition-all uppercase tracking-wider text-xs mt-2 disabled:opacity-50 shadow-lg shadow-amber-500/10"
              >
                {isCreating ? 'Deploying Match...' : 'Deploy Pairing to Database'}
              </button>
            </form>
          </div>
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

      {/* Matches Feed Log Timeline */}
      <main className="p-5 flex flex-col gap-4 max-w-md mx-auto w-full flex-1">
        {displayedMatches.length === 0 ? (
          <div className="text-center p-12 bg-white/5 rounded-2xl border border-dashed border-white/10 text-xs text-slate-500 italic">
            No matches scheduled for Round {activeRound} yet.
          </div>
        ) : (
          displayedMatches.map((match) => {
            
            // --- BULLETPROOF AUTH CHECK ---
            const safePlayerId = player?.id ? String(player.id).trim().toLowerCase() : null;
            const safePlayerName = player?.name ? String(player.name).trim().toLowerCase() : null;
            
            const matchParticipants = [
              match.team1_player1, match.team1_player2,
              match.team2_player1, match.team2_player2
            ].filter(Boolean).map(p => {
              // Defensive catch for nested objects
              const val = typeof p === 'object' ? (p.id || p.name) : p;
              return String(val).trim().toLowerCase();
            });

            const isMyMatch = matchParticipants.some(p => p === safePlayerId || p === safePlayerName);

            return (
              <div 
                key={match.id}
                className={`bg-[#121827] rounded-2xl p-4 border transition-all flex flex-col gap-4 relative overflow-hidden ${
                  isMyMatch ? 'border-[#34d399]/40 shadow-[0_0_20px_rgba(52,211,153,0.05)]' : 'border-white/5'
                }`}
              >
                {isMyMatch && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#34d399] to-emerald-600"></div>}

                {/* Card Header */}
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span>{match.format || '1v1'}</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span className="text-slate-300 font-mono text-xs font-bold tracking-tight">{formatDisplayTime(match.tee_time)}</span>
                  </div>
                  {match.is_live ? (
                    <span className="text-[#34d399] bg-[#34d399]/10 px-2 py-0.5 rounded-md border border-[#34d399]/20 flex items-center gap-1 animate-pulse">Live Scoring</span>
                  ) : match.status === 'completed' ? (
                    <span className="text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">Final</span>
                  ) : (
                    <span className="text-slate-600">Scheduled</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 items-center bg-black/20 p-3 rounded-xl border border-white/5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-blue-400">Slanted Clams</span>
                    <div className="text-sm font-black tracking-tight truncate">{getGolferName(match.team1_player1)}</div>
                    <div className="text-sm font-black tracking-tight truncate text-slate-400">{getGolferName(match.team1_player2) || 'Single Solo'}</div>
                  </div>

                  <div className="space-y-1 text-right border-l border-white/5 pl-4">
                    <span className="text-[9px] font-black uppercase tracking-wider text-red-400">Clam Brothelmen</span>
                    <div className="text-sm font-black tracking-tight truncate">{getGolferName(match.team2_player1)}</div>
                    <div className="text-sm font-black tracking-tight truncate text-slate-400">{getGolferName(match.team2_player2) || 'Single Solo'}</div>
                  </div>
                </div>

                {/* PROBABILITY ENGINE */}
                <MatchProbabilityBar 
                  matchId={match.id} 
                  status={match.status} 
                  team1Name={getGolferName(match.team1_player1)}
                  team2Name={getGolferName(match.team2_player1)}
                />

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
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}