import React, { useState, useRef } from 'react';
import foresVLogo from './assets/foresv-logo.png';
import topoMapBg from './assets/topo-bg.jpg'; 
import demoVideo from './assets/demo.mp4'; // Imported directly from your folder

export default function DoubleWhammyCard({ 
  playerName = 'Richard "Demolition" Hendricks',
  course = 'The Legend',
  date = '06/25/2026',
  videoUrl = demoVideo, // Defaults to your demo.mp4 video file
  parallel = '1/1', // Options: '1/1', '/5', '/10'
  serialNumber = 1
}) {
  const cardRef = useRef(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [transform, setTransform] = useState('perspective(1500px) rotateX(0deg) rotateY(0deg)');
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  const cleanName = playerName.replace(/"[^"]*"\s*/g, '');
  const nickName = playerName.match(/"([^"]+)"/)?.[1] || null;

  // --- PARALLEL THEME ENGINE ---
  const theme = {
    '1/1': {
      name: "Obsidian Masterpiece",
      bgClass: "bg-neutral-950 border-neutral-800",
      topoFilter: "invert(1) sepia(1) saturate(600%) hue-rotate(0deg) brightness(1.1) contrast(1.6)", // Deep Laser Crimson
      towerGlow: "shadow-[0_0_30px_rgba(220,38,38,0.3)]",
      stampClass: "from-yellow-200 via-yellow-500 to-yellow-700",
      stampTextClass: "text-yellow-100",
      stampText: "1 OF 1",
    },
    '/5': {
      name: "Molten Sapphire",
      bgClass: "bg-blue-950 border-blue-900",
      topoFilter: "invert(1) sepia(1) saturate(500%) hue-rotate(190deg) brightness(1.4) contrast(1.3)", // Cyan Flash
      towerGlow: "shadow-[0_0_30px_rgba(6,182,212,0.3)]",
      stampClass: "from-slate-300 via-slate-100 to-slate-400",
      stampTextClass: "text-slate-800",
      stampText: `${serialNumber} OF 5`,
    },
    '/10': {
      name: "Industrial Iron Base",
      bgClass: "bg-zinc-900 border-zinc-700",
      topoFilter: "invert(0.9) grayscale(1) brightness(1.3) contrast(1.3)", // Chrome Tint
      towerGlow: "shadow-[0_0_20px_rgba(255,255,255,0.1)]",
      stampClass: "from-amber-600 via-amber-700 to-amber-900",
      stampTextClass: "text-amber-100",
      stampText: `${serialNumber} OF 10`,
    }
  }[parallel] || theme['1/1'];

  // --- 3D TILT ENGINE (LANDSCAPE MODIFIED) ---
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;
    
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTransform(`perspective(1500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1.015)`);
    setGlarePosition({ x: glareX, y: glareY });
  };

  const handleMouseEnter = () => setIsHovering(true);
  
  const handleMouseLeave = () => {
    setIsHovering(false);
    setTransform('perspective(1500px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlarePosition({ x: 50, y: 50 });
  };

  const obsidianNoise = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;
  const glassCracks = `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' stroke='rgba(255,255,255,0.08)' stroke-width='0.4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 20 L40 45 M90 15 L60 45 M95 85 L65 55 M5 80 L35 55' fill='none'/%3E%3C/svg%3E")`;

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-screen bg-neutral-950 p-6 font-sans">
      
      {/* Structural Setup Display Labels */}
      <div className="text-center mb-5 space-y-1">
        <h2 className="text-red-500 font-black tracking-[0.2em] uppercase text-xs drop-shadow-md">
          {theme.name} // LANDSCAPE VIEWPORT
        </h2>
        <p className="text-zinc-600 text-[9px] uppercase font-bold tracking-[0.3em]">
          Premium Symmetrical Architecture
        </p>
      </div>

      {/* LANDSCAPE CARD FRAME (Widescreen Layout Ratio) */}
      <div className="relative w-[500px] h-[340px] cursor-pointer group" style={{ perspective: '1500px' }}>
        <div 
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => setIsFlipped(!isFlipped)}
          className="w-full h-full relative transition-all duration-300 ease-out shadow-[0_30px_60px_rgba(0,0,0,0.95)] rounded-2xl"
          style={{
            transform: `${transform} ${isFlipped ? 'rotateY(180deg)' : ''}`,
            transformStyle: 'preserve-3d',
            transition: isHovering && !isFlipped ? 'none' : 'transform 0.7s cubic-bezier(0.25, 1, 0.3, 1)'
          }}
        >
          {/* =========================================
              FRONT OF CARD: CINEMATIC TWIN TOWERS
             ========================================= */}
          <div className={`absolute inset-0 w-full h-full rounded-2xl overflow-hidden border-[6px] ${theme.bgClass}`} 
               style={{ backfaceVisibility: 'hidden' }}>
            
            {/* Absolute Textures */}
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-neutral-950 via-zinc-950 to-neutral-950"></div>
            <div className="absolute inset-0 z-[1] opacity-25 mix-blend-overlay pointer-events-none" style={{ backgroundImage: obsidianNoise }}></div>

            {/* Topo Sheet Underlying Map Glow */}
            <div className="absolute inset-0 z-[2] pointer-events-none mix-blend-color-dodge opacity-45" 
                 style={{ 
                   backgroundImage: `url(${topoMapBg})`, 
                   backgroundSize: '130%', 
                   backgroundPosition: 'center',
                   filter: theme.topoFilter,
                   WebkitMaskImage: `radial-gradient(circle 260px at ${glarePosition.x}% ${glarePosition.y}%, black 0%, transparent 100%)`,
                   maskImage: `radial-gradient(circle 260px at ${glarePosition.x}% ${glarePosition.y}%, black 0%, transparent 100%)`
                 }}>
            </div>

            {/* Top Minimalist Arching Header */}
            <div className="absolute top-3 inset-x-0 z-40 text-center flex flex-col items-center">
              <h1 className="text-[#dfb76c] font-serif font-bold text-[10px] tracking-[0.4em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                Fores Banquet Moments
              </h1>
              <div className="mt-1 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-[#dfb76c]/40 to-transparent"></div>
            </div>

            {/* MAIN GRID WINDOW: Tower Flankers & Video Screen Central Void */}
            <div className="absolute inset-x-0 top-10 bottom-12 z-20 grid grid-cols-[76px_1fr_76px] gap-3 px-4 items-end h-[74%]">
              
              {/* LEFT TOWER: Structural Monolith (Hole 9) */}
              <div className={`relative flex flex-col items-center justify-end h-full w-full ${theme.towerGlow} transition-shadow duration-300`}>
                {/* Flared Monolith Cap */}
                <div className="w-full h-7 bg-gradient-to-b from-zinc-700 via-zinc-600 to-zinc-800 border-x-2 border-t-2 border-zinc-400 rounded-t-md flex items-center justify-center z-30 shadow-[0_4px_8px_rgba(0,0,0,0.5)]" style={{ backgroundImage: obsidianNoise }}>
                  <span className="text-zinc-950 font-black text-[9px] tracking-widest drop-shadow-sm">HOLE 9</span>
                </div>
                {/* Solid Tapered Structural Column */}
                <div className="w-10 flex-1 bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 border-x-2 border-zinc-500 relative overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,0.9)]" style={{ backgroundImage: obsidianNoise }}>
                  {/* Heavy Structural Fractures */}
                  <div className="absolute top-6 left-1 w-[2px] h-12 bg-neutral-950 transform rotate-[25deg] opacity-90 shadow-md"></div>
                  <div className="absolute bottom-10 right-2 w-[2px] h-16 bg-neutral-950 transform -rotate-[15deg] opacity-90 shadow-md"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-zinc-900/90 font-black text-[9px] tracking-[0.5em] uppercase font-mono [writing-mode:vertical-lr] transform rotate-180 select-none drop-shadow-[1px_1px_0px_rgba(255,255,255,0.05)]">
                      DOUBLE BOGEY+
                    </span>
                  </div>
                </div>
                {/* Base Anchor Slab */}
                <div className="w-12 h-3 bg-zinc-950 border border-zinc-800 rounded-b-sm shadow-md"></div>
              </div>

              {/* CENTER SCREEN: The Absolute Video Void Viewport */}
              <div className="relative bg-neutral-950/95 border-2 border-zinc-800/80 rounded-xl flex items-center justify-center shadow-[inset_0_4px_20px_rgba(0,0,0,0.95),0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden h-full w-full group/video">
                {/* Subtle cracked tempered layer across glass edge bounds */}
                <div className="absolute inset-0 z-10 opacity-50 pointer-events-none mix-blend-screen" style={{ backgroundImage: glassCracks }}></div>
                
                {videoUrl ? (
                  <video src={videoUrl} className="w-full h-full object-cover z-0" autoPlay loop muted playsInline />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-neutral-900 to-black flex flex-col items-center justify-center space-y-1 p-4 text-center z-0">
                    <div className="w-8 h-8 rounded-full border border-dashed border-zinc-700 flex items-center justify-center text-zinc-600 animate-spin mb-1">
                      <span className="text-xs">v</span>
                    </div>
                    <span className="text-zinc-500 font-mono font-black tracking-widest text-[9px] uppercase">Widescreen Video Engine</span>
                  </div>
                )}
                
                {/* Embedded Floating HUD Details Overlay */}
                <div className="absolute bottom-2 left-3 right-3 z-30 flex justify-between items-end opacity-40 group-hover/video:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-t from-black/100 via-black/90 to-transparent p-1.5 rounded-sm">
                  <div className="text-left">
                    <p className="text-zinc-400 font-serif italic text-xs font-bold">{cleanName}</p>
                    <p className="text-zinc-600 font-mono text-[7px] tracking-wider uppercase mt-0.5">{course} • {date}</p>
                  </div>

                </div>
              </div>

              {/* RIGHT TOWER: Combusted Erupting Monolith (Hole 11) */}
              <div className={`relative flex flex-col items-center justify-end h-full w-full ${theme.towerGlow} transition-shadow duration-300`}>
                
                {/* VOLUMETRIC ANIMATED SMOKE PUFF ENGINES */}
                <div className="absolute -top-14 -left-12 w-32 h-48 pointer-events-none z-50 overflow-visible">
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-5 h-5 bg-gradient-to-r from-neutral-900 to-zinc-950 rounded-full blur-sm opacity-0 animate-[ping_2.4s_infinite_ease-out]"></div>
                  <div className="absolute bottom-20 left-1/3 w-8 h-8 bg-black/80 rounded-full blur-md opacity-0 animate-[ping_2.8s_infinite_ease-out_0.6s]"></div>
                  <div className="absolute bottom-24 left-1/4 w-10 h-10 bg-zinc-950/70 rounded-full blur-lg opacity-0 animate-[ping_3.2s_infinite_ease-out_1.2s]"></div>
                </div>

                {/* Flared Monolith Cap */}
                <div className="w-full h-7 bg-gradient-to-b from-zinc-700 via-zinc-600 to-zinc-800 border-x-2 border-t-2 border-zinc-500 rounded-t-md flex items-center justify-center z-30 shadow-[0_4px_8px_rgba(0,0,0,0.5)]" style={{ backgroundImage: obsidianNoise }}>
                  <span className="text-zinc-400 font-black text-[9px] tracking-widest drop-shadow-sm">HOLE 11</span>
                </div>
                {/* Combusted Void Column Channel */}
                <div className="w-10 flex-1 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-x-2 border-zinc-800 relative overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.95)]" style={{ backgroundImage: obsidianNoise }}>
                  
                  {/* Internal Thermal Glow Core */}
                  <div className="absolute inset-x-0 top-1/4 bottom-0 bg-gradient-to-b from-red-600/90 via-red-950 to-neutral-950 shadow-[inset_0_4px_12px_rgba(220,38,38,0.6)] flex items-center justify-center animate-[pulse_1s_infinite_alternate]">
                    <span className="text-[#ff9980] font-black text-[9px] tracking-[0.5em] uppercase font-mono [writing-mode:vertical-lr] drop-shadow-[0_0_8px_#ff3700] select-none">
                     DOUBLE BOGEY+
                    </span>
                  </div>
                </div>
                {/* Base Anchor Slab */}
                <div className="w-12 h-3 bg-zinc-900 border border-zinc-800 rounded-b-sm shadow shadow-zinc-950"></div>
              </div>

            </div>

            {/* Lower Static Trophy Details Footer */}
            <div className="absolute bottom-2 left-4 right-4 z-40 flex items-center justify-between border-t border-zinc-800/60 pt-2 h-8">
              <div className="flex space-x-4 items-center">
                <div className="flex flex-col">
                  <span className="text-zinc-600 text-[6px] font-black tracking-widest uppercase">Classification</span>
                  <span className="text-zinc-400 font-serif text-[9px] font-bold tracking-wider uppercase">FORES PREMIUM FUCK UP</span>
                </div>
                {nickName && (
                  <span className="text-[#dfb76c] font-serif italic text-[10px] bg-black/40 px-2 py-0.5 rounded border border-[#dfb76c]/10">
                    "{nickName}"
                  </span>
                )}
              </div>
              
              {/* Variable Parallel Run Stamp */}
              <div className={`bg-gradient-to-br ${theme.stampClass} border border-white/10 px-3 py-0.5 rounded shadow-inner`}>
                <span className={`font-mono font-black text-[10px] tracking-tighter ${theme.stampTextClass}`}>{theme.stampText}</span>
              </div>
            </div>

            {/* --- SURFACE LIGHTING MATRIX GLARE --- */}
            <div className="absolute inset-0 z-[60] pointer-events-none transition-opacity duration-300 mix-blend-overlay" 
                 style={{ opacity: isHovering ? 0.7 : 0.15 }}>
              <div className="absolute inset-0"
                   style={{ background: `linear-gradient(115deg, transparent ${glarePosition.x - 20}%, rgba(255,255,255,0.8) ${glarePosition.x}%, transparent ${glarePosition.x + 20}%)` }}>
              </div>
            </div>

          </div>

          {/* =========================================
              BACK OF CARD: REGISTRATION CERTIFICATE
             ========================================= */}
          <div 
            className={`absolute inset-0 w-full h-full rounded-2xl shadow-2xl border-4 overflow-hidden ${theme.bgClass} text-zinc-300`} 
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-black/60 to-black/95"></div>
            <div className="absolute inset-0 z-[1] opacity-20 mix-blend-overlay" style={{ backgroundImage: obsidianNoise }}></div>
            
            <div className="absolute inset-0 z-[2] opacity-10 pointer-events-none mix-blend-color-dodge" 
                 style={{ 
                   backgroundImage: `url(${topoMapBg})`, 
                   backgroundSize: 'cover', 
                   backgroundPosition: 'center',
                   filter: theme.topoFilter
                 }}>
            </div>
            
            <div className="relative h-full flex flex-col p-5 z-10 justify-between">
              
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-zinc-900 flex items-center justify-center p-0.5">
                  <div className="w-full h-full bg-neutral-950 rounded-full flex items-center justify-center border border-red-500/20">
                    <span className="text-red-500 font-mono font-black text-[8px]">FV</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-zinc-500 font-black text-[6px] uppercase tracking-widest mb-0.5">Verification Ledger</div>
                  <div className="text-zinc-200 font-mono text-[10px] font-black tracking-wider">DW-MOMENT // {parallel}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-[120px_1fr] gap-4 items-center flex-1 py-2">
                <div className="bg-black/40 p-2.5 border border-zinc-800/80 rounded shadow-inner text-center space-y-2">
                  <div>
                    <div className="text-[6px] font-black text-zinc-500 uppercase tracking-widest">HCP Ledger</div>
                    <div className="text-xs font-black text-white font-mono">VALIDATED</div>
                  </div>
                  <div className="border-t border-zinc-800 pt-1.5">
                    <div className="text-[6px] font-black text-zinc-500 uppercase tracking-widest">Index Result</div>
                    <div className="text-xs font-black text-red-500 font-mono">CRITICAL</div>
                  </div>
                </div>
                
                <div className="bg-black/50 p-3 rounded border border-zinc-800 h-full flex items-center">
                  <p className="text-[9px] text-zinc-400 font-medium leading-relaxed text-justify font-sans">
                    Technical Token Issued. This object commemorates a clean structural collapse across holes 9 and 11. By executing successive deep over-par milestones, the tracking recipient is indexed natively into the collection.
                  </p>
                </div>
              </div>

              <div className="text-center border-t border-zinc-800/80 pt-2">
                <div className="text-[6px] font-black text-zinc-500 uppercase tracking-[0.25em]">
                  Fores Banquet Collection • All Records Securely Minted
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}