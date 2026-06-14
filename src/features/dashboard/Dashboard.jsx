import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function Dashboard({ onStartMatch, onLogout }) {
  const [isLoading, setIsLoading] = useState(true);
  
  // Real State Containers
  const [ryderCupState, setRyderCupState] = useState({
    team1: { name: "Slanted Clams", score: 0 },
    team2: { name: "Clam Brothelmen", score: 0 }
  });
  
  const [activeMatch, setActiveMatch] = useState({
    inProgress: false,
    matchId: null,
    currentHole: 1,
    format: "",
    opponents: ""
  });

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);

      try {
        // 1. Get the currently logged-in user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 2. Fetch Global Ryder Cup Scores
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('name, points');

        if (!teamsError && teamsData) {
          const clams = teamsData.find(t => t.name === 'Slanted Clams') || { name: 'Slanted Clams', points: 0 };
          const brothelmen = teamsData.find(t => t.name === 'Clam Brothelmen') || { name: 'Clam Brothelmen', points: 0 };
          
          setRyderCupState({
            team1: { name: clams.name, score: clams.points },
            team2: { name: brothelmen.name, score: brothelmen.points }
          });
        }

        // 3. Fetch Active Match for this specific user
        // We query the join table to find matches they are a part of that are 'in_progress'
        const { data: matchData, error: matchError } = await supabase
          .from('match_players')
          .select(`
            match_id,
            matches ( id, format, status, current_hole )
          `)
          .eq('profile_id', user.id)
          .eq('matches.status', 'in_progress')
          .single();

        if (matchData && matchData.matches) {
          // If they have an active match, update the hero button
          setActiveMatch({
            inProgress: true,
            matchId: matchData.matches.id,
            currentHole: matchData.matches.current_hole,
            format: matchData.matches.format,
            opponents: "Opponents" // Note: We will write a more complex query later to fetch exact opponent names!
          });
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white font-sans overflow-hidden antialiased">
      
      {/* --- HEADER: GLOBAL RYDER CUP SCOREBOARD --- */}
      <header className="pt-12 pb-6 px-4 shrink-0 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 relative shadow-2xl">
        <div className="absolute top-4 right-4">
          <button onClick={onLogout} className="text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors border border-slate-800 bg-slate-900 rounded px-2 py-1">
            Sign Out
          </button>
        </div>

        <div className="text-center mb-4">
          <h1 className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase">Fores V</h1>
          <h2 className="text-sm font-black tracking-widest text-emerald-500 uppercase mt-0.5 shadow-emerald-500/20 drop-shadow-md">The Ryder Cup</h2>
        </div>

        {/* Live Score Strip */}
        <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-2xl p-2 shadow-inner">
          <div className="flex-1 flex flex-col items-center border-r border-slate-800 px-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 text-center leading-tight">Slanted<br/>Clams</span>
            <span className={`text-3xl font-mono font-black ${ryderCupState.team1.score > ryderCupState.team2.score ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'text-slate-400'}`}>
              {ryderCupState.team1.score}
            </span>
          </div>
          
          <div className="px-4 flex flex-col items-center justify-center">
            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">VS</span>
          </div>

          <div className="flex-1 flex flex-col items-center border-l border-slate-800 px-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 text-center leading-tight">Clam<br/>Brothelmen</span>
            <span className={`text-3xl font-mono font-black ${ryderCupState.team2.score > ryderCupState.team1.score ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'text-slate-400'}`}>
              {ryderCupState.team2.score}
            </span>
          </div>
        </div>
      </header>

      {/* --- MATRIX NAV GRID --- */}
      <main className="flex-1 px-4 py-5 overflow-y-auto pb-safe flex flex-col gap-4 relative">
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
             <span className="text-xs font-black text-emerald-500 uppercase tracking-widest animate-pulse">Syncing Telemetry...</span>
          </div>
        )}

        {/* 1. HERO TILE: Smart Match Engine */}
        <button 
          onClick={() => onStartMatch(activeMatch.matchId)} // Passes the real Match ID to the MatchScreen!
          className={`w-full rounded-3xl p-6 flex flex-col items-start justify-end h-40 transition-all relative overflow-hidden group ${
            activeMatch.inProgress 
              ? 'bg-gradient-to-br from-orange-600 to-orange-900 border border-orange-500/50 shadow-[0_10px_30px_rgba(249,115,22,0.2)]'
              : 'bg-gradient-to-br from-emerald-600 to-emerald-900 border border-emerald-500/50 shadow-[0_10px_30px_rgba(16,185,129,0.2)]'
          }`}
        >
          <svg className={`absolute -right-4 -bottom-4 w-32 h-32 opacity-20 group-hover:scale-110 transition-transform ${activeMatch.inProgress ? 'text-orange-100' : 'text-emerald-100'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z"/></svg>
          
          {activeMatch.inProgress ? (
            <>
              <div className="flex justify-between items-start w-full z-10 mb-auto">
                <span className="bg-orange-950/50 border border-orange-500/30 text-orange-300 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">Match In Progress</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-orange-200">{activeMatch.format}</span>
              </div>
              <div className="z-10 mt-2 text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-200 block mb-0.5">Resume vs {activeMatch.opponents}</span>
                <span className="text-3xl font-black tracking-tighter text-white uppercase leading-none">Hole {activeMatch.currentHole} ➔</span>
              </div>
            </>
          ) : (
            <>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 mb-1 z-10">Initialize Tracker</span>
              <span className="text-3xl font-black tracking-tighter text-white uppercase z-10">Start Match</span>
            </>
          )}
        </button>

        {/* ... (Keep the rest of your secondary buttons exactly the same) ... */}
        
        <div className="grid grid-cols-2 gap-4">
          <button className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 flex flex-col items-start justify-between h-36 hover:bg-slate-800 transition-colors text-left relative">
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md">Live Data</span>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Results & Tees</span>
              <span className="text-lg font-black tracking-tight text-white uppercase leading-none">Schedule</span>
            </div>
          </button>

          <button className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 flex flex-col items-start justify-between h-36 hover:bg-slate-800 transition-colors text-left relative">
             <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md">The Book</span>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Wager Ledger</span>
              <span className="text-lg font-black tracking-tight text-white uppercase leading-none">Bet Board</span>
            </div>
          </button>
        </div>

        <button className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 flex items-center justify-between hover:bg-slate-800 transition-colors text-left relative overflow-hidden group">
          <div className="flex flex-col z-10">
            <div className="flex items-center gap-2 mb-1">
               <span className="text-xl font-black tracking-tight text-white uppercase">Chirps</span>
            </div>
            <span className="text-[10px] font-black tracking-wider text-slate-400 truncate max-w-[200px]">
              Tap to view group feed...
            </span>
          </div>
          <span className="text-slate-600 font-black text-xl group-hover:translate-x-1 transition-transform z-10">→</span>
        </button>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <button className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4 flex flex-col items-start justify-end h-28 hover:border-slate-600 transition-colors text-left">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Equipment</span>
            <span className="text-sm font-black tracking-tight text-slate-300 uppercase">The Garage</span>
          </button>

          <button className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4 flex flex-col items-start justify-end h-28 hover:border-slate-600 transition-colors text-left">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Locker Room</span>
            <span className="text-sm font-black tracking-tight text-slate-300 uppercase">Profile</span>
          </button>
        </div>

      </main>
    </div>
  );
}