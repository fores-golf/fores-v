import React, { useState, useEffect, useRef } from 'react';
import { useChirpsData } from './hooks/useChirpsData';

export default function ChirpsView({ onBack }) {
  const { 
    chirps, 
    golfers, 
    loading, 
    sendChirp, 
    sendSystemBroadcast, 
    notificationPermission, 
    requestPlatformPermissions, 
    debugLog 
  } = useChirpsData();

  const [typedMessage, setTypedMessage] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const feedEndRef = useRef(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 120);
    return () => clearTimeout(timeoutId);
  }, [chirps]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setTypedMessage(val);

    const words = val.split(' ');
    const lastWord = words[words.length - 1];

    // Trigger lookup panel when current string fragment starts with '@'
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      const query = lastWord.substring(1).toLowerCase();
      
      // Filter choices out of the normalized players pool
      const filtered = golfers.filter(g => g.name?.toLowerCase().includes(query));
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectGolfer = (name) => {
    const words = typedMessage.split(' ');
    words.pop(); // Drop the prefix typed chunk (e.g. "@mic")
    const formattedName = name.replace(/\s+/g, ''); 
    words.push(`@${formattedName} `); // Append clean formatted player tag back into text string
    setTypedMessage(words.join(' '));
    setShowSuggestions(false);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;
    sendChirp(typedMessage);
    setTypedMessage('');
  };

  const triggerMockBotBroadcast = () => {
    sendSystemBroadcast('Mickey Salva just drained a 40-foot putt on Hole 9 for Eagle! Slanted Clams take the lead.');
  };

  const renderMessageContent = (text) => {
    if (!text) return '';
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

  return (
    <div className="h-[100dvh] w-screen bg-[#090d16] text-white font-sans flex flex-col fixed inset-0 z-40 overflow-hidden">
      
      {/* HEADER BAR */}
      <div className="px-5 py-4 flex justify-between items-center bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/5 shrink-0 z-10">
        <button onClick={onBack} className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 active:scale-95 transition-transform">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path>
          </svg>
          Hub
        </button>
        <h1 className="font-black text-lg tracking-tight uppercase italic flex items-center gap-1.5 mx-auto cursor-pointer" onClick={triggerMockBotBroadcast}>
          <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse"></span>
          Chirps Board
        </h1>
        <div className="w-9 h-5 pointer-events-none" />
      </div>

      {/* PUSH NOTIFICATION PERMISSION BANNER */}
      {notificationPermission === 'default' && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-2.5 flex justify-between items-center shrink-0 shadow-lg z-10 animate-fade-in">
          <p className="text-[11px] font-bold tracking-tight text-white/90">
            🔔 Never miss when you get chirped at! Enable mobile alerts.
          </p>
          <button 
            onClick={requestPlatformPermissions} 
            className="bg-white text-indigo-700 font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-lg shadow active:scale-95 transition-transform"
          >
            Enable
          </button>
        </div>
      )}

      {/* CHAT THREAD VIEWPORT */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scrolling-touch">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center">
            <span className="animate-spin h-8 w-8 border-4 border-[#34d399] border-t-transparent rounded-full" />
          </div>
        ) : chirps.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <span className="text-2xl">💬</span>
            <p className="text-xs font-semibold">No active chirps. Send a message to get started!</p>
          </div>
        ) : (
          chirps.map((chirp) => {
            const isClam = chirp.team === 'Slanted Clams';
            const isBrothel = chirp.team === 'Clam Brothelmen';
            return (
              <div key={chirp.id} className="flex gap-3 items-start max-w-[88%] animate-fade-in">
                <div className={`w-8 h-8 rounded-full shrink-0 border flex items-center justify-center text-[10px] font-black ${
                  isClam ? 'bg-blue-900 border-blue-400/40 text-blue-100' :
                  isBrothel ? 'bg-red-900 border-red-400/40 text-red-100' :
                  'bg-slate-800 border-white/10 text-slate-300'
                }`}>
                  {chirp.sender.substring(0,2).toUpperCase()}
                </div>

                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-baseline gap-2">
                    <span className="font-black tracking-tight text-xs text-slate-300">{chirp.sender}</span>
                    <span className="text-[8px] font-bold text-slate-600">{chirp.timestamp}</span>
                  </div>
                  <div className={`border p-3 text-sm rounded-2xl rounded-tl-none ${
                    isClam ? 'bg-blue-950/40 border-blue-500/20 text-blue-50' :
                    isBrothel ? 'bg-red-950/40 border-red-500/20 text-red-50' :
                    'bg-white/5 border-white/5 text-slate-100'
                  }`}>
                    {renderMessageContent(chirp.text)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={feedEndRef} />
      </div>

      {/* INPUT SYSTEM CONTROL BAR */}
      <div className="p-4 bg-[#0f172a]/95 backdrop-blur-xl border-t border-white/5 shrink-0 relative pb-safe">
        
        {/* Dynamic Autocomplete Modal Menu */}
        {showSuggestions && (
          <div className="absolute bottom-full left-4 right-4 bg-[#1e293b] rounded-2xl border border-white/10 shadow-2xl max-h-40 overflow-y-auto mb-2 divide-y divide-white/5 z-20">
            {suggestions.map((golfer) => (
              <button
                key={golfer.id}
                type="button"
                onClick={() => handleSelectGolfer(golfer.name)}
                className="w-full text-left p-3 flex justify-between items-center hover:bg-white/5 text-white active:bg-white/10"
              >
                <span className="font-black text-sm">@{golfer.name.replace(/\s+/g, '')}</span>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded border border-white/10 bg-slate-800">
                  {golfer.team}
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
            placeholder="Chirp at the other group... type @ to tag"
            className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 text-sm font-semibold text-white focus:outline-none focus:border-[#34d399]/40 transition-colors"
          />
          <button
            type="submit"
            disabled={!typedMessage.trim()}
            className="bg-[#34d399] text-black w-12 h-12 rounded-2xl flex items-center justify-center disabled:opacity-40 shrink-0"
          >
            <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
          </button>
        </form>
      </div>

      {/* MOBILE CONSOLE OUTPUT PANELS */}
      <div className="bg-slate-950 text-[10px] p-2 font-mono text-amber-400 border-t border-white/10 shrink-0 max-h-16 overflow-y-auto">
        <span className="text-slate-500 font-bold mr-1">[MOBILE STATUS]:</span> 
        {debugLog}
      </div>

    </div>
  );
}
