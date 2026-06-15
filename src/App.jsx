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

// Trading Card Views
import CardCollectionView from './features/achievements/CardCollectionView';
// Import the new administrator screen
import AdminConsoleView from './features/admin/AdminConsoleView';

// --- MAIN ROUTER LOGIC ---
function AppRouter() {
  const { session, player, isAuthLoading } = useUser();
  const [currentView, setCurrentView] = useState('dashboard'); 
  const [activeScoringMatchId, setActiveScoringMatchId] = useState(null);

  // SECURE CHECK: Determine if the logged-in profile belongs to you (Trevor)
  // You can verify by your login email or your database row name string
  const isAdminUser = session?.user?.email === 'tjcolo87@gmail.com' || player?.name?.includes('Trevor');

  // 1. Show global boot spinner while checking identity
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

  // 3. Ensure player row is loaded before rendering heavy tournament hubs
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
          onNavigateToVault={() => setCurrentView('vault')}
          // Pass down the navigation launcher callback for your Admin view
          onNavigateToAdmin={() => setCurrentView('admin')}
          // Expose permission state down to the UI
          isAdmin={isAdminUser}
          isChirpsOpen={currentView === 'chirps'}
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
          onBack={() => {
            setActiveScoringMatchId(null);
            setCurrentView('schedule');
          }} 
        />
      )}

      {/* Hidden Trading Card Inventory System View */}
      <CardCollectionView 
        isOpen={currentView === 'vault'} 
        onBack={() => setCurrentView('dashboard')} 
      />

      {/* SECURE BLOCK: Mount Admin Engine view only if identity authorization clears */}
      <AdminConsoleView 
        isOpen={currentView === 'admin' && isAdminUser} 
        onBack={() => setCurrentView('dashboard')} 
      />

      {/* Hardware Accelerated Persistent Overlay */}
      <GarageView isOpen={currentView === 'garage'} onBack={() => setCurrentView('dashboard')} />

    </div>
  );
}

// --- APP WRAPPER ---
export default function App() {
  return (
    <UserProvider>
      <AppRouter />
    </UserProvider>
  );
}