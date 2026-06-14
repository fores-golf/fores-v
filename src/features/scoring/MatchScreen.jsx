import React, { useState, useEffect } from 'react';
import PremiumMapMatrix from '../course/PremiumMapMatrix';
import ScoreEntrySheet from './ScoreEntrySheet';
import { supabase } from '../../config/supabaseClient';

export default function MatchScreen() {
  const [currentHole, setCurrentHole] = useState(1);
  const [par, setPar] = useState(4);
  const [activeHoleData, setActiveHoleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScoreSheetOpen, setIsScoreSheetOpen] = useState(false);

  // State to hold and pass global insights/match status to the map HUD
  const [matchInsights, setMatchInsights] = useState({
    status: "1 UP",
    thru: "Hole 1",
    wagerStatus: "+$20"
  });

  useEffect(() => {
    async function fetchHole() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('holes')
        .select('*')
        .eq('course_id', 1) 
        .eq('hole_number', currentHole)
        .single();

      if (error) {
        console.error('Error fetching hole:', error);
      } else if (data) {
        setActiveHoleData({
          ...data,
          leafletCenter: [data.green_center_geo.coordinates[1], data.green_center_geo.coordinates[0]],
          leafletFront: [data.green_front_geo.coordinates[1], data.green_front_geo.coordinates[0]],
          leafletBack: [data.green_back_geo.coordinates[1], data.green_back_geo.coordinates[0]]
        });
        setPar(data.par);
      }
      setIsLoading(false);
    }
    fetchHole();
  }, [currentHole]);

  const handleScoreSave = async (scoreData) => {
    if (!activeHoleData || !activeHoleData.id) return;

    const DUMMY_USER_ID = '00000000-0000-0000-0000-000000000000';
    const DUMMY_MATCH_ID = '00000000-0000-0000-0000-000000000000';

    const { error } = await supabase
      .from('hole_scores')
      .upsert({
        matchup_id: DUMMY_MATCH_ID,
        profile_id: DUMMY_USER_ID,
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
      console.error("❌ Failed to log score:", error.message);
      return; 
    }

    console.log("✅ Score saved. Advancing hole pipeline...");
    
    // Auto-advance to the next hole
    if (currentHole < 18) {
      setCurrentHole(prev => prev + 1);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white font-sans overflow-hidden antialiased">
      
      {/* --- HUD HEADER MODULE --- */}
      <header className="absolute top-4 left-4 right-4 h-14 bg-slate-900/80 backdrop-blur-md border border-slate-800/60 rounded-2xl flex justify-between items-center px-4 z-[500] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <button 
          onClick={() => setCurrentHole(Math.max(1, currentHole - 1))}
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-950/40 border border-slate-800/40 w-10 h-8 rounded-xl flex items-center justify-center hover:text-white hover:border-slate-700 transition-all active:scale-95"
        >
          ◀
        </button>
        
        <div className="text-center flex flex-col items-center justify-center">
          <h1 className="text-base font-black tracking-widest text-slate-100 uppercase leading-none">Hole {currentHole}</h1>
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mt-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">PAR {par}</span>
        </div>
        
        <button 
          onClick={() => setCurrentHole(Math.min(18, currentHole + 1))}
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-950/40 border border-slate-800/40 w-10 h-8 rounded-xl flex items-center justify-center hover:text-white hover:border-slate-700 transition-all active:scale-95"
        >
          ▶
        </button>
      </header>

      {/* --- PURE MAP AREA --- */}
      <main className="flex-1 relative w-full h-full z-0 bg-slate-950">
         {isLoading || !activeHoleData ? (
           <div className="h-full flex items-center justify-center text-slate-600 font-black animate-pulse uppercase tracking-[0.2em] text-xs">
             Syncing Geospatial Arrays...
           </div>
         ) : (
           <PremiumMapMatrix 
             holeData={activeHoleData} 
             insights={matchInsights} // Pass insights down to float on map
             onLogScoreClick={() => setIsScoreSheetOpen(true)} 
           />
         )}
      </main>

      {/* GLOBAL SLIDE UP SHEET */}
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