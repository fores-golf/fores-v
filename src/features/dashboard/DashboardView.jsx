import React from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import TopAppBar from '../../shared/components/layout/TopAppBar';
import DashboardSkeletons from './components/DashboardSkeletons';
import MyMatchesHero from './components/MyMatchesHero';
import DashboardNavGrid from './components/DashboardNavGrid';

export default function DashboardView({ onNavigateToProfile, onNavigateToGarage, onNavigateToChirps, onNavigateToLeaderboard, onNavigateToSchedule }) {
  const { ryderCupState, activeMatch, isLoading, error } = useDashboardData();

  return (
    <div className="min-h-[100dvh] bg-[#0f172a] text-white font-sans overflow-y-auto pb-safe selection:bg-[#34d399]/30">
      <TopAppBar 
        onAvatarClick={onNavigateToProfile} 
        team1={!isLoading && !error ? ryderCupState.team1 : null}
        team2={!isLoading && !error ? ryderCupState.team2 : null}
        hasNotifications={true}
      />

      <main className="p-5 flex flex-col gap-6 max-w-md mx-auto">
        {error && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-sm font-semibold border border-red-500/20 shadow-lg backdrop-blur-md">
            <span>{error} Swipe down to refresh.</span>
          </div>
        )}

        {isLoading ? (
          <DashboardSkeletons />
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                {activeMatch?.inProgress ? "Active Competition" : "Up Next For You"}
              </h2>
              <MyMatchesHero activeMatch={activeMatch} onClick={() => console.log('Hero shortcut...')} />
            </section>
            
            <section className="space-y-2">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1"> Tournament Hub </h2>
              <DashboardNavGrid 
                onProfileClick={onNavigateToProfile} 
                onGarageClick={onNavigateToGarage} 
                onChirpsClick={onNavigateToChirps}
                onLeaderboardClick={onNavigateToLeaderboard}
                onScheduleClick={onNavigateToSchedule}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}