import React from 'react';

const GridTile = ({ title, icon, badge, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white/5 backdrop-blur-md rounded-2xl shadow-sm border border-white/5 p-4 flex flex-col items-center justify-center text-center transition-all duration-200 active:scale-95 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#1e8c45]/50 aspect-square relative group"
  >
    {/* Floating Badge */}
    {badge && (
      <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg ${badge.type === 'alert' ? 'bg-red-500 text-white' : 'bg-[#1e8c45] text-white'}`}>
        {badge.text}
      </span>
    )}
    
    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 text-gray-400 border border-white/10 shadow-inner group-hover:text-[#34d399] transition-colors">
      {icon}
    </div>
    
    <h3 className="font-bold text-gray-200 text-sm tracking-tight">{title}</h3>
  </button>
);

export default function DashboardNavGrid({ chirpsCount = 3, walletBalance = 420 }) {
  // ... Keep the exact same 6 GridTile instantiations from before, 
  // just the component definition above needed changing!
  return (
     <div className="grid grid-cols-2 gap-4">
      {/* Ensure all your tiles are rendered here exactly as they were in the previous step */}
      <GridTile title="Schedule" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>} onClick={() => console.log('Go to Schedule')} />
      <GridTile title="Leaderboard" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>} onClick={() => console.log('Go to Leaderboard')} />
      <GridTile title="Bet Board" badge={{ text: `$${walletBalance}`, type: 'success' }} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>} onClick={() => console.log('Go to Bets')} />
      <GridTile title="Chirps" badge={{ text: `${chirpsCount} New`, type: 'alert' }} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>} onClick={() => console.log('Go to Chirps')} />
      <GridTile title="Garage" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>} onClick={() => console.log('Go to Garage')} />
      <GridTile title="Profile" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>} onClick={() => console.log('Go to Profile')} />
    </div>
  );
}