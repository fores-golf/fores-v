import React, { useState, useEffect } from 'react';
import PremiumMapMatrix from '../course/PremiumMapMatrix';
import ScoreEntrySheet from './ScoreEntrySheet';
import { supabase } from '../../config/supabaseClient';

export default function MatchScreen() {
  const [activeTab, setActiveTab] = useState('B'); 
  const [currentHole, setCurrentHole] = useState(1);
  const [par, setPar] = useState(4);
  const [activeHoleData, setActiveHoleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScoreSheetOpen, setIsScoreSheetOpen] = useState(false);

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

    if (currentHole < 18) {
      setCurrentHole(prev => prev + 1);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="flex justify-between items-center px-4 py-3 bg-slate-950 border-b border-slate-800 shrink-0 z-50 relative">
        <button 
          onClick={() => setCurrentHole(Math.max(1, currentHole - 1))}
          className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors px-2 py-1"
        >
          ← Prev
        </button>
        
        <div className="text-center flex flex-col items-center">
          <h1 className="text-xl font-black tracking-tighter leading-none">HOLE {currentHole}</h1>
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Par {par}</p>
        </div>
        
        <button 
          onClick={() => setCurrentHole(Math.min(18, currentHole + 1))}
          className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors px-2 py-1"
        >
          Next →
        </button>
      </header>

      {/* FULL BLEED CONTAINER */}
      <main className="flex-1 relative w-full bg-black z-0">
        {activeTab === 'A' && (
          <div className="flex flex-col items-center justify-center h-full bg-slate-900 p-6">
             <h2 className="text-xl font-black uppercase tracking-widest text-slate-400 mb-4">Scorecard Overview</h2>
             <button onClick={() => setIsScoreSheetOpen(true)} className="px-6 py-3 border border-emerald-500 text-emerald-400 font-black uppercase tracking-widest text-xs rounded-xl">Edit Hole {currentHole}</button>
          </div>
        )}

        {activeTab === 'B' && (
           isLoading || !activeHoleData ? (
             <div className="h-full flex items-center justify-center text-slate-500 font-black animate-pulse uppercase tracking-widest">
               Triangulating Satellites...
             </div>
           ) : (
             <PremiumMapMatrix 
               holeData={activeHoleData} 
               onLogScoreClick={() => setIsScoreSheetOpen(true)} // <-- Passes the open trigger right to the map
             />
           )
        )}

        {activeTab === 'C' && (
          <div className="flex flex-col items-center justify-center h-full bg-slate-900">
            <h2 className="text-xl text-slate-300">Match Insights (Coming Soon)</h2>
          </div>
        )}
      </main>

      {/* CLEAN SYSTEM TABS */}
      <nav className="flex bg-slate-950 border-t border-slate-800 shrink-0 pb-safe z-50 relative">
        <button className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest ${activeTab === 'A' ? 'text-emerald-400' : 'text-slate-500'}`} onClick={() => setActiveTab('A')}>Score</button>
        <button className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest ${activeTab === 'B' ? 'text-emerald-400' : 'text-slate-500'}`} onClick={() => setActiveTab('B')}>Map</button>
        <button className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest ${activeTab === 'C' ? 'text-emerald-400' : 'text-slate-500'}`} onClick={() => setActiveTab('C')}>Insights</button>
      </nav>

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