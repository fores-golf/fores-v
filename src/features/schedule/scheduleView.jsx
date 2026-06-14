import React, { useState } from 'react';
import { useScheduleData } from './hooks/useScheduleData';

export default function ScheduleView({ onBack, onLaunchScoringEngine }) {
  const { schedule, golfers, loading, createNewMatch, startMatchLive } = useScheduleData();
  const [showDrawer, setShowDrawer] = useState(false);

  // Form State Definitions
  const [round, setRound] = useState('1');
  const [courseName, setCourseName] = useState('The Legend');
  const [format, setFormat] = useState('1v1');
  const [teeTime, setTeeTime] = useState('08:00 AM');
  const [t1p1, setT1p1] = useState('');
  const [t1p2, setT1p2] = useState('');
  const [t2p1, setT2p1] = useState('');
  const [t2p2, setT2p2] = useState('');

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!t1p1 || !t2p1) {
      alert('Please select primary players for both team rosters.');
      return;
    }
    const res = await createNewMatch({ round, courseName, format, teeTime, t1p1, t1p2, t2p1, t2p2 });
    if (res.success) {
      setShowDrawer(false);
      setT1p1(''); setT1p2(''); setT2p1(''); setT2p2('');
    }
  };

  const handleInitiateMatch = async (matchId) => {
    const res = await startMatchLive(matchId);
    if (res.success) {
      onLaunchScoringEngine(matchId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0f172a] flex items-center justify-center pb-safe">
        <span className="animate-spin h-10 w-10 border-4 border-[#34d399] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Split rosters dynamically by reading the schema 'team' key parameters
  const clamsRoster = golfers.filter(g => g.team === 'Slanted Clams');
  const brothelmenRoster = golfers.filter(g => g.team === 'Clam Brothelmen');

  const renderMatchCard = (match) => {
    const isLive = match.status === 'live';
    const isDone = match.status === 'completed';

    return (
      <div 
        key={match.id} 
        className={`bg-white/5 border rounded-2xl p-4 shadow-md backdrop-blur-md relative overflow-hidden flex flex-col gap-3 transition-all ${
          isLive ? 'border-red-500/20 bg-gradient-to-r from-red-500/5 via-transparent to-transparent shadow-[0_0_20px_rgba(239,68,68,0.05)]' : 'border-white/5'
        }`}
      >
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 self-start">
              Round {match.round} • {match.format}
            </span>
            <span className="text-[9px] text-slate-500 font-bold mt-1 pl-0.5">{match.course_name}</span>
          </div>
          
          {isLive && (
            <div className="flex items-center gap-1.5 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 text-red-400 text-[9px] font-extrabold uppercase tracking-wider animate-pulse">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              Hole {match.current_hole}
            </div>
          )}
          {!isLive && !isDone && (
            <span className="text-[10px] font-black tracking-tight text-[#34d399] bg-[#34d399]/10 px-2 py-0.5 rounded border border-[#34d399]/10">
              {match.tee_time}
            </span>
          )}
          {isDone && (
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded border border-slate-500/10">
              Final
            </span>
          )}
        </div>

        <div className="flex justify-between items-center text-sm my-1">
          <div className="flex flex-col gap-0.5 text-left w-[40%]">
            <span className={`font-black tracking-tight truncate ${isDone && match.team1_score > match.team2_score ? "text-blue-400" : "text-slate-200"}`}>
              {match.team1_player1}
            </span>
            {match.team1_player2 && <span className="font-medium text-xs text-slate-500 truncate">{match.team1_player2}</span>}
          </div>

          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-xl border border-white/5 font-black text-base tabular-nums shadow-inner">
            {isDone || isLive ? (
              <>
                <span className={match.team1_score > match.team2_score ? "text-blue-400" : "text-slate-400"}>{match.team1_score}</span>
                <span className="text-xs text-slate-600 font-bold">-</span>
                <span className={match.team2_score > match.team1_score ? "text-red-400" : "text-slate-400"}>{match.team2_score}</span>
              </>
            ) : (
              <span className="text-[10px] font-black uppercase text-slate-600 px-1">VS</span>
            )}
          </div>

          <div className="flex flex-col gap-0.5 text-right w-[40%]">
            <span className={`font-black tracking-tight truncate ${isDone && match.team2_score > match.team1_score ? "text-red-400" : "text-slate-200"}`}>
              {match.team2_player1}
            </span>
            {match.team2_player2 && <span className="font-medium text-xs text-slate-500 truncate">{match.team2_player2}</span>}
          </div>
        </div>

        {isLive && (
          <button 
            onClick={() => onLaunchScoringEngine(match.id)}
            className="w-full bg-red-600/15 hover:bg-red-600/25 border border-red-500/20 text-red-400 font-black py-2.5 rounded-xl transition-all active:scale-[0.98] text-xs uppercase tracking-wider mt-1"
          >
            Enter Scorecard View
          </button>
        )}
        {!isLive && !isDone && (
          <button 
            onClick={() => handleIntroduceMatchLive(match.id)}
            className="w-full bg-[#1e8c45]/20 hover:bg-[#1e8c45]/30 border border-[#34d399]/20 text-[#34d399] font-black py-2.5 rounded-xl transition-all active:scale-[0.98] text-xs uppercase tracking-wider mt-1"
          >
            Start Match Live
          </button>
        )}
      </div>
    );
  };

  const handleIntroduceMatchLive = async (matchId) => {
    const res = await startMatchLive(matchId);
    if (res.success) {
      onLaunchScoringEngine(matchId);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#090d16] text-white font-sans pb-safe fixed inset-0 z-40 overflow-y-auto">
      
      {/* Top Bar Header Layout */}
      <div className="px-5 py-4 flex justify-between items-center bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-10">
        <button onClick={onBack} className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 active:scale-95 transition-transform">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          Hub
        </button>
        <h1 className="font-black text-lg tracking-tight uppercase italic flex items-center gap-1.5">
          <svg className="w-5 h-5 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          Trip Schedule
        </h1>
        <button 
          onClick={() => setShowDrawer(true)}
          className="bg-[#34d399] text-black font-black text-xs px-3 py-1.5 rounded-xl active:scale-95 transition-transform uppercase tracking-wider shadow-md"
        >
          + Add
        </button>
      </div>

      <main className="p-5 flex flex-col gap-6 max-w-md mx-auto">
        {/* LIVE FEED */}
        {schedule.live.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 ml-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              Live Group Matches
            </h2>
            <div className="flex flex-col gap-3">
              {schedule.live.map(renderMatchCard)}
            </div>
          </section>
        )}

        {/* CHRONOLOGICAL TEE SHEET */}
        <section className="space-y-2.5">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
            Upcoming Tee Times
          </h2>
          <div className="flex flex-col gap-3">
            {schedule.upcoming.length === 0 ? (
              <div className="text-center p-6 bg-white/5 border border-white/5 rounded-2xl text-xs text-slate-500 italic">
                All rounds tee'd off for the day.
              </div>
            ) : (
              schedule.upcoming.map(renderMatchCard)
            )}
          </div>
        </section>

        {/* COMPLETED SLATE */}
        {schedule.completed.length > 0 && (
          <section className="space-y-2.5 pt-4 border-t border-white/5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
              Clubhouse Board Results
            </h2>
            <div className="flex flex-col gap-3">
              {schedule.completed.map(renderMatchCard)}
            </div>
          </section>
        )}
      </main>

      {/* --- CREATE NEW MATCH FORM DRAWER OVERLAY --- */}
      {showDrawer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end justify-center">
          <div className="bg-[#0f172a] border-t border-white/10 rounded-t-3xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh] shadow-2xl flex flex-col gap-5">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-black text-base uppercase tracking-tight italic text-slate-100">Create Match Pairing</h3>
              <button onClick={() => setShowDrawer(false)} className="text-xs text-slate-500 font-bold uppercase hover:text-white">Cancel</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Round</label>
                  <select value={round} onChange={(e) => setRound(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl p-3 font-semibold text-white focus:outline-none">
                    {['1', '2', '3', '4', '5'].map(r => <option key={r} value={r} className="bg-[#0f172a]">Round {r}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Format</label>
                  <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl p-3 font-semibold text-white focus:outline-none">
                    {['1v1', 'Scramble', 'Shamble'].map(f => <option key={f} value={f} className="bg-[#0f172a]">{f}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Course</label>
                  <select value={courseName} onChange={(e) => setCourseName(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl p-3 font-semibold text-white focus:outline-none">
                    {['The Legend', 'Quarry'].map(c => <option key={c} value={c} className="bg-[#0f172a]">{c}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Tee Time</label>
                  <input type="text" value={teeTime} onChange={(e) => setTeeTime(e.target.value)} placeholder="e.g., 08:30 AM" className="w-full bg-white/5 border border-white/5 rounded-xl p-3 font-semibold text-white focus:outline-none" />
                </div>
              </div>

              {/* Slanted Clams Selector Block */}
              <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-4 space-y-3 mt-1">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Slanted Clams Roster</h4>
                <div className="flex flex-col gap-2">
                  <select value={t1p1} onChange={(e) => setT1p1(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-white focus:outline-none">
                    <option value="">Select Golfer 1...</option>
                    {clamsRoster.map(g => <option key={g.name} value={g.name} className="bg-[#0f172a]">{g.name}</option>)}
                  </select>
                  {format !== '1v1' && (
                    <select value={t1p2} onChange={(e) => setT1p2(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-white focus:outline-none">
                      <option value="">Select Partner (Golfer 2)...</option>
                      {clamsRoster.map(g => <option key={g.name} value={g.name} className="bg-[#0f172a]">{g.name}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Clam Brothelmen Selector Block */}
              <div className="bg-red-600/5 border border-red-500/10 rounded-2xl p-4 space-y-3">
                <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest">Clam Brothelmen Roster</h4>
                <div className="flex flex-col gap-2">
                  <select value={t2p1} onChange={(e) => setT2p1(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-white focus:outline-none">
                    <option value="">Select Golfer 1...</option>
                    {brothelmenRoster.map(g => <option key={g.name} value={g.name} className="bg-[#0f172a]">{g.name}</option>)}
                  </select>
                  {format !== '1v1' && (
                    <select value={t2p2} onChange={(e) => setT2p2(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-white focus:outline-none">
                      <option value="">Select Partner (Golfer 2)...</option>
                      {brothelmenRoster.map(g => <option key={g.name} value={g.name} className="bg-[#0f172a]">{g.name}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <button type="submit" className="w-full bg-[#34d399] hover:bg-[#2bc489] text-black font-black py-4 rounded-xl transition-colors uppercase tracking-wider text-xs mt-3 shadow-lg">
                Publish Pairing to Tee Sheet
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}