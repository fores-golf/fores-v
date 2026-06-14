import React, { useState, useEffect } from 'react';
import { supabase } from './config/supabaseClient';

// FSD Component Imports
import AuthScreen from './features/auth/AuthScreen';
import DashboardView from './features/dashboard/DashboardView';
import MatchScreen from './features/scoring/MatchScreen';

export default function App() {
  const [session, setSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true); // New: Prevents the auth flash
  const [currentView, setCurrentView] = useState('auth'); // 'auth', 'dashboard', 'match', 'profile'

  useEffect(() => {
    // Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setCurrentView('dashboard');
      setIsInitializing(false); // Done checking!
    });

    // Listen for login/logout events
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

  // --- INITIALIZATION STATE ---
  if (isInitializing) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center pb-safe">
        <span className="animate-spin h-10 w-10 border-4 border-[#1e8c45] border-t-transparent rounded-full" />
      </div>
    );
  }

  // --- ROUTING LOGIC ---
  if (!session || currentView === 'auth') {
    return <AuthScreen />;
  }

  /* * FUTURE ARCHITECTURE NOTE:
   * Once we build TournamentContext, it will wrap these authenticated routes:
   * <TournamentProvider>
   * {currentView === 'dashboard' && <DashboardView />}
   * </TournamentProvider>
   */

  if (currentView === 'dashboard') {
    return (
      <DashboardView 
        onStartMatch={() => setCurrentView('match')} 
        // We temporarily map this until the Profile feature is built out
        onNavigateToProfile={() => console.log('Navigate to Profile...')} 
      />
    );
  }

  if (currentView === 'match') {
    return <MatchScreen onExit={() => setCurrentView('dashboard')} />;
  }

  // Fallback
  return null;
}