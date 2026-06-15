import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Roster Claim State (for new signups)
  const [unclaimedPlayers, setUnclaimedPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');

  // Fetch players who haven't created an account yet
  useEffect(() => {
    async function fetchUnclaimedPlayers() {
      const { data } = await supabase
        .from('players')
        .select('id, name, team')
        .is('auth_id', null)
        .order('name');
      
      if (data) setUnclaimedPlayers(data);
    }

    if (!isLogin) {
      fetchUnclaimedPlayers();
    }
  }, [isLogin]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        // --- LOGIN FLOW ---
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        
        // If successful, App.jsx's onAuthStateChange listener will automatically catch it and route to the dashboard.
      } else {
        // --- SIGN UP FLOW ---
        if (!selectedPlayerId) {
          throw new Error('Please select your name from the roster to claim your profile.');
        }

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        // If sign up is successful, link their new auth ID to their player profile
        if (authData?.user) {
          const { error: linkError } = await supabase
            .from('players')
            .update({ auth_id: authData.user.id })
            .eq('id', selectedPlayerId);

          if (linkError) throw linkError;
        }

        setMessage('Registration successful! You are now logged in and linked to your roster profile.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#090d16] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-[#34d399]/30">
      
      {/* Background ambient glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#34d399]/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md z-10 flex flex-col gap-8">
        
        {/* Logo / Header Jumbotron */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-[#34d399] to-[#1e8c45] rounded-2xl mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.3)] mb-6">
            <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight italic">Fores V</h1>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Tournament Scoring Engine</p>
        </div>

        {/* Auth Form Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
          
          <div className="flex bg-black/40 p-1 rounded-xl mb-6 border border-white/5">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${isLogin ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${!isLogin ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-bold mb-4 flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="bg-[#34d399]/10 border border-[#34d399]/20 text-[#34d399] p-3 rounded-xl text-xs font-bold mb-4">
              {message}
            </div>
          )}

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            
            {!isLogin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Claim Your Profile</label>
                <select 
                  value={selectedPlayerId} 
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm font-semibold focus:outline-none focus:border-[#34d399]/50 text-white transition-colors"
                >
                  <option value="">Select your name...</option>
                  {unclaimedPlayers.map((player) => (
                    <option key={player.id} value={player.id} className="bg-[#0f172a]">
                      {player.name} ({player.team})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="golfer@fores-v.com"
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm font-semibold focus:outline-none focus:border-[#34d399]/50 text-white placeholder-slate-600 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm font-semibold focus:outline-none focus:border-[#34d399]/50 text-white placeholder-slate-600 transition-colors"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#34d399] hover:bg-[#2bc489] text-black font-black py-4 rounded-xl transition-all active:scale-[0.98] uppercase tracking-wider text-sm mt-2 shadow-[0_0_15px_rgba(52,211,153,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Authenticating...' : (isLogin ? 'Enter Clubhouse' : 'Register & Claim Profile')}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}