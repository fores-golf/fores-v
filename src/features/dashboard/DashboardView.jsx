import React, { useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { useScheduleData } from '../schedule/hooks/useScheduleData';
import { useChirpsNotification } from '../chat/hooks/useChirpsNotifications';
import { supabase } from '../../config/supabaseClient';

export default function DashboardView({ 
  onNavigateToProfile, 
  onNavigateToGarage, 
  onNavigateToChirps, 
  onNavigateToLeaderboard, 
  onNavigateToSchedule,
  onNavigateToVault,
  onNavigateToAdmin, 
  isAdmin,           
  isChirpsOpen
}) {
  const { player } = useUser();
  const { myMatches, loading, startMatch } = useScheduleData();
  const showChirpAlert = useChirpsNotification(isChirpsOpen);

  const isClams = player?.team === 'Slanted Clams';
  const teamAccentHex = isClams ? '#3b82f6' : '#ef4444';

  // --- AUTOMATED CALENDAR LOCK: INTROCARD MINT ENGINE ---
  useEffect(() => {
    async function verifyIntroCardMint() {
      if (!player?.id) return;

      // Restrict execution baseline criteria until calendar passes June 23, 2026
      const tripLaunchDate = new Date('2026-06-23T00:00:00');
      if (new Date() < tripLaunchDate) return; 

      try {
        // Query if user contains an existing intro card layout record row inside metadata blocks
        const { data: alreadyMinted } = await supabase
          .from('player_cards')
          .select('id')
          .eq('player_id', player.id)
          .eq('captured_metadata->>card_type', 'intro')
          .maybeSingle();

        if (!alreadyMinted) {
          await supabase
            .from('player_cards')
            .insert({
              player_id: player.id,
              template_id: 'tpl-intro-card-id', // Maps cleanly down to your card_templates row record ID
              is_in_pack: true,
              minted_at: new Date(),
              captured_metadata: {
                card_type: 'intro',
                player_name: player.name,
		player_team: player.team,
                parallel: 'Base',
                serial_number: '#TOUR-CARD',
                unlocked_timestamp: new Date()
              }
            });
          console.log("IntroCard successfully stowed inside user vault collection inventory slot.");
        }
      } catch (err) {
        console.warn("IntroCard access bouncer error check passed over:", err.message);
      }
    }
    
    verifyIntroCardMint();
  }, [player?.id]);

  return (
    <div className="min-h-[100dvh] bg-[#060911] text-white font-sans pb-safe flex flex-col overflow-y-auto relative selection:bg-[#34d399]/20">
      
      {/* Dynamic Ambient Background Illumination */}
      <div className="absolute top-[-5%] right-[-10%] w-[70%] h-[35%] bg-[#34d399]/10 blur-[130px] rounded-full pointer-events-none z-0 animate-pulse duration-[6000ms]"></div>
      <div 
        className="absolute top-[15%] left-[-20%] w-[70%] h-[35%] blur-[130px] rounded-full pointer-events-none z-0 transition-colors duration-700 animate-pulse duration-[4000ms]"
        style={{ backgroundColor: `${teamAccentHex}15` }}
      ></div>

      {/* --- SUPER FLASHY BRANDING & HEADER ZONE --- */}
      <header className="px-5 pt-8 pb-4 relative z-10 max-w-md mx-auto w-full space-y-5">
        
        {/* HYPER-STYLIZED ARCADE NEON BANNER */}
        <div className="relative bg-gradient-to-b from-[#0f172a]/95 via-[#090d16]/98 to-[#030712]/100 border border-white/[0.03] rounded-[2rem] p-5 flex items-center gap-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(52,211,153,0.03)] overflow-hidden group">
          <div className="absolute inset-0 p-[1px] rounded-[2rem] bg-gradient-to-r from-transparent via-[#34d399]/20 to-transparent group-hover:via-[#34d399]/50 transition-all duration-700 pointer-events-none z-0">
            <div className="absolute inset-0 bg-[#060911] rounded-[2rem]"></div>
          </div>
          <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:10px_10px] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_100%)] z-0"></div>
          <div className="absolute inset-0 w-full h-[200%] bg-gradient-to-b from-transparent via-[#34d399]/5 to-transparent -translate-y-full animate-[skew-sweep_5s_ease-in-out_infinite] pointer-events-none z-0"></div>
          <div className="absolute left-6 top-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-r from-[#34d399]/10 to-blue-500/0 rounded-full blur-xl pointer-events-none z-0"></div>

          {/* Secret Backdoor Trigger: Tapping logo container 5 times opens card collection vault */}
          <div 
            onClick={() => {
              window.f5_vault_clicks = (window.f5_vault_clicks || 0) + 1;
              if (window.f5_vault_clicks >= 5) {
                window.f5_vault_clicks = 0;
                onNavigateToVault();
              }
            }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-white/10 flex items-center justify-center p-3 shrink-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_4px_12px_rgba(0,0,0,0.5)] group-hover:border-[#34d399]/40 group-hover:shadow-[0_0_20px_rgba(52,211,153,0.2)] transition-all duration-500 relative z-10 cursor-pointer"
          >
            <img 
              src="/fores-v-logo.png" 
              alt="Fores V Logo" 
              className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(52,211,153,0.4)] group-hover:scale-110 group-hover:rotate-[2deg] transition-all duration-500"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML = '<span class="text-2xl font-black text-[#34d399] tracking-tighter italic select-none drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]">F5</span>';
              }}
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center relative z-10">
            <h2 className="text-2xl font-black tracking-tight uppercase italic bg-gradient-to-r from-white via-slate-100 via-white to-slate-500 bg-clip-text text-transparent leading-none select-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
              Fores V
            </h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[7px] font-black text-[#34d399]/40 tracking-normal select-none font-mono">{"//"}</span>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#34d399] drop-shadow-[0_0_12px_rgba(52,211,153,0.4)] group-hover:text-white transition-colors duration-500 truncate">
                Land Of 10,000 Putts
              </p>
            </div>
          </div>
        </div>

        {/* INTEGRATED MATCH ROSTER STATUS GREETING */}
        <div className="flex justify-between items-center bg-gradient-to-r from-black/40 to-black/10 p-3.5 rounded-2xl border border-white/[0.04] shadow-inner backdrop-blur-sm">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Clubhouse Core</span>
              <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded-full border border-white/[0.03]">
                <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: teamAccentHex }}></span>
                <span className="w-1.5 h-1.5 rounded-full absolute" style={{ backgroundColor: teamAccentHex }}></span>
                <span className="text-[7px] font-mono font-bold text-slate-400 uppercase tracking-widest pl-1">Online</span>
              </div>
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase italic text-slate-100">
              Welcome, <span className="text-white drop-shadow-sm">{player?.name?.split(' ')[0] || 'Golfer'}</span>
            </h1>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              Rep: <span style={{ color: teamAccentHex }} className="font-extrabold drop-shadow-[0_0_10px_rgba(239,68,68,0.1)]">{player?.team || 'Unassigned'}</span>
            </p>
          </div>

          <button 
            onClick={onNavigateToProfile}
            className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#161f32] to-[#0f172a] border border-white/10 p-0.5 overflow-hidden flex items-center justify-center shadow-xl active:scale-95 hover:border-slate-500/50 transition-all shrink-0"
          >
            <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-900 flex items-center justify-center">
              {player?.avatar_url ? (
                <img src={player.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-black text-slate-400 font-mono">{player?.name?.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
          </button>
        </div>

      </header>

      {/* --- MAIN DASHBOARD HUB CONTENT --- */}
      <main className="p-5 flex flex-col gap-6 max-w-md mx-auto w-full flex-1 relative z-10 pt-1">
        
        {/* --- SECTION: MY LIVE TOURNAMENT MATCHUPS --- */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">My Active Matchups</h2>
            {!loading && myMatches.length > 0 && (
              <span className="text-[9px] font-black text-[#34d399] bg-[#34d399]/10 px-2 py-0.5 rounded border border-[#34d399]/20 tracking-wider uppercase">
                {myMatches.filter(m => m.is_live === true || m.is_live === 'true' || m.status === 'live').length} Live
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
              {myMatches.map(match => {
                const isMatchActive = match.is_live === true || match.is_live === 'true' || match.status === 'live';

                return (
                  <div 
                    key={match.id} 
                    className={`bg-gradient-to-br from-[#121827] to-[#0d121f] border rounded-3xl p-4 flex flex-col gap-4 shadow-xl relative overflow-hidden transition-all ${
                      isMatchActive ? 'border-[#34d399]/30' : 'border-white/5'
                    }`}
                  >
                    <div 
                      className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r"
                      style={{ fallbackColor: '#34d399', backgroundImage: isMatchActive ? 'linear-gradient(to right, #34d399, #10b981)' : `linear-gradient(to right, ${teamAccentHex}, #1e293b)` }}
                    ></div>

                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
                      <span>Round {match.round} — Match #{match.match_number}</span>
                      {isMatchActive ? (
                        <span className="text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/20 px-2 py-0.5 rounded-md font-bold animate-pulse">Live Tracker</span>
                      ) : match.status === 'completed' ? (
                        <span className="text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">Finalized</span>
                      ) : (
                        <span className="text-slate-400/60 font-bold tracking-wide uppercase text-[8px] bg-white/[0.02] border border-white/5 px-1.5 py-0.5 rounded">Pending Start</span>
                      )}
                    </div>

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

                    {isMatchActive ? (
                      <button 
                        onClick={onNavigateToSchedule}
                        className="w-full py-3 bg-emerald-950/40 hover:bg-emerald-900/40 text-[#34d399] font-black text-xs uppercase tracking-wider rounded-xl border border-[#34d399]/20 active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(52,211,153,0.05)]"
                      >
                        Open Live Match Engine
                      </button>
                    ) : match.status !== 'completed' ? (
                      <button 
                        onClick={() => startMatch && startMatch(match.id)}
                        className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.2)] border border-amber-400/30 active:scale-[0.98] transition-all"
                      >
                        🚀 Initialize / Start Match
                      </button>
                    ) : (
                      <button 
                        onClick={onNavigateToSchedule}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-400 font-black text-xs uppercase tracking-wider rounded-xl border border-white/5 active:scale-[0.98] transition-all"
                      >
                        View Match Summary
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* --- SECTION: PRIMARY NAVIGATION GRID METRIC --- */}
        <section className="space-y-3">
          <div className="flex justify-between items-center pl-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Clubhouse Applications</h2>
            {isAdmin && (
              <button 
                onClick={onNavigateToAdmin}
                className="text-[8px] font-black tracking-widest uppercase bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-0.5 rounded transition-colors cursor-pointer"
              >
                ⚙️ Admin Console
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
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

            <button 
              onClick={onNavigateToChirps}
              className="bg-[#121827] border border-white/5 rounded-2xl p-4 flex flex-col text-left gap-4 hover:border-white/10 transition-colors active:scale-[0.97] duration-150 relative overflow-hidden group shadow-lg"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-lg group-hover:scale-110 transition-transform relative">
                💬
                {showChirpAlert && (
                  <>
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-[#121827] rounded-full animate-ping"></span>
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-[#121827] rounded-full"></span>
                  </>
                )}
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