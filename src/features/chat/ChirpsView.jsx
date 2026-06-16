import React, { useState, useEffect, useRef } from 'react';
import { useChirpsData } from './hooks/useChirpsData';

export default function ChirpsView({ onBack }) {
  const { chirps, golfers, loading, sendChirp, sendSystemBroadcast } = useChirpsData();
  const [typedMessage, setTypedMessage] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const feedEndRef = useRef(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chirps]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setTypedMessage(val);

    const words = val.split(' ');
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@') && lastWord.length > 1) {
      const query = lastWord.substring(1).toLowerCase();
      const filtered = golfers.filter(g => g.name?.toLowerCase().includes(query));
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectGolfer = (name) => {
    const words = typedMessage.split(' ');
    words.pop();
    const formattedName = name.replace(/\s+/g, ''); 
    words.push(`@${formattedName} `); 
    setTypedMessage(words.join(' '));
    setShowSuggestions(false);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;
    sendChirp(typedMessage);
    setTypedMessage('');
  };

  // Helper macro button to test the streaming capabilities
  const triggerMockBotBroadcast = () => {
    sendSystemBroadcast('Mickey Salva just drained a 40-foot putt on Hole 9 for Eagle! Slanted Clams take the lead.');
  };

  // Parser to convert @ mentions into glowing elements
  const renderMessageContent = (text) => {
    if (text.startsWith('[BROADCAST]')) {
      return text.replace('[BROADCAST]', '').trim();
    }
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
      
      {/* Premium Glass Header */}
      <div className="px-5 py-4 flex justify-between items-center bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/5 z-10">
        <button onClick={onBack} className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 active:scale-95 transition-transform">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          Hub
        </button>
        <h1 className="font-black text-lg tracking-tight uppercase italic flex items-center gap-1.5 mx-auto" onClick={triggerMockBotBroadcast}>
          <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse"></span>
          Chirps Board
        </h1>
        {/* STAT SHARE BUTTON REMOVED FROM THIS LOCATION */}
        <div className="w-9 h-5 pointer-events-none" /> {/* Empty spatial stabilizer to keep title cleanly centered */}
      </div>

      {/* --- CHAT TIMELINE CONTAINER --- */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 style-scrolling-touch">
        {chirps.map((chirp) => {
          const isClam = chirp.team === 'Slanted Clams';
          const isBrothel = chirp.team === 'Clam Brothelmen';
          const containsStats = chirp.text.includes('[COMBINE_STAT]');

          // 1. Render layout for automated broadcast alerts
          if (chirp.isBot) {
            return (
              <div key={chirp.id} className="w-full py-1.5 px-4 bg-gradient-to-r from-amber-500/10 via-[#0f172a] to-transparent border-l-4 border-amber-500 rounded-r-xl my-2 animate-fade-in flex items-start gap-2.5">
                <span className="text-base mt-0.5">⛳️</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Live Engine Alert</span>
                  <p className="text-xs font-bold text-slate-300 leading-relaxed">{renderMessageContent(chirp.text)}</p>
                </div>
              </div>
            );
          }

          // 2. Standard player layout
          return (
            <div key={chirp.id} className={`flex gap-3 items-start animate-fade-in max-w-[88%] ${containsStats ? 'w-full max-w-sm' : ''}`}>
              <div className={`w-8 h-8 rounded-full shrink-0 border overflow-hidden flex items-center justify-center text-[10px] font-black ${
                isClam ? 'bg-blue-900 border-blue-400/40 text-blue-100 shadow-[0_0_10px_rgba(59,130,246,0.2)]' :
                isBrothel ? 'bg-red-900 border-red-400/40 text-red-100 shadow-[0_0_10px_rgba(239,68,68,0.2)]' :
                'bg-slate-800 border-white/10 text-slate-300'
              }`}>
                {chirp.avatar ? <img src={chirp.avatar} alt="Avatar" className="w-full h-full object-cover" /> : chirp.sender.substring(0,2).toUpperCase()}
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex items-baseline gap-2">
                  <span className="font-black tracking-tight text-xs text-slate-300">{chirp.sender}</span>
                  <span className="text-[8px] font-bold text-slate-600 tabular-nums">{chirp.timestamp}</span>
                </div>

                {/* --- CHIRP CARD GRADIENTS --- */}
                <div className={`border p-3.5 shadow-xl backdrop-blur-md text-sm leading-relaxed ${
                  isClam ? 'bg-gradient-to-br from-blue-950/50 to-[#0f172a] border-blue-500/20 text-blue-50 rounded-2xl rounded-tl-none shadow-blue-500/5' :
                  isBrothel ? 'bg-gradient-to-br from-red-950/50 to-[#0f172a] border-red-500/20 text-red-50 rounded-2xl rounded-tl-none shadow-red-500/5' :
                  'bg-white/5 border-white/5 rounded-2xl rounded-tl-none text-slate-100'
                }`}>
                  {renderMessageContent(chirp.text)}

                  {/* --- INTERACTIVE MULTIMEDIA EMBED --- */}
                  {containsStats && (
                    <div className="mt-3 bg-black/50 border border-white/10 rounded-xl p-3 flex flex-col gap-2.5 shadow-inner">
                      <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Combine Rating</span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 italic">Verified Card</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">Avg Drive</span>
                          <span className="text-sm font-black text-white tabular-nums">265 YDS</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">GIR Profile</span>
                          <span className="text-sm font-black text-white tabular-nums">54%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={feedEndRef} />
      </div>

      {/* --- BOTTOM INTERACTION CONTROL --- */}
      <div className="p-4 bg-[#0f172a]/95 backdrop-blur-xl border-t border-white/5 relative">
        {showSuggestions && (
          <div className="absolute bottom-full left-4 right-4 bg-[#1e293b] rounded-2xl border border-white/10 shadow-2xl max-h-40 overflow-y-auto mb-2 divide-y divide-white/5 z-20 backdrop-blur-xl">
            {suggestions.map((golfer) => (
              <button
                key={golfer.id}
                type="button"
                onClick={() => handleSelectGolfer(golfer.name)}
                className="w-full text-left p-3 flex justify-between items-center hover:bg-white/5 transition-colors active:bg-white/10"
              >
                <span className="font-black text-sm text-slate-200">@{golfer.name.replace(/\s+/g, '')}</span>
                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                  golfer.team === 'Slanted Clams' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  golfer.team === 'Clam Brothelmen' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }`}>
                  {golfer.team || 'Free Agent'}
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
            <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </form>
      </div>

    </div>
  );
}