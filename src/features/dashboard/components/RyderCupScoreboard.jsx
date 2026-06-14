import React from 'react';

export default function RyderCupScoreboard({ team1, team2 }) {
  // Helper to grab initials (e.g., "Slanted Clams" -> "SC")
  const getInitials = (name) => {
    if (!name) return "TBD";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="w-full bg-gradient-to-b from-[#0f172a] to-transparent pt-4 pb-2 px-5">
      {/* The Floating Glass Capsule */}
      <div className="max-w-md mx-auto relative group">
        
        {/* Ambient background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-[#10b981]/5 to-red-500/10 rounded-2xl blur-md"></div>
        
        {/* Inner Glass Panel */}
        <div className="relative flex justify-between items-center bg-[#1e293b]/60 backdrop-blur-xl rounded-2xl p-2 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">

          {/* --- TEAM 1 (Left Side) --- */}
          <div className="flex items-center gap-3 pl-1">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-900 to-slate-900 border border-blue-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <span className="text-sm font-black text-blue-50 tracking-wider">
                {getInitials(team1?.name)}
              </span>
            </div>
            <span className="text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
              {team1?.score || 0}
            </span>
          </div>

          {/* --- CENTER DIVIDER --- */}
          <div className="flex flex-col items-center px-4">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.25em] mb-1.5">
              Standings
            </span>
            <div className="bg-[#10b981]/10 border border-[#10b981]/30 px-2 py-0.5 rounded text-[10px] font-black text-[#34d399] shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              VS
            </div>
          </div>

          {/* --- TEAM 2 (Right Side) --- */}
          <div className="flex items-center gap-3 pr-1">
            <span className="text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
              {team2?.score || 0}
            </span>
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-900 to-slate-900 border border-red-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.15)]">
              <span className="text-sm font-black text-red-50 tracking-wider">
                {getInitials(team2?.name)}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}