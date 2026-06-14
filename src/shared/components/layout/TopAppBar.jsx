import React from 'react';

export default function TopAppBar({ onAvatarClick, userInitials = "JW", hasNotifications = true, team1, team2 }) {
  // Helper to grab initials
  const getInitials = (name) => {
    if (!name) return "TBD";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-[#0f172a]/90 backdrop-blur-2xl sticky top-0 z-50 border-b border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
      
      {/* Top Row: Brand & Profile */}
      <div className="px-5 pt-3 pb-2 flex justify-between items-center">
        {/* Brand */}
        <div className="flex flex-col">
          <h1 className="font-black text-xl tracking-tighter italic flex items-baseline gap-1 drop-shadow-md">
            <span className="text-white">FORES</span>
            <span className="text-[#34d399]">V</span>
          </h1>
          <span className="text-[7px] font-bold tracking-[0.25em] text-slate-400 uppercase -mt-0.5 ml-0.5">
            Ryder Cup
          </span>
        </div>
        
        {/* Profile */}
        <button 
          onClick={onAvatarClick} 
          aria-label="Open Profile"
          className="relative group focus:outline-none"
        >
          <div className="absolute inset-0 bg-[#34d399] rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
          <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center shadow-lg overflow-hidden group-active:scale-95 transition-transform duration-200">
            <div className="absolute inset-0 border border-white/5 rounded-full m-[1px]"></div>
            <span className="text-xs font-black text-white tracking-wider">{userInitials}</span>
          </div>
          {hasNotifications && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-[#0f172a]"></span>
            </span>
          )}
        </button>
      </div>

      {/* Bottom Row: The Persistent Scorebug */}
      {(team1 && team2) && (
        <div className="px-5 pb-3">
          <div className="relative w-full h-10 bg-[#1e293b]/60 rounded-xl border border-white/10 shadow-inner flex items-center justify-between px-1 overflow-hidden">
            
            {/* Ambient inner glows */}
            <div className="absolute left-0 w-1/3 h-full bg-blue-500/10 blur-md"></div>
            <div className="absolute right-0 w-1/3 h-full bg-red-500/10 blur-md"></div>

            {/* Team 1 */}
            <div className="flex items-center gap-2 relative z-10 pl-1">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-900 to-slate-900 border border-blue-400/30 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                <span className="text-[9px] font-black text-blue-50 tracking-wider">
                  {getInitials(team1.name)}
                </span>
              </div>
              <span className="text-xl font-black text-white tabular-nums tracking-tighter drop-shadow-md">
                {team1.score}
              </span>
            </div>

            {/* Center VS */}
            <div className="flex flex-col items-center relative z-10">
              <div className="bg-[#10b981]/10 border border-[#10b981]/30 px-2 py-0.5 rounded text-[9px] font-black text-[#34d399] shadow-sm">
                VS
              </div>
            </div>

            {/* Team 2 */}
            <div className="flex items-center gap-2 relative z-10 pr-1">
              <span className="text-xl font-black text-white tabular-nums tracking-tighter drop-shadow-md">
                {team2.score}
              </span>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-900 to-slate-900 border border-red-400/30 flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                <span className="text-[9px] font-black text-red-50 tracking-wider">
                  {getInitials(team2.name)}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}
    </header>
  );
}