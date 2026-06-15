import React, { useState, useEffect } from 'react';
import PremiumMapMatrix from '../course/PremiumMapMatrix';
import ScoreEntrySheet from './ScoreEntrySheet';
import { supabase } from '../../config/supabaseClient';
import { useUser } from '../../context/UserContext';

export default function MatchScreen({ matchId, onBack }) {
  const { player } = useUser();
  const [currentHole, setCurrentHole] = useState(1);
  const [par, setPar] = useState(4);
  const [activeHoleData, setActiveHoleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScoreSheetOpen, setIsScoreSheetOpen] = useState(false);

  // State to pass live tournament standings down onto the Leaflet map overlay
  const [matchInsights, setMatchInsights] = useState({
    status: "ALL SQUARE",
    thru: "Hole 1",
    wagerStatus: "LIVE"
  });

  // 1. FETCH GEOSPATIAL HOLE ARRAY WITH BULLETPROOF POSTGIS GPS FLIPPING
  useEffect(() => {
    async function fetchHole() {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('holes')
          .select('*')
          .eq('course_id', 1) 
          .eq('hole_number', currentHole)
          .maybeSingle(); // Prevents crashing if a row is temporarily missing

        if (error) throw error;

        if (data) {
          // --- GPS INVERSION ENGINE ---
          // PostGIS coordinates = [Lng, Lat] | Leaflet coordinates = [Lat, Lng]
          const convertPostGISToLeaflet = (geoObject) => {
            if (geoObject && geoObject.coordinates && Array.isArray(geoObject.coordinates)) {
              const [lng, lat] = geoObject.coordinates;
              return [lat, lng]; // Flipped to map correctly
            }
            // Fallback baseline coordinates if geography row data is corrupt or empty
            return [47.5142, -92.2372]; 
          };

          setActiveHoleData({
            ...data,
            leafletCenter: convertPostGISToLeaflet(data.green_center_geo),
            leafletFront: convertPostGISToLeaflet(data.green_front_geo),
            leafletBack: convertPostGISToLeaflet(data.green_back_geo)
          });
          setPar(data.par || 4);
        } else {
          console.warn(`Hole ${currentHole} data row missing in database.`);
        }
      } catch (err) {
        console.error('GPS Data fetch failure:', err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHole();
  }, [currentHole]);

  // 2. FETCH LIVE STREAMING MATCH VALUES FOR HUB DATA
  useEffect(() => {
    if (!matchId) return;

    async function fetchLiveInsights() {
      try {
        const { data, error } = await supabase
          .from('matches')
          .select('team1_score, team2_score, format')
          .eq('id', matchId)
          .single();

        if (!error && data) {
          setMatchInsights({
            status: `${data.team1_score} vs ${data.team2_score}`,
            thru: `Hole ${currentHole}`,
            wagerStatus: (data.format || 'LIVE').toUpperCase()
          });
        }
      } catch (err) {
        console.warn('Insights background update skipped:', err.message);
      }
    }

    fetchLiveInsights();
  }, [currentHole, matchId]);

  // 3. PERSIST SCORE METRIC ENTRIES
  const handleScoreSave = async (scoreData) => {
    if (!activeHoleData || !activeHoleData.id || !matchId || !player?.id) {
      alert('Missing validation markers. Verify your profile authentication state.');
      return;
    }

    const { error } = await supabase
      .from('hole_scores')
      .upsert({
        matchup_id: matchId,        
        profile_id: player.id,       
        hole_id: activeHoleData.id,
        gross_score: scoreData.score,
        putts: scoreData.putts,
        accuracy: scoreData.accuracy,
        penalty_strokes: scoreData.penalties,
        water_balls: scoreData.water,
        drinks: scoreData.drinks
      }, { 
        onConflict: 'matchup_id, hole_id, profile_id' 
      });

    if (error) {
      alert("Database transmission failed: " + error.message);
      return; 
    }

    // Advance to the next hole card automatically
    if (currentHole < 18) {
      setCurrentHole(prev => prev + 1);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white font-sans overflow-hidden antialiased fixed inset-0 z-50">
      
      {/* --- HUD HEADER MODULE --- */}
      <header className="absolute top-4 left-4 right-4 h-14 bg-slate-900/80 backdrop-blur-md border border-slate-800/60 rounded-2xl flex justify-between items-center px-4 z-[500] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        
        {/* Navigation Escape Group (Exit button explicitly fires onBack handler) */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack}
            className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/5 border border-red-500/20 px-2.5 h-8 rounded-xl flex items-center justify-center gap-1 hover:bg-red-500/10 transition-all active:scale-95 cursor-pointer z-[600]"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Exit
          </button>
          
          <button 
            onClick={() => setCurrentHole(Math.max(1, currentHole - 1))}
            disabled={currentHole === 1}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-950/40 border border-slate-800/40 w-8 h-8 rounded-xl flex items-center justify-center hover:text-white hover:border-slate-700 transition-all active:scale-95 disabled:opacity-30"
          >
            ◀
          </button>
        </div>
        
        {/* Central Identification Tag */}
        <div className="text-center flex flex-col items-center justify-center">
          <h1 className="text-base font-black tracking-widest text-slate-100 uppercase leading-none">Hole {currentHole}</h1>
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mt-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">PAR {par}</span>
        </div>
        
        {/* Fast-Forward Hole Selection Toggle */}
        <button 
          onClick={() => setCurrentHole(Math.min(18, currentHole + 1))}
          disabled={currentHole === 18}
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-950/40 border border-slate-800/40 w-10 h-8 rounded-xl flex items-center justify-center hover:text-white hover:border-slate-700 transition-all active:scale-95 disabled:opacity-30"
        >
          ▶
        </button>
      </header>

      {/* --- PREMIUM GEOSPATIAL MAP CANVAS WINDOW --- */}
      <main className="flex-1 relative w-full h-full z-0 bg-slate-950">
         {isLoading || !activeHoleData ? (
           <div className="h-full flex items-center justify-center text-slate-600 font-black animate-pulse uppercase tracking-[0.2em] text-xs">
             Syncing Geospatial Arrays...
           </div>
         ) : (
           <PremiumMapMatrix 
             holeData={activeHoleData} 
             insights={matchInsights} 
             onLogScoreClick={() => setIsScoreSheetOpen(true)} 
           />
         )}
      </main>

      {/* GLOBAL SCORE ENTRY SLIDE UP DRAWER */}
      <ScoreEntrySheet 
        isOpen={isScoreSheetOpen} 
        onClose={() => setIsScoreSheetOpen(false)} 
        currentHole={currentHole}
        par={par}
        onSave={handleScoreSave}
      />
    </div>
  );
}