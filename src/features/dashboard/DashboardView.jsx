import React, { useEffect, useState } from 'react';
import { useUser } from '../../context/UserContext';
import { useScheduleData } from '../schedule/hooks/useScheduleData';
import { useChirpsNotification } from '../chat/hooks/useChirpsNotifications';
import { supabase } from '../../config/supabaseClient';
import { calculatePlayingHandicaps, evaluateMatchStatus } from '../../utils/matchPlayEngine';
import LiveTicker from './LiveTicker'; // Ensure this path matches where you saved LiveTicker.jsx

const ROUND_METADATA = {
  1: { date: 'June 25th', parseDate: '2026-06-25', course: 'Quarry', format: 'Vegas' },
  2: { date: 'June 26th', parseDate: '2026-06-26', course: 'Quarry', format: 'Greensomes' },
  3: { date: 'June 26th', parseDate: '2026-06-26', course: 'Legend', format: 'Best Ball' },
  4: { date: 'June 27th', parseDate: '2026-06-27', course: 'Legend', format: 'Scramble' },
  5: { date: 'June 27th', parseDate: '2026-06-27', course: 'Quarry', format: '1v1' }
};

export default function DashboardView({ 
  onNavigateToProfile, 
  onNavigateToGarage, 
  onNavigateToChirps, 
  onNavigateToLeaderboard, 
  onNavigateToSchedule,
  onNavigateToVault,
  onNavigateToAdmin, 
  onNavigateToMulligans, 
  isAdmin,           
  isChirpsOpen
}) {
  const { player } = useUser();
  const { myMatches = [], loading, startMatch, golfers = [], refreshMatches } = useScheduleData() || {};
  const showChirpAlert = useChirpsNotification(isChirpsOpen);

  const isClams = player?.team === 'Slanted Clams';
  const teamAccentHex = isClams ? '#3b82f6' : '#ef4444';

  const [animateDice, setAnimateDice] = useState(true);
  const [showSplash, setShowSplash] = useState(() => {
    return sessionStorage.getItem('fores_v_splash_seen') !== 'true';
  });

  // Master telemetry arrays to compute match standing string states live from table memory
  const [allHoleScores, setAllHoleScores] = useState([]);
  const [courseHoles, setCourseHoles] = useState([]);

  const fetchLiveTrackingTelemetry = async () => {
    try {
      const { data: scores } = await supabase.from('hole_scores').select('*');
      const { data: holes } = await supabase.from('holes').select('*').eq('course_id', 1);
      if (scores) setAllHoleScores(scores);
      if (holes) setCourseHoles(holes);
    } catch (err) {
      console.warn("Dashboard real-time calculation payload refresh warning:", err.message);
    }
  };

  useEffect(() => {
    fetchLiveTrackingTelemetry();

    const matchesChannel = supabase
      .channel('dashboard-matches-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        refreshMatches?.();
        fetchLiveTrackingTelemetry();
      })
      .subscribe();

    const scoresChannel = supabase
      .channel('dashboard-scores-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hole_scores' }, () => {
        refreshMatches?.();
        fetchLiveTrackingTelemetry();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(scoresChannel);
    };
  }, [refreshMatches]);

  const handleDismissSplash = () => {
    sessionStorage.setItem('fores_v_splash_seen', 'true');
    setShowSplash(false);
  };

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const targetDate = new Date('2026-06-25T15:30:00-05:00').getTime();
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;
      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    };
    updateCountdown(); 
    const intervalId = setInterval(updateCountdown, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { setAnimateDice(false); }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const getPlayerName = (identifier) => {
    if (!identifier) return "TBD";
    const cleanId = String(identifier).trim().toLowerCase();
    const activeGolfers = golfers || [];
    const found = activeGolfers.find(g => 
      (g.auth_id && String(g.auth_id).trim().toLowerCase() === cleanId) ||
      (g.id && String(g.id).trim().toLowerCase() === cleanId)
    );
    return found ? found.name : identifier; 
  };

  const isMatchReadyToStart = (round, teeTime) => {
    if (!teeTime) return false;
    const meta = ROUND_METADATA[round];
    if (!meta || !meta.parseDate) return true; 
    const matchDateStr = `${meta.parseDate}T${teeTime}:00-05:00`;
    const matchTime = new Date(matchDateStr).getTime();
    const now = new Date().getTime();
    return now >= (matchTime - (30 * 60 * 1000));
  };

  const safeMatches = myMatches || [];
  const liveCount = safeMatches.filter(m => m?.is_live === true || m?.is_live === 'true').length;

  return (
    <div className="min-h-[100dvh] bg-[#060911] text-white font-sans pb-safe flex flex-col overflow-y-auto relative selection:bg-[#34d399]/20">
      
      {/* --- HYPER-STYLED SPLASH SCREEN OVERLAY --- */}
      {showSplash && (
        <div onClick={handleDismissSplash} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060911] cursor-pointer">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[60%] bg-[#34d399]/15 blur-[150px] rounded-full pointer-events-none z-0 animate-pulse duration-[3000ms]"></div>
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 w-full max-w-sm space-y-6 animate-[fadeIn_0.5s_ease-out]">
            <div>
              <h2 className="text-4xl font-black tracking-tight uppercase italic bg-gradient-to-r from-white via-slate-100 via-white to-slate-500 bg-clip-text text-transparent leading-none select-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">Fores V</h2>
              <p className="mt-2 text-[11px] font-black uppercase tracking-[0.25em] text-[#34d399] drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">Land Of 10,000 Putts</p>
            </div>
            <div className="pt-6 w-full flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3 animate-pulse">T-Minus</span>
              <div className="flex items-center justify-center gap-3 w-full bg-black/50 p-5 rounded-[2rem] border border-white/10 shadow-[0_0_40px_rgba(52,211,153,0.1),inset_0_2px_10px_rgba(0,0,0,0.5)] backdrop-blur-md">
                <div className="flex flex-col items-center w-12"><span className="text-3xl font-mono font-black text-[#34d399]">{timeLeft.days}</span><span className="text-[8px] font-bold text-slate-500 tracking-widest uppercase mt-1">Days</span></div>
                <span className="text-xl font-black text-slate-700 pb-4">:</span>
                <div className="flex flex-col items-center w-12"><span className="text-3xl font-mono font-black text-slate-100">{timeLeft.hours.toString().padStart(2, '0')}</span><span className="text-[8px] font-bold text-slate-500 tracking-widest uppercase mt-1">Hrs</span></div>
                <span className="text-xl font-black text-slate-700 pb-4">:</span>
                <div className="flex flex-col items-center w-12"><span className="text-3xl font-mono font-black text-slate-100">{timeLeft.minutes.toString().padStart(2, '0')}</span><span className="text-[8px] font-bold text-slate-500 tracking-widest uppercase mt-1">Min</span></div>
                <span className="text-xl font-black text-slate-700 pb-4">:</span>
                <div className="flex flex-col items-center w-12"><span className="text-3xl font-mono font-black text-amber-400">{timeLeft.seconds.toString().padStart(2, '0')}</span><span className="text-[8px] font-bold text-slate-500 tracking-widest uppercase mt-1">Sec</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 INJECTED TICKER COMPONENT */}
      <LiveTicker />

      {/* Atmospheric Illumination Background */}
      <div className="absolute top-[-5%] right-[-10%] w-[70%] h-[35%] bg-[#34d399]/10 blur-[130px] rounded-full pointer-events-none z-0 animate-pulse duration-[6000ms]"></div>
      <div className="absolute top-[15%] left-[-20%] w-[70%] h-[35%] blur-[130px] rounded-full pointer-events-none z-0 transition-colors duration-700 animate-pulse" style={{ backgroundColor: `${teamAccentHex}15`, animationDuration: '4000ms' }}></div>

      {/* Header zone greeting */}
      <header className="px-5 pt-8 pb-4 relative z-10 max-w-md mx-auto w-full space-y-5">
        <div className="relative bg-gradient-to-b from-[#0f172a]/95 via-[#090d16]/98 to-[#030712]/100 border border-white/[0.03] rounded-[2rem] p-5 flex items-center gap-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden group">
          <div className="absolute inset-0 p-[1px] rounded-[2rem] bg-gradient-to-r from-transparent via-[#34d399]/20 to-transparent group-hover:via-[#34d399]/50 transition-all duration-700 pointer-events-none z-0"><div className="absolute inset-0 bg-[#060911] rounded-[2rem]"></div></div>
          <div onClick={() => { onNavigateToVault(); }} className="w-16 h-16 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-white/10 flex items-center justify-center p-3 shrink-0 shadow-2xl relative z-10 cursor-pointer"><img src="/fores-v-logo.png" alt="Fores V Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]" /></div>
          <div className="flex-1 min-w-0 flex flex-col justify-center relative z-10">
            <h2 className="text-2xl font-black tracking-tight uppercase italic bg-gradient-to-r from-white via-slate-100 via-white to-slate-500 bg-clip-text text-transparent leading-none">Fores V</h2>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#34d399] mt-1.5 truncate">Land Of 10,000 Putts</p>
          </div>
          <button onClick={() => onNavigateToMulligans?.()} type="button" className={`w-8 h-8 rounded-xl bg-slate-950/40 border flex items-center justify-center transition-all relative z-30 shrink-0 ${animateDice ? 'animate-spin border-amber-500/40 text-amber-400' : 'border-white/5 text-slate-500 hover:text-amber-400'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM18 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM6 18.72a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM6 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" /><rect width="18" height="18" x="3" y="3" rx="4" /></svg></button>
        </div>

        <div className="flex justify-between items-center bg-gradient-to-r from-black/40 to-black/10 p-3.5 rounded-2xl border border-white/[0.04] backdrop-blur-sm">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2"><span className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Clubhouse Core</span><div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded-full border border-white/[0.03]"><span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: teamAccentHex }}></span><span className="text-[7px] font-mono font-bold text-slate-400 uppercase tracking-widest pl-1">Live Feed</span></div></div>
            <h1 className="text-xl font-black tracking-tight uppercase italic text-slate-100">Welcome, <span className="text-white">{player?.name?.split(' ')[0] || 'Golfer'}</span></h1>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Team: <span style={{ color: teamAccentHex }} className="font-extrabold">{player?.team || 'Unassigned'}</span></p>
          </div>
          <button onClick={onNavigateToProfile} className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#161f32] to-[#0f172a] border border-white/10 p-0.5 overflow-hidden flex items-center justify-center shadow-xl active:scale-95 shrink-0"><div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-900 flex items-center justify-center">{player?.avatar_url ? <img src={player.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-xs font-black text-slate-400 font-mono">{player?.name?.substring(0, 2).toUpperCase()}</span>}</div></button>
        </div>
      </header>

      {/* Main dashboard body container grid loops */}
      <main className="p-5 flex flex-col gap-6 max-w-md mx-auto w-full flex-1 relative z-10 pt-1">
        
        {/* --- SECTION: RETURNING ACTIVE QUADRANT PAIRINGS GRIDS --- */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">My Active Matchups</h2>
            {!loading && safeMatches.length > 0 && (
              <span className="text-[9px] font-black text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 tracking-wider uppercase">
                {liveCount} Live
              </span>
            )}
          </div>
          
          {loading ? (
            <div className="bg-[#121827] border border-white/5 rounded-3xl p-8 flex justify-center items-center">
              <span className="animate-spin h-6 w-6 border-2 border-[#34d399] border-t-transparent rounded-full" />
            </div>
          ) : safeMatches.length === 0 ? (
            <div onClick={onNavigateToSchedule} className="bg-[#121827] border border-white/5 rounded-3xl p-6 text-center cursor-pointer group hover:border-white/10 transition-colors shadow-xl">
              <div className="text-2xl mb-1.5 opacity-60">📅</div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No personal matches assigned</p>
              <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest mt-1 block">Tap to browse full schedule</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {safeMatches.map(match => {
                if (!match) return null;

                // Lookup profile objects live from identity caches
                const t1p1 = golfers.find(g => String(g.id) === String(match.team1_player1) || String(g.auth_id) === String(match.team1_player1));
                const t1p2 = golfers.find(g => String(g.id) === String(match.team1_player2) || String(g.auth_id) === String(match.team1_player2));
                const t2p1 = golfers.find(g => String(g.id) === String(match.team2_player1) || String(g.auth_id) === String(match.team2_player1));
                const t2p2 = golfers.find(g => String(g.id) === String(match.team2_player2) || String(g.auth_id) === String(match.team2_player2));

                const team1Arr = [];
                if (t1p1) team1Arr.push({ id: 't1p1', courseHandicap: parseInt(t1p1.handicap, 10) || 0 });
                if (t1p2) team1Arr.push({ id: 't1p2', courseHandicap: parseInt(t1p2.handicap, 10) || 0 });

                const team2Arr = [];
                if (t2p1) team2Arr.push({ id: 't2p1', courseHandicap: parseInt(t2p1.handicap, 10) || 0 });
                if (t2p2) team2Arr.push({ id: 't2p2', courseHandicap: parseInt(t2p2.handicap, 10) || 0 });

                const format = match.format || '1v1';
                const handicapData = calculatePlayingHandicaps(format, team1Arr, team2Arr);
                const currentMatchScores = allHoleScores.filter(s => s.matchup_id === match.id);

                // Run score calculation live on the layout card index
                const matchResult = evaluateMatchStatus(format, handicapData, courseHoles, currentMatchScores);
                
                // 🎯 FIXED FLAG TARGET CONFIGURATION: Directly tracks the is_live database attribute boolean
                const isCurrentlyLive = match.is_live === true || match.is_live === 'true';

                return (
                  <div key={match.id} className={`bg-gradient-to-br from-[#121827] to-[#0d121f] border rounded-3xl p-4 flex flex-col gap-4 shadow-xl relative overflow-hidden transition-all ${isCurrentlyLive ? 'border-orange-500/30' : 'border-white/5'}`}>
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r" style={{ backgroundImage: isCurrentlyLive ? 'linear-gradient(to right, #f97316, #ea580c)' : `linear-gradient(to right, ${teamAccentHex}, #1e293b)` }}></div>

                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
                      <span>Round {match.round} — Match #{match.match_number} <span className="text-amber-500 font-mono font-bold">({format.toUpperCase()})</span></span>
                      {match.status === 'completed' ? (
                        <span className="text-slate-400 bg-white/5 px-2 py-0.5 rounded-md font-bold">Final</span>
                      ) : isCurrentlyLive ? (
                        <span className="text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md font-bold animate-pulse">Live Tracking</span>
                      ) : (
                        <span className="text-slate-500 bg-white/[0.01] border border-white/5 px-2 py-0.5 rounded-md">Pending</span>
                      )}
                    </div>

                    {/* True 2v2 Partner Quad Roster Layout Box */}
                    <div className="grid grid-cols-2 gap-4 items-center bg-black/30 p-3 rounded-2xl border border-white/5 relative">
                      <div className="flex flex-col text-left truncate">
                        <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Slanted Clams</span>
                        <span className="text-sm font-black text-slate-100 truncate">{getPlayerName(match.team1_player1)}</span>
                        {match.team1_player2 && <span className="text-xs font-bold text-slate-400 truncate mt-0.5">{getPlayerName(match.team1_player2)}</span>}
                      </div>

                      <div className="flex flex-col items-end text-right border-l border-white/5 pl-4 truncate">
                        <span className="text-[9px] font-black uppercase text-red-400 tracking-wider">Brothelmen</span>
                        <span className="text-sm font-black text-slate-100 truncate">{getPlayerName(match.team2_player1)}</span>
                        {match.team2_player2 && <span className="text-xs font-bold text-slate-400 truncate mt-0.5">{getPlayerName(match.team2_player2)}</span>}
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Match Standing</span>
                        {/* 🎯 RENDERS SCORE DATA DIRECT FROM MULTI-PLAYER ROW ARRAYS IN MEMORY */}
                        <span className="text-sm font-black text-slate-200">
                          {matchResult.holesPlayed > 0 ? `${matchResult.statusStr} // THRU ${matchResult.holesPlayed}` : 'AS // TEE 1'}
                        </span>
                      </div>
                      <button 
                        onClick={onNavigateToSchedule}
                        className={`px-4 py-2.5 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] ${isCurrentlyLive || isMatchReadyToStart(match.round, match.tee_time) ? 'bg-[#34d399] text-black shadow-lg' : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'}`}
                      >
                        {match.status === 'completed' ? 'Summary' : isCurrentlyLive ? 'Resume Match' : 'Launch Match'}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Clubhouse Apps Navigation Panels */}
        <section className="space-y-3">
          <div className="flex justify-between items-center pl-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Clubhouse Applications</h2>
            {isAdmin && <button onClick={onNavigateToAdmin} className="text-[8px] font-black tracking-widest uppercase bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded">⚙️ Admin Console</button>}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onNavigateToLeaderboard} className="bg-[#121827] border border-white/5 rounded-2xl p-4 flex flex-col text-left gap-4 hover:border-white/10 active:scale-[0.97] transition-all group shadow-lg"><div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">🏆</div><div><h3 className="font-black text-sm uppercase tracking-tight text-slate-200">Leaderboard</h3><p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Live Field Standings</p></div></button>
            <button onClick={onNavigateToSchedule} className="bg-[#121827] border border-white/5 rounded-2xl p-4 flex flex-col text-left gap-4 hover:border-white/10 active:scale-[0.97] transition-all group shadow-lg"><div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">📅</div><div><h3 className="font-black text-sm uppercase tracking-tight text-slate-200">Schedule</h3><p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Rounds & Pairings</p></div></button>
            <button onClick={onNavigateToGarage} className="bg-[#121827] border border-white/5 rounded-2xl p-4 flex flex-col text-left gap-4 hover:border-white/10 active:scale-[0.97] transition-all group shadow-lg"><div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">⚙️</div><div><h3 className="font-black text-sm uppercase tracking-tight text-slate-200">The Garage</h3><p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Ballistics & Bag WITB</p></div></button>
            <button onClick={onNavigateToChirps} className="bg-[#121827] border border-white/5 rounded-2xl p-4 flex flex-col text-left gap-4 hover:border-white/10 active:scale-[0.97] transition-all group shadow-lg"><div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-lg group-hover:scale-110 transition-transform relative">💬{showChirpAlert && <><span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-[#121827] rounded-full animate-ping"></span><span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-[#121827] rounded-full"></span></>}</div><div><h3 className="font-black text-sm uppercase tracking-tight text-slate-200">Chirps Board</h3><p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Real-time Trash Talk</p></div></button>
          </div>
        </section>

      </main>
    </div>
  );
}