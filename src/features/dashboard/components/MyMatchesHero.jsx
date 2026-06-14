import React from 'react';

export default function MyMatchesHero({ activeMatch, onClick }) {
  // Determine if we are looking at a live round or an upcoming one
  const isLive = activeMatch?.inProgress;

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-white/10 group active:scale-[0.98] transition-transform duration-200 cursor-pointer" onClick={onClick}>
      
      {/* Deep, rich gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#020617]"></div>
      
      {/* Dynamic atmospheric lighting based on state */}
      <div className={`absolute -right-16 -top-16 w-64 h-64 opacity-20 rounded-full blur-3xl ${isLive ? 'bg-red-500' : 'bg-[#1e8c45]'}`}></div>
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500 opacity-10 rounded-full blur-2xl"></div>

      <div className="relative z-10 p-6 flex flex-col h-full bg-white/5 backdrop-blur-sm">
        
        {/* Header: Status */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? 'bg-red-400' : 'bg-[#34d399]'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isLive ? 'bg-red-500' : 'bg-[#10b981]'}`}></span>
            </span>
            <span className={`text-xs font-black uppercase tracking-widest ${isLive ? 'text-red-400' : 'text-gray-300'}`}>
              {isLive ? 'Live Match' : 'My Matches'}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300 bg-white/10 px-2.5 py-1 rounded-full border border-white/5 shadow-inner">
            Round 1
          </span>
        </div>

        {/* Body: Match Details */}
        <div className="mb-6">
          <h2 className="text-2xl font-black text-white tracking-tight mb-1">
            {activeMatch?.format || "Best Ball"} <span className="text-[#1e8c45]">&</span> Alt Shot
          </h2>
          <p className="text-sm font-medium text-gray-400 flex items-center gap-2">
            {isLive ? (
              <>
                <svg className="w-4 h-4 text-red-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                <span className="text-white">Currently on Hole {activeMatch?.currentHole || 4}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Pine Valley • Tee: 10:42 AM
              </>
            )}
          </p>
        </div>

        {/* Footer: Action & Opponents */}
        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
          <div className="flex -space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#1e293b] flex items-center justify-center text-[10px] font-bold text-white shadow-sm">TR</div>
            <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-[#1e293b] flex items-center justify-center text-[10px] font-bold text-white shadow-sm">JS</div>
          </div>
          <div className={`text-sm font-bold flex items-center gap-1 transition-colors ${isLive ? 'text-white group-hover:text-red-400' : 'text-white group-hover:text-[#34d399]'}`}>
            {isLive ? 'Resume Round' : 'Enter Hub'}
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
          </div>
        </div>

      </div>
    </div>
  );
}