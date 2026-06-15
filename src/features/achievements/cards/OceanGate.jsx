import React, { useState, useRef } from 'react';
import foresVLogo from '/fores-v-logo.png';
import topoMapBg from '/topo-bg.jpg'; 

export default function OceanGateCard({ 
  playerName = "Clubhouse Golfer",
  playerTeam = "Unassigned",
  signatureText = "Autograph", 
  photoUrl, 
  holeNumber = 1,
  courseName = "Fores V Master Course",
  parallel = "1/1", 
  serialNumber = "#01"  
}) {
  const cardRef = useRef(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [transform, setTransform] = useState('perspective(1200px) rotateX(0deg) rotateY(0deg)');
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  const currentDate = new Date('2026-06-11').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  // --- BULLETPROOF PARALLEL THEME ENGINE ---
  const themesCatalog = {
    '1/1': {
      name: "Obsidian Masterpiece",
      bgClass: "bg-slate-950 border-slate-700",
      topoFilter: "invert(1) sepia(1) saturate(1000%) hue-rotate(110deg) brightness(2) contrast(2)",
      topoOpacity: 0.45, 
      showAuto: true
    },
    '/5': {
      name: "Sapphire Signature",
      bgClass: "bg-blue-950 border-blue-700",
      topoFilter: "invert(1) sepia(1) saturate(500%) hue-rotate(190deg) brightness(1.5) contrast(1.2)", 
      topoOpacity: 0.2, 
      showAuto: true
    },
    '/10': {
      name: "Silver Base Relic",
      bgClass: "bg-slate-800 border-slate-500",
      topoFilter: "invert(0.9) grayscale(1) brightness(1.5) contrast(1.2)",
      topoOpacity: 0.2,
      showAuto: false
    },
    'Base': {
      name: "Clubhouse Core",
      bgClass: "bg-slate-950 border-slate-800",
      topoFilter: "brightness(0.5) contrast(1)",
      topoOpacity: 0.1,
      showAuto: false
    }
  };

  // Safely grab the theme or fallback gracefully to standard safe parameters
  const activeTheme = themesCatalog[parallel] || themesCatalog['Base'] || themesCatalog['1/1'];

  // Safe evaluation parser for the structural serialization text indicator logic
  const maxSerialLimit = parallel && parallel.includes('/') ? parallel.split('/')[1] : '01';

  // --- 3D TILT ENGINE ---
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    
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
    <div className="w-full flex flex-col items-center justify-center font-sans">
      
      <style>
        {`
          /* --- SIGNATURE WRITING ANIMATION --- */
          @keyframes write-sig {
            0% { clip-path: inset(0 100% 0 0); opacity: 0; }
            5% { opacity: 1; }
            100% { clip-path: inset(0 0 0 0); opacity: 1; }
          }
          .animate-signature {
            display: inline-block;
            white-space: nowrap;
            opacity: 0; 
            animation: write-sig 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
            animation-delay: 0.2s;
          }

          .card-wrapper {
            background-color: #F4F1E1; 
            padding: 20px;
            width: 700px;
            height: 520px;
            box-sizing: border-box;
            font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
            box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
            position: relative;
            border-radius: 8px;
          }
          .green-base {
            background-color: #124028; 
            width: 100%;
            height: 100%;
            position: relative;
            border: 3px solid #C5A059; 
            box-sizing: border-box;
            overflow: hidden; 
          }
          .green-base::before {
            content: '';
            position: absolute;
            top: 5px; left: 5px; right: 5px; bottom: 5px;
            border: 1px solid #C5A059;
            pointer-events: none;
            opacity: 0.7;
          }
          .left-decor {
            position: absolute;
            top: 75px; left: 20px; bottom: 90px; width: 40px;
            border: 2px solid #C5A059;
            border-right: none;
            border-radius: 10px 0 0 10px;
          }
          .header-text {
            text-align: center;
            color: #D4AF37;
            font-size: 28px;
            font-style: italic;
            margin-top: 15px;
            letter-spacing: 1.5px;
            border-bottom: 2px solid #C5A059;
            margin-left: 40px; margin-right: 40px;
            padding-bottom: 5px;
          }
          .photo-area {
            position: absolute;
            top: 75px; right: 40px;
            width: 480px; height: 220px;
            background-color: #E8E9F3;
            border: 3px solid #C5A059;
            border-radius: 4px;
            display: flex; justify-content: center; align-items: center;
            box-shadow: inset 0 6px 12px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.3);
            z-index: 2;
            overflow: hidden; 
          }
          .card-media {
            width: 100%; height: 100%; object-fit: cover; pointer-events: none;
          }
          .turf-box {
            position: absolute;
            top: 265px; left: 80px;
            width: 160px; height: 85px;
            background-color: #0A3A20;
            background-image: radial-gradient(#114232 20%, transparent 20%), radial-gradient(#114232 20%, transparent 20%);
            background-position: 0 0, 3px 3px; background-size: 6px 6px;
            border: 3px solid #C5A059; border-radius: 8px 8px 0 0;
            box-shadow: inset 0 8px 12px rgba(0,0,0,0.6), 0 4px 8px rgba(0,0,0,0.3);
            z-index: 3;
          }
          .gold-plate {
            position: absolute;
            top: 310px; left: 235px;
            width: 350px; height: 110px;
            background: linear-gradient(135deg, #E6D070 0%, #C5A059 40%, #9A7B3E 60%, #E6D070 100%);
            border: 2px solid #6b531e; border-radius: 4px;
            box-shadow: inset 0 1px 3px rgba(255,255,255,0.6), 0 6px 12px rgba(0,0,0,0.4);
            z-index: 2;
          }
          .silver-box {
            position: absolute;
            top: 360px; left: 40px;
            width: 200px; height: 60px;
            background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 50%, #b8b8b8 100%);
            border: 2px solid #a0a0a0; border-radius: 8px 4px 4px 12px;
            box-shadow: inset 0 1px 4px rgba(255,255,255,0.8), 0 6px 10px rgba(0,0,0,0.4);
            z-index: 4;
          }
          .circle-cutout {
            position: absolute;
            top: 365px; right: 50px;
            width: 50px; height: 50px;
            background-color: #0d301e;
            border: 3px solid #C5A059; border-radius: 50%;
            box-shadow: inset 0 6px 10px rgba(0,0,0,0.6);
            z-index: 3;
          }
          .footer-text {
            position: absolute; bottom: 12px; width: 100%;
            text-align: center; color: #D4AF37; font-size: 14px;
            letter-spacing: 2px; font-weight: bold;
          }
        `}
      </style>

      {/* Dynamic Header Layout */}
      <div className="text-center mb-6 space-y-2 animate-fade-in">
        <h2 className="text-emerald-400 font-black tracking-widest uppercase text-xs drop-shadow-md">
          {activeTheme.name}
        </h2>
        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">
          Fores Banquet Collection
        </p>
      </div>

      <div className="relative cursor-pointer group scale-[0.8] sm:scale-100" style={{ perspective: '1200px', width: '700px', height: '520px' }}>
        
        <div 
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => setIsFlipped(!isFlipped)}
          className="w-full h-full relative transition-all duration-200 ease-out shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] rounded-[8px]"
          style={{
            transform: `${transform} ${isFlipped ? 'rotateY(180deg)' : ''}`,
            transformStyle: 'preserve-3d',
            transition: isHovering && !isFlipped ? 'none' : 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)'
          }}
        >
          {/* =========================================
              FRONT OF CARD
          ========================================= */}
          <div className="absolute inset-0 w-full h-full" style={{ backfaceVisibility: 'hidden' }}>
            <div className="card-wrapper">
              <div className="green-base">
                
                <div className="header-text">OceanGate Submersible</div>
                <div className="left-decor"></div>

                <div className="photo-area">
                  {photoUrl ? (
                    <img src={photoUrl} className="card-media" alt="Player Moment" />
                  ) : (
                    <video className="card-media" src="/oceangate.mp4" autoPlay loop muted playsInline />
                  )}
                </div>

                <div className="turf-box flex flex-col items-center justify-center">
                  <span className="text-[#C5A059] text-[10px] uppercase font-black tracking-widest leading-none drop-shadow-md">Hole</span>
                  <span className="text-white text-4xl font-black leading-none mt-1 drop-shadow-md">{holeNumber}</span>
                </div>

                {/* Etched Info (Gold Plate) */}
                <div className="gold-plate flex flex-col items-center justify-center p-2 text-[#3e2e0e]" style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.4)' }}>
                  <span className="font-black text-[28px] uppercase tracking-[0.2em] my-1 opacity-90 leading-none">IMPLOSION</span>
                  <span className="font-bold text-[10px] uppercase tracking-widest text-center opacity-80 leading-none mt-2">
                    {currentDate} • {courseName}
                  </span>
                </div>

                {/* Player Name & Signature (Silver Box) */}
                <div className="silver-box flex flex-col items-center justify-center px-2">
                  <span className="text-slate-600 font-black text-[9px] uppercase tracking-widest text-center leading-none mb-1">
                    {playerName}
                  </span>
                  <span className="text-[#1a1a1a] text-2xl transform -rotate-2 leading-none animate-signature" style={{ fontFamily: "'Brush Script MT', cursive" }}>
                    {signatureText}
                  </span>
                </div>

                {/* Rarity Overlay (Circle) */}
                <div className="circle-cutout flex items-center justify-center">
                  <span className="text-[#C5A059] font-black text-xs tracking-tighter drop-shadow-sm leading-none">{parallel}</span>
                </div>

                <div className="footer-text">PREMIUM FORES FUCK UP</div>

                <div className="absolute inset-0 z-[50] pointer-events-none transition-opacity duration-200 mix-blend-overlay" 
                     style={{ opacity: isHovering ? 0.6 : 0.1 }}>
                  <div className="absolute inset-0"
                       style={{ background: `linear-gradient(105deg, transparent ${glarePosition.x - 15}%, rgba(255,255,255,0.7) ${glarePosition.x}%, transparent ${glarePosition.x + 15}%)` }}>
                  </div>
                </div>

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
            <div className="absolute inset-0 z-[1] opacity-30 mix-blend-overlay pointer-events-none" style={{ backgroundImage: obsidianNoise }}></div>
            
            <div className="absolute inset-0 z-[2] pointer-events-none mix-blend-color-dodge" 
                 style={{ 
                   opacity: activeTheme.topoOpacity,
                   backgroundImage: `url(${topoMapBg})`, 
                   backgroundSize: 'cover', 
                   backgroundPosition: 'center',
                   filter: activeTheme.topoFilter
                 }}>
            </div>
            
            <div className="relative h-full flex flex-col p-10 z-10">
              
              <div className="flex justify-between items-center border-b border-slate-700/50 pb-6">
                 <div className="flex items-center space-x-4">
                   <img src={foresVLogo} alt="Fores V" className="w-16 h-16 rounded-full border border-slate-600 opacity-90 shadow-lg bg-black object-cover" />
                   <div>
                     <div className="text-white font-black text-2xl uppercase tracking-widest">{playerName}</div>
                     <div className="text-[#C5A059] font-bold text-xs uppercase tracking-widest">{courseName} • Hole {holeNumber}</div>
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="text-slate-400 font-black text-[9px] uppercase tracking-widest mb-1">Authentication No.</div>
                   <div className="text-slate-100 font-black text-lg tracking-widest drop-shadow-md">
                     FV-01 / {maxSerialLimit}
                   </div>
                 </div>
              </div>
              
              <div className="flex flex-row gap-8 pt-8 flex-1">
                <div className="w-1/3 flex flex-col justify-center space-y-8 border-r border-slate-700/50 pr-8">
                  <div className="text-center space-y-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Minted</div>
                    <div className="text-2xl font-black text-white tracking-tighter">{currentDate}</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Serialization</div>
                    <div className="text-2xl font-black text-[#C5A059] tracking-tighter">{serialNumber} OF {maxSerialLimit}</div>
                  </div>
                </div>
                
                <div className="w-2/3 flex items-center justify-center">
                  <div className="bg-black/40 p-6 rounded-lg border border-slate-700/50 shadow-inner relative w-full">
                    <p className="text-sm text-slate-300 font-bold leading-relaxed text-justify relative z-10">
                       Congratulations. You have obtained a verified event artifact from the Fores V tournament. Executed on Hole {holeNumber} at {courseName}. This heavily die-cut artifact is a guaranteed fuck up masterpiece, that probably lost {playerName} the match and may have fucked up {playerTeam}'s chances overall.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-auto text-center border-t border-slate-700/50 pt-4">
                 <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
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