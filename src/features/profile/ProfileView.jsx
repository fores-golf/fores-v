import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useUser } from '../../context/UserContext';

// --- DIRECT ASSET IMPORTS ---
import dkImg from '/assets/badges/dk.png';
import tkImg from '/assets/badges/tk.png';
import okImg from '/assets/badges/ok.png';
import ktImg from '/assets/badges/kt.png';
import ktrImg from '/assets/badges/ktr.png';
import kmImg from '/assets/badges/km.png';
import ktsImg from '/assets/badges/kts.png';
import kpImg from '/assets/badges/kp.png';
import kymImg from '/assets/badges/kym.png';

const AVAILABLE_BADGES = [
  { id: 'b1', name: 'Double Par', targetStreak: 2, imageAsset: dkImg, description: 'Two pars or better in a row' },
  { id: 'b2', name: 'Triple Par', targetStreak: 3, imageAsset: tkImg, description: 'Three pars or better in a row' },
  { id: 'b3', name: 'Overpar', targetStreak: 4, imageAsset: okImg, description: 'Four pars or better in a row' },
  { id: 'b4', name: 'Partacular', targetStreak: 5, imageAsset: ktImg, description: 'Five pars or better in a row' },
  { id: 'b5', name: 'Partrocity', targetStreak: 6, imageAsset: ktrImg, description: 'Six pars or better in a row' },
  { id: 'b6', name: 'Paramanjaro', targetStreak: 7, imageAsset: kmImg, description: 'Seven pars or better in a row' },
  { id: 'b7', name: 'Partastophe', targetStreak: 8, imageAsset: ktsImg, description: 'Eight pars or better in a row' },
  { id: 'b8', name: 'Parpocalypse', targetStreak: 9, imageAsset: kpImg, description: 'Nine pars or better in a row' },
  { id: 'b9', name: 'Parrionaire', targetStreak: 10, imageAsset: kymImg, description: 'Ten pars or better in a row' },
];

export default function ProfileView({ onBack }) {
  const { player, logout, refreshIdentity } = useUser();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEquipping, setIsEquipping] = useState(false);
  const [isCheckingBadges, setIsCheckingBadges] = useState(false);
  
  // Animation states
  const [spinningBadges, setSpinningBadges] = useState({});
  const [mainPinSpinning, setMainPinSpinning] = useState(false);
  
  const lastTapRef = useRef({ id: null, time: 0 });

  // Local form state
  const [formData, setFormData] = useState({
    name: player?.name || '',
    archetype: player?.archetype || 'All-Around',
    driving_dist: player?.driving_dist || '',
    gir_percentage: player?.gir_percentage || '',
    avg_putts: player?.avg_putts || '',
    power_rating: player?.power_rating || '',
    short_game_rating: player?.short_game_rating || ''
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (player?.id) {
      checkAndAwardBadges();
    }
  }, [player?.id]);

  if (!player) return null;

  const isClams = player.team === 'Slanted Clams';
  const currentBadge = AVAILABLE_BADGES.find(b => b.id === player.equipped_badge_id);
  const unlockedBadgeIds = player.unlocked_badges || []; 

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // --- STREAK CALCULATION ENGINE (UPDATED FOR DIRECT PAR COLUMN) ---
  const checkAndAwardBadges = async () => {
    try {
      setIsCheckingBadges(true);
      
      // Pull gross_score and par directly from the flat hole_scores table
      const { data: scores, error } = await supabase
        .from('hole_scores')
        .select('gross_score, par, updated_at')
        .eq('profile_id', player.id)
        .order('updated_at', { ascending: true });

      if (error) throw error;
      if (!scores || scores.length === 0) return;

      let maxStreak = 0;
      let currentStreak = 0;

      scores.forEach((hole) => {
        const grossScore = hole.gross_score;
        const targetPar = hole.par;

        if (grossScore !== null && targetPar !== undefined && targetPar !== null && grossScore <= targetPar) {
          currentStreak++;
          if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
          }
        } else {
          currentStreak = 0; // Streak broken, resets but retains max
        }
      });

      const badgesToUnlock = AVAILABLE_BADGES.filter(badge => {
        return maxStreak >= badge.targetStreak && !unlockedBadgeIds.includes(badge.id);
      }).map(b => b.id);

      if (badgesToUnlock.length > 0) {
        const updatedUnlockedList = [...unlockedBadgeIds, ...badgesToUnlock];
        
        const { error: patchError } = await supabase
          .from('profiles')
          .update({ unlocked_badges: updatedUnlockedList })
          .eq('id', player.id);

        if (patchError) throw patchError;
        await refreshIdentity();
      }
    } catch (err) {
      console.error('Error in lifetime badge engine:', err.message);
    } finally {
      setIsCheckingBadges(false);
    }
  };

  // --- DUAL INTERACTION HANDLER (TAP TO EQUIP / DOUBLE TAP TO SPIN) ---
  const handleBadgeInteraction = (badgeId) => {
    if (!unlockedBadgeIds.includes(badgeId)) return;

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; 
    
    if (lastTapRef.current.id === badgeId && (now - lastTapRef.current.time) < DOUBLE_TAP_DELAY) {
      setSpinningBadges(prev => ({ ...prev, [badgeId]: true }));
      setTimeout(() => {
        setSpinningBadges(prev => ({ ...prev, [badgeId]: false }));
      }, 600);
      
      lastTapRef.current = { id: null, time: 0 };
    } else {
      lastTapRef.current = { id: badgeId, time: now };
      
      setTimeout(() => {
        if (lastTapRef.current.id === badgeId) {
          executeEquipBadge(badgeId);
          lastTapRef.current = { id: null, time: 0 };
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const executeEquipBadge = async (badgeId) => {
    if (isEquipping) return;
    setIsEquipping(true);
    try {
      const nextBadgeId = player.equipped_badge_id === badgeId ? null : badgeId;

      const { error } = await supabase
        .from('profiles')
        .update({ equipped_badge_id: nextBadgeId })
        .eq('id', player.id);

      if (error) throw error;
      await refreshIdentity();
    } catch (error) {
      alert('Error equipping badge: ' + error.message);
    } finally {
      setIsEquipping(false);
    }
  };

  const triggerMainPinSpin = () => {
    if (mainPinSpinning) return;
    setMainPinSpinning(true);
    setTimeout(() => setMainPinSpinning(false), 600);
  };

  // --- IMAGE UPLOAD ENGINE ---
  const handleImageUpload = async (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setIsUploading(true);
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${player.id}/avatar_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', player.id);

      if (updateError) throw updateError;
      await refreshIdentity();
    } catch (error) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // --- TEXT DATA SAVE ENGINE ---
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        archetype: formData.archetype,
        driving_dist: parseInt(formData.driving_dist) || null,
        gir_percentage: parseInt(formData.gir_percentage) || null,
        avg_putts: parseFloat(formData.avg_putts) || null,
        power_rating: parseInt(formData.power_rating) || null,
        short_game_rating: parseInt(formData.short_game_rating) || null
      };

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', player.id);

      if (error) throw error;
      await refreshIdentity();
      setIsEditing(false);
    } catch (error) {
      alert('Error saving profile: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const shimmerTailwindClasses = "relative overflow-hidden after:absolute after:inset-0 after:w-[200%] after:-translate-x-full after:animate-[shimmer_2.5s_infinite_linear] after:bg-gradient-to-r after:from-transparent after:via-white/40 after:to-transparent";

  // Filter available badges so only earned ones render
  const earnedBadges = AVAILABLE_BADGES.filter(badge => unlockedBadgeIds.includes(badge.id));

  return (
    <div className="min-h-[100dvh] bg-[#090d16] text-white font-sans pb-safe fixed inset-0 z-40 overflow-y-auto style-scrolling-touch">
      
      {/* Top App Bar */}
      <div className="px-5 py-4 flex justify-between items-center bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20">
        <button onClick={onBack} className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 active:scale-95 transition-transform">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          Hub
        </button>
        <h1 className="font-black text-lg tracking-tight uppercase italic flex items-center gap-1.5">
          Tour Card
        </h1>
        {isEditing ? (
          <button onClick={handleSaveProfile} disabled={isSaving} className="text-xs font-black text-[#34d399] uppercase tracking-wider active:scale-95 transition-transform">
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="text-xs font-black text-amber-500 uppercase tracking-wider active:scale-95 transition-transform flex items-center gap-1">
            Edit
          </button>
        )}
      </div>

      <main className="p-5 flex flex-col gap-6 max-w-md mx-auto relative z-0">
        
        {/* HERO JUMBOTRON */}
        <div className={`bg-gradient-to-br ${isClams ? 'from-blue-900/40 to-[#0f172a]' : 'from-red-900/40 to-[#0f172a]'} rounded-3xl p-6 border ${isClams ? 'border-blue-500/20' : 'border-red-500/20'} shadow-2xl relative overflow-hidden`}>
          
          <div className="flex flex-col items-center mb-6 relative z-10 text-center">
            
            {/* --- AVATAR SECTOR WITH LIVE OVERLAY --- */}
            <div className="relative mb-4">
              <div 
                className="relative group cursor-pointer" 
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={`w-24 h-24 rounded-full border-4 ${isClams ? 'border-blue-500/50' : 'border-red-500/50'} overflow-hidden bg-black/50 flex items-center justify-center relative shadow-xl`}>
                  {isUploading ? (
                    <span className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full" />
                  ) : player.avatar_url ? (
                    <img src={player.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-slate-600">{player.name.charAt(0)}</span>
                  )}
                  
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              {/* LIVE EQUIPPED PIN */}
              {currentBadge && (
                <button 
                  onClick={triggerMainPinSpin}
                  className={`absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#090d16] border-2 border-amber-400 flex items-center justify-center p-0.5 shadow-lg [transform-style:preserve-3d] transition-transform duration-500 ease-out ${shimmerTailwindClasses} ${
                    mainPinSpinning ? '[transform:rotateY(360deg)]' : ''
                  }`}
                >
                  <img 
                    src={currentBadge.imageAsset} 
                    alt={currentBadge.name} 
                    className="w-full h-full object-contain mix-blend-screen scale-110"
                  />
                </button>
              )}
            </div>

            {/* --- NAME & ARCHETYPE --- */}
            {isEditing ? (
              <div className="flex flex-col gap-2 w-full px-4">
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl p-2 text-center text-xl font-black text-white focus:outline-none focus:border-white/30"
                />
                <input 
                  type="text" 
                  value={formData.archetype} 
                  onChange={(e) => handleInputChange('archetype', e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl p-2 text-center text-xs font-bold text-slate-300 focus:outline-none focus:border-white/30 uppercase tracking-widest"
                />
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-black tracking-tighter uppercase italic drop-shadow-md">{player.name}</h2>
                <div className="flex justify-center items-center gap-2 mt-1">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${isClams ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                    {player.team}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-black/30 px-2 py-0.5 rounded-full border border-white/5">
                    {player.archetype || 'All-Around'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* STATIC INDEX METRIC */}
          <div className="flex justify-center border-t border-white/5 pt-4 mt-2">
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Index</span>
              <span className={`text-4xl font-black tabular-nums tracking-tighter ${isClams ? 'text-blue-400' : 'text-red-400'}`}>{player.handicap}</span>
            </div>
          </div>
        </div>

        {/* --- TROPHY CASE SECTION --- */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Trophy Case</h3>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              {isCheckingBadges ? 'Scanning Scores...' : 'Tap: Equip • Double Tap: Spin'}
            </span>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 shadow-md backdrop-blur-md">
            {earnedBadges.length === 0 ? (
              <div className="text-center py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                No badges earned yet. Hit the links.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {earnedBadges.map((badge) => {
                  const isEquipped = player.equipped_badge_id === badge.id;
                  const isSpinning = !!spinningBadges[badge.id];

                  return (
                    <button
                      key={badge.id}
                      onClick={() => handleBadgeInteraction(badge.id)}
                      className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl transition-all duration-200 ${
                        isEquipped 
                          ? 'bg-amber-500/10 border-2 border-amber-400 shadow-md' 
                          : 'bg-black/20 border border-white/5 hover:border-white/10 active:scale-95'
                      }`}
                    >
                      {/* PNG Badge Container */}
                      <div className={`w-12 h-12 mb-1 flex items-center justify-center rounded-lg [transform-style:preserve-3d] transition-transform duration-500 ease-out ${shimmerTailwindClasses} ${isSpinning ? '[transform:rotateY(360deg)]' : ''}`}>
                        <img 
                          src={badge.imageAsset} 
                          alt={badge.name} 
                          className="w-full h-full object-contain mix-blend-screen scale-110 select-none pointer-events-none"
                        />
                      </div>

                      <span className="text-[9px] font-black tracking-tight text-slate-300 text-center line-clamp-1 w-full select-none">
                        {badge.name}
                      </span>

                      {/* Micro Indicators */}
                      {isEquipped && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* SCOUTING COMBINE METRICS */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Scouting Combine Metrics</h3>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl shadow-md backdrop-blur-md overflow-hidden">
            {/* Driving Dist */}
            <div className="flex justify-between items-center p-4 border-b border-white/5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Driving Dist</span>
              {isEditing ? (
                <div className="flex items-center gap-2 bg-black/30 rounded-lg px-2 py-1 border border-white/10 w-24">
                  <input type="number" value={formData.driving_dist} onChange={(e) => handleInputChange('driving_dist', e.target.value)} className="w-full bg-transparent border-none text-right font-black text-white focus:outline-none text-sm tabular-nums" />
                  <span className="text-[10px] font-bold text-slate-500">YDS</span>
                </div>
              ) : (
                <span className="text-sm font-black tabular-nums text-white">{player.driving_dist ? `${player.driving_dist} YDS` : '--'}</span>
              )}
            </div>
            
            {/* GIR % */}
            <div className="flex justify-between items-center p-4 border-b border-white/5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">GIR %</span>
              {isEditing ? (
                <div className="flex items-center gap-2 bg-black/30 rounded-lg px-2 py-1 border border-white/10 w-24">
                  <input type="number" value={formData.gir_percentage} onChange={(e) => handleInputChange('gir_percentage', e.target.value)} className="w-full bg-transparent border-none text-right font-black text-white focus:outline-none text-sm tabular-nums" />
                  <span className="text-[10px] font-bold text-slate-500">%</span>
                </div>
              ) : (
                <span className="text-sm font-black tabular-nums text-white">{player.gir_percentage ? `${player.gir_percentage}%` : '--'}</span>
              )}
            </div>
            
            {/* Avg Putts */}
            <div className="flex justify-between items-center p-4 border-b border-white/5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Putts / Hole</span>
              {isEditing ? (
                <input type="number" step="0.1" value={formData.avg_putts} onChange={(e) => handleInputChange('avg_putts', e.target.value)} className="bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-right font-black text-white focus:outline-none text-sm tabular-nums w-20" />
              ) : (
                <span className="text-sm font-black tabular-nums text-white">{player.avg_putts || '--'}</span>
              )}
            </div>

            {/* Power Rating */}
            <div className="flex justify-between items-center p-4 border-b border-white/5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Power Rating (0-99)</span>
              {isEditing ? (
                <input type="number" value={formData.power_rating} onChange={(e) => handleInputChange('power_rating', e.target.value)} className="bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-right font-black text-white focus:outline-none text-sm tabular-nums w-20" />
              ) : (
                <span className="text-sm font-black tabular-nums text-amber-400">{player.power_rating || '--'}</span>
              )}
            </div>

            {/* Short Game Rating */}
            <div className="flex justify-between items-center p-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Short Game (0-99)</span>
              {isEditing ? (
                <input type="number" value={formData.short_game_rating} onChange={(e) => handleInputChange('short_game_rating', e.target.value)} className="bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-right font-black text-white focus:outline-none text-sm tabular-nums w-20" />
              ) : (
                <span className="text-sm font-black tabular-nums text-amber-400">{player.short_game_rating || '--'}</span>
              )}
            </div>

          </div>
        </section>

        {/* LOGOUT BUTTON */}
        {!isEditing && (
          <button onClick={logout} className="w-full mt-4 py-4 border border-red-500/20 bg-red-500/5 rounded-2xl text-xs font-black uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition-colors active:scale-[0.99]">
            Sign Out of Tour
          </button>
        )}

      </main>
    </div>
  );
}