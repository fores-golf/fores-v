import React, { useState, useRef } from 'react';
import foresVLogo from '/fores-v-logo.png';
import topoMapBg from '/topo-bg.jpg'; 

export default function PlayerIntroCard({ 
  playerName = "Trevor Roeger", 
  nickname = "Tres Putt Putz", 
  photoUrl, 
  handicap = "4.2",
  archetype = "Bomber", 
  homeCourse = "The Legend GC",
  hometown = "Denver, CO",
  parallel = "1/1", 
  serialNumber = 1,
  
  // Explicitly mapping table properties to fallback defaults cleanly
  drivingDist = 295,
  girPercentage = 64,
  avgPutts = 1.8,
  powerRating = 88,
  shortGameRating = 74,
  scoutingReport = "Profile assessment pending official league clearance."
}) {
  const cardRef = useRef(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [transform, setTransform] = useState('perspective(1200px) rotateX(0deg) rotateY(0deg)');
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  const isVideo = photoUrl && (photoUrl.endsWith('.mp4') || photoUrl.endsWith('.webm') || photoUrl.endsWith('.mov'));

  // --- BULLETPROOF PARALLEL THEME ENGINE ---
  const themesCatalog = {
    '1/1': {
      name: "Nebula Masterpiece",
      bgClass: "bg-slate-950 border-emerald-500/50",
      topoFilter: "invert(1) sepia(1) saturate(500%) hue-rotate(120deg) brightness(1.2) contrast(1.5)",
      frameClass: "from-emerald-600 via-slate-900 to-black border-emerald-500",
      stampClass: "from-yellow-200 via-yellow-500 to-yellow-700",
      stampTextClass: "text-yellow-100",
      stampText: "1 OF 1",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    },
    '/5': {
      name: "Crimson Onyx",
      bgClass: "bg-stone-950 border-red-700/50",
      topoFilter: "invert(1) sepia(1) saturate(600%) hue-rotate(340deg) brightness(1.3) contrast(1.3)",
      frameClass: "from-red-800 via-stone-900 to-black border-red-600",
      stampClass: "from-slate-300 via-slate-100 to-slate-400",
      stampTextClass: "text-slate-800",
      stampText: `${serialNumber} OF 5`,
      badgeColor: "bg-red-500/10 text-red-400 border-red-500/30"
    },
    '/10': {
      name: "Cobalt Velocity",
      bgClass: "bg-blue-950 border-blue-700/50",
      topoFilter: "invert(1) sepia(1) saturate(500%) hue-rotate(200deg) brightness(1.4) contrast(1.2)",
      frameClass: "from-blue-700 via-slate-900 to-blue-950 border-blue-500",
      stampClass: "from-amber-600 via-amber-700 to-amber-900",
      stampTextClass: "text-amber-100",
      stampText: `${serialNumber} OF 10`,
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30"
    },
    'Base': {
      name: "Clubhouse Core",
      bgClass: "bg-slate-950 border-slate-700/50",
      topoFilter: "opacity-20",
      frameClass: "from-slate-800 via-slate-900 to-black border-slate-700",
      stampClass: "from-slate-400 to-slate-600",
      stampTextClass: "text-slate-300",
      stampText: "ROSTER",
      badgeColor: "bg-slate-500/10 text-slate-400 border-slate-500/30"
    }
  };

  // Safely grab the theme or fall back to Base configuration layout parameters cleanly
  const activeTheme = themesCatalog[parallel] || themesCatalog['Base'] || themesCatalog['1/1'];

  // --- 3D TILT ENGINE ---
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

  return (
    <div className="w-full flex flex-col items-center justify-center font-sans select-none">

      <div className="text-center mb-6 space-y-1">
        <h2 className="text-slate-200 font-black tracking-widest uppercase text-xs drop-shadow-md">
          {activeTheme.name} <span className="text-yellow-500 font-medium ml-1">Edition</span>
        </h2>
        <p className="text-slate-500 text-[9px] uppercase font-bold tracking-[0.25em]">
          Fores V • Player Roster Showcase
        </p>
      </div>

      <div className="relative w-[320px] h-[460px] cursor-pointer" style={{ perspective: '1200px' }}>
        <div 
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => setIsFlipped(!isFlipped)}
          className="w-full h-full relative transition-all duration-200 ease-out shadow-[0_25px_50px_rgba(0,0,0,0.85)] rounded-[12px]"
          style={{
            transform: `${transform} ${isFlipped ? 'rotateY(180deg)' : ''}`,
            transformStyle: 'preserve-3d',
            transition: isHovering && !isFlipped ? 'none' : 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)'
          }}
        >
          {/* =========================================
              FRONT OF CARD
          ========================================= */}
          <div className={`absolute inset-0 w-full h-full rounded-[12px] overflow-hidden border-2 ${activeTheme.bgClass}`} 
               style={{ backfaceVisibility: 'hidden' }}>
            
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/20 via-black/70 to-black/95"></div>
            <div className="absolute inset-0 z-[1] opacity-[0.15] mix-blend-overlay pointer-events-none" style={{ backgroundImage: obsidianNoise }}></div>

            <div className="absolute inset-0 z-[2] pointer-events-none mix-blend-screen" 
                 style={{ 
                   backgroundImage: `url(${topoMapBg})`, 
                   backgroundSize: '160%', 
                   backgroundPosition: 'center',
                   filter: activeTheme.topoFilter,
                   opacity: 0.6,
                   WebkitMaskImage: `radial-gradient(circle 220px at ${glarePosition.x}% ${glarePosition.y}%, black 20%, transparent 100%)`,
                   maskImage: `radial-gradient(circle 220px at ${glarePosition.x}% ${glarePosition.y}%, black 20%, transparent 100%)`
                 }}>
            </div>

            <div className="absolute inset-0 z-10 flex flex-col justify-between p-4">
              
              <div className="flex justify-between items-start pt-1">
                <div className={`border px-2 py-0.5 rounded-sm text-[8px] uppercase tracking-widest font-black ${activeTheme.badgeColor}`}>
                  {archetype}
                </div>
                <div className={`bg-gradient-to-br ${activeTheme.stampClass} text-transparent bg-clip-text font-black text-xs tracking-wider drop-shadow-md`}>
                  <span>{activeTheme.stampText}</span>
                </div>
              </div>

              {/* DISPLAY FRAME */}
              <div className="w-full h-[58%] my-auto relative px-1">
                <div className={`w-full h-full bg-gradient-to-b ${activeTheme.frameClass} p-[1.5px] rounded-lg shadow-2xl`}>
                  <div className="w-full h-full bg-slate-900 relative overflow-hidden rounded-[6px] flex items-center justify-center">
                    
                    {photoUrl ? (
                      isVideo ? (
                        <video 
                          src={photoUrl} 
                          autoPlay 
                          loop 
                          muted 
                          playsInline
                          className="w-full h-full object-contain contrast-[1.05] saturate-110 relative z-10"
                        />
                      ) : (
                        <img src={photoUrl} alt={playerName} className="w-full h-full object-cover object-top contrast-[1.05] saturate-110" />
                      )
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-black">
                        <img src={foresVLogo} alt="Fores V" className="w-16 h-16 opacity-10 mb-2 animate-pulse" />
                        <span className="text-slate-600 font-black uppercase text-[9px] tracking-[0.3em]">Media Awaiting</span>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none z-20"></div>
                  </div>
                </div>

                <div className="absolute -bottom-2 right-4 bg-yellow-500 text-black px-2.5 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider transform rotate-1 shadow-lg border border-yellow-400 z-30">
                  "{nickname}"
                </div>
              </div>

              <div className="w-full space-y-2 pb-1 z-20">
                <div>
                  <p className="text-slate-400 font-bold text-[8px] uppercase tracking-[0.25em] mb-0.5">Tour Competitor</p>
                  <h1 className="text-white font-black text-2xl uppercase tracking-wider leading-none drop-shadow-md">
                    {playerName}
                  </h1>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-2 text-[10px]">
                  <div>
                    <span className="text-slate-500 uppercase font-bold text-[7px] block tracking-wider">Home Course</span>
                    <span className="text-slate-200 font-extrabold truncate block">{homeCourse}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 uppercase font-bold text-[7px] block tracking-wider">HCP Index</span>
                    <span className="text-slate-400 font-black text-xs tracking-tight">{handicap}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="absolute inset-0 z-[30] pointer-events-none transition-opacity duration-200 mix-blend-color-dodge" 
                 style={{ opacity: isHovering ? 0.45 : 0.1 }}>
                 <div className="absolute inset-0"
                      style={{ background: `linear-gradient(110deg, transparent ${glarePosition.x - 20}%, rgba(255,255,255,0.4) ${glarePosition.x}%, transparent ${glarePosition.x + 20}%)` }}>
                 </div>
            </div>

          </div>

          {/* =========================================
              BACK OF CARD
          ========================================= */}
          <div 
            className={`absolute inset-0 w-full h-full rounded-[12px] shadow-2xl border-2 overflow-hidden ${activeTheme.bgClass} text-slate-300`} 
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-black/60 to-black/95"></div>
            <div className="absolute inset-0 z-[1] opacity-25 mix-blend-overlay" style={{ backgroundImage: obsidianNoise }}></div>
            
            <div className="absolute inset-0 z-[2] opacity-10 pointer-events-none mix-blend-color-dodge" 
                 style={{ 
                   backgroundImage: `url(${topoMapBg})`, 
                   backgroundSize: 'cover', 
                   backgroundPosition: 'center',
                   filter: activeTheme.topoFilter
                 }}>
            </div>
            
            <div className="relative h-full flex flex-col p-5 z-10 justify-between">
              
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                 <div className="flex items-center gap-2">
                   <img src={foresVLogo} alt="Fores V" className="w-8 h-8 rounded-full border border-slate-700 bg-slate-900 p-0.5 shadow-md" />
                   <div>
                     <div className="text-white font-black text-xs uppercase tracking-wide">{playerName}</div>
                     <div className="text-slate-500 text-[7px] font-bold uppercase tracking-widest">{hometown}</div>
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="text-slate-500 font-black text-[6px] uppercase tracking-widest">Player Dossier</div>
                   <div className="text-slate-200 font-black text-[10px] tracking-widest">REG-ID #{playerName.replace(/\s+/g, '').substring(0,4).toUpperCase()}</div>
                 </div>
              </div>
              
              <div className="space-y-3 flex-1 pt-3">
                
                {/* Stats Grid */}
                <div className="bg-black/50 p-2.5 rounded-md border border-slate-800/80 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Driving DIST</div>
                    <div className="text-base font-black text-white tracking-tight">{drivingDist}<span className="text-[9px] text-slate-400 font-normal ml-0.5">Yds</span></div>
                  </div>
                  <div className="border-x border-slate-800">
                    <div className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">GIR Percentage</div>
                    <div className="text-base font-black text-emerald-400 tracking-tight">{girPercentage}%</div>
                  </div>
                  <div>
                    <div className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Avg Putts</div>
                    <div className="text-base font-black text-white tracking-tight">{avgPutts}</div>
                  </div>
                </div>
                
                {/* Description Assessment Box */}
                <div className="bg-gradient-to-b from-slate-950 to-black p-3.5 rounded-md border border-slate-800 shadow-inner space-y-2">
                  <div className="text-yellow-500 font-black text-[7px] uppercase tracking-[0.2em]">
                    Official Scouting Assessment
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed text-justify">
                    {scoutingReport}
                  </p>
                </div>

                {/* Progress Ratings */}
                <div className="space-y-1.5 pt-1">
                  <div>
                    <div className="flex justify-between text-[7px] font-black uppercase text-slate-400 tracking-wider">
                      <span>Power</span>
                      <span className="text-white">{powerRating}/100</span>
                    </div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${powerRating}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[7px] font-black uppercase text-slate-400 tracking-wider">
                      <span>Short Game</span>
                      <span className="text-white">{shortGameRating}/100</span>
                    </div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${shortGameRating}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-2.5 flex items-center justify-between text-[6px] font-bold text-slate-500 uppercase tracking-widest">
                 <span>© 2026 Fores Tournament Syndicate</span>
                 <span className="text-slate-400">Card 01/01</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}