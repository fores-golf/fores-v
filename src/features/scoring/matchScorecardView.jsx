import React, { useEffect, useState } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useUser } from '../../context/UserContext';

export default function MatchScorecardView({ insights, allHolesData, holeScores = [], onClose }) {
  const { player, isAdmin } = useUser();
  const [playerNames, setPlayerNames] = useState({ t1p1: 'TBD', t1p2: '', t2p1: 'TBD', t2p2: '' });
  const [editingCell, setEditingCell] = useState(null); 
  const [editValue, setEditValue] = useState('');

  const HARDCODED_ADMIN_ID = '2889dad2-6a62-41e5-85be-8f8f5f88c893';
  const isUserExplicitAdmin = isAdmin || 
    String(player?.auth_id).trim().toLowerCase() === HARDCODED_ADMIN_ID || 
    String(player?.id).trim().toLowerCase() === HARDCODED_ADMIN_ID;

  const sortedHoles = [...allHolesData].sort((a, b) => a.hole_number - b.hole_number);

  useEffect(() => {
    async function resolveExactNames() {
      try {
        const targetT1P1 = insights?.t1p1 || insights?.team1_player1;
        const targetT1P2 = insights?.t1p2 || insights?.team1_player2;
        const targetT2P1 = insights?.t2p1 || insights?.team2_player1;
        const targetT2P2 = insights?.t2p2 || insights?.team2_player2;

        const ids = [targetT1P1, targetT1P2, targetT2P1, targetT2P2].filter(Boolean);
        if (ids.length === 0) return;

        const { data } = await supabase.from('players').select('id, auth_id, name').in('auth_id', ids);
        
        if (data && data.length > 0) {
          const nameMap = {};
          data.forEach(p => { 
            if (p.auth_id) nameMap[String(p.auth_id).trim().toLowerCase()] = p.name;
          });
          
          const cleanKey = (val) => val ? String(val).trim().toLowerCase() : '';

          setPlayerNames({
            t1p1: nameMap[cleanKey(targetT1P1)] || 'TBD',
            t1p2: nameMap[cleanKey(targetT1P2)] || '',
            t2p1: nameMap[cleanKey(targetT2P1)] || 'TBD',
            t2p2: nameMap[cleanKey(targetT2P2)] || ''
          });
        }
      } catch (err) {
        console.warn('Name resolution error in scorecard:', err.message);
      }
    }
    resolveExactNames();
  }, [insights]);

  const getAsterisks = (strokes, hcpIndex) => {
    if (strokes <= 0) return '';
    let count = Math.floor(strokes / 18);
    const remainder = strokes % 18;
    if (remainder >= hcpIndex) count += 1;
    return '*'.repeat(count);
  };

  const getSlotColumnName = (slotKey) => {
    if (slotKey === 't1p1') return 'score_slanted_a';
    if (slotKey === 't1p2') return 'score_slanted_b';
    if (slotKey === 't2p1') return 'score_brothelmen_a';
    if (slotKey === 't2p2') return 'score_brothelmen_b';
    return '';
  };

  const getCellScore = (holeId, slotKey) => {
    const scoreRow = holeScores.find(s => s.hole_id === holeId);
    if (!scoreRow) return null;
    const dbColumn = getSlotColumnName(slotKey);
    return scoreRow[dbColumn] || null;
  };

  const handleCellSave = async (holeId, holeNumber, slotKey) => {
    setEditingCell(null);
    const numericScore = parseInt(editValue, 10);
    if (isNaN(numericScore) && editValue !== '') return; 

    const dbColumn = getSlotColumnName(slotKey);
    const finalValue = editValue === '' ? null : numericScore;

    try {
      const { data: currentScores } = await supabase.from('hole_scores').select('*').eq('matchup_id', insights.matchupId).eq('hole_id', holeId).maybeSingle();
      
      const upsertPayload = {
        ...(currentScores || {}),
        matchup_id: insights.matchupId,
        hole_id: holeId,
        hole_number: holeNumber,
        [dbColumn]: finalValue
      };

      await supabase.from('hole_scores').upsert(upsertPayload, { onConflict: 'matchup_id, hole_id' });
    } catch (err) {
      alert("Admin override failed: " + err.message);
    }
  };

  const startEditing = (holeId, slotKey, currentVal) => {
    if (!isUserExplicitAdmin) return; 
    setEditingCell({ holeId, slotKey });
    setEditValue(currentVal !== null ? String(currentVal) : '');
  };

  const getTeamLabel = (p1, p2) => {
    if (!p1 || p1 === 'TBD') return 'TBD';
    if (!p2) return p1;
    return `${p1.split(' ')[0]} & ${p2.split(' ')[0]}`;
  };

  const team1ComboName = getTeamLabel(playerNames.t1p1, playerNames.t1p2);
  const team2ComboName = getTeamLabel(playerNames.t2p1, playerNames.t2p2);

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[10000] p-4 flex flex-col font-sans text-white overflow-y-auto">
      <div className="flex justify-between items-center mb-6 max-w-4xl mx-auto w-full shrink-0 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight uppercase italic text-amber-500">Official Handicap Card</h2>
            {isUserExplicitAdmin && (
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded">Admin Dev Mode</span>
            )}
          </div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">Format: {insights.wagerStatus}</p>
        </div>
        <button onClick={onClose} className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all">Close</button>
      </div>

      <div className="max-w-4xl mx-auto w-full overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 style-scrolling-touch">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <th className="py-3 px-2 min-w-[160px]">Hole / Hcp Index</th>
              {sortedHoles.map(h => (
                <th key={h.id} className="py-3 px-1.5 text-center min-w-[38px] font-mono">
                  <div>{h.hole_number}</div>
                  <div className="text-[8px] text-slate-600 font-bold mt-0.5">i:{h.hcp_index}</div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-800/50 text-xs">
            <tr className="bg-black/20 font-bold text-slate-300">
              <td className="py-2.5 px-2 font-black uppercase text-[10px] tracking-wider text-emerald-400">Course Par</td>
              {sortedHoles.map(h => (
                <td key={h.id} className="py-2.5 px-1.5 text-center font-mono">{h.par || 4}</td>
              ))}
            </tr>

            {insights.strokesType === 'team' ? (
              <>
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3 px-2 font-black text-blue-400 truncate">
                    {team1ComboName} <span className="text-[9px] font-bold text-slate-500">(+{insights.team1Strokes})</span>
                  </td>
                  {sortedHoles.map(h => {
                    const stars = getAsterisks(insights.team1Strokes, h.hcp_index);
                    const currentVal = getCellScore(h.id, 't1p1');
                    const isCellEditing = editingCell?.holeId === h.id && editingCell?.slotKey === 't1p1';

                    return (
                      <td key={h.id} className="py-2 px-1 text-center font-mono font-bold align-middle">
                        {isCellEditing ? (
                          <input type="tel" value={editValue} autoFocus onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleCellSave(h.id, h.hole_number, 't1p1')} onKeyDown={(e) => e.key === 'Enter' && handleCellSave(h.id, h.hole_number, 't1p1')} className="w-8 h-7 bg-black text-center text-blue-400 border border-blue-500 rounded font-mono text-sm" />
                        ) : (
                          <div onClick={() => startEditing(h.id, 't1p1', currentVal)} className={`cursor-pointer min-h-[1.5rem] ${isUserExplicitAdmin ? 'hover:bg-white/10 rounded' : ''}`}>
                            <span className="text-white text-sm">{currentVal || '-'}</span>
                          </div>
                        )}
                        <div className="text-blue-400 font-black text-[9px] h-3 leading-none select-none">{stars}</div>
                      </td>
                    );
                  })}
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3 px-2 font-black text-red-400 truncate">
                    {team2ComboName} <span className="text-[9px] font-bold text-slate-500">(+{insights.team2Strokes})</span>
                  </td>
                  {sortedHoles.map(h => {
                    const stars = getAsterisks(insights.team2Strokes, h.hcp_index);
                    const currentVal = getCellScore(h.id, 't2p1');
                    const isCellEditing = editingCell?.holeId === h.id && editingCell?.slotKey === 't2p1';

                    return (
                      <td key={h.id} className="py-2 px-1 text-center font-mono font-bold align-middle">
                        {isCellEditing ? (
                          <input type="tel" value={editValue} autoFocus onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleCellSave(h.id, h.hole_number, 't2p1')} onKeyDown={(e) => e.key === 'Enter' && handleCellSave(h.id, h.hole_number, 't2p1')} className="w-8 h-7 bg-black text-center text-red-400 border border-red-500 rounded font-mono text-sm" />
                        ) : (
                          <div onClick={() => startEditing(h.id, 't2p1', currentVal)} className={`cursor-pointer min-h-[1.5rem] ${isUserExplicitAdmin ? 'hover:bg-white/10 rounded' : ''}`}>
                            <span className="text-white text-sm">{currentVal || '-'}</span>
                          </div>
                        )}
                        <div className="text-red-400 font-black text-[9px] h-3 leading-none select-none">{stars}</div>
                      </td>
                    );
                  })}
                </tr>
              </>
            ) : (
              <>
                {['t1p1', 't1p2', 't2p1', 't2p2'].map((slotKey) => {
                  const targetT1P2 = insights?.t1p2 || insights?.team1_player2;
                  const targetT2P2 = insights?.t2p2 || insights?.team2_player2;
                  if ((slotKey === 't1p2' && !targetT1P2) || (slotKey === 't2p2' && !targetT2P2)) return null;
                  
                  const isTeam1 = slotKey.startsWith('t1');
                  const nameStr = playerNames[slotKey];
                  const strokeCount = insights[`${slotKey}Strokes`] || 0;

                  return (
                    <tr key={slotKey} className={`hover:bg-white/[0.02] ${slotKey === 't2p1' ? 'border-t border-slate-800/50' : ''}`}>
                      <td className={`py-3 px-2 truncate ${isTeam1 ? 'font-black text-slate-200' : 'font-medium text-slate-400'}`}>
                        {nameStr} <span className="text-[9px] font-bold text-slate-500">(+{strokeCount})</span>
                      </td>
                      {sortedHoles.map(h => {
                        const currentVal = getCellScore(h.id, slotKey);
                        const isCellEditing = editingCell?.holeId === h.id && editingCell?.slotKey === slotKey;
                        const stars = getAsterisks(strokeCount, h.hcp_index);

                        return (
                          <td key={h.id} className="py-2 px-1 text-center font-mono align-middle">
                            {isCellEditing ? (
                              <input type="tel" value={editValue} autoFocus onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleCellSave(h.id, h.hole_number, slotKey)} onKeyDown={(e) => e.key === 'Enter' && handleCellSave(h.id, h.hole_number, slotKey)} className="w-8 h-7 bg-black text-center text-amber-400 border border-amber-500 rounded font-mono text-sm" />
                            ) : (
                              <div onClick={() => startEditing(h.id, slotKey, currentVal)} className={`cursor-pointer min-h-[1.2rem] flex flex-col justify-center ${isUserExplicitAdmin ? 'hover:bg-white/10 rounded' : ''}`}>
                                <span className="text-white text-sm font-bold leading-none">{currentVal || '-'}</span>
                              </div>
                            )}
                            <div className="text-amber-500/70 font-black text-[9px] tracking-tighter h-3 leading-none select-none">{stars}</div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>
      
      {isUserExplicitAdmin && (
        <div className="mt-4 max-w-4xl mx-auto w-full text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center bg-white/5 border border-white/5 p-2 rounded-xl">
          ⚡ Admin Dev Mode Active: Tap or click any player score block to modify or populate raw values instantly.
        </div>
      )}
    </div>
  );
}