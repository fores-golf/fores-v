import React, { useState } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e, type) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white font-sans items-center justify-center p-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm z-10 flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2 uppercase">Fores</h1>
          <p className="text-xs font-black tracking-[0.2em] text-emerald-500 uppercase">Telemetry & Analytics</p>
        </div>

        <form className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Email Coordinates</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="golfer@tour.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Secure Passkey</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-[10px] font-black text-red-400 uppercase tracking-wider text-center">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button 
              onClick={(e) => handleAuth(e, 'login')}
              disabled={loading}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest py-3.5 rounded-xl transition-all border border-slate-700"
            >
              Sign In
            </button>
            <button 
              onClick={(e) => handleAuth(e, 'signup')}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest py-3.5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all border border-emerald-500"
            >
              Create Locker
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}