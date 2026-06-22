import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';

const GAME_FORMATS = [
  { id: 'head_to_head_net', name: 'Net Battle', color: 'from-emerald-400 to-green-600' },
  { id: 'head_to_head_gross', name: 'Gross Brawl', color: 'from-cyan-400 to-blue-600' },
  { id: 'skins', name: 'Skins Shootout', color: 'from-pink-500 to-rose-600' },
  { id: 'most_birdies', name: 'Birdie Blitz', color: 'from-amber-400 to-orange-500' },
  { id: 'greenies', name: 'KP Clam Clash', color: 'from-purple-400 to-indigo-600' }
];

const WORLD_ROUNDS = [
  { id: 'world_1', label: 'World 1' },
  { id: 'world_2', label: 'World 2' },
  { id: 'world_3', label: 'World 3' },
  { id: 'world_4', label: 'World 4' }
];

function ClamCoin({ size = 'md' }) {
  const sizeClasses = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-8 h-8 text-xs';
  return (
    <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 border-2 border-black inline-flex items-center justify-center font-black text-black shadow-[2px_2px_0_#000] relative shrink-0`}>
      <svg className="w-4/6 h-4/6 text-amber-9ab stroke-black animate-pulse" viewBox="0 0 24 24" fill="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" fill="#fef08a" />
        <path d="M12 6v12M8 8c.5 1.5.5 4.5 0 6M16 8c-.5 1.5-.5 4.5 0 6M5 10c1 1 1 3 0 4M19 10c-1 1-1 3 0 4" strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0.5 rounded-full border border-dashed border-yellow-100/40 pointer-events-none" />
    </div>
  );
}

export default function MulligansMatrixView({ onBack }) {
  // 🎯 UPDATE: Everyone starts with 0 tokens now
  const [mulliganBalance, setMulliganBalance] = useState(0);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [golfersList, setGolfersList] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('arena');

  // Modals / Input States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(null);
  const [winnerId, setWinnerId] = useState('');
  const [loserId, setLoserId] = useState('');
  
  const [pointsToAdd, setPointsToAdd] = useState(100);
  const [selectedFormat, setSelectedGame] = useState(GAME_FORMATS[0].name);
  const [selectedWorld, setSelectedWorld] = useState(WORLD_ROUNDS[0].label);
  const [invitedPlayerIds, setSelectedPlayers] = useState([]);
  const [pointStakes, setPointStakes] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCoreLedgerData();
    
    const gamesSubscription = supabase
      .channel('wagers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wagers' }, () => {
        fetchCoreLedgerData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(gamesSubscription);
    };
  }, []);

  const fetchCoreLedgerData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let activeUserId = user?.id;

      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });
      
      if (pError) throw pError;
      setGolfersList(profiles || []);

      if (!activeUserId && profiles && profiles.length > 0) {
        activeUserId = profiles[0].id;
      }

      const userProfile = profiles?.find(p => p.id === activeUserId);
      if (userProfile) {
        setCurrentUserProfile(userProfile);
        
        const { data: logs } = await supabase
          .from('points_log')
          .select('amount')
          .eq('player_id', userProfile.id);

        const { data: settledWagers } = await supabase
          .from('wagers')
          .select('stakes_amount, winner_id, loser_id')
          .or(`winner_id.eq.${userProfile.id},loser_id.eq.${userProfile.id}`);

        // 🎯 UPDATE: Baseline changed from 100 to 0
        let calculatedBalance = 0;
        if (logs) {
          calculatedBalance += logs.reduce((sum, log) => sum + log.amount, 0);
        }
        if (settledWagers) {
          settledWagers.forEach(w => {
            if (w.winner_id === userProfile.id) calculatedBalance += w.stakes_amount;
            if (w.loser_id === userProfile.id) calculatedBalance -= w.stakes_amount;
          });
        }
        setMulliganBalance(calculatedBalance);
      }

      const { data: games, error: gError } = await supabase
        .from('wagers')
        .select(`
          *,
          wager_participants (
            player_id,
            payout_status
          )
        `)
        .order('created_at', { ascending: false });

      if (gError) throw gError;
      setActiveGames(games || []);

    } catch (err) {
      console.error("Ledger engine failure:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPoints = async (e) => {
    e.preventDefault();
    if (!currentUserProfile || pointsToAdd <= 0) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('points_log')
        .insert({ player_id: currentUserProfile.id, amount: Number(pointsToAdd) });

      if (error) throw error;
      await fetchCoreLedgerData();
      setShowPointsModal(false);
      setPointsToAdd(100);
    } catch (err) {
      alert("Error writing to Clam Vault: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBroadcastGame = async (e) => {
    e.preventDefault();
    if (!currentUserProfile || invitedPlayerIds.length === 0) return;

    // 🎯 VALIDATION GATEWAY: Prevent staging game if user doesn't have enough tokens
    if (mulliganBalance < Number(pointStakes)) {
      alert(`Challenge Denied: You need at least ${pointStakes} tokens in your stash to broadcast this stake.`);
      return;
    }

    setIsSubmitting(true);
    const targetOpponentId = invitedPlayerIds[0];

    try {
      const { data: gameData, error: gameError } = await supabase
        .from('wagers')
        .insert({
          creator_id: currentUserProfile.id,
          opponent_id: targetOpponentId, 
          game_type: selectedFormat,
          stakes_amount: Number(pointStakes),
          world_round: selectedWorld,
          status: 'pending'
        })
        .select().single();

      if (gameError) throw gameError;

      const participantRows = [
        { wager_id: gameData.id, player_id: currentUserProfile.id, payout_status: 'pending' },
        { wager_id: gameData.id, player_id: targetOpponentId, payout_status: 'pending' }
      ];
      
      await supabase.from('wager_participants').insert(participantRows);

      await fetchCoreLedgerData();
      setShowCreateModal(false);
      setSelectedPlayers([]);
      setPointStakes(10);
    } catch (err) {
      alert("Error broadcasting match: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptInvite = async (game) => {
    if (!currentUserProfile) return;

    // 🎯 VALIDATION GATEWAY: Prevent accepting challenge if user doesn't have enough tokens
    if (mulliganBalance < Number(game.stakes_amount)) {
      alert(`Acceptance Blocked: You need at least ${game.stakes_amount} tokens in your stash to join this battle line-up.`);
      return;
    }

    try {
      await supabase.from('wagers').update({ status: 'active' }).eq('id', game.id);
      await fetchCoreLedgerData();
    } catch (err) {
      alert("Failed joining battle lineup: " + err.message);
    }
  };

  const handleResolveMatch = async (e) => {
    e.preventDefault();
    if (!showResolveModal || !winnerId || !loserId) return;
    setIsSubmitting(true);
    try {
      await supabase
        .from('wagers')
        .update({
          status: 'completed',
          winner_id: winnerId,
          loser_id: loserId
        })
        .eq('id', showResolveModal.id);

      await fetchCoreLedgerData();
      setShowResolveModal(null);
      setWinnerId('');
      setLoserId('');
    } catch (err) {
      alert("Error resolving mini-game: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openArenaGames = activeGames.filter(g => g.status === 'pending' || g.status === 'active');
  const finishedGames = activeGames.filter(g => g.status === 'completed');

  return (
    <div className="min-h-[100dvh] bg-[#1a0836] text-white font-sans flex flex-col pb-safe fixed inset-0 z-40 overflow-y-auto">
      
      {/* HEADER */}
      <div className="px-5 py-4 flex justify-between items-center bg-[#2d0d5e] border-b-4 border-yellow-400 sticky top-0 z-50 shadow-[0_4px_0_#000]">
        <button onClick={onBack} className="text-xs font-black uppercase tracking-wider bg-rose-600 border-2 border-black text-white px-3 py-1.5 rounded-md shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-[0px_0px_0_#000] transition-all">◀ EXIT</button>
        <h1 className="font-black text-lg tracking-wider text-yellow-400 uppercase italic drop-shadow-[2px_2px_0_rgba(0,0,0,1)] flex items-center gap-1">🦪 CLAM-BAKE ARENA 🕹️</h1>
        <div className="w-8 h-5" />
      </div>

      <div className="p-5 space-y-6 max-w-md mx-auto w-full pb-24">
        
        {/* HUD CARD */}
        <div className="bg-gradient-to-br from-[#4c1d95] to-[#2e1065] border-4 border-black rounded-2xl p-5 shadow-[4px_4px_0_#000] relative overflow-hidden">
          <div className="flex justify-between items-center">
            <div>
              <span className="bg-yellow-400 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-sm shadow-[1px_1px_0_#000]">CLAM TOKEN STASH</span>
              <div className="text-4xl font-black font-mono tracking-tight text-white mt-2 flex items-center gap-2 drop-shadow-[3px_3px_0_rgba(0,0,0,1)]">
                <ClamCoin size="lg" />
                <span>{mulliganBalance}</span>
                <span className="text-xs font-black text-yellow-300 uppercase font-sans">TOKENS</span>
              </div>
            </div>
            <button onClick={() => setShowPointsModal(true)} className="bg-emerald-400 hover:bg-emerald-300 text-black border-2 border-black text-xs font-black uppercase px-3 py-2.5 rounded-xl shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_#000]">+ ADD TOKENS</button>
          </div>
          <div className="mt-4 border-t-2 border-black/40 pt-3 flex justify-between text-[11px] font-bold uppercase tracking-wider">
            <span className="text-cyan-300">GOLFER: <span className="text-white font-black">{currentUserProfile?.name || 'GUEST'}</span></span>
            <span className="bg-rose-500 text-white px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_#000]">{currentUserProfile?.team || 'SQUAD'}</span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="grid grid-cols-3 gap-1 bg-black p-1 border-2 border-black rounded-xl">
          <button onClick={() => setActiveTab('arena')} className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'arena' ? 'bg-yellow-400 text-black' : 'text-slate-400 hover:text-white'}`}>⚔️ LIVE ARENA</button>
          <button onClick={() => setActiveTab('history')} className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'history' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'}`}>🏆 CRUSH BOARD</button>
          <button onClick={() => setActiveTab('standings')} className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'standings' ? 'bg-cyan-400 text-black' : 'text-slate-400 hover:text-white'}`}>📊 VAULT RANKS</button>
        </div>

        {/* TAB 1: LIVE ARENA */}
        {activeTab === 'arena' && (
          <div className="space-y-4">
            <button 
              onClick={() => {
                if (mulliganBalance <= 0) {
                  alert("Challenge Prevented: You cannot stage a wager with 0 tokens. Top up your token stash first.");
                  return;
                }
                setShowCreateModal(true);
              }} 
              className="w-full bg-rose-500 hover:bg-rose-400 border-4 border-black py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-[0_4px_0_#991b1b,0_4px_0_#000] active:translate-y-1 active:shadow-[0_0px_0_#000] transition-all"
            >
              💥 CHALLENGE PLAYER
            </button>

            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-yellow-400 drop-shadow-[1px_1px_0_#000]">🎯 ACTIVE CHALLENGES</h2>
              
              {openArenaGames.length === 0 ? (
                <div className="border-4 border-dashed border-purple-500/40 rounded-2xl py-8 text-center bg-black/20">
                  <p className="text-xs text-purple-300 font-black uppercase tracking-widest">No Active Fights Staged...</p>
                </div>
              ) : (
                openArenaGames.map((game) => {
                  const isCreator = String(game.creator_id) === String(currentUserProfile?.id);
                  
                  const hostProfile = golfersList.find(g => String(g.id) === String(game.creator_id));
                  const hostName = isCreator ? "YOU" : (hostProfile?.name || "PLAYER 1");
                  const hostAvatar = hostProfile?.avatar_url || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + hostName;

                  const opponentId = game.opponent_id || game.wager_participants?.find(p => String(p.player_id) !== String(game.creator_id))?.player_id;
                  const challengerProfile = golfersList.find(g => String(g.id) === String(opponentId));
                  const isYouChallenged = String(opponentId) === String(currentUserProfile?.id);
                  
                  const challengerName = isYouChallenged ? "YOU" : (challengerProfile?.name || "CHALLENGER");
                  const challengerAvatar = challengerProfile?.avatar_url || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + challengerName;
                  
                  const allAccepted = game.status === 'active'; 

                  return (
                    <div key={game.id} className="bg-slate-950 border-4 border-black rounded-2xl overflow-hidden shadow-[6px_6px_0_#000] relative flex flex-col group">
                      
                      {/* BANNER */}
                      <div className="bg-[#2d0d5e] border-b-4 border-black px-3 py-1.5 flex justify-between items-center z-10">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_#000] ${allAccepted ? 'bg-emerald-400 text-black' : 'bg-yellow-400 text-black'}`}>
                            {allAccepted ? '⚡ MATCH ACTIVE' : '⏳ PENDING'}
                          </span>
                          {game.world_round && (
                            <span className="text-[9px] font-black bg-cyan-400 border border-black text-black px-1.5 py-0.5 rounded uppercase font-mono shadow-[1px_1px_0_#000]">🗺️ {game.world_round}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-yellow-300 uppercase italic tracking-wide block">{game.game_type}</span>
                        </div>
                      </div>

                      {/* CHARACTER SPLIT VIEW */}
                      <div className="relative h-32 w-full flex items-center bg-zinc-900 border-b-4 border-black overflow-hidden select-none">
                        {/* LEFT: HOST PROFILE */}
                        <div className="w-1/2 h-full bg-gradient-to-br from-rose-700 via-rose-600 to-rose-900 flex relative items-center justify-start pl-4 overflow-hidden pr-6 [clip-path:polygon(0_0,100%_0,75%_100%,0_100%)] z-10 border-r-2 border-black">
                          <div className="flex items-center gap-3 relative">
                            <img src={hostAvatar} alt={hostName} className="w-16 h-16 rounded-xl border-4 border-black bg-black/40 shadow-[3px_3px_0_#000] object-cover shrink-0" onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${hostName}`; }} />
                            <div className="flex flex-col drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                              <span className="text-[9px] font-black text-rose-300 font-mono tracking-widest">P1 HOST</span>
                              <span className="text-sm font-black uppercase tracking-tight text-white italic truncate max-w-[80px]">{hostName}</span>
                            </div>
                          </div>
                        </div>

                        {/* VS ICON */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-yellow-400 text-black font-black italic border-4 border-black text-xs px-2 py-1 rounded-md shadow-[3px_3px_0_#000] tracking-tighter rotate-[-6deg] font-mono scale-110">VS</div>

                        {/* RIGHT: OPPONENT TARGET */}
                        <div className="w-1/2 h-full bg-gradient-to-bl from-blue-700 via-blue-600 to-blue-900 absolute right-0 top-0 flex items-center justify-end pr-4 pl-6 [clip-path:polygon(25%_0,100%_0,100%_100%,0_100%)]">
                          <div className="flex items-center gap-3 relative justify-end text-right">
                            <div className="flex flex-col drop-shadow-[2px_2px_0_rgba(0,0,0,1)] items-end">
                              <span className="text-[9px] font-black text-blue-300 font-mono tracking-widest">P2 TARGET</span>
                              <span className="text-sm font-black uppercase tracking-tight text-white italic truncate max-w-[90px]">{challengerName}</span>
                            </div>
                            <img src={challengerAvatar} alt={challengerName} className="w-16 h-16 rounded-xl border-4 border-black bg-black/40 shadow-[3px_3px_0_#000] object-cover shrink-0" onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${challengerName}`; }} />
                          </div>
                          {allAccepted && <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none border-l-4 border-emerald-400 z-10" />}
                        </div>
                      </div>

                      {/* CARD FOOTER */}
                      <div className="p-3 bg-black/40 flex justify-between items-center font-mono">
                        <div className="flex items-center gap-1.5 bg-black border-2 border-black px-2 py-1 rounded-xl">
                          <ClamCoin size="sm" />
                          <span className="text-xs font-black text-yellow-400">{game.stakes_amount} TOKENS</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isYouChallenged && game.status === 'pending' && (
                            <button onClick={() => handleAcceptInvite(game)} className="bg-emerald-400 hover:bg-emerald-300 text-black text-[10px] font-black border-2 border-black px-2.5 py-1.5 rounded-lg shadow-[2px_2px_0_#000] active:translate-y-0.5">⚔️ ACCEPT</button>
                          )}
                          {(isCreator || isYouChallenged) && game.status === 'active' && (
                            <button onClick={() => { setShowResolveModal(game); setWinnerId(game.creator_id); setLoserId(opponentId || ''); }} className="bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-black font-black uppercase text-[10px] tracking-wide px-3 py-1.5 rounded-lg shadow-[2px_2px_0_#000] active:translate-y-0.5">🏁 END GAME</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CRUSH BOARD */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-rose-400 drop-shadow-[1px_1px_0_#000]">🎬 SETTLED HISTORY</h2>
            {finishedGames.length === 0 ? <p className="text-xs text-center text-slate-500 uppercase font-black py-8">No matches recorded yet...</p> : finishedGames.map((game) => {
              const winnerName = golfersList.find(g => g.id === game.winner_id)?.name || "Champion";
              const loserName = golfersList.find(g => g.id === game.loser_id)?.name || "Opponent";
              return (
                <div key={game.id} className="bg-black border-4 border-black rounded-xl p-3 shadow-[3px_3px_0_#000]">
                  <div className="text-[9px] font-black tracking-widest text-purple-400 uppercase mb-1">🎮 {game.game_type} {game.world_round ? `• ${game.world_round}` : ''}</div>
                  <div className="flex justify-between items-center bg-gradient-to-r from-emerald-950 to-rose-950 p-2 border-2 border-black rounded-lg">
                    <div className="text-xs font-bold">🥇 <span className="text-emerald-400 font-black uppercase">{winnerName}</span> defeated <span className="text-rose-400 uppercase font-black">{loserName}</span></div>
                    <div className="flex items-center gap-1 bg-black px-1.5 py-0.5 rounded border border-yellow-400 shrink-0"><span className="text-yellow-400 font-mono text-xs font-black">+{game.stakes_amount}</span><ClamCoin size="sm" /></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: STANDINGS */}
        {activeTab === 'standings' && (
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400 drop-shadow-[1px_1px_0_#000]">🏆 CURRENT STANDINGS</h2>
            <div className="bg-black border-4 border-black rounded-xl divide-y-2 divide-black/60 overflow-hidden shadow-[4px_4px_0_#000]">
              {golfersList.map((golfer, index) => {
                // 🎯 UPDATE: Baseline shifted down to 0 tokens standard
                const claimed = activeGames.reduce((acc, g) => {
                  if (g.status === 'completed' && g.winner_id === golfer.id) return acc + g.stakes_amount;
                  if (g.status === 'completed' && g.loser_id === golfer.id) return acc - g.stakes_amount;
                  return acc;
                }, 0);
                return (
                  <div key={golfer.id} className="p-3 flex justify-between items-center bg-purple-950/20 hover:bg-purple-900/20">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-yellow-400 w-4">#{index + 1}</span>
                      <div>
                        <div className="text-xs font-black uppercase text-white tracking-wide">{golfer.name}</div>
                        <div className="text-[8px] font-black text-slate-500 uppercase">{golfer.team || 'FREE AGENT'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono font-black text-sm text-yellow-300"><span>{claimed}</span><ClamCoin size="sm" /></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {showPointsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1001] flex items-center justify-center p-4">
          <form onSubmit={handleAddPoints} className="bg-[#2d0d5e] border-4 border-black rounded-3xl p-6 w-full max-w-sm space-y-5 shadow-[8px_8px_0_#000]">
            <div className="text-center"><h2 className="text-lg font-black uppercase tracking-wider text-yellow-400 drop-shadow-[2px_2px_0_#000]">🦪 GET TOKENS</h2></div>
            <div className="space-y-2">
              <input type="number" value={pointsToAdd} onChange={(e) => setPointsToAdd(e.target.value)} min="1" className="w-full bg-black border-4 border-black text-yellow-300 text-3xl font-mono font-black p-2.5 rounded-2xl text-center focus:outline-none" required />
            </div>
            <div className="flex gap-3"><button type="button" onClick={() => setShowPointsModal(false)} className="w-1/2 bg-rose-600 text-white font-black py-2.5 rounded-xl text-xs">ABORT</button><button type="submit" className="w-1/2 bg-emerald-400 text-black font-black py-2.5 rounded-xl text-xs">COLLECT</button></div>
          </form>
        </div>
      )}

      {showResolveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1001] flex items-center justify-center p-4">
          <form onSubmit={handleResolveMatch} className="bg-[#2d0d5e] border-4 border-black rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-[8px_8px_0_#000]">
            <div className="text-center"><h2 className="text-base font-black uppercase tracking-wider text-yellow-400">🏁 RECORDE SCORE</h2></div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-emerald-400">🏆 CROWN WINNER</label>
              <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)} className="w-full bg-black text-white p-3 border-2 border-black rounded-xl text-xs font-bold focus:outline-none" required>
                <option value="">-- Choose Champion --</option>
                {golfersList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-rose-400">💀 SELECT LOSER</label>
              <select value={loserId} onChange={(e) => setLoserId(e.target.value)} className="w-full bg-black text-white p-3 border-2 border-black rounded-xl text-xs font-bold focus:outline-none" required>
                <option value="">-- Choose Loser --</option>
                {golfersList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowResolveModal(null)} className="w-1/2 bg-slate-700 text-white font-black py-2.5 rounded-xl text-xs">CANCEL</button><button type="submit" className="w-1/2 bg-emerald-400 text-black font-black py-2.5 rounded-xl text-xs">SUBMIT</button></div>
          </form>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#2d0d5e] border-t-4 sm:border-4 border-black rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-[8px_8px_0_#000] max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b-4 border-black/40 pb-3">
              <div><h2 className="text-base font-black uppercase tracking-widest text-yellow-400">STAGE GAME</h2></div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="bg-rose-600 text-white font-black text-xs px-2 py-1 rounded">CLOSE</button>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-white tracking-wider">SELECT WORLD LEVEL</label>
              <select value={selectedWorld} onChange={(e) => setSelectedWorld(e.target.value)} className="w-full bg-black border-2 border-black text-cyan-400 p-3 rounded-xl text-xs font-black uppercase focus:outline-none">
                {WORLD_ROUNDS.map(w => <option key={w.id} className="bg-purple-950 text-white" value={w.label}>{w.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-white tracking-wider">SELECT EVENT MODE</label>
              <select value={selectedFormat} onChange={(e) => setSelectedGame(e.target.value)} className="w-full bg-black border-2 border-black text-yellow-400 p-3 rounded-xl text-xs font-black uppercase focus:outline-none">
                {GAME_FORMATS.map(g => <option key={g.id} className="bg-purple-950 text-white" value={g.name}>{g.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-white tracking-wider">🎯 CHOOSE YOUR OPPONENT</label>
              <select value={invitedPlayerIds[0] || ""} onChange={(e) => { const selectedId = e.target.value; setSelectedPlayers(selectedId ? [selectedId] : []); }} className="w-full bg-black border-2 border-black text-emerald-400 p-3 rounded-xl text-xs font-black uppercase focus:outline-none" required>
                <option value="">-- SELECT TARGET PLAYER --</option>
                {golfersList.filter(g => String(g.id) !== String(currentUserProfile?.id)).map(golfer => (<option key={golfer.id} className="bg-purple-950 text-white" value={golfer.id}>{golfer.name}</option>))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-white tracking-wider">STAKES AMOUNT</label>
              <input type="number" value={pointStakes} onChange={(e) => setPointStakes(e.target.value)} min="1" className="w-full bg-black border-2 border-black text-yellow-400 text-xl font-mono font-black p-2.5 rounded-xl text-center focus:outline-none" />
            </div>
            <div className="pt-2"><button type="submit" onClick={handleBroadcastGame} className="w-full bg-emerald-400 text-black border-4 border-black font-black py-3.5 rounded-xl uppercase text-xs tracking-widest shadow-[0_4px_0_#000]">📡 SEND CHALLENGE</button></div>
          </div>
        </div>
      )}
    </div>
  );
}