import React, { useState, useEffect } from 'react';

export default function ScoreEntrySheet({ isOpen, onClose, currentHole, par, onSave }) {
  // Reset local state whenever the hole changes
  const [score, setScore] = useState(par);
  const [putts, setPutts] = useState(2);
  const [accuracy, setAccuracy] = useState('hit'); // 'hit', 'left', 'right', 'long', 'short'
  const [penalties, setPenalties] = useState(0);
  const [water, setWater] = useState(0);
  const [drinks, setDrinks] = useState(0);

  useEffect(() => {
    setScore(par);
    setPutts(2);
    setAccuracy('hit');
    setPenalties(0);
    setWater(0);
    setDrinks(0);
  }, [currentHole, par]);

  // Handle the bottom sheet animation state
  if (!isOpen) return null;

  return (
    <>
      {/* Dark Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[900] transition-opacity"
        onClick={onClose}
      />

      {/* Sliding Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 rounded-t-3xl z-[999] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-slide-up flex flex-col max-h-[90vh]">
        
        {/* Drag Handle & Header */}
        <div className="flex flex-col items-center pt-3 pb-4 border-b border-slate-800 shrink-0">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mb-4" />
          <div className="flex justify-between items-center w-full px-6">
            <h2 className="text-xl font-black text-white tracking-tighter">HOLE {currentHole} SCORE</h2>
            <span className="text-xs font-black uppercase tracking-widest text-emerald-500 bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-800">Par {par}</span>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* --- CORE SCORES (Vertical Steppers) --- */}
          <div className="flex justify-center gap-8">
            {/* Total Score Stepper */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total</span>
              <button onClick={() => setScore(s => s + 1)} className="w-20 h-14 bg-slate-800 rounded-t-2xl text-emerald-400 font-black text-3xl flex items-center justify-center border-t border-x border-slate-700 hover:bg-slate-700 transition-colors">+</button>
              <div className="w-20 h-20 bg-slate-950 flex items-center justify-center text-4xl font-black border border-slate-700 text-white shadow-inner">{score}</div>
              <button onClick={() => setScore(s => Math.max(1, s - 1))} className="w-20 h-14 bg-slate-800 rounded-b-2xl text-red-400 font-black text-3xl flex items-center justify-center border-b border-x border-slate-700 hover:bg-slate-700 transition-colors">-</button>
            </div>

            {/* Putts Stepper */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Putts</span>
              <button onClick={() => setPutts(p => p + 1)} className="w-20 h-14 bg-slate-800 rounded-t-2xl text-emerald-400 font-black text-3xl flex items-center justify-center border-t border-x border-slate-700 hover:bg-slate-700 transition-colors">+</button>
              <div className="w-20 h-20 bg-slate-950 flex items-center justify-center text-4xl font-black border border-slate-700 text-white shadow-inner">{putts}</div>
              <button onClick={() => setPutts(p => Math.max(0, p - 1))} className="w-20 h-14 bg-slate-800 rounded-b-2xl text-red-400 font-black text-3xl flex items-center justify-center border-b border-x border-slate-700 hover:bg-slate-700 transition-colors">-</button>
            </div>
          </div>

          {/* --- TEE SHOT ACCURACY (Crosshair Grid) --- */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-inner">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center mb-4">Tee Shot Accuracy</h3>
            <div className="grid grid-cols-3 grid-rows-3 gap-2 w-48 h-48 mx-auto">
              <div />
              <button onClick={() => setAccuracy('long')} className={`rounded-xl border font-black text-[10px] uppercase tracking-wider transition-all ${accuracy === 'long' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>Long</button>
              <div />
              
              <button onClick={() => setAccuracy('left')} className={`rounded-xl border font-black text-[10px] uppercase tracking-wider transition-all ${accuracy === 'left' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>Left</button>
              <button onClick={() => setAccuracy('hit')} className={`rounded-xl border font-black text-xs uppercase tracking-wider transition-all ${accuracy === 'hit' ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>Hit</button>
              <button onClick={() => setAccuracy('right')} className={`rounded-xl border font-black text-[10px] uppercase tracking-wider transition-all ${accuracy === 'right' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>Right</button>
              
              <div />
              <button onClick={() => setAccuracy('short')} className={`rounded-xl border font-black text-[10px] uppercase tracking-wider transition-all ${accuracy === 'short' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>Short</button>
              <div />
            </div>
          </div>

          {/* --- HAZARDS & VICES (Counters) --- */}
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 pl-4">⚠️ Penalty Strokes</span>
              <div className="flex items-center gap-4 bg-slate-900 rounded-lg p-1">
                <button onClick={() => setPenalties(p => Math.max(0, p - 1))} className="w-10 h-10 flex items-center justify-center text-xl font-black text-slate-400">-</button>
                <span className="text-lg font-black text-white w-4 text-center">{penalties}</span>
                <button onClick={() => setPenalties(p => p + 1)} className="w-10 h-10 flex items-center justify-center text-xl font-black text-red-400">+</button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 pl-4">🌊 Water Balls</span>
              <div className="flex items-center gap-4 bg-slate-900 rounded-lg p-1">
                <button onClick={() => setWater(w => Math.max(0, w - 1))} className="w-10 h-10 flex items-center justify-center text-xl font-black text-slate-400">-</button>
                <span className="text-lg font-black text-white w-4 text-center">{water}</span>
                <button onClick={() => setWater(w => w + 1)} className="w-10 h-10 flex items-center justify-center text-xl font-black text-blue-400">+</button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 pl-4">🍻 Drinks Consumed</span>
              <div className="flex items-center gap-4 bg-slate-900 rounded-lg p-1">
                <button onClick={() => setDrinks(d => Math.max(0, d - 1))} className="w-10 h-10 flex items-center justify-center text-xl font-black text-slate-400">-</button>
                <span className="text-lg font-black text-white w-4 text-center">{drinks}</span>
                <button onClick={() => setDrinks(d => d + 1)} className="w-10 h-10 flex items-center justify-center text-xl font-black text-yellow-400">+</button>
              </div>
            </div>
          </div>
        </div>

        {/* --- SUBMIT BUTTON --- */}
        <div className="p-6 bg-slate-950 border-t border-slate-800 shrink-0 pb-safe">
          <button 
            onClick={() => {
              onSave({ score, putts, accuracy, penalties, water, drinks });
              onClose();
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-widest py-5 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
          >
            Enter Score
          </button>
        </div>

      </div>
    </>
  );
}