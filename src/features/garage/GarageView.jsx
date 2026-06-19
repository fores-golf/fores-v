import React, { useState, useEffect } from 'react';
import { useGarageData } from './hooks/useGarageData';

const CLUB_OPTIONS = [
  'Driver', '3 Wood', '5 Wood', '7 Wood', 
  '2h', '3h', '4h', '5h', 
  '3i', '4i', '5i', '6i', '7i', '8i', '9i', 
  'Pitching Wedge', 'Gap Wedge', 'Sand Wedge', 
  '52 degree', '56 degree', '60 degree', 
  'Putter', 'Custom'
];

export default function GarageView({ isOpen, onBack }) {
  const { bag, hometown, loading, saving, setBag, setHometown, saveGarage } = useGarageData();

  // --- LOCATION AUTOCOMPLETE STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // --- DRAG AND DROP STATE ---
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  // Sync initial hometown load to the search bar
  useEffect(() => {
    if (hometown) setSearchQuery(hometown);
  }, [hometown]);

  // Debounced Open-Meteo Geocoding Fetch
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery && searchQuery !== hometown && showDropdown) {
        setIsSearching(true);
        try {
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=4&language=en&format=json`);
          const data = await res.json();
          setSearchResults(data.results || []);
        } catch (e) {
          console.error('Geocoding error:', e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, hometown, showDropdown]);

  const handleSelectLocation = (loc) => {
    const formattedLocation = `${loc.name}, ${loc.admin1 || loc.country}`;
    setHometown(formattedLocation);
    setSearchQuery(formattedLocation);
    setShowDropdown(false);
  };

  const handleCloseAnimation = async () => {
    await saveGarage(bag, hometown);
    onBack();
  };

  const handleUpdateField = (id, field, val) => {
    const nextBag = bag.map(c => {
      if (c.id === id) {
        if (field === 'distance') return { ...c, [field]: parseInt(val) || 0 };
        return { ...c, [field]: val };
      }
      return c;
    });
    setBag(nextBag);
  };

  const handleDeleteClub = (id) => {
    setBag(bag.filter(c => c.id !== id));
  };

  const handleAddClub = () => {
    const newClub = { 
      id: `club-${Date.now()}`, 
      name: '', 
      distance: 100,
      customRank: 999000 + bag.length // Default to the bottom, just above Putter
    };
    setBag([...bag, newClub]);
  };

  // --- SORTING ENGINE (FRACTIONAL INDEXING) ---
  const getSortValue = (club) => {
    const isStandard = CLUB_OPTIONS.includes(club.name) && club.name !== 'Custom' && club.name !== '';
    if (isStandard) {
      return CLUB_OPTIONS.indexOf(club.name) * 1000;
    }
    // If it's a custom club, rely on its saved fractional rank
    return club.customRank !== undefined ? club.customRank : 999000;
  };

  const sortedBag = [...bag].sort((a, b) => {
    // 1. Absolute Rule: Putter is ALWAYS the last item, period.
    if (a.name === 'Putter' && b.name !== 'Putter') return 1;
    if (b.name === 'Putter' && a.name !== 'Putter') return -1;

    // 2. Standard Fractional Sort
    const valA = getSortValue(a);
    const valB = getSortValue(b);
    
    // Tiebreaker just in case two custom clubs share the exact same rank
    if (valA === valB) return a.id.localeCompare(b.id);
    return valA - valB;
  });

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e, club) => {
    setDraggedId(club.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, id) => {
    e.preventDefault(); // Required to allow dropping
    if (draggedId && draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    setDragOverId(null);

    if (!draggedId || draggedId === targetId) return;

    const draggedIdx = sortedBag.findIndex(c => c.id === draggedId);
    const targetIdx = sortedBag.findIndex(c => c.id === targetId);

    let prevRank, nextRank;

    // Calculate midpoint between the surrounding clubs based on drag direction
    if (draggedIdx < targetIdx) {
      // Dragged down
      prevRank = getSortValue(sortedBag[targetIdx]);
      nextRank = targetIdx + 1 < sortedBag.length ? getSortValue(sortedBag[targetIdx + 1]) : prevRank + 1000;
    } else {
      // Dragged up
      nextRank = getSortValue(sortedBag[targetIdx]);
      prevRank = targetIdx - 1 >= 0 ? getSortValue(sortedBag[targetIdx - 1]) : nextRank - 1000;
    }

    const newRank = (prevRank + nextRank) / 2;

    // Update the custom club's rank in the master bag state
    setBag(bag.map(c => c.id === draggedId ? { ...c, customRank: newRank } : c));
    setDraggedId(null);
  };

  if (loading) return null;

  return (
    <div 
      className={`min-h-[100dvh] bg-[#090d16] text-white font-sans pb-safe fixed inset-0 z-50 overflow-y-auto style-scrolling-touch transition-transform duration-500 ease-out transform ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ willChange: 'transform' }}
    >
      <div className="w-full h-1.5 bg-gradient-to-r from-slate-700 via-[#34d399] to-slate-700 sticky top-0 z-20"></div>

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
          className="text-xs font-black uppercase tracking-wider text-[#34d399] active:scale-95 transition-transform disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Sync'}
        </button>
      </div>

      <main className="p-5 flex flex-col gap-6 max-w-md mx-auto relative z-0">
        
        {/* --- ENVIRONMENTAL CALIBRATION --- */}
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-3xl p-5 border border-white/5 relative overflow-visible shadow-2xl">
          <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="w-8 h-8 bg-blue-500/10 border border-blue-400/20 rounded-lg flex items-center justify-center text-blue-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2a2.5 2.5 0 002.5-2.5V6a2.5 2.5 0 00-2.5-2.5H10A2.5 2.5 0 007.5 6v1" />
              </svg>
            </div>
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-200">Ballistics Engine</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4 relative z-10">
            Search your home city below. Fores V dynamically measures density variances when playing under tournament air metrics in <span className="text-amber-400 font-bold">Biwabik, MN</span>.
          </p>
          
          <div className="relative z-50">
            <div className="relative flex items-center">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Search City (e.g., Denver, CO)"
                className="w-full bg-black/40 rounded-xl border border-white/5 p-3.5 pl-10 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
              <div className="absolute left-3 text-slate-500">
                {isSearching ? (
                  <span className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full block" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                )}
              </div>
            </div>

            {/* AUTOCOMPLETE DROPDOWN */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                {searchResults.map((loc) => (
                  <div 
                    key={loc.id}
                    onMouseDown={() => handleSelectLocation(loc)}
                    className="p-3 border-b border-white/5 hover:bg-blue-500/10 cursor-pointer flex justify-between items-center group transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{loc.name}</span>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{loc.admin1}, {loc.country_code}</span>
                    </div>
                    {loc.elevation && (
                      <span className="text-[10px] font-black text-slate-400 bg-black/30 px-2 py-1 rounded-lg border border-white/5">
                        {Math.round(loc.elevation * 3.28084).toLocaleString()} FT
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- CLUB SPECIFICATIONS --- */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Club Specifications</h2>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${bag.length > 14 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-[#34d399]/10 text-[#34d399] border-[#34d399]/20'}`}>
              {bag.length} Sticks {bag.length > 14 && '(Illegal)'}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {/* Iterating over the SORTED array so visual updates are instant */}
            {sortedBag.map((club) => {
              const isStandard = CLUB_OPTIONS.includes(club.name) && club.name !== '' && club.name !== 'Custom';
              
              return (
                <div 
                  key={club.id} 
                  draggable={!isStandard}
                  onDragStart={(e) => handleDragStart(e, club)}
                  onDragOver={(e) => handleDragOver(e, club.id)}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => handleDrop(e, club.id)}
                  className={`bg-[#121827] border rounded-2xl p-4 flex flex-col gap-3 shadow-md group transition-all duration-200 ${
                    dragOverId === club.id ? 'border-[#34d399] bg-[#34d399]/5 scale-[1.02]' : 'border-white/5 hover:border-white/10'
                  } ${draggedId === club.id ? 'opacity-40 scale-95' : 'opacity-100'}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      
                      {/* Drag Handle Icon - Only shows on Custom clubs */}
                      {!isStandard && (
                        <div className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-white transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                      )}

                      <button 
                        onClick={() => handleDeleteClub(club.id)}
                        className="opacity-50 hover:opacity-100 text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-all active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      
                      {isStandard ? (
                        <span className="font-black tracking-tight text-slate-100 text-lg">{club.name}</span>
                      ) : (
                        <input 
                          type="text"
                          value={club.name}
                          onChange={(e) => handleUpdateField(club.id, 'name', e.target.value)}
                          placeholder="Custom Club"
                          className="bg-transparent border-b border-[#34d399]/40 focus:border-[#34d399] font-black tracking-tight text-slate-100 text-lg focus:outline-none w-32 transition-colors placeholder:text-slate-600 pb-0.5"
                        />
                      )}
                    </div>
                    
                    <select
                      value={isStandard ? club.name : 'Custom'}
                      onChange={(e) => {
                        if (e.target.value === 'Custom') {
                          handleUpdateField(club.id, 'name', ''); 
                        } else {
                          handleUpdateField(club.id, 'name', e.target.value);
                        }
                      }}
                      className="bg-black/50 border border-white/5 rounded-lg px-2 py-1 text-[10px] font-bold text-amber-400 focus:outline-none focus:border-amber-500/50 uppercase tracking-wider text-right"
                    >
                      {CLUB_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-[#0f172a]">{opt}</option>)}
                    </select>
                  </div>

                  <div className="flex justify-end pr-1">
                    {club.name !== 'Putter' ? (
                      <div className="flex items-center gap-3 bg-black/30 rounded-xl px-3 py-1.5 border border-white/5 focus-within:border-[#34d399]/40 transition-colors w-28">
                        <input 
                          type="number"
                          value={club.distance === 0 ? '' : club.distance}
                          onChange={(e) => {
                            const rawValue = e.target.value;
                            const parsedValue = rawValue === '' ? 0 : parseInt(rawValue, 10);
                            handleUpdateField(club.id, 'distance', parsedValue);
                          }}
                          placeholder="0"
                          className="w-full bg-transparent border-none text-right font-black text-white focus:outline-none text-lg tabular-nums"
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Yds</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 italic pr-2 py-2">Feel Only</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <button 
          onClick={handleAddClub}
          className="w-full border-2 border-dashed border-white/10 hover:border-[#34d399]/40 hover:bg-white/5 font-bold py-4 rounded-2xl transition-all active:scale-[0.99] flex justify-center items-center gap-2 text-sm text-slate-400 hover:text-white mt-2"
        >
          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Add Club to Bag
        </button>

      </main>
    </div>
  );
}