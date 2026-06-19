import React, { useState } from 'react';
import { useLeaderboardData } from './hooks/useLeaderboardData';
// Adjust this import path based on where your probability engine file is located
import { MatchProbabilityBar } from '../probability/probability_engine'; 

// Metadata mapping for the UI
const ROUND_METADATA = {
  1: { date: 'June 25th', course: 'Quarry' },
  2: { date: 'June 26th', course: 'Quarry' },
  3: { date: 'June 26th', course: 'Legend' },
  4: { date: 'June 27th', course: 'Legend' },
  5: { date: 'June 27th', course: 'Quarry' }
};

export default function LeaderboardView({ onBack }) {
  const [viewMode, setViewMode] = useState('team'); 
  const { standings, matchHistory, individualStats, loading } = useLeaderboardData();

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0f172a] flex items-center justify-center pb-safe">
        <span className="animate-spin h-10 w-10 border-4 border-[#34d399] border-t-transparent rounded-full" />
      </div>
    );
  }

  const t1Pct = (standings.team1.score / standings.totalAvailablePoints) * 100;
  const t2Pct = (standings.team2.score / standings.totalAvailablePoints) * 100;

  // --- 🎯 NEW: SORT ENGINE ---
  // Forces 'live' matches to the top, then sorts the rest chronologically
  const sortedMatchHistory = [...matchHistory].sort((a, b) => {
    if (a.status === 'live' && b.status !== 'live') return -1;
    if (b.status === 'live' && a.status !== 'live') return 1;
    return a.round - b.round;
  });

  return (
    <div className="min-h-[100dvh] bg-[#090d16] text-white font-sans pb-safe fixed inset-0 z-40 overflow-y-auto style-scrolling-touch">
      
      {/* Top Bar Header Navigation */}
      <div className="px-5 py-4 flex justify-between items-center bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20">
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

      <main className="p-5 flex flex-col gap-6 max-w-md mx-auto relative z-0">
        
        {/* --- VIEW TOGGLE CONTROL (THE TABS) --- */}
        <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 sticky top-20 z-10 backdrop-blur-md">
          <button 
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${viewMode === 'team' ? 'bg-[#34d399] text-black shadow-md' : 'text-slate-500 hover:text-slate-300'}`} 
            onClick={() => setViewMode('team')}
          >
            Team Matches
          </button>
          <button 
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${viewMode === 'individual' ? 'bg-[#34d399] text-black shadow-md' : 'text-slate-500 hover:text-slate-300'}`} 
            onClick={() => setViewMode('individual')}
          >
            Individual
          </button>
        </div>

        {viewMode === 'team' ? (
          <>
            {/* --- THE TRIP PROGRESS JUMBOTRON GRAPHIC --- */}
            <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-3xl p-5 border border-white/5 shadow-2xl relative overflow-hidden">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 text-center">
                Race to {standings.pointsNeededToWin} Points
              </h3>
              
              <div className="relative w-full h-5 bg-black/40 rounded-full border border-white/5 overflow-hidden flex">
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-yellow-500/50 z-10 dashed"></div>
                <div style={{ width: `${t1Pct}%` }} className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                <div className="flex-1"></div>
                <div style={{ width: `${t2Pct}%` }} className="h-full bg-gradient-to-l from-red-600 to-red-400 transition-all duration-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
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
                {sortedMatchHistory.length === 0 ? (
                  <div className="text-center p-8 bg-white/5 border border-white/5 rounded-2xl text-xs text-slate-500 italic">
                    No tournament pairings published yet.
                  </div>
                ) : (
                  sortedMatchHistory.map((match) => {
                    const roundMeta = ROUND_METADATA[match.round] || { date: 'TBD', course: 'TBD' };

                    return (
                      <div key={match.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 shadow-md backdrop-blur-md relative overflow-hidden flex flex-col gap-3">
                        
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                              R{match.round} • {match.format}
                            </span>
                            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                            <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-widest">
                              {roundMeta.course}
                            </span>
                          </div>
                          
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded shrink-0 ${
                            match.status === 'completed' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
                            match.status === 'live' ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {match.status}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                          <div className="flex flex-col gap-0.5 text-left w-[42%]">
                            <span className="font-black tracking-tight text-slate-200 truncate">{match.team1_player1 || 'TBD'}</span>
                            {match.team1_player2 && <span className="font-medium text-xs text-slate-500 truncate">{match.team1_player2}</span>}
                          </div>

                          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-xl border border-white/5 font-black text-base tabular-nums shadow-inner">
                            <span className={match.team1_score > match.team2_score ? "text-blue-400" : "text-slate-400"}>{match.team1_score}</span>
                            <span className="text-xs text-slate-600 font-bold">-</span>
                            <span className={match.team2_score > match.team1_score ? "text-red-400" : "text-slate-400"}>{match.team2_score}</span>
                          </div>

                          <div className="flex flex-col gap-0.5 text-right w-[42%]">
                            <span className="font-black tracking-tight text-slate-200 truncate">{match.team2_player1 || 'TBD'}</span>
                            {match.team2_player2 && <span className="font-medium text-xs text-slate-500 truncate">{match.team2_player2}</span>}
                          </div>
                        </div>

                        {/* GATE THE PROBABILITY ENGINE SO IT DOES NOT CRASH ON BLANK ROSTERS */}
                        {match.team1_player1 && match.team2_player1 && (
                          <MatchProbabilityBar 
                            matchId={match.id} 
                            status={match.status} 
                            team1Name={match.team1_player1}
                            team2Name={match.team2_player1}
                          />
                        )}

                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </>
        ) : (
          /* --- INDIVIDUAL LEADERBOARD VIEW --- */
          <section className="space-y-3 animate-fade-in">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex justify-between items-center">
              <span>Individual Standings</span>
              <span className="bg-white/5 px-2 py-1 rounded text-slate-500">Sort: Lowest Net</span>
            </h2>

            <div className="flex flex-col gap-3">
              {individualStats.length === 0 ? (
                <div className="text-center p-8 bg-white/5 border border-white/5 rounded-2xl text-xs text-slate-500 italic">
                  No individual scores logged yet.
                </div>
              ) : (
                individualStats.map((golfer, index) => {
                  const isClams = golfer.team === 'Slanted Clams';
                  
                  return (
                    <div key={golfer.id} className={`bg-white/5 border ${index === 0 ? 'border-amber-400/30 bg-amber-500/5' : 'border-white/5'} rounded-2xl p-4 shadow-md backdrop-blur-md flex items-center justify-between transition-colors hover:bg-white/10`}>
                      
                      <div className="flex items-center gap-4">
                        <div className={`text-xl font-black italic w-6 text-center ${index === 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                          {index + 1}
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="font-black text-slate-100 text-lg tracking-tight leading-none">{golfer.name}</span>
                          <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isClams ? 'text-blue-400' : 'text-red-400'}`}>
                            {golfer.team}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-4 text-right">
                        <div className="flex flex-col items-center justify-center w-10">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Gross</span>
                          <span className="text-sm font-black tabular-nums text-slate-300">{golfer.gross}</span>
                        </div>
                        
                        <div className="w-px bg-white/10 my-1"></div>
                        
                        <div className="flex flex-col items-center justify-center w-12">
                          <span className="text-[8px] font-black uppercase tracking-widest text-[#34d399] mb-1">Net</span>
                          <span className={`font-black tabular-nums leading-none drop-shadow-md ${golfer.completedRounds > 0 ? 'text-lg text-[#34d399]' : 'text-[10px] text-slate-500 mt-1'}`}>
                            {/* Displays "TBD" until the hook confirms 18 holes are finished */}
                            {golfer.netDisplay}
                          </span>
                        </div>
                        
                        <div className="w-px bg-white/10 my-1"></div>
                        
                        <div className="flex flex-col items-center justify-center w-10">
                          <span className="text-[8px] font-black uppercase tracking-widest text-amber-400 mb-1">Won</span>
                          <span className="text-sm font-black tabular-nums text-amber-400">{golfer.holesWon}</span>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}