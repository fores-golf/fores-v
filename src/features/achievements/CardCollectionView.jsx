import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useUser } from '../../context/UserContext';

export default function CardCollectionView({ isOpen, onBack }) {
  const { session, player } = useUser();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const activeUserId = session?.user?.id || player?.id;

  useEffect(() => {
    async function fetchPlayerCards() {
      if (!activeUserId) return;
      try {
        setLoading(true);
        
        // Query player_cards and deeply fetch template data down to the achievement name
        const { data, error } = await supabase
          .from('player_cards')
          .select(`
            id,
            minted_at,
            is_in_pack,
            card_templates (
              id,
              name,
              rarity,
              image_url,
              card_metadata,
              achievements (
                name,
                description
              )
            )
          `)
          .eq('player_id', activeUserId);

        if (error) throw error;
        setCards(data || []);
      } catch (err) {
        console.error('Error fetching minted trading cards:', err.message);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      fetchPlayerCards();
    }
  }, [activeUserId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#060911] text-white font-sans z-50 overflow-y-auto pb-safe animate-fade-in">
      {/* Premium Top Navigation Header */}
      <div className="px-5 py-4 flex justify-between items-center bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
        <button 
          onClick={onBack}
          className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 active:scale-95 transition-transform"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="font-black text-lg tracking-tight uppercase italic flex items-center gap-2 text-amber-400">
          ✨ Vault Inventory
        </h1>
        <div className="text-right">
          <span className="text-[10px] font-black px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md uppercase tracking-wider">
            {cards.length} Cards Minted
          </span>
        </div>
      </div>

      <main className="p-5 max-w-md mx-auto space-y-6 relative z-10">
        <p className="text-xs text-slate-400 leading-relaxed text-center">
          These assets correspond directly to your unlocked clubhouse achievements. Unreleased items are safely stowed here to be packed out later.
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="animate-spin h-8 w-8 border-2 border-amber-400 border-t-transparent rounded-full" />
          </div>
        ) : cards.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-3xl p-10 text-center bg-black/20">
            <span className="text-3xl block mb-2">🃏</span>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">Vault is completely empty</p>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mt-1">Unlock course achievements to mint collectibles</p>
          </div>
        ) : (
          /* TRADING CARD GALLERY GRID */
          <div className="grid grid-cols-2 gap-4">
            {cards.map((item) => {
              const tpl = item.card_templates;
              const ach = tpl?.achievements;
              
              // Map rarity string to flashy neon borders
              const rarityColor = 
                tpl?.rarity === 'Legendary' ? 'border-amber-500 text-amber-400 bg-amber-500/10' :
                tpl?.rarity === 'Epic' ? 'border-purple-500 text-purple-400 bg-purple-500/10' :
                tpl?.rarity === 'Rare' ? 'border-blue-500 text-blue-400 bg-blue-500/10' :
                'border-slate-700 text-slate-400 bg-slate-800/30';

              return (
                <div 
                  key={item.id}
                  className={`relative rounded-2xl border bg-gradient-to-b from-slate-950 to-slate-900 p-3 flex flex-col gap-2.5 shadow-2xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300`}
                  style={{ borderColor: tpl?.rarity === 'Legendary' ? '#f59e0b' : tpl?.rarity === 'Epic' ? '#a855f7' : tpl?.rarity === 'Rare' ? '#3b82f6' : '#334155' }}
                >
                  {/* Status Tag: Held or Pending Pack Distribution */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest ${item.is_in_pack ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-white'}`}>
                      {item.is_in_pack ? 'In Pack' : 'Stowed'}
                    </span>
                  </div>

                  {/* Card Art Canvas Frame */}
                  <div className="w-full aspect-[3/4] rounded-xl bg-black/40 border border-white/5 flex items-center justify-center relative overflow-hidden shadow-inner group-hover:border-white/10 transition-colors">
                    {tpl?.image_url ? (
                      <img src={tpl.image_url} alt={tpl.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2 flex flex-col items-center">
                        <span className="text-2xl mb-1">⛳</span>
                        <span className="text-[9px] font-black tracking-tighter uppercase text-slate-500">Fores V Mint</span>
                      </div>
                    )}
                  </div>

                  {/* Card Label Stack */}
                  <div className="space-y-1 min-w-0">
                    <span className={`text-[7px] font-black uppercase tracking-[0.15em] px-1 py-0.5 rounded border ${rarityColor}`}>
                      {tpl?.rarity || 'Common'}
                    </span>
                    <h3 className="text-xs font-black tracking-tight uppercase italic truncate text-slate-200 mt-1">
                      {tpl?.name || 'Unknown Template'}
                    </h3>
                    <p className="text-[8px] font-semibold text-slate-500 truncate">
                      Via: {ach?.name || 'Milestone'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}