import React, { useState, useEffect } from 'react';
import { supabase } from './config/supabaseClient';

import AuthScreen from './features/auth/AuthScreen';
import DashboardView from './features/dashboard/DashboardView';
import MatchScreen from './features/scoring/MatchScreen';
import ProfileView from './features/profile/ProfileView';
import GarageView from './features/garage/GarageView';
import ChirpsView from './features/chat/ChirpsView';
import LeaderboardView from './features/leaderboard/LeaderboardView';
import ScheduleView from './features/schedule/ScheduleView';

export default function App() {
  const [session, setSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentView, setCurrentView] = useState('auth');
  const [activeScoringMatchId, setActiveScoringMatchId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setCurrentView('dashboard');
      setIsInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setCurrentView('dashboard');
      } else {
        setCurrentView('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-[100dvh] bg-[#0f172a] flex items-center justify-center pb-safe">
        <span className="animate-spin h-10 w-10 border-4 border-[#34d399] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session || currentView === 'auth') {
    return <AuthScreen />;
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#0f172a] overflow-hidden select-none">
      
      {currentView === 'dashboard' && (
        <DashboardView 
          onNavigateToProfile={() => setCurrentView('profile')} 
          onNavigateToGarage={() => setCurrentView('garage')} 
          onNavigateToChirps={() => setCurrentView('chirps')} 
          onNavigateToLeaderboard={() => setCurrentView('leaderboard')} 
          onNavigateToSchedule={() => setCurrentView('schedule')} 
        />
      )}
      
      {currentView === 'profile' && <ProfileView onBack={() => setCurrentView('dashboard')} />}
      {currentView === 'chirps' && <ChirpsView onBack={() => setCurrentView('dashboard')} />}
      {currentView === 'leaderboard' && <LeaderboardView onBack={() => setCurrentView('dashboard')} />}
      
      {currentView === 'schedule' && (
        <ScheduleView 
          onBack={() => setCurrentView('dashboard')} 
          onLaunchScoringEngine={(matchId) => {
            setActiveScoringMatchId(matchId);
            setCurrentView('match');
          }}
        />
      )}
      
      {currentView === 'match' && (
        <MatchScreen 
          matchId={activeScoringMatchId}
          onExit={() => {
            setActiveScoringMatchId(null);
            setCurrentView('schedule');
          }} 
        />
      )}

      <GarageView isOpen={currentView === 'garage'} onBack={() => setCurrentView('dashboard')} />

    </div>
  );
}