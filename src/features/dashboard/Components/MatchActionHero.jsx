import React, { useState } from 'react';

export default function MatchActionHero({ activeMatch, onAction }) {
  const [isStarting, setIsStarting] = useState(false);

  const handleClick = async () => {
    setIsStarting(true);
    // Wrap in a try/catch in case the routing or API fails
    try {
      await onAction(activeMatch.matchId);
    } finally {
      setIsStarting(false);
    }
  };

  if (activeMatch.inProgress) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-gray-800">Round in Progress</span>
          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-md">
            Hole {activeMatch.currentHole}
          </span>
        </div>
        <div className="text-sm text-gray-500 mb-5">
          {activeMatch.format} vs {activeMatch.opponents}
        </div>
        <button 
          onClick={handleClick} 
          disabled={isStarting}
          className="w-full bg-[#1e8c45] text-white font-bold py-3.5 rounded-xl hover:bg-[#167036] transition-colors shadow-sm disabled:opacity-70 flex justify-center items-center gap-2"
        >
          {isStarting ? (
             <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
             "Resume Match"
          )}
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={handleClick} 
      disabled={isStarting}
      className="w-full bg-[#1e8c45] text-white font-bold py-4 rounded-2xl hover:bg-[#167036] transition-colors shadow-sm flex justify-center items-center gap-2 disabled:opacity-70"
    >
      {isStarting ? (
        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
      )}
      <span>Start Match</span>
    </button>
  );
}