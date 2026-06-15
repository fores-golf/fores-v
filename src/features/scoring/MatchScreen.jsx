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
  
  // CHANGED: Now holds the ENTIRE score object (putts, accuracy, etc.) instead of just a number
  const [currentScoreData, setCurrentScoreData] = useState(null);

  const [matchInsights, setMatchInsights] = useState({
    status: "ALL SQUARE",
    thru: "Hole 1",
    wagerStatus: "LIVE"
  });

  useEffect(() => {
    async function fetchHole() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('holes')
          .select('*')
          .eq('course_id', 1) 
          .eq('hole_number', currentHole)
          .maybeSingle(); 

        if (error) throw error;

        if (data) {
          const convertPostGISToLeaflet = (geoObject) => {
            if (geoObject && geoObject.coordinates && Array.isArray(geoObject.coordinates)) {
              const [lng, lat] = geoObject.coordinates;
              return [lat, lng]; 
            }
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

  // FETCH ENTIRE EXISTING SCORE ROW FOR THIS HOLE
  useEffect(() => {
    if (!activeHoleData?.id || !matchId || !player?.id) {
      setCurrentScoreData(null);
      return;
    }

    async function fetchExistingScore() {
      try {
        const { data, error } = await supabase
          .from('hole_scores')
          .select('*') // Select everything to populate the ScoreEntrySheet
          .eq('matchup_id', matchId)
          .eq('profile_id', player.id)
          .eq('hole_id', activeHoleData.id)
          .maybeSingle(); 

        if (!error && data) {
          setCurrentScoreData(data);
        } else {
          setCurrentScoreData(null); 
        }
      } catch (err) {
        console.warn('Could not fetch existing hole score:', err.message);
      }
    }

    fetchExistingScore();
  }, [activeHoleData, matchId, player?.id]);

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
        hole_number: currentHole,
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

    // Instantly update local state so the HUD and sheet retain the new saved data
    setCurrentScoreData({
      gross_score: scoreData.score,
      putts: scoreData.putts,
      accuracy: scoreData.accuracy,
      penalty_strokes: scoreData.penalties,
      water_balls: scoreData.water,
      drinks: scoreData.drinks
    });

    if (currentHole < 18) {
      setCurrentHole(prev => prev + 1);
    }
  };

  const handleExitClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof onBack === 'function') {
      onBack();
    } else {
      console.error("The 'onBack' prop was not passed to MatchScreen!");
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white font-sans overflow-hidden antialiased fixed inset-0 z-50">
      
      {/* HUD HEADER */}
      <header className="absolute top-4 left-4 right-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/60 rounded-2xl flex justify-between items-center px-4 py-2 z-[9999] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExitClick}
            className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/5 border border-red-500/20 px-2.5 h-8 rounded-xl flex items-center justify-center gap-1 hover:bg-red-500/10 transition-all active:scale-95 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Exit
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); setCurrentHole(Math.max(1, currentHole - 1)); }}
            disabled={currentHole === 1}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-950/40 border border-slate-800/40 w-8 h-8 rounded-xl flex items-center justify-center hover:text-white hover:border-slate-700 transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
          >
            ◀
          </button>
        </div>
        
        <div className="text-center flex flex-col items-center justify-center select-none">
          <h1 className="text-base font-black tracking-widest text-slate-100 uppercase leading-none">Hole {currentHole}</h1>
          
          <div className="flex gap-1.5 mt-1 items-center">
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              PAR {par}
            </span>
            {currentScoreData?.gross_score && (
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                SCORE: {currentScoreData.gross_score}
              </span>
            )}
          </div>
        </div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); setCurrentHole(Math.min(18, currentHole + 1)); }}
          disabled={currentHole === 18}
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-950/40 border border-slate-800/40 w-10 h-8 rounded-xl flex items-center justify-center hover:text-white hover:border-slate-700 transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
        >
          ▶
        </button>
      </header>

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

      {/* PASSING THE EXISTING SCORE DATA DOWN TO THE SHEET */}
      <ScoreEntrySheet 
        isOpen={isScoreSheetOpen} 
        onClose={() => setIsScoreSheetOpen(false)} 
        currentHole={currentHole}
        par={par}
        onSave={handleScoreSave}
        existingData={currentScoreData} 
      />
    </div>
  );
}