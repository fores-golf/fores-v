import React from 'react';

export default function DashboardSkeletons() {
  return (
    <div className="flex flex-col gap-4 animate-pulse w-full">
      
      {/* --- SCOREBOARD SKELETON --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="h-3 bg-gray-200 rounded-full w-1/3 mx-auto mb-6" />
        <div className="flex justify-between items-center">
          
          {/* Team 1 Placeholder */}
          <div className="flex flex-col items-center flex-1 gap-2">
            <div className="w-14 h-14 bg-gray-200 rounded-full" />
            <div className="h-3 bg-gray-200 rounded-full w-16" />
            <div className="h-8 bg-gray-200 rounded-md w-12 mt-1" />
          </div>
          
          {/* VS Placeholder */}
          <div className="w-6 h-4 bg-gray-200 rounded" />
          
          {/* Team 2 Placeholder */}
          <div className="flex flex-col items-center flex-1 gap-2">
            <div className="w-14 h-14 bg-gray-200 rounded-full" />
            <div className="h-3 bg-gray-200 rounded-full w-16" />
            <div className="h-8 bg-gray-200 rounded-md w-12 mt-1" />
          </div>

        </div>
      </div>

      {/* --- HERO ACTION SKELETON --- */}
      {/* Matches the exact height of your large green "Start Match" button */}
      <div className="h-[60px] bg-gray-200 rounded-2xl w-full" />

      {/* --- CHIRP PREVIEW SKELETON --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 bg-gray-200 rounded-full w-1/3" />
          <div className="h-3 bg-gray-200 rounded-full w-3/4" />
        </div>
      </div>

      {/* --- NAVIGATION GRID SKELETON --- */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col items-start">
            <div className="w-8 h-8 bg-gray-200 rounded-full mb-3" />
            <div className="h-4 bg-gray-200 rounded-full w-1/2 mb-2" />
            <div className="h-3 bg-gray-200 rounded-full w-2/3" />
          </div>
        ))}
      </div>

    </div>
  );
}