import React, { useState, useRef } from 'react';
import foresVLogo from '/fores-v-logo.png';
import topoMapBg from '/topo-bg.jpg'; 

export default function BanquetCard({ 
  playerName = "Trevor Roeger", 
  signatureText = "Tres Putt Putz", 
  photoUrl, 
  holeNumber = 4,
  courseName = "The Legend",
  parallel = "1/1", // Options: '1/1', '/5', '/10', 'Base'
  serialNumber = "#01" 
}) {
  const cardRef = useRef(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [transform, setTransform] = useState('perspective(1200px) rotateX(0deg) rotateY(0deg)');
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  const currentDate = new Date('2026-06-09').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });

  // --- BULLETPROOF PARALLEL THEME ENGINE ---
  const themesCatalog = {
    '1/1': {
      name: "Obsidian Masterpiece",
      bgClass: "bg-slate-950 border-slate-700",
      topoFilter: "invert(1) sepia(1) saturate(500%) hue-rotate(80deg) brightness(1.2) contrast(1.5)", 
      frameClass: "from-slate-700 via-slate-800 to-black border-slate-600",
      stampClass: "from-yellow-200 via-yellow-500 to-yellow-700",
      stampTextClass: "text-yellow-100",
      stampText: "1 OF 1",
      showAuto: true,
      showInscription: true
    },
    '/5': {
      name: "Sapphire Signature",
      bgClass: "bg-blue-950 border-blue-700",
      topoFilter: "invert(1) sepia(1) saturate(500%) hue-rotate(190deg) brightness(1.5) contrast(1.2)", 
      frameClass: "from-blue-700 via-blue-800 to-slate-900 border-blue-500",
      stampClass: "from-slate-300 via-slate-100 to-slate-400",
      stampTextClass: "text-slate-800",
      stampText: `${serialNumber} OF 5`,
      showAuto: true,
      showInscription: false
    },
    '/10': {
      name: "Silver Base Relic",
      bgClass: "bg-slate-800 border-slate-500",
      topoFilter: "invert(0.9) grayscale(1) brightness(1.5) contrast(1.2)", 
      frameClass: "from-slate-400 via-slate-500 to-slate-700 border-slate-400",
      stampClass: "from-amber-600 via-amber-700 to-amber-900",
      stampTextClass: "text-amber-100",
      stampText: `${serialNumber} OF 10`,
      showAuto: false,
      showInscription: false
    },
    'Base': {
      name: "Clubhouse Core",
      bgClass: "bg-slate-950 border-slate-800",
      topoFilter: "brightness(0.5) contrast(1)",
      frameClass: "from-slate-800 via-slate-900 to-black border-slate-700",
      stampClass: "from-slate-500 to-slate-600",
      stampTextClass: "text-slate-400",
      stampText: "CORE",
      showAuto: false,
      showInscription: false
    }
  };

  // Safely grab the theme or fallback gracefully to standard safe parameters
  const activeTheme = themesCatalog[parallel] || themesCatalog['Base'] || themesCatalog['1/1'];

  // Safe evaluation parser for the structural serialization text indicator logic
  const maxSerialLimit = parallel && parallel.includes('/') ? parallel.split('/')[1] : '01';

  // --- 3D TILT & PHYSICAL LIGHTING ENGINE ---
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;
    
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTransform(`perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
    setGlarePosition({ x: glareX, y: glareY });
  };

  const handleMouseEnter = () => setIsHovering(true);
  
  const handleMouseLeave = () => {
    setIsHovering(false);
    setTransform('perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlarePosition({ x: 50, y: 50 });
  };

  const obsidianNoise = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;
  const fabricMesh = `radial-gradient(circle, rgba(0,0,0,0.8) 1px, transparent 1.5px)`;

  return (
    <div className="w-full flex flex-col items-center justify-center font-sans">

      {/* Dynamic Header */}
      <div className="text-center mb-6 space-y-2 animate-fade-in">
        <h2 className="text-emerald-400 font-black tracking-widest uppercase text-[10px] drop-shadow-md">
          {activeTheme.name}
        </h2>
        <p className="text-slate-400 text-[8px] uppercase font-bold tracking-widest">
          Fores Banquet Collection
        </p>
      </div>

      <div className="relative w-[320px] h-[460px] cursor-pointer group" style={{ perspective: '1200px' }}>
        <div 
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => setIsFlipped(!isFlipped)}
          className="w-full h-full relative transition-all duration-200 ease-out shadow-[0_20px_40px_rgba(0,0,0,0.8)] rounded-[8px]"
          style={{
            transform: `${transform} ${isFlipped ? 'rotateY(180deg)' : ''}`,
            transformStyle: 'preserve-3d',
            transition: isHovering && !isFlipped ? 'none' : 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)'
          }}
        >
          {/* =========================================
              FRONT OF CARD (Dynamic Chassis)
          ========================================= */}
          <div className={`absolute inset-0 w-full h-full rounded-[8px] overflow-hidden border-2 ${activeTheme.bgClass}`} 
               style={{ backfaceVisibility: 'hidden' }}>
            
            {/* 1. Base Texture */}
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-black/40 to-black/90"></div>
            <div className="absolute inset-0 z-[1] opacity-30 mix-blend-overlay pointer-events-none" style={{ backgroundImage: obsidianNoise }}></div>

            {/* 2. Topo Stamp */}
            <div className="absolute inset-0 z-[2] pointer-events-none mix-blend-color-dodge" 
                 style={{ 
                   backgroundImage: `url(${topoMapBg})`, 
                   backgroundSize: '150%', 
                   backgroundPosition: 'center',
                   filter: activeTheme.topoFilter,
                   opacity: 0.85,
                   WebkitMaskImage: `radial-gradient(circle 200px at ${glarePosition.x}% ${glarePosition.y}%, black 0%, transparent 100%)`,
                   maskImage: `radial-gradient(circle 200px at ${glarePosition.x}% ${glarePosition.y}%, black 0%, transparent 100%)`
                 }}>
            </div>

            {/* --- MAIN CARD ARCHITECTURE --- */}
            <div className="absolute inset-0 z-10 flex flex-col p-4">
              
              {/* TOP SECTION: Relic & Photo */}
              <div className="w-full flex gap-3 h-[50%] pt-2">
                
                {/* LEFT: Deep Die-Cut Relic Window */}
                <div className="w-[40%] h-full relative">
                  <div className="w-full h-full relative rounded-sm overflow-hidden drop-shadow-lg border border-slate-800">
                    <div className="absolute inset-0 bg-transparent z-10 shadow-[inset_0_8px_15px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(255,255,255,0.1)] pointer-events-none rounded-sm"></div>
                    <div className="absolute inset-0 z-0 bg-[#0f172a] flex items-center justify-center">
                       <div className="absolute inset-0 z-10 opacity-60 mix-blend-multiply" style={{ backgroundImage: fabricMesh, backgroundSize: '3px 3px' }}></div>
                       <img src={foresVLogo} alt="Fores V Patch" className="w-[140%] h-[140%] object-contain drop-shadow-md saturate-110" />
                    </div>
                  </div>
                </div>

                {/* RIGHT: Framed Player Portrait */}
                <div className="w-[60%] h-full relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${activeTheme.frameClass} p-[2px] rounded-sm shadow-xl`}>
                    <div className="w-full h-full bg-black relative overflow-hidden rounded-sm shadow-inner">
                      {photoUrl ? (
                        <img src={photoUrl} alt="Player" className="w-full h-full object-cover contrast-110 saturate-110" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 border border-dashed border-slate-700">
                          <span className="text-slate-600 font-black uppercase text-[8px] tracking-widest">Portrait</span>
                        </div>
                      )}
                      <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.9)] pointer-events-none"></div>
                    </div>
                  </div>
                  
                  <div className={`absolute -bottom-3 -left-4 border px-3 py-1 shadow-xl z-20 ${activeTheme.bgClass}`}>
                    <h1 className="text-white font-black text-lg uppercase tracking-widest" style={{ textShadow: '1px 1px 0 #000' }}>
                      {playerName}
                    </h1>
                  </div>
                </div>
              </div>

              {/* MIDDLE: Serial Number Stamp */}
              <div className="w-full flex justify-end mt-4 z-20 relative">
                 <div className={`bg-gradient-to-br ${activeTheme.stampClass} text-transparent bg-clip-text font-black text-sm tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] border-b border-white/20 pb-0.5`}>
                   <span className={activeTheme.stampTextClass}>{activeTheme.stampText}</span>
                 </div>
              </div>

              {/* BOTTOM SECTION: Dynamic based on Rarity */}
              {activeTheme.showAuto ? (
                <div className="w-full flex-1 mt-2 bg-[#f8f6f0] rounded-sm shadow-[inset_0_6px_12px_rgba(0,0,0,0.5),inset_0_1px_3px_rgba(0,0,0,0.3)] border border-slate-800 relative flex flex-col items-center justify-center p-3">
                  
                  <div className={`relative w-full flex items-center justify-center z-10 ${activeTheme.showInscription ? 'mb-2 mt-1' : ''}`}>
                    <span className="text-[#000080] text-[46px] leading-none transform -rotate-3" 
                          style={{ fontFamily: "'Brush Script MT', cursive", textShadow: '1px 1px 0 rgba(0,0,128,0.1)' }}>
                      {signatureText}
                    </span>
                  </div>

                  {activeTheme.showInscription && (
                    <div className="flex flex-col items-center justify-center transform -rotate-2 w-full mt-1">
                      <span className="text-[#000080] text-[10px] font-bold tracking-widest uppercase opacity-90" 
                            style={{ fontFamily: "'Brush Script MT', cursive" }}>
                        Inaugural Birdie • Hole {holeNumber} • {courseName}
                      </span>
                      <span className="text-[#000080] text-[9px] font-bold tracking-widest mt-1 opacity-80" 
                            style={{ fontFamily: "'Brush Script MT', cursive" }}>
                        {currentDate}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full flex-1 mt-2 bg-gradient-to-b from-slate-700 to-slate-900 rounded-sm shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] border border-slate-500 relative flex flex-col items-center justify-center p-3">
                  <div className="text-amber-500 font-black text-[8px] uppercase tracking-[0.3em] mb-2 drop-shadow-md">
                    Official Event Artifact
                  </div>
                  <div className="text-slate-100 font-black text-xl uppercase tracking-widest" style={{ textShadow: '2px 2px 0px #000' }}>
                    {courseName}
                  </div>
                  <div className="text-slate-400 font-bold text-[9px] uppercase tracking-[0.2em] mt-1 border-t border-slate-600 pt-2 w-2/3 text-center">
                    Hole {holeNumber} • {currentDate}
                  </div>
                </div>
              )}

            </div>

            {/* --- GLOBAL LIGHTING GLARE --- */}
            <div className="absolute inset-0 z-[30] pointer-events-none transition-opacity duration-200 mix-blend-overlay" 
                 style={{ opacity: isHovering ? 0.6 : 0.1 }}>
                 <div className="absolute inset-0"
                      style={{ background: `linear-gradient(105deg, transparent ${glarePosition.x - 15}%, rgba(255,255,255,0.7) ${glarePosition.x}%, transparent ${glarePosition.x + 15}%)` }}>
                 </div>
            </div>

          </div>

          {/* =========================================
              BACK OF CARD
          ========================================= */}
          <div 
            className={`absolute inset-0 w-full h-full rounded-[8px] shadow-2xl border-2 overflow-hidden ${activeTheme.bgClass} text-slate-300`} 
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-black/50 to-black/90"></div>
            <div className="absolute inset-0 z-[1] opacity-30 mix-blend-overlay" style={{ backgroundImage: obsidianNoise }}></div>
            
            <div className="absolute inset-0 z-[2] opacity-10 pointer-events-none mix-blend-color-dodge" 
                 style={{ 
                   backgroundImage: `url(${topoMapBg})`, 
                   backgroundSize: 'cover', 
                   backgroundPosition: 'center',
                   filter: activeTheme.topoFilter
                 }}>
            </div>
            
            <div className="relative h-full flex flex-col p-6 z-10">
              
              <div className="flex justify-between items-center border-b border-slate-700/50 pb-4">
                 <img src={foresVLogo} alt="Fores V" className="w-12 h-12 rounded-full border border-slate-600 opacity-90 shadow-lg" />
                 <div className="text-right">
                   <div className="text-slate-400 font-black text-[7px] uppercase tracking-widest mb-0.5">Authentication No.</div>
                   <div className="text-slate-100 font-black text-xs tracking-widest drop-shadow-md">FV-01 / {maxSerialLimit}</div>
                 </div>
              </div>
              
              <div className="space-y-4 pt-4 flex-1">
                <div className="grid grid-cols-2 gap-4 border-b border-slate-700/50 pb-4">
                  <div className="text-center space-y-1">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">HCP Index</div>
                    <div className="text-2xl font-black text-white tracking-tighter">VRFD</div>
                  </div>
                  <div className="text-center space-y-1 border-l border-slate-700/50">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">W/L Record</div>
                    <div className="text-2xl font-black text-white tracking-tighter">0-0-0</div>
                  </div>
                </div>
                
                <div className="bg-black/40 p-4 rounded-sm border border-slate-700/50 shadow-inner relative">
                  <p className="text-[10px] text-slate-300 font-bold leading-relaxed text-justify relative z-10">
                    Congratulations. You have obtained a special moment card from the Fores V tournament. Executed on Hole {holeNumber} at {courseName}. This heavily die-cut artifact is a guaranteed limited masterpiece, featuring {activeTheme.showAuto ? 'an authentic, on-card signature and ' : ''}match-worn embedded materials.
                  </p>
                </div>
              </div>

              <div className="mt-auto text-center border-t border-slate-700/50 pt-3">
                 <div className="text-[6px] font-black text-slate-500 uppercase tracking-[0.2em]">
                   Fores Banquet Collection
                 </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}