import React, { useState, useEffect, useRef } from 'react';
import { useChirpsData } from './hooks/useChirpsData';

export default function ChirpsView({ onBack }) {
  const { chirps, golfers, loading, sendChirp } = useChirpsData();
  const [typedMessage, setTypedMessage] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const feedEndRef = useRef(null);

  // Keep chat pinned to the bottom when new talk drops in
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chirps]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setTypedMessage(val);

    // Look for the last word starting with @ to suggest tagging targets
    const words = val.split(' ');
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@') && lastWord.length > 1) {
      const query = lastWord.substring(1).toLowerCase();
      const filtered = golfers.filter(g => g.username?.toLowerCase().includes(query));
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectGolfer = (username) => {
    const words = typedMessage.split(' ');
    words.pop(); // Remove the partial mention string
    words.push(`@${username} `); // Inject full completed username
    setTypedMessage(words.join(' '));
    setShowSuggestions(false);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;
    sendChirp(typedMessage);
    setTypedMessage('');
  };

  // Visual text formatter: Converts text words starting with @ into glowing emerald sub-badges
  const renderMessageContent = (text) => {
    return text.split(' ').map((word, i) => {
      if (word.startsWith('@')) {
        return (
          <span key={i} className="text-[#34d399] font-black bg-[#34d399]/10 px-1.5 py-0.5 rounded border border-[#34d399]/20 shadow-sm inline-block mr-1">
            {word}
          </span>
        );
      }
      return word + ' ';
    });
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0f172a] flex items-center justify-center pb-safe">
        <span className="animate-spin h-10 w-10 border-4 border-[#34d399] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#090d16] text-white font-sans flex flex-col pb-safe fixed inset-0 z-40">
      
      {/* Premium Glass Top bar Header */}
      <div className="px-5 py-4 flex justify-between items-center bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/5 z-10">
        <button onClick={onBack} className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 active:scale-95 transition-transform">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          Hub
        </button>
        <h1 className="font-black text-lg tracking-tight uppercase italic flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          Chirps Board
        </h1>
        <div className="w-8 h-8"></div> {/* Spacer balance */}
      </div>

      {/* --- MESSAGE COMMET FEED --- */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 style-scrolling-touch">
        {chirps.map((chirp) => {
          const isClam = chirp.team === 'Slanted Clams';
          const isBrothel = chirp.team === 'Clam Brothelmen';

          return (
            <div key={chirp.id} className="flex gap-3 items-start animate-fade-in max-w-[85%]">
              {/* Dynamic team badge border layout wrappers */}
              <div className={`w-8 h-8 rounded-full shrink-0 border overflow-hidden flex items-center justify-center text-[10px] font-black ${
                isClam ? 'bg-blue-900 border-blue-400/40 text-blue-100' :
                isBrothel ? 'bg-red-900 border-red-400/40 text-red-100' :
                'bg-slate-800 border-white/10 text-slate-300'
              }`}>
                {chirp.avatar ? <img src={chirp.avatar} alt="Avatar" className="w-full h-full object-cover" /> : chirp.sender.substring(0,2).toUpperCase()}
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-black tracking-tight text-sm text-slate-200">{chirp.sender}</span>
                  <span className="text-[9px] font-bold text-slate-600 tabular-nums">{chirp.timestamp}</span>
                </div>
                {/* Message text element box */}
                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-3.5 shadow-md backdrop-blur-md text-sm text-slate-100 leading-relaxed">
                  {renderMessageContent(chirp.text)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={feedEndRef} />
      </div>

      {/* --- FOOTER COMMNET CONTROLLER ENGINE --- */}
      <div className="p-4 bg-[#0f172a]/95 backdrop-blur-xl border-t border-white/5 relative">
        
        {/* Real-time Tagging Suggestion Autocomplete Box Sheet */}
        {showSuggestions && (
          <div className="absolute bottom-full left-4 right-4 bg-[#1e293b] rounded-2xl border border-white/10 shadow-2xl max-h-40 overflow-y-auto mb-2 divide-y divide-white/5 z-20 backdrop-blur-xl">
            {suggestions.map((golfer) => (
              <button
                key={golfer.id}
                type="button"
                onClick={() => handleSelectGolfer(golfer.username)}
                className="w-full text-left p-3 flex justify-between items-center hover:bg-white/5 transition-colors active:bg-white/10"
              >
                <span className="font-black text-sm text-slate-200">@{golfer.username}</span>
                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                  golfer.team_name === 'Slanted Clams' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  golfer.team_name === 'Clam Brothelmen' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }`}>
                  {golfer.team_name || 'Free Agent'}
                </span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 max-w-md mx-auto">
          <input
            type="text"
            value={typedMessage}
            onChange={handleInputChange}
            placeholder="Chirp at the other group... use @ to tag"
            className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-[#34d399]/40 focus:ring-1 focus:ring-[#34d399]/40 transition-colors"
          />
          <button
            type="submit"
            disabled={!typedMessage.trim()}
            className="bg-[#34d399] text-black w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg hover:bg-[#2bc489] transition-colors disabled:opacity-40 disabled:hover:bg-[#34d399] active:scale-95 duration-150 shrink-0"
          >
            <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l92-7-9-7M5 12h14"></path></svg>
          </button>
        </form>
      </div>

    </div>
  );
}