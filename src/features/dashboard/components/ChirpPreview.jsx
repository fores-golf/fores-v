import React from 'react';

export default function ChirpPreview({ 
  unreadCount = 3, 
  latestChirp = { author: "T. Roeger", text: "Bro hit it in the water again..." },
  onClick 
}) {
  return (
    <button 
      onClick={onClick}
      className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e8c45]/20"
    >
      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <span className="font-bold text-gray-900">Chirps</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {unreadCount} New
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500 truncate">
          <span className="font-semibold text-gray-700">{latestChirp.author}:</span> "{latestChirp.text}"
        </div>
      </div>
    </button>
  );
}