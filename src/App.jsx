import React, { useState } from 'react';

// Identity Context
import { UserProvider, useUser } from './context/UserContext';

// Feature-Sliced Design Application Views
import AuthScreen from './features/auth/AuthScreen';
import DashboardView from './features/dashboard/DashboardView';
import MatchScreen from './features/scoring/MatchScreen';
import ProfileView from './features/profile/ProfileView';
import GarageView from './features/garage/GarageView';
import ChirpsView from './features/chat/ChirpsView';
import LeaderboardView from './features/leaderboard/LeaderboardView';
import ScheduleView from './features/schedule/ScheduleView';

// --- MAIN ROUTER LOGIC ---
function AppRouter() {
  // Consume our new global context!
  const { session, player, isAuthLoading } = useUser();
  const [currentView, setCurrentView] = useState('dashboard'); 
  const [activeScoringMatchId, setActiveScoringMatchId] = useState(null);

  // 1. Show the global boot spinner while checking identity
  if (isAuthLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#0f172a] flex items-center justify-center pb-safe">
        <span className="animate-spin h-10 w-10 border-4 border-[#34d399] border-t-transparent rounded-full" />
      </div>
    );
  }

  // 2. Route gatekeeper: Force to auth screen if no session exists
  if (!session) {
    return <AuthScreen />;
  }

  // 3. Ensure player row is loaded before rendering the heavy tournament hubs
  if (session && !player) {
    return (
      <div className="min-h-[100dvh] bg-[#0f172a] flex flex-col items-center justify-center pb-safe text-white gap-4">
        <span className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Locating Tour Card...</p>
      </div>
    );
  }

  // 4. Core System Layer Manager
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

      {/* Hardware Accelerated Persistent Overlay */}
      <GarageView isOpen={currentView === 'garage'} onBack={() => setCurrentView('dashboard')} />

    </div>
  );
}

// --- APP WRAPPER ---
// We wrap the Router in the Provider here so the Router can use the context hooks.
export default function App() {
  return (
    <UserProvider>
      <AppRouter />
    </UserProvider>
  );
}