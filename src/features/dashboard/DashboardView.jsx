import React from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import TopAppBar from '../../shared/components/layout/TopAppBar';
import DashboardSkeletons from './components/DashboardSkeletons';
import MyMatchesHero from './components/MyMatchesHero';
import DashboardNavGrid from './components/DashboardNavGrid';

// Note: You can delete import RyderCupScoreboard; it is gone!

export default function DashboardView({ onNavigateToProfile }) {
  const { ryderCupState, activeMatch, isLoading, error } = useDashboardData();

  return (
    <div className="min-h-[100dvh] bg-[#0f172a] text-white font-sans overflow-y-auto pb-safe">
      
      {/* We now pass the teams directly into the TopAppBar! */}
      <TopAppBar 
        onAvatarClick={onNavigateToProfile} 
        team1={!isLoading && !error ? ryderCupState.team1 : null}
        team2={!isLoading && !error ? ryderCupState.team2 : null}
      />

      {/* Main Content Area */}
      <main className="p-5 flex flex-col gap-6 max-w-md mx-auto">
        {error && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-sm font-medium border border-red-500/20 shadow-sm">
            {error} - Please pull to refresh.
          </div>
        )}

        {isLoading ? (
          <DashboardSkeletons />
        ) : (
          <>
            <section>
              <MyMatchesHero 
                activeMatch={activeMatch} 
                onClick={() => console.log('Navigating to My Matches...')} 
              />
            </section>
            
            <section>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Tournament Hub</h2>
              <DashboardNavGrid />
            </section>
          </>
        )}
      </main>
    </div>
  );
}