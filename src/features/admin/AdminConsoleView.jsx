import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';

// Import your bulletproofed code-based card layout files
import PlayerIntroCard from '../achievements/cards/IntroCard';
import BanquetCard from '../achievements/cards/BanquetCard';
import OceanGateCard from '../achievements/cards/OceanGate';
import WhammyCard from '../achievements/cards/WhammyCard';

export default function AdminConsoleView({ isOpen, onBack }) {
  const [achievements, setAchievements] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]); 
  const [mintedStats, setMintedStats] = useState({ total: 0, inPacks: 0, stowed: 0 });
  const [recentUnlocks, setRecentUnlocks] = useState([]);
  const [activeTab, setActiveTab] = useState('templates'); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdminMetrics() {
      try {
        setLoading(true);

        const { data: achData } = await supabase
          .from('achievements')
          .select('*')
          .order('name');

        const { data: profileData } = await supabase
          .from('profiles') 
          .select('*')
          .order('name');

        const { data: cardData } = await supabase
          .from('player_cards')
          .select('id, template_id, is_in_pack');

        const { data: rawUnlocks } = await supabase
          .from('unlocked_achievements')
          .select(`
            unlocked_at,
            player_id,
            achievements (name)
          `)
          .order('unlocked_at', { ascending: false })
          .limit(10);

        setAchievements(achData || []);
        setAllPlayers(profileData || []);
        setRecentUnlocks(rawUnlocks || []);

        if (cardData) {
          const total = cardData.length;
          const inPacks = cardData.filter(c => c.is_in_pack).length;
          setMintedStats({
            total,
            inPacks,
            stowed: total - inPacks
          });
        }
      } catch (err) {
        console.error('Admin Fetch Error:', err.message);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      fetchAdminMetrics();
    }
  }, [isOpen]);

  // --- DYNAMIC VIDEO RESOLUTION ENGINE ---
  const resolvePlayerVideoPath = (fullName) => {
    if (!fullName) return '/foresv-logo.png'; // Fallback asset if name is missing
    
    const cleanName = fullName.trim().toLowerCase();

    // 1. Explicit Edge-Case Exception Routing
    if (cleanName === 'mike ross') {
      return '/ross.mp4';   // Last name rule
    }
    if (cleanName === 'kevin larson') {
      return '/kevlar.mp4'; // Nickname code rule
    }
    if (cleanName === 'billy presson') {
      return '/wpiv.mp4';   // Custom alias rule
    }

    // 2. Default Baseline Rule: Pull first name up to space boundary
    const firstName = cleanName.split(' ')[0];
    return `/${firstName}.mp4`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#060911] text-white font-sans z-50 overflow-y-auto pb-safe">
      
      {/* Sticky Admin Header */}
      <div className="px-5 py-4 flex justify-between items-center bg-red-950/40 backdrop-blur-xl border-b border-red-500/20 sticky top-0 z-30">
        <button 
          onClick={onBack}
          className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 active:scale-95 transition-transform"
        >
          ❌ Exit Admin
        </button>
        <h1 className="font-black text-sm tracking-widest uppercase italic text-red-400 flex items-center gap-2">
          ⚙️ F5 Tournament Control
        </h1>
        <span className="text-[9px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded">
          Trevor Roeger
        </span>
      </div>

      <main className="p-5 max-w-md mx-auto space-y-6">
        
        {/* Live Aggregate Counter Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-slate-900 border border-white/5 p-3 rounded-xl text-center">
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 block">Total Minted</span>
            <span className="text-xl font-black font-mono text-amber-400 mt-1 block">{mintedStats.total}</span>
          </div>
          <div className="bg-slate-900 border border-white/5 p-3 rounded-xl text-center">
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 block">In Packs</span>
            <span className="text-xl font-black font-mono text-blue-400 mt-1 block">{mintedStats.inPacks}</span>
          </div>
          <div className="bg-slate-900 border border-white/5 p-3 rounded-xl text-center">
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 block">Loose Inventory</span>
            <span className="text-xl font-black font-mono text-emerald-400 mt-1 block">{mintedStats.stowed}</span>
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className="flex border-b border-white/5 bg-black/20 rounded-xl p-1">
          {['templates', 'achievements', 'activity'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors ${
                activeTab === tab ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-slate-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="animate-spin h-6 w-6 border-2 border-red-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div>
            
            {/* TAB 1: CARD TEMPLATES */}
            {activeTab === 'templates' && (
              <div className="grid grid-cols-1 gap-6">
                
                {/* ROSTER INTRO CARDS SHOWCASE */}
                <div className="bg-slate-950 border border-white/5 rounded-3xl p-4 space-y-4 shadow-xl">
                  <div className="border-b border-white/5 pb-2 flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-black text-white uppercase italic">Fores V Roster Intro Cards</h3>
                      <p className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                        Displaying {allPlayers.length} live customized variations from tournament profiles
                      </p>
                    </div>
                    <span className="text-[7px] font-mono border border-blue-500/30 text-blue-400 bg-blue-500/5 px-1.5 py-0.5 rounded">All Roster</span>
                  </div>

                  <div className="space-y-8 pt-2 max-h-[60vh] overflow-y-auto pr-1">
                    {allPlayers.length === 0 ? (
                      <p className="text-[10px] text-slate-600 text-center py-4 uppercase font-mono">No profile records returned from database.</p>
                    ) : (
                      allPlayers.map((usr) => (
                        <div key={usr.id} className="w-full flex flex-col items-center py-4 bg-black/40 rounded-2xl overflow-hidden scale-90 border border-white/[0.02] shadow-inner origin-center">
                          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-3">
                            Profile Owner: {usr.name || 'Anonymous User'}
                          </span>
                          <PlayerIntroCard 
                            playerName={usr.name}
                            nickname={usr.nickname || "Clubhouse Legend"}
                            
                            // WIRED: Passes the parsed public folder video path straight into the display frame
                            photoUrl={resolvePlayerVideoPath(usr.name)}
                            
                            handicap={usr.handicap || usr.trip_handicap || "0.0"}
                            archetype={usr.archetype || "Golfer"}
                            drivingDist={usr.driving_dist || 250}
                            girPercentage={usr.gir_percentage || 50}
                            avgPutts={usr.avg_putts || 2.0}
                            powerRating={usr.power_rating || 70}
                            shortGameRating={usr.short_game_rating || 70}
                            scoutingReport={usr.scouting_report || "Official league dossier analysis logged."}
                            parallel="Base"
                            serialNumber="#TOUR"
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* TEMPLATE PREVIEW 2: BANQUET BIRDIE MOMENT */}
                <div className="bg-slate-950 border border-white/5 rounded-3xl p-4 space-y-4 shadow-xl">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <div>
                      <h3 className="text-xs font-black text-white uppercase italic">Banquet Birdie Moment</h3>
                      <p className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Trigger: Birdie logged during round matches</p>
                    </div>
                    <span className="text-[7px] font-mono border border-amber-500/30 text-amber-400 bg-amber-500/5 px-1.5 py-0.5 rounded">Legendary</span>
                  </div>
                  <div className="w-full flex items-center justify-center py-4 bg-black/20 rounded-2xl overflow-hidden scale-90 origin-center">
                    <BanquetCard playerName="SAMPLE PLAYER" signatureText="Autograph" holeNumber={7} courseName="Fores V Course" parallel="1/1" serialNumber="#01/01" />
                  </div>
                </div>

                {/* TEMPLATE PREVIEW 3: OCEANGATE SUBMERSIBLE */}
                <div className="bg-slate-950 border border-white/5 rounded-3xl p-4 space-y-4 shadow-xl">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <div>
                      <h3 className="text-xs font-black text-white uppercase italic">OceanGate Submersible</h3>
                      <p className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Trigger: 2+ Water balls on a single hole</p>
                    </div>
                    <span className="text-[7px] font-mono border border-red-500/30 text-red-400 bg-red-500/5 px-1.5 py-0.5 rounded">Strict 1/1</span>
                  </div>
                  <div className="w-full flex items-center justify-center py-4 bg-black/20 rounded-2xl overflow-hidden scale-90 origin-center">
                    <OceanGateCard playerName="SAMPLE GOLFER" holeNumber={14} />
                  </div>
                </div>

                {/* TEMPLATE PREVIEW 4: DOUBLE WHAMMY */}
                <div className="bg-slate-950 border border-white/5 rounded-3xl p-4 space-y-4 shadow-xl">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <div>
                      <h3 className="text-xs font-black text-white uppercase italic">Double Whammy Crisis</h3>
                      <p className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Trigger: Double Bogey+ on BOTH Hole 9 & 11</p>
                    </div>
                    <span className="text-[7px] font-mono border border-purple-500/30 text-purple-400 bg-purple-500/5 px-1.5 py-0.5 rounded">Strict 1/1</span>
                  </div>
                  <div className="w-full flex items-center justify-center py-4 bg-black/20 rounded-2xl overflow-hidden scale-90 origin-center">
                    <WhammyCard playerName="SAMPLE GOLFER" date="06/24/2026" />
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: GLOBAL achievements */}
            {activeTab === 'achievements' && (
              <div className="space-y-2">
                {achievements.map(ach => (
                  <div key={ach.id} className="p-3 bg-slate-900/60 border border-white/5 rounded-xl flex justify-between items-start shadow-md">
                    <div>
                      <h4 className="text-xs font-black text-slate-200 uppercase tracking-tight">{ach.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{ach.description}</p>
                    </div>
                    <span className="text-[8px] font-mono font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-white/5 uppercase shrink-0">
                      Profile Badge
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: RECENT TRIP LOGS ACTIVITY */}
            {activeTab === 'activity' && (
              <div className="space-y-2">
                {recentUnlocks.length === 0 ? (
                  <p className="text-[10px] text-slate-500 text-center py-6">No players have triggered unlocks yet.</p>
                ) : (
                  recentUnlocks.map((ul, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/60 border border-white/5 rounded-xl flex justify-between items-center shadow-md">
                      <div>
                        <span className="text-[8px] font-mono text-red-400 block uppercase tracking-wider font-bold">Unlocked!</span>
                        <h4 className="text-xs font-black text-slate-200 uppercase tracking-tight mt-0.5">
                          {ul.achievements?.name}
                        </h4>
                      </div>
                      <span className="text-[8px] font-semibold text-slate-500">
                        {new Date(ul.unlocked_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
            
          </div>
        )}
      </main>
    </div>
  );
}