import React, { useState, useEffect } from 'react';
import MatchScreen from './features/scoring/MatchScreen';
import Dashboard from './features/Dashboard/Dashboard';
import AuthScreen from './features/auth/AuthScreen';
import { supabase } from './config/supabaseClient';

export default function App() {
  const [session, setSession] = useState(null);
  const [currentView, setCurrentView] = useState('auth'); // 'auth', 'dashboard', 'match'

  useEffect(() => {
    // Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setCurrentView('dashboard');
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

  // --- ROUTING LOGIC ---
  if (!session || currentView === 'auth') {
    return <AuthScreen />;
  }

  if (currentView === 'dashboard') {
    return <Dashboard 
      onStartMatch={() => setCurrentView('match')} 
      onLogout={() => supabase.auth.signOut()} 
    />;
  }

  if (currentView === 'match') {
    return <MatchScreen onExit={() => setCurrentView('dashboard')} />;
  }
}