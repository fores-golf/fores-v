import React from 'react';

export default function MyMatchesHero({ activeMatch, onClick, getPlayerName }) {
  // 🎯 FIX: Match against true database status strings instead of undefined properties
  const isLive = activeMatch?.status === 'live' || activeMatch?.is_live === true || activeMatch?.is_live === 'true';

  // 🎯 FIX: Pull the live calculated match status or fallback gracefully
  const liveScoreText = activeMatch?.status_string && activeMatch.status_string !== "" 
    ? activeMatch.status_string 
    : "All Square";

  const thruText = activeMatch?.thru_count && activeMatch.thru_count > 0 
    ? `Thru ${activeMatch.thru_count}` 
    : "Teeing Off";

  // Translate team names and format safely
  const formatName = activeMatch?.format ? String(activeMatch.format).toUpperCase() : "MATCH PLAY";
  const p1Name = getPlayerName ? getPlayerName(activeMatch?.team1_player1) : "TBD";
  const p2Name = getPlayerName ? getPlayerName(activeMatch?.team2_player1) : "TBD";

  const getInitials = (name) => {
    if (!name || name === "TBD") return "??";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-white/10 group active:scale-[0.98] transition-transform duration-200 cursor-pointer" onClick={onClick}>
      
      {/* Deep, rich gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#020617]"></div>
      
      {/* Dynamic atmospheric lighting based on state */}
      <div className={`absolute -right-16 -top-16 w-64 h-64 opacity-20 rounded-full blur-3xl ${isLive ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500 opacity-10 rounded-full blur-2xl"></div>

      <div className="relative z-10 p-6 flex flex-col h-full bg-white/5 backdrop-blur-sm">
        
        {/* Header: Status */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? 'bg-orange-400' : 'bg-[#34d399]'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isLive ? 'bg-orange-500' : 'bg-[#10b981]'}`}></span>
            </span>
            <span className={`text-xs font-black uppercase tracking-widest ${isLive ? 'text-orange-400 animate-pulse' : 'text-slate-400'}`}>
              {isLive ? 'Live Match Tracking' : 'Upcoming Match'}
            </span>
          </div>
          <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-500 bg-black/40 px-2.5 py-1 rounded-full border border-white/5 shadow-inner">
            Round {activeMatch?.round || 1}
          </span>
        </div>

        {/* Body: Match Details */}
        <div className="mb-6">
          {/* 🎯 FIX: Render real Live Match Score and Format */}
          <h2 className="text-2xl font-black text-white tracking-tight mb-1 uppercase italic">
            {isLive ? liveScoreText : formatName}
          </h2>
          <p className="text-sm font-medium text-slate-400 flex items-center gap-2 font-mono">
            {isLive ? (
              <>
                <svg className="w-4 h-4 text-orange-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                <span className="text-white font-sans font-black uppercase tracking-wide">{thruText}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Tee Time: {activeMatch?.tee_time ? new Date(`2000-01-01T${activeMatch.tee_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD'}
              </>
            )}
          </p>
        </div>

        {/* Footer: Action & Opponents */}
        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-[#1e293b] flex items-center justify-center text-[9px] font-black text-white shadow-sm uppercase select-none">{getInitials(p1Name)}</div>
            <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-[#1e293b] flex items-center justify-center text-[9px] font-black text-white shadow-sm uppercase select-none">{getInitials(p2Name)}</div>
          </div>
          <div className={`text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-colors ${isLive ? 'text-[#34d399]' : 'text-white group-hover:text-[#34d399]'}`}>
            {isLive ? 'Launch Live Card' : 'Enter Match Hub'}
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
          </div>
        </div>

      </div>
    </div>
  );
}