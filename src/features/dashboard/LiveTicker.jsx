import React from 'react';
// IMPORTANT: Adjust these import paths to match exactly where these files live in your project
import { useLeaderboardData } from '../leaderboard/LeaderboardView'; 
import { MatchProbabilityBar } from '../probability/probability_engine';

export default function LiveTicker() {
  const { standings, matchHistory, loading } = useLeaderboardData();

  if (loading) {
    return (
      <div className="w-full h-10 bg-[#060911] border-b border-white/5 flex items-center justify-center">
        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest animate-pulse">
          Syncing Live Feed...
        </span>
      </div>
    );
  }

  // Filter for matches currently out on the course
  const liveMatches = matchHistory.filter(m => 
    m.status === 'live' || m.is_live === true || m.is_live === 'true'
  );

  return (
    <div className="w-full h-10 bg-gradient-to-r from-[#030712] via-[#0f172a] to-[#030712] border-b border-white/10 overflow-hidden relative z-40 flex items-center shadow-lg">
      
      <style>
        {`
          @keyframes ticker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-ticker {
            animation: ticker 40s linear infinite; 
          }
          .ticker-content:hover {
            animation-play-state: paused;
          }
        `}
      </style>
      
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#030712] to-transparent z-10 pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#030712] to-transparent z-10 pointer-events-none"></div>

      <div className="flex whitespace-nowrap animate-ticker ticker-content w-max">
        
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex items-center">
            
            {/* Overall Tournament Score Jumbotron */}
            <div className="flex items-center gap-3 mx-8 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">🏆 Overall</span>
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                <span className="text-blue-400 font-black text-[11px] tracking-wide">CLAMS {standings.team1.score}</span>
                <span className="text-slate-600 font-bold text-[8px] uppercase">VS</span>
                <span className="text-red-400 font-black text-[11px] tracking-wide">{standings.team2.score} BROTHELMEN</span>
              </div>
            </div>

            {/* Live Matchup Feeds */}
            {liveMatches.length > 0 ? liveMatches.map(match => {
              // Dynamically build the team names depending on if it's 1v1 or 2v2
              const t1Names = match.team1_player2 ? `${match.team1_player1} & ${match.team1_player2}` : match.team1_player1;
              const t2Names = match.team2_player2 ? `${match.team2_player1} & ${match.team2_player2}` : match.team2_player1;

              return (
                <div key={match.id} className="flex items-center gap-3 mx-8 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping absolute opacity-75"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 relative"></span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">Live</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-slate-300 font-bold text-[10px] uppercase tracking-wider">
                    <span>{t1Names}</span>
                    
                    {/* Inline Numeric Score Badge */}
                    <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded border border-white/10 text-white font-black tabular-nums">
                      <span className={Number(match.team1_score) > Number(match.team2_score) ? "text-blue-400" : ""}>
                        {match.team1_score || 0}
                      </span>
                      <span className="text-slate-600">-</span>
                      <span className={Number(match.team2_score) > Number(match.team1_score) ? "text-red-400" : ""}>
                        {match.team2_score || 0}
                      </span>
                    </div>

                    <span>{t2Names}</span>
                  </div>
                  
                  <div className="w-24 h-3 opacity-90 pointer-events-none ml-2">
                    <MatchProbabilityBar 
                      matchId={match.id} 
                      status={match.status} 
                      team1Name={match.team1_player1} 
                      team2Name={match.team2_player1} 
                      staticMode={true} 
                    />
                  </div>
                </div>
              );
            }) : (
              <div className="flex items-center gap-2 mx-8 shrink-0">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 italic">No Active Pairings on Course</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}