import React, { useState } from 'react';
import { useGarageData } from './hooks/useGarageData';

const CLUB_OPTIONS = ['2h', '3h', '4h', '5h', '3i', '4i', '56 degree', '60 degree', 'Custom'];

export default function GarageView({ isOpen, onBack }) {
  const { bag, hometown, loading, saving, setBag, setHometown, saveGarage } = useGarageData();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [customName, setCustomName] = useState('');

  const handleCloseAnimation = async () => {
    // Sync data parameters to Supabase during the transition
    await saveGarage(bag, hometown);
    // Tell parent to flip state back to 'dashboard'
    onBack();
  };

  const handleUpdateDistance = (id, val) => {
    const nextBag = bag.map(c => c.id === id ? { ...c, distance: parseInt(val) || 0 } : c);
    setBag(nextBag);
  };

  const handleDeleteClub = (id) => {
    setBag(bag.filter(c => c.id !== id));
  };

  const handleAddClub = (type) => {
    if (type === 'Custom') {
      if (!customName.trim()) return;
      const newClub = { id: `cust-${Date.now()}`, name: customName, distance: 100 };
      setBag([...bag, newClub]);
      setCustomName('');
    } else {
      const newClub = { id: `${type}-${Date.now()}`, name: type, distance: 100 };
      setBag([...bag, newClub]);
    }
    setShowAddMenu(false);
  };

  if (loading) return null;

  return (
    <div 
      className={`min-h-[100dvh] bg-[#090d16] text-white font-sans pb-safe fixed inset-0 z-50 overflow-y-auto style-scrolling-touch transition-transform duration-500 ease-out transform ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ willChange: 'transform' }}
    >
      {/* Structural Top Accent Line mimicking a garage door rail header */}
      <div className="w-full h-1.5 bg-gradient-to-r from-slate-700 via-[#34d399] to-slate-700 sticky top-0 z-20"></div>

      {/* Navigation App Bar */}
      <div className="px-5 py-4 flex justify-between items-center bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/5 sticky top-1.5 z-10">
        <button 
          onClick={handleCloseAnimation} 
          className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 active:scale-95 transition-transform"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
          </svg>
          Close Bag
        </button>
        <h1 className="font-black text-lg tracking-tight uppercase italic flex items-center gap-1.5">
          <svg className="w-5 h-5 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          The Garage
        </h1>
        <button 
          onClick={() => saveGarage(bag, hometown)}
          disabled={saving}
          className="text-xs font-black uppercase tracking-wider text-[#34d399] active:scale-95 transition-transform"
        >
          {saving ? 'Saving...' : 'Sync'}
        </button>
      </div>

      <main className="p-5 flex flex-col gap-6 max-w-md mx-auto relative z-0">
        
        {/* --- ENVIRONMENTAL CALIBRATION MODULE (Hometown vs Biwabik) --- */}
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-3xl p-5 border border-white/5 relative overflow-hidden shadow-2xl">
          <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-500/10 border border-blue-400/20 rounded-lg flex items-center justify-center text-blue-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2a2.5 2.5 0 002.5-2.5V6a2.5 2.5 0 00-2.5-2.5H10A2.5 2.5 0 007.5 6v1" />
              </svg>
            </div>
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-200">Ballistics Engine</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Input your home city database profile below. Fores V dynamically measures density variances when playing under tournament air metrics in <span className="text-amber-400 font-bold">Biwabik, MN</span>.
          </p>
          <input 
            type="text"
            value={hometown}
            onChange={(e) => setHometown(e.target.value)}
            placeholder="e.g., Denver, CO (Elevation Baseline)"
            className="w-full bg-black/40 rounded-xl border border-white/5 p-3.5 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* --- THE VIRTUAL GOLF BAG COMPARTMENT --- */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Club Specifications</h2>
            <span className="text-[10px] font-black text-[#34d399] bg-[#34d399]/10 px-2 py-0.5 rounded border border-[#34d399]/20">{bag.length} Sticks</span>
          </div>

          <div className="flex flex-col gap-2">
            {bag.map((club) => (
              <div 
                key={club.id} 
                className="bg-white/5 border border-white/5 rounded-2xl p-3 pl-4 flex justify-between items-center shadow-md backdrop-blur-md group hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleDeleteClub(club.id)}
                    className="opacity-40 hover:opacity-100 text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-all active:scale-95"
                    aria-label={`Remove ${club.name}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <span className="font-black tracking-tight text-slate-100 text-base">{club.name}</span>
                </div>

                {club.id !== 'pt' ? (
                  <div className="flex items-center gap-2 bg-black/20 rounded-xl px-2 py-1 border border-white/5 focus-within:border-[#34d399]/40 transition-colors">
                    <input 
                      type="number"
                      value={club.distance}
                      onChange={(e) => handleUpdateDistance(club.id, e.target.value)}
                      className="w-14 bg-transparent border-none text-right font-black text-white focus:outline-none text-base tabular-nums"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pr-1">Yds</span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-500 italic pr-3">Feel Only</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* --- ADD NEW STICK CTA TRIGGER --- */}
        {!showAddMenu ? (
          <button 
            onClick={() => setShowAddMenu(true)}
            className="w-full border-2 border-dashed border-white/10 hover:border-[#34d399]/40 hover:bg-white/5 font-bold py-4 rounded-2xl transition-all active:scale-[0.99] flex justify-center items-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Add Club to Bag
          </button>
        ) : (
          <div className="bg-gradient-to-b from-[#1e293b] to-[#0f172a] rounded-3xl p-5 border border-white/10 shadow-2xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Select Variant Matrix</h3>
            
            <div className="grid grid-cols-3 gap-2">
              {CLUB_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => opt !== 'Custom' && handleAddClub(opt)}
                  className={`py-2.5 rounded-xl text-xs font-black border transition-all active:scale-95 ${
                    opt === 'Custom' ? 'bg-[#34d399]/10 text-[#34d399] border-[#34d399]/20 col-span-3 mt-1' : 'bg-white/5 text-slate-300 border-white/5 hover:border-white/10'
                  }`}
                >
                  {opt === 'Custom' ? 'Create Custom Configuration' : opt}
                </button>
              ))}
            </div>

            {showAddMenu && (
              <div className="pt-2 flex gap-2">
                <input 
                  type="text" 
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., 64 Degree, 7W, Mini Dr"
                  className="flex-1 bg-black/40 rounded-xl border border-white/5 p-3 text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-[#34d399]/40"
                />
                <button 
                  onClick={() => handleAddClub('Custom')}
                  className="bg-[#34d399] text-black font-black text-xs px-4 rounded-xl active:scale-95 transition-transform"
                >
                  Add
                </button>
              </div>
            )}

            <button 
              onClick={() => setShowAddMenu(false)}
              className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-400 pt-2"
            >
              Cancel Selection
            </button>
          </div>
        )}

      </main>
    </div>
  );
}