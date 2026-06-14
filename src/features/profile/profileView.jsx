import React, { useState, useEffect } from 'react';
import { useProfileData } from './hooks/useProfileData';
import { supabase } from '../../config/supabaseClient';

export default function ProfileView({ onBack }) {
  const { profile, teams, loading, updating, updateProfile, uploadAvatar } = useProfileData();
  const [username, setUsername] = useState('');
  const [handicap, setHandicap] = useState(0);
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setHandicap(profile.handicap);
      setTeamName(profile.team_name);
    }
  }, [profile]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    const result = await updateProfile({ username, handicap, avatar_url: profile.avatar_url, team_name: teamName });
    if (result?.success) {
      alert('Golfer matrix updated successfully!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0f172a] flex items-center justify-center pb-safe">
        <span className="animate-spin h-10 w-10 border-4 border-[#34d399] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Dynamic perimeter styling based on selected team franchise
  const getTeamGlowColor = () => {
    if (teamName === 'Slanted Clams') return 'shadow-[0_0_25px_rgba(59,130,246,0.25)] border-blue-500/40';
    if (teamName === 'Clam Brothelmen') return 'shadow-[0_0_25px_rgba(239,68,68,0.25)] border-red-500/40';
    return 'shadow-[0_0_20px_rgba(52,211,153,0.1)] border-white/10';
  };

  return (
    <div className="min-h-[100dvh] bg-[#0f172a] text-white font-sans pb-safe">
      
      {/* Top Bar Nav */}
      <div className="px-5 py-4 flex justify-between items-center bg-[#0f172a]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <button onClick={onBack} className="text-sm font-bold text-slate-400 flex items-center gap-1 active:scale-95 transition-transform">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          Hub
        </button>
        <h1 className="font-black text-lg tracking-tight uppercase">Golfer Card</h1>
        <button onClick={handleSave} disabled={updating} className="text-sm font-black text-[#34d399] active:scale-95 transition-transform disabled:opacity-50">
          Save
        </button>
      </div>

      <main className="p-5 flex flex-col gap-6 max-w-md mx-auto">
        
        {/* --- VISUAL PLAYER IDENTITY CARD --- */}
        <div className={`relative overflow-hidden rounded-3xl border p-6 bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617] text-center transition-all duration-300 ${getTeamGlowColor()}`}>
          
          {/* Team Background Gradient Flares */}
          {teamName === 'Slanted Clams' && <div className="absolute -right-10 -top-10 w-36 h-36 bg-blue-500/15 rounded-full blur-3xl"></div>}
          {teamName === 'Clam Brothelmen' && <div className="absolute -right-10 -top-10 w-36 h-36 bg-red-500/15 rounded-full blur-3xl"></div>}
          {(!teamName) && <div className="absolute -right-10 -top-10 w-36 h-36 bg-[#34d399]/10 rounded-full blur-3xl"></div>}

          {/* Avatar Upload Container */}
          <div className="relative w-24 h-24 mx-auto mb-4 group/avatar">
            <label htmlFor="avatar-upload" className="cursor-pointer block relative h-full w-full rounded-full overflow-hidden border-2 border-white/10 bg-slate-800 shadow-inner">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-black bg-gradient-to-br from-slate-700 to-slate-900 text-slate-300">
                  {username ? username.substring(0, 2).toUpperCase() : '??'}
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] font-black tracking-wider uppercase text-white">
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
                Edit
              </div>
            </label>
            <input type="file" id="avatar-upload" accept="image/*" onChange={uploadAvatar} disabled={updating} className="hidden" />
          </div>

          <h2 className="text-xl font-black tracking-tight text-white">{username || 'Anonymous Golfer'}</h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
              teamName === 'Slanted Clams' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
              teamName === 'Clam Brothelmen' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
              'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}>
              {teamName || 'Unassigned'}
            </span>
            <span className="text-xs font-bold text-slate-400">•</span>
            <span className="text-xs font-bold tracking-tight text-slate-400">HDCP: <span className="text-[#34d399]">{handicap || '0.0'}</span></span>
          </div>
        </div>

        {/* --- DATA INPUT FORM --- */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          
          {/* Team Switcher Segment block */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Team Franchise</label>
            <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
              {teams.map((t) => {
                const isSelected = teamName === t.name;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTeamName(t.name)}
                    className={`py-3 rounded-xl font-bold text-sm transition-all ${
                      isSelected 
                        ? t.name === 'Slanted Clams' 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                          : 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Golfer Handle</label>
            <div className="relative">
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter handle..."
                className="w-full bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 p-4 pl-11 text-white font-semibold placeholder-slate-600 focus:outline-none focus:border-[#34d399]/40 focus:ring-1 focus:ring-[#34d399]/40 transition-colors"
              />
              <svg className="absolute left-4 top-4.5 w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Handicap Index</label>
            <div className="relative">
              <input 
                type="number" 
                step="0.1"
                value={handicap} 
                onChange={(e) => setHandicap(e.target.value)}
                placeholder="0.0"
                className="w-full bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 p-4 pl-11 text-white font-semibold placeholder-slate-600 focus:outline-none focus:border-[#34d399]/40 focus:ring-1 focus:ring-[#34d399]/40 transition-colors"
              />
              <svg className="absolute left-4 top-4.5 w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5">
            <button 
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold py-4 rounded-2xl transition-colors active:scale-95 duration-200 flex justify-center items-center gap-2 text-sm uppercase tracking-wider"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              Sign Out Session
            </button>
          </div>
        </form>

      </main>
    </div>
  );
}