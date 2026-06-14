import React, { useState, useEffect } from 'react';
import PremiumMapMatrix from '../course/PremiumMapMatrix';
import ScoreEntrySheet from './ScoreEntrySheet'; // <-- Import the new sheet
import { supabase } from '../../config/supabaseClient';

export default function MatchScreen() {
  const [activeTab, setActiveTab] = useState('B'); 
  const [currentHole, setCurrentHole] = useState(1);
  const [par, setPar] = useState(4);
  const [activeHoleData, setActiveHoleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- NEW: Global Match State & Sheet Controller ---
  const [isScoreSheetOpen, setIsScoreSheetOpen] = useState(false);
  const [roundStats, setRoundStats] = useState({ totalScore: 42, toPar: 6 }); // Mock data for now

// Handle saving the score to Supabase and auto-advancing
  const handleScoreSave = async (scoreData) => {
    
    // We need the actual database ID of the hole, not just the number (1-18)
    if (!activeHoleData || !activeHoleData.id) {
      console.error("Hold up: Hole data hasn't loaded from the DB yet.");
      return;
    }

    /* 🚨 THE MISSING LINK 🚨
      To save a score, the database requires a Match ID and a User Profile ID.
      Because we haven't built the Login Screen or the Pre-Game Lobby yet, 
      we have to use a dummy UUID here just to test the UI flow. 
    */
    const DUMMY_USER_ID = '00000000-0000-0000-0000-000000000000';
    const DUMMY_MATCH_ID = '00000000-0000-0000-0000-000000000000';

    // Push to Supabase using UPSERT (Insert if new, Update if editing)
    const { data, error } = await supabase
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
        onConflict: 'matchup_id, hole_id, profile_id' // Uses the constraint we just made!
      });

    if (error) {
      console.error("❌ Failed to log score:", error.message);
      // In a production app, we would show a slick error toast here
      return; 
    }

    console.log("✅ Score locked in:", scoreData);

    // Auto-advance to next hole if we aren't on 18
    if (currentHole < 18) {
      setCurrentHole(prev => prev + 1);
    }
  };
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

   return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white font-sans overflow-hidden">
      
      {/* --- SLEEK COMPRESSED HEADER --- */}
      <header className="flex justify-between items-center px-4 py-3 bg-slate-950 border-b border-slate-800 shrink-0 z-50 relative shadow-sm">
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

{/* --- FULL BLEED CONTENT AREA --- */}
      <main className="flex-1 relative w-full bg-black z-0">
        
        {activeTab === 'A' && (
          <div className="flex flex-col items-center justify-center h-full animate-fade-in bg-slate-900 p-6">
             <h2 className="text-xl font-black uppercase tracking-widest text-slate-400 mb-4">Scorecard Overview</h2>
             <p className="text-center text-slate-500 text-sm">This tab will house the full 18-hole grid, match play status, and wager ledger.</p>
             {/* We can still trigger the exact same sheet from here! */}
             <button onClick={() => setIsScoreSheetOpen(true)} className="mt-8 px-6 py-3 border border-emerald-500 text-emerald-400 font-black uppercase tracking-widest text-xs rounded-xl">Edit Hole {currentHole}</button>
          </div>
        )}

        {activeTab === 'B' && (
           isLoading || !activeHoleData ? (
             <div className="h-full flex items-center justify-center text-slate-500 font-black animate-pulse uppercase tracking-widest">
               Triangulating Satellites...
             </div>
           ) : (
             <PremiumMapMatrix holeData={activeHoleData} />
           )
        )}

        {activeTab === 'C' && (
          <div className="flex flex-col items-center justify-center h-full animate-fade-in bg-slate-900">
            <h2 className="text-xl text-slate-300">Match Insights (Coming Soon)</h2>
          </div>
        )}
      
{/* --- NEW: FLOATING QUICK STATS & ACTION BAR --- */}
        <div className="absolute bottom-6 left-4 right-4 z-[50] flex justify-between items-center bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-3 shadow-2xl">
           <div className="flex flex-col px-2">
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-0.5">Your Round</span>
              <div className="flex items-baseline gap-2">
                 <span className="text-2xl font-black text-white leading-none">{roundStats.totalScore}</span>
                 <span className={`text-sm font-bold leading-none ${roundStats.toPar > 0 ? 'text-red-400' : roundStats.toPar < 0 ? 'text-blue-400' : 'text-slate-400'}`}>
                   {roundStats.toPar > 0 ? `+${roundStats.toPar}` : roundStats.toPar === 0 ? 'E' : roundStats.toPar}
                 </span>
              </div>
           </div>
           
           <button 
             onClick={() => setIsScoreSheetOpen(true)} 
             className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
           >
              Log Score
           </button>
        </div>

      </main>


      {/* --- NATIVE BOTTOM TAB BAR --- */}
      <nav className="flex bg-slate-950 border-t border-slate-800 shrink-0 pb-safe z-50 relative">
        <button 
          className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${activeTab === 'A' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
          onClick={() => setActiveTab('A')}
        >
          <span className="text-[10px] font-black uppercase tracking-widest">Score</span>
        </button>
        
        <button 
          className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${activeTab === 'B' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
          onClick={() => setActiveTab('B')}
        >
          <span className="text-[10px] font-black uppercase tracking-widest">Map</span>
        </button>
        
        <button 
          className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${activeTab === 'C' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
          onClick={() => setActiveTab('C')}
        >
          <span className="text-[10px] font-black uppercase tracking-widest">Insights</span>
        </button>
      </nav>

{/* --- THE GLOBAL SLIDE-UP SHEET --- */}
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