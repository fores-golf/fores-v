import React from 'react';
import { useLeaderboardData } from './hooks/useLeaderboardData';

export default function LeaderboardView({ onBack }) {
  const { standings, matchHistory, loading } = useLeaderboardData();

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0f172a] flex items-center justify-center pb-safe">
        <span className="animate-spin h-10 w-10 border-4 border-[#34d399] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Calculate percentages for the broadcast progress bar
  const t1Pct = (standings.team1.score / standings.totalAvailablePoints) * 100;
  const t2Pct = (standings.team2.score / standings.totalAvailablePoints) * 100;

  return (
    <div className="min-h-[100dvh] bg-[#090d16] text-white font-sans pb-safe fixed inset-0 z-40 overflow-y-auto">
      
      {/* Top Bar Header Navigation */}
      <div className="px-5 py-4 flex justify-between items-center bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-10">
        <button onClick={onBack} className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 active:scale-95 transition-transform">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          Hub
        </button>
        <h1 className="font-black text-lg tracking-tight uppercase italic flex items-center gap-1.5">
          <svg className="w-5 h-5 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Leaderboard
        </h1>
        <div className="w-8 h-8"></div>
      </div>

      <main className="p-5 flex flex-col gap-6 max-w-md mx-auto">
        
        {/* --- THE TRIP PROGRESS JUMBOTRON GRAPHIC --- */}
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-3xl p-5 border border-white/5 shadow-2xl relative overflow-hidden">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 text-center">
            Race to {standings.pointsNeededToWin} Points
          </h3>
          
          {/* Dynamic Dual Progress bar */}
          <div className="relative w-full h-5 bg-black/40 rounded-full border border-white/5 overflow-hidden flex">
            {/* Center target threshold bar indicator line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-yellow-500/50 z-10 dashed"></div>
            
            {/* Slanted Clams Track */}
            <div 
              style={{ width: `${t1Pct}%` }} 
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
            ></div>
            
            {/* Spacer pushing Clam Brothelmen to align perfectly from the right side */}
            <div className="flex-1"></div>
            
            {/* Clam Brothelmen Track */}
            <div 
              style={{ width: `${t2Pct}%` }} 
              className="h-full bg-gradient-to-l from-red-600 to-red-400 transition-all duration-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
            ></div>
          </div>

          <div className="flex justify-between items-center mt-3 px-1 text-xs font-black tracking-tight">
            <span className="text-blue-400">{standings.team1.score} pts</span>
            <span className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Target Outright Win</span>
            <span className="text-red-400">{standings.team2.score} pts</span>
          </div>
        </div>

        {/* --- TOURNAMENT MATCH INDIVIDUAL HISTORY --- */}
        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
            Match Analytics Matrix
          </h2>

          <div className="flex flex-col gap-3">
            {matchHistory.length === 0 ? (
              <div className="text-center p-8 bg-white/5 border border-white/5 rounded-2xl text-xs text-slate-500 italic">
                No tournament pairings published yet.
              </div>
            ) : (
              matchHistory.map((match) => (
                <div key={match.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 shadow-md backdrop-blur-md relative overflow-hidden flex flex-col gap-3">
                  
                  {/* Card Sub-Header */}
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      Round {match.round} • {match.format}
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      match.status === 'completed' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
                      match.status === 'live' ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {match.status}
                    </span>
                  </div>

                  {/* Competitor Match Rows */}
                  <div className="flex justify-between items-center text-sm">
                    {/* Left Team (Clams) */}
                    <div className="flex flex-col gap-0.5 text-left w-[42%]">
                      <span className="font-black tracking-tight text-slate-200 truncate">{match.team1_player1}</span>
                      {match.team1_player2 && <span className="font-medium text-xs text-slate-500 truncate">{match.team1_player2}</span>}
                    </div>

                    {/* Score Centerpiece Box */}
                    <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-xl border border-white/5 font-black text-base tabular-nums shadow-inner">
                      <span className={match.team1_score > match.team2_score ? "text-blue-400" : "text-slate-400"}>{match.team1_score}</span>
                      <span className="text-xs text-slate-600 font-bold">-</span>
                      <span className={match.team2_score > match.team1_score ? "text-red-400" : "text-slate-400"}>{match.team2_score}</span>
                    </div>

                    {/* Right Team (Brothelmen) */}
                    <div className="flex flex-col gap-0.5 text-right w-[42%]">
                      <span className="font-black tracking-tight text-slate-200 truncate">{match.team2_player1}</span>
                      {match.team2_player2 && <span className="font-medium text-xs text-slate-500 truncate">{match.team2_player2}</span>}
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        </section>

      </main>
    </div>
  );
}