import React from 'react';
// IMPORTANT: Adjust these import paths to match exactly where these files live in your project
import { useLeaderboardData } from '../leaderboard/LeaderboardView'; 
import { MatchProbabilityBar } from '../probability/probability_engine';
import { calculatePlayingHandicaps, evaluateMatchStatus } from '../../utils/matchPlayEngine';

const TickerMatchItem = ({ match }) => {
  const t1Names = match.team1_player2 ? `${match.team1_player1} & ${match.team1_player2}` : match.team1_player1;
  const t2Names = match.team2_player2 ? `${match.team2_player1} & ${match.team2_player2}` : match.team2_player1;

  // 🎯 FIX: Pull the exact live status string evaluated by the leaderboard engine
  // This ensures closed-out matches immediately read "CLAMS 4 & 3" or "BROTHELMEN 2 UP" instead of raw scores
  const matchStatusBadge = <span className="text-slate-200">{match.statusStr || 'AS'}</span>;
  const isCompleted = match.status === 'completed' || match.live_holesPlayed >= 18;

  return (
    <div className="flex items-center gap-3 mx-8 shrink-0">
      <div className="flex items-center gap-1.5">
        {!isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping absolute opacity-75"></span>}
        <span className={`w-1.5 h-1.5 rounded-full relative ${isCompleted ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
        <span className={`text-[9px] font-black uppercase tracking-widest ${isCompleted ? 'text-emerald-400' : 'text-orange-400'}`}>
          {isCompleted ? 'Final' : 'Live'}
        </span>
      </div>
      
      <div className="flex items-center gap-2 text-slate-300 font-bold text-[10px] uppercase tracking-wider">
        <span className="text-blue-400/80">{t1Names}</span>
        
        {/* Clean, proper Match Play Badge */}
        <div className="flex items-center justify-center min-w-[70px] bg-black/40 px-2 py-0.5 rounded border border-white/10 font-black tabular-nums shadow-inner whitespace-nowrap text-xs uppercase tracking-tight">
          {matchStatusBadge}
        </div>

        <span className="text-red-400/80">{t2Names}</span>
      </div>
      
      <div className="opacity-90 pointer-events-none flex items-center shrink-0 min-w-max">
        <MatchProbabilityBar 
          matchId={match.id} 
          status={isCompleted ? 'completed' : 'live'} 
          team1Name={match.team1_player1} 
          team2Name={match.team2_player1} 
          staticMode={false} 
          variant="ticker"
        />
      </div>
    </div>
  );
};

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
            
            <div className="flex items-center gap-3 mx-8 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">🏆 Overall</span>
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                <span className="text-blue-400 font-black text-[11px] tracking-wide">CLAMS {standings.team1.score}</span>
                <span className="text-slate-600 font-bold text-[8px] uppercase">VS</span>
                <span className="text-red-400 font-black text-[11px] tracking-wide">{standings.team2.score} BROTHELMEN</span>
              </div>
            </div>

            {liveMatches.length > 0 ? liveMatches.map(match => (
              <TickerMatchItem key={match.id} match={match} />
            )) : (
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