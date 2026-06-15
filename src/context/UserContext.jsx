import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

const UserContext = createContext();
export const useUser = () => useContext(UserContext);

// The official Tournament Rules Committee list
const ADMIN_NAMES = ['Trevor Roeger', 'Brett Newman', 'Kevin Gurney'];

export function UserProvider({ children }) {
  const [session, setSession] = useState(null);
  const [player, setPlayer] = useState(null); 
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // Admin flag state

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchPlayerProfile(session.user.id);
      else setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchPlayerProfile(session.user.id);
      else {
        setPlayer(null);
        setIsAdmin(false);
        setIsAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPlayerProfile = async (authId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authId)
        .single();

      if (error) throw error;
      setPlayer(data);
      
      // Check if their verified name is on the Admin List
      if (data && ADMIN_NAMES.includes(data.name)) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error('Error fetching golfer identity:', err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const refreshIdentity = async () => {
    if (session?.user?.id) await fetchPlayerProfile(session.user.id);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <UserContext.Provider value={{ session, player, isAdmin, isAuthLoading, logout, refreshIdentity }}>
      {children}
    </UserContext.Provider>
  );
}