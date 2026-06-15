import React from 'react';
import { useUser } from '../../context/UserContext';
import { useScheduleData } from '../schedule/hooks/useScheduleData';

export default function DashboardView({ 
  onNavigateToProfile, 
  onNavigateToGarage, 
  onNavigateToChirps, 
  onNavigateToLeaderboard, 
  onNavigateToSchedule 
}) {
  const { player } = useUser();
  const { myMatches, loading } = useScheduleData();

  const isClams = player?.team === 'Slanted Clams';
  const teamAccentHex = isClams ? '#3b82f6' : '#ef4444';

  return (
    <div className="min-h-[100dvh] bg-[#090d16] text-white font-sans pb-safe flex flex-col overflow-y-auto relative selection:bg-[#34d399]/20">
      
      {/* Cinematic Ambient Glow Backdrops */}
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[40%] bg-[#34d399]/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
      <div 
        className="absolute top-[20%] left-[-20%] w-[60%] h-[40%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors duration-500"
        style={{ backgroundColor: `${teamAccentHex}10` }}
      ></div>

      {/* --- HERO CLUBHOUSE GREETING --- */}
      <header className="px-5 pt-8 pb-4 flex justify-between items-center relative z-10 max-w-md mx-auto w-full">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Clubhouse Lobby</span>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse`} style={{ backgroundColor: teamAccentHex }}></span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-slate-100">
            Welcome, <span className="text-white drop-shadow-sm">{player?.name?.split(' ')[0] || 'Golfer'}</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            Rep: <span style={{ color: teamAccentHex }}>{player?.team || 'Unassigned'}</span>
          </p>
        </div>

        {/* Profile Avatar Clickable Trigger */}
        <button 
          onClick={onNavigateToProfile}
          className="w-12 h-12 rounded-2xl bg-[#121827] border border-white/10 overflow-hidden flex items-center justify-center shadow-lg active:scale-95 transition-transform shrink-0"
        >
          {player?.avatar_url ? (
            <img src={player.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-black text-slate-400">{player?.name?.substring(0, 2).toUpperCase()}</span>
          )}
        </button>
      </header>

      {/* --- MAIN DASHBOARD HUB CONTENT --- */}
      <main className="p-5 flex flex-col gap-6 max-w-md mx-auto w-full flex-1 relative z-10 pt-2">
        
        {/* --- SECTION: MY LIVE TOURNAMENT MATCHUPS --- */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">My Active Matchups</h2>
            {!loading && myMatches.length > 0 && (
              <span className="text-[9px] font-black text-[#34d399] bg-[#34d399]/10 px-2 py-0.5 rounded border border-[#34d399]/20 tracking-wider uppercase">
                {myMatches.filter(m => m.is_live).length} Live
              </span>
            )}
          </div>
          
          {loading ? (
            <div className="bg-[#121827] border border-white/5 rounded-3xl p-8 flex justify-center items-center shadow-xl">
              <span className="animate-spin h-6 w-6 border-2 border-[#34d399] border-t-transparent rounded-full" />
            </div>
          ) : myMatches.length === 0 ? (
            <div 
              onClick={onNavigateToSchedule}
              className="bg-[#121827] border border-white/5 rounded-3xl p-6 text-center cursor-pointer group hover:border-white/10 transition-colors shadow-xl"
            >
              <div className="text-2xl mb-1.5 opacity-60">📅</div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-200 transition-colors">No personal matches assigned</p>
              <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest mt-1 block">Tap to browse full schedule</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myMatches.map(match => (
                <div 
                  key={match.id} 
                  className={`bg-gradient-to-br from-[#121827] to-[#0d121f] border rounded-3xl p-4 flex flex-col gap-4 shadow-xl relative overflow-hidden transition-all ${
                    match.is_live ? 'border-[#34d399]/30' : 'border-white/5'
                  }`}
                >
                  {/* Visual Top Highlight Strip */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r"
                    style={{ fallbackColor: '#34d399', backgroundImage: match.is_live ? 'linear-gradient(to right, #34d399, #10b981)' : `linear-gradient(to right, ${teamAccentHex}, #1e293b)` }}
                  ></div>

                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
                    <span>Round {match.round} — Match #{match.match_number}</span>
                    {match.is_live ? (
                      <span className="text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/20 px-2 py-0.5 rounded-md font-bold animate-pulse">Live Tracker</span>
                    ) : match.status === 'completed' ? (
                      <span className="text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">Finalized</span>
                    ) : (
                      <span className="text-slate-600">Upcoming</span>
                    )}
                  </div>

                  {/* Dynamic Match versus details */}
                  <div className="flex justify-between items-center bg-black/30 p-3 rounded-2xl border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Slanted Clams</span>
                      <span className="text-sm font-black text-slate-200 truncate max-w-[130px]">{match.team1_player1}</span>
                    </div>
                    
                    <div className="text-center shrink-0 px-2">
                      <span className="text-[10px] font-black text-slate-600 block tracking-tighter uppercase italic">VS</span>
                      <span className="text-xs font-black text-[#34d399] font-mono tabular-nums bg-[#34d399]/10 px-1.5 py-0.5 rounded border border-[#34d399]/10 mt-0.5 block">
                        {match.team1_score} - {match.team2_score}
                      </span>
                    </div>

                    <div className="flex flex-col items-end text-right">
                      <span className="text-[9px] font-black uppercase text-red-400 tracking-wider">Brothelmen</span>
                      <span className="text-sm font-black text-slate-200 truncate max-w-[130px]">{match.team2_player1}</span>
                    </div>
                  </div>

                  <button 
                    onClick={onNavigateToSchedule}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-200 font-black text-xs uppercase tracking-wider rounded-xl border border-white/5 active:scale-[0.98] transition-all"
                  >
                    Open Live Match Engine
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* --- SECTION: PRIMARY NAVIGATION GRID METRIC --- */}
        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-1"> Clubhouse Applications</h2>
          
          <div className="grid grid-cols-2 gap-3">
            
            {/* Nav: Leaderboard */}
            <button 
              onClick={onNavigateToLeaderboard}
              className="bg-[#121827] border border-white/5 rounded-2xl p-4 flex flex-col text-left gap-4 hover:border-white/10 transition-colors active:scale-[0.97] duration-150 relative overflow-hidden group shadow-lg"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                🏆
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-tight text-slate-200">Leaderboard</h3>
                <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Live Field Standings</p>
              </div>
            </button>

            {/* Nav: Schedule */}
            <button 
              onClick={onNavigateToSchedule}
              className="bg-[#121827] border border-white/5 rounded-2xl p-4 flex flex-col text-left gap-4 hover:border-white/10 transition-colors active:scale-[0.97] duration-150 relative overflow-hidden group shadow-lg"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                📅
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-tight text-slate-200">Schedule</h3>
                <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Rounds & Pairings</p>
              </div>
            </button>

            {/* Nav: The Garage (WITB) */}
            <button 
              onClick={onNavigateToGarage}
              className="bg-[#121827] border border-white/5 rounded-2xl p-4 flex flex-col text-left gap-4 hover:border-white/10 transition-colors active:scale-[0.97] duration-150 relative overflow-hidden group shadow-lg"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                ⚙️
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-tight text-slate-200">The Garage</h3>
                <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Ballistics & Bag WITB</p>
              </div>
            </button>

            {/* Nav: Chirps Chat */}
            <button 
              onClick={onNavigateToChirps}
              className="bg-[#121827] border border-white/5 rounded-2xl p-4 flex flex-col text-left gap-4 hover:border-white/10 transition-colors active:scale-[0.97] duration-150 relative overflow-hidden group shadow-lg"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-lg group-hover:scale-110 transition-transform relative">
                💬
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-[#121827] rounded-full animate-ping"></span>
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-tight text-slate-200">Chirps Board</h3>
                <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Real-time Trash Talk</p>
              </div>
            </button>

          </div>
        </section>

      </main>
    </div>
  );
}