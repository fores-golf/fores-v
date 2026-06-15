import React, { useState, useEffect } from 'react';

export default function ScoreEntrySheet({ isOpen, onClose, currentHole, par, onSave, existingData }) {
  const [score, setScore] = useState(par);
  const [putts, setPutts] = useState(2);
  const [accuracy, setAccuracy] = useState('hit'); // 'hit', 'left', 'right', 'long', 'short'
  const [penalties, setPenalties] = useState(0);
  const [water, setWater] = useState(0);
  const [drinks, setDrinks] = useState(0);

  // Add this inside ScoreEntrySheet, right below your useState declarations:
  useEffect(() => {
    if (isOpen) {
      if (existingData) {
        // If data exists, pre-fill all form fields with their saved values
        setScore(existingData.gross_score);
        setPutts(existingData.putts || 0);
        setAccuracy(existingData.accuracy || ''); 
        setPenalties(existingData.penalty_strokes || 0);
        setWater(existingData.water_balls || 0);
        setDrinks(existingData.drinks || 0);
      } else {
        // If no data exists, wipe the sheet clean for a fresh hole
        setScore(par);
        setPutts(2); // standard par assumption
        setAccuracy('');
        setPenalties(0);
        setWater(0);
        setDrinks(0);
      }
    }
  }, [isOpen, existingData, par]);

  if (!isOpen) return null;

  return (
    <>
      {/* Deep Immersive Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[900] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Premium Compact Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-800 rounded-t-[2.5rem] z-[999] shadow-[0_-20px_50px_rgba(0,0,0,0.7)] animate-slide-up flex flex-col pb-safe max-h-[92vh]">
        
        {/* Header Block */}
        <div className="flex flex-col items-center pt-3 pb-3 shrink-0">
          <div className="w-12 h-1 bg-slate-700 rounded-full mb-3" />
          <div className="flex justify-between items-center w-full px-6">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter leading-none">SCORE ENTRY</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Hole {currentHole} &bull; Par {par}</p>
            </div>
            <button 
              onClick={onClose}
              className="text-xs font-black text-slate-400 bg-slate-800 border border-slate-700 rounded-full w-7 h-7 flex items-center justify-center hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Unified Dashboard Grid (Zero Scrolling) */}
        <div className="flex-1 px-5 pb-4 grid grid-cols-2 gap-4 overflow-hidden">
          
          {/* --- CARD 1: MAIN SCORES --- */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-inner">
            {/* Total Score */}
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Gross Score</span>
              <div className="flex items-center justify-between bg-slate-900/50 rounded-xl border border-slate-800 p-1">
                <button onClick={() => setScore(s => Math.max(1, s - 1))} className="w-10 h-10 rounded-lg text-slate-400 font-black text-xl flex items-center justify-center hover:bg-slate-800 hover:text-white">-</button>
                <span className="text-3xl font-black text-white font-mono tracking-tighter">{score}</span>
                <button onClick={() => setScore(s => s + 1)} className="w-10 h-10 rounded-lg text-emerald-400 font-black text-xl flex items-center justify-center hover:bg-slate-800">+</button>
              </div>
            </div>

            {/* Putts */}
            <div className="flex flex-col mt-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Putts</span>
              <div className="flex items-center justify-between bg-slate-900/50 rounded-xl border border-slate-800 p-1">
                <button onClick={() => setPutts(p => Math.max(0, p - 1))} className="w-10 h-10 rounded-lg text-slate-400 font-black text-xl flex items-center justify-center hover:bg-slate-800 hover:text-white">-</button>
                <span className="text-2xl font-black text-slate-300 font-mono">{putts}</span>
                <button onClick={() => setPutts(p => p + 1)} className="w-10 h-10 rounded-lg text-emerald-400 font-black text-xl flex items-center justify-center hover:bg-slate-800">+</button>
              </div>
            </div>
          </div>

          {/* --- CARD 2: TEE ACCURACY (D-PAD MATRIX) --- */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 flex flex-col justify-between shadow-inner items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center block w-full self-start mb-1">Fairway Accuracy</span>
            
            <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-32 h-32 relative my-auto">
              <div />
              <button onClick={() => setAccuracy('long')} className={`rounded-lg border font-black text-[9px] uppercase transition-all flex items-center justify-center ${accuracy === 'long' ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-slate-900 border-slate-800/60 text-slate-600'}`}>▲</button>
              <div />
              
              <button onClick={() => setAccuracy('left')} className={`rounded-lg border font-black text-[9px] uppercase transition-all flex items-center justify-center ${accuracy === 'left' ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'bg-slate-900 border-slate-800/60 text-slate-600'}`}>◀</button>
              <button onClick={() => setAccuracy('hit')} className={`rounded-lg border font-black text-xs uppercase transition-all flex items-center justify-center ${accuracy === 'hit' ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-105' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>●</button>
              <button onClick={() => setAccuracy('right')} className={`rounded-lg border font-black text-[9px] uppercase transition-all flex items-center justify-center ${accuracy === 'right' ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'bg-slate-900 border-slate-800/60 text-slate-600'}`}>▶</button>
              
              <div />
              <button onClick={() => setAccuracy('short')} className={`rounded-lg border font-black text-[9px] uppercase transition-all flex items-center justify-center ${accuracy === 'short' ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-slate-900 border-slate-800/60 text-slate-600'}`}>▼</button>
              <div />
            </div>
          </div>

          {/* --- CARD 3: HAZARDS & MODIFIERS (FULL WIDTH SPAN) --- */}
          <div className="col-span-2 bg-slate-950/40 border border-slate-800/60 rounded-2xl p-3 grid grid-cols-3 gap-3">
            
            {/* Penalties Counter */}
            <div className="flex flex-col items-center bg-slate-900/40 border border-slate-800/80 rounded-xl p-2 justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Penalties</span>
              <span className={`text-xl font-black font-mono my-1 ${penalties > 0 ? 'text-red-400' : 'text-slate-400'}`}>{penalties}</span>
              <div className="flex gap-1 w-full">
                <button onClick={() => setPenalties(p => Math.max(0, p - 1))} className="flex-1 bg-slate-800 rounded-md py-1 text-xs font-bold text-slate-400 border border-slate-700/50 hover:bg-slate-700">-</button>
                <button onClick={() => setPenalties(p => p + 1)} className="flex-1 bg-slate-800 rounded-md py-1 text-xs font-bold text-red-400 border border-slate-700/50 hover:bg-slate-700">+</button>
              </div>
            </div>

            {/* Water Balls Counter */}
            <div className="flex flex-col items-center bg-slate-900/40 border border-slate-800/80 rounded-xl p-2 justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Water Balls</span>
              <span className={`text-xl font-black font-mono my-1 ${water > 0 ? 'text-blue-400' : 'text-slate-400'}`}>{water}</span>
              <div className="flex gap-1 w-full">
                <button onClick={() => setWater(w => Math.max(0, w - 1))} className="flex-1 bg-slate-800 rounded-md py-1 text-xs font-bold text-slate-400 border border-slate-700/50 hover:bg-slate-700">-</button>
                <button onClick={() => setWater(w => w + 1)} className="flex-1 bg-slate-800 rounded-md py-1 text-xs font-bold text-blue-400 border border-slate-700/50 hover:bg-slate-700">+</button>
              </div>
            </div>

            {/* Drinks Counter */}
            <div className="flex flex-col items-center bg-slate-900/40 border border-slate-800/80 rounded-xl p-2 justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Drinks 🍻</span>
              <span className={`text-xl font-black font-mono my-1 ${drinks > 0 ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]' : 'text-slate-400'}`}>{drinks}</span>
              <div className="flex gap-1 w-full">
                <button onClick={() => setDrinks(d => Math.max(0, d - 1))} className="flex-1 bg-slate-800 rounded-md py-1 text-xs font-bold text-slate-400 border border-slate-700/50 hover:bg-slate-700">-</button>
                <button onClick={() => setDrinks(d => d + 1)} className="flex-1 bg-slate-800 rounded-md py-1 text-xs font-bold text-yellow-400 border border-slate-700/50 hover:bg-slate-700">+</button>
              </div>
            </div>

          </div>
        </div>

        {/* Action Button Strip */}
        <div className="p-4 px-5 bg-slate-950 border-t border-slate-800/60 shrink-0 flex gap-3">
          <button 
            onClick={() => {
              onSave({ score, putts, accuracy, penalties, water, drinks });
              onClose();
            }}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all border border-emerald-500"
          >
            Confirm & Lock Score
          </button>
        </div>

      </div>
    </>
  );
}