import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../config/supabaseClient'; 
import { playerVideos } from './assetMap'; 

// Import your card layout template files
import BanquetCard from './cards/BanquetCard';
import IntroCard from './cards/IntroCard';
import WhammyCard from './cards/WhammyCard';
import OceanGate from './cards/OceanGate';

export default function CardMintingProtocol({ mintData, onComplete }) {
  const isOceanGate = mintData.cardType === 'oceangate';
  const isWhammy = mintData.cardType === 'whammy';
  const initiallyNeedsCapture = mintData.requiresCapture && !isOceanGate;

  const [step, setStep] = useState(initiallyNeedsCapture ? 'capture' : 'reveal');
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState(null);
  const [capturedPhotoFile, setCapturedPhotoFile] = useState(null);
  const [capturedSignature, setCapturedSignature] = useState('');
  const [isMinting, setIsMinting] = useState(false);
  
  // Ref to prevent duplicate auto-mint triggers in React StrictMode
  const hasAutoMinted = useRef(false);

  // --- AUTOMATIC BACKGROUND MINT ENGINE ---
  useEffect(() => {
    if (step === 'reveal' && !hasAutoMinted.current) {
      
      // If it's a card type that doesn't require a photo capture, automate it completely
      if (isOceanGate || isWhammy) {
        hasAutoMinted.current = true;
        
        // Handle Signature requirement internally for high-tier parallel variants
        if ((mintData.primaryTier === '1/1' || mintData.primaryTier === '/5') && !capturedSignature) {
          const sig = prompt("Authentic Player Autograph Required! Enter Signature text:");
          if (sig) {
            setCapturedSignature(sig);
            // Execute mint immediately with the signature string provided
            executeMintProtocol(sig);
          } else {
            // Fallback if they cancel the prompt
            executeMintProtocol("Autograph");
          }
        } else {
          // Normal parallel or base tier: execute background script instantly
          executeMintProtocol(capturedSignature);
        }
      }
    }
  }, [step, isOceanGate, isWhammy, mintData, capturedSignature]);

  const handlePhotoCapture = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCapturedPhotoFile(file);
      setCapturedPhotoUrl(URL.createObjectURL(file));
    }
  };

  // Wrapped the core logic inside an internal execution block so useEffect can trigger it cleanly
  const executeMintProtocol = async (signatureToUse) => {
    setIsMinting(true);
    
    try {
      let dynamicImageUrl = null;

      if (capturedPhotoFile && !isOceanGate) {
        const fileExt = capturedPhotoFile.name.split('.').pop();
        const fileName = `${mintData.earnedByUserId || 'anon'}-${Date.now()}.${fileExt}`;
        const filePath = `card-captures/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('vault-assets')
          .upload(filePath, capturedPhotoFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('vault-assets').getPublicUrl(filePath);
          if (urlData) dynamicImageUrl = urlData.publicUrl;
        }
      }

      let validatedPlayerId = mintData.earnedByUserId;
      if (!validatedPlayerId) {
        const { data: authData } = await supabase.auth.getSession();
        if (authData?.session?.user) {
          validatedPlayerId = authData.session.user.id;
        }
      }

      if (!validatedPlayerId) {
        const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
        if (profiles && profiles.length > 0) {
          validatedPlayerId = profiles[0].id;
        }
      }

      let cleanMintNumber = parseInt(mintData.primarySerial, 10);
      if (isNaN(cleanMintNumber)) {
        cleanMintNumber = 1;
      }

      const metadataPayload = {
        original_template_string_id: mintData.templateId,
        card_type: mintData.cardType,
        player_name: mintData.player, 
        player_team: mintData.team || "Independent", 
        parallel: mintData.primaryTier || "Base",            
        serial_number: mintData.primarySerial || "#TOUR",
        signature_data: signatureToUse || null,
        custom_image_url: dynamicImageUrl || mintData.defaultTemplateImageUrl || null,
        hole_triggered: mintData.hole,
        course_name: mintData.courseName || "Fores V Master Course"
      };

      const vaultInserts = (mintData.tiers || [{ tier: 'Base', serial: '1' }]).map(t => {
        let currentMintNum = parseInt(t.serial, 10);
        return {
          player_id: validatedPlayerId || "00000000-0000-0000-0000-000000000000", 
          template_id: null, 
          is_in_pack: false, 
          minted_at: new Date(),
          mint_number: isNaN(currentMintNum) ? 1 : currentMintNum, 
          metadata: {
            ...metadataPayload,
            parallel: t.tier,
            serial_number: t.serial
          }
        };
      });

      const { error: cardError } = await supabase
        .from('player_cards')
        .insert(vaultInserts);

      if (cardError) {
        console.warn("F5 Database Interceptor: Fallback local cache written.", cardError.message);
        const localArchive = JSON.parse(localStorage.getItem('f5_vault_offline_cards') || '[]');
        localArchive.push(...vaultInserts);
        localStorage.setItem('f5_vault_offline_cards', JSON.stringify(localArchive));
      }

      if (validatedPlayerId && mintData.achievementId) {
        let numericAchievementId = parseInt(mintData.achievementId, 10);
        if (!isNaN(numericAchievementId)) {
          await supabase
            .from('unlocked_achievements')
            .insert({
              player_id: validatedPlayerId,
              achievement_id: numericAchievementId,
              unlocked_at: new Date()
            }).catch(e => console.warn("Unlocked assignment skipped:", e.message));
        }
      }

    } catch (error) {
      console.error("F5 Severe Execution Intercept Failure:", error.message);
    } finally {
      setIsMinting(false);
    }
  };

  // Explicit pass-through handler for manually captured cards (like Banquet Cards)
  const handleMintToVault = () => {
    executeMintProtocol(capturedSignature);
  };

  return (
    <div className="fixed inset-0 min-h-screen bg-[#060911] flex flex-col justify-center font-sans z-[999] overflow-hidden">
      
      {/* --- STEP 1: CAPTURE OVERLAY (SKIPPED FOR OCEANGATE & WHAMMY) --- */}
      {step === 'capture' && (
        <div className="p-6 space-y-6 animate-fade-in w-full max-w-sm mx-auto overflow-y-auto max-h-screen pb-20 relative z-10">
          <div className="text-center space-y-2 border-b border-white/5 pb-4">
             <h2 className="text-amber-500 font-black uppercase tracking-widest text-sm">Artifact Creation</h2>
             <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Capture raw clubhouse emotion</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-[#34d399] tracking-widest">1. Snap Live Action Photo</label>
            <div className="relative">
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className={`border-2 border-dashed rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-300 ${capturedPhotoUrl ? 'border-[#34d399] bg-slate-900 h-48' : 'border-slate-800 bg-black/40 h-32'}`}>
                {capturedPhotoUrl ? <img src={capturedPhotoUrl} alt="Preview" className="w-full h-full object-cover" /> : <span className="text-slate-500 font-black text-xs uppercase tracking-widest">Tap to trigger Camera</span>}
              </div>
            </div>
          </div>

          {(mintData.primaryTier === '1/1' || mintData.primaryTier === '/5') && (
            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-black uppercase text-[#34d399] tracking-widest">2. Authentic Player Autograph</label>
              <input 
                type="text" placeholder="Hand phone to player to sign..." value={capturedSignature} onChange={(e) => setCapturedSignature(e.target.value)}
                className="w-full bg-slate-950 border border-white/5 text-white p-4 rounded-xl focus:outline-none focus:border-amber-500 text-center text-2xl font-semibold tracking-wide" 
                style={{ fontFamily: capturedSignature ? "'Brush Script MT', cursive, sans-serif" : "inherit" }}
              />
            </div>
          )}

          <div className="pt-4">
            <button 
              onClick={handleMintToVault} 
              disabled={isMinting || !capturedPhotoUrl || ((mintData.primaryTier === '1/1' || mintData.primaryTier === '/5') && !capturedSignature)}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-20 text-white font-black py-4 rounded-xl uppercase tracking-widest flex justify-center items-center shadow-lg"
            >
              {isMinting ? <span className="animate-pulse">Writing Vault variants...</span> : "Mint Artifacts"}
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 2: REVEAL OVERLAY (AUTOMATED HUD BACKDROP) --- */}
      {step === 'reveal' && (
        <div className="animate-fade-in w-full h-[100dvh] flex flex-col justify-center overflow-hidden bg-[#060911]">
          <div className="text-center pt-8 shrink-0 z-20 relative space-y-1">
             <h3 className="text-[#34d399] font-black uppercase tracking-widest text-xs animate-pulse">
               {isMinting ? "Securing Vault Allocation..." : "Primary Pull Displayed"}
             </h3>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px]">
               {isMinting ? "Syncing data arrays with Postgres grid..." : `All ${mintData.tiers?.length || 1} variants saved automatically`}
             </p>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full scale-95 origin-center">
             
             {/* 1. Banquet Birdie */}
             {mintData.cardType === 'banquet' && (
               <BanquetCard 
                 playerName={mintData.player} 
                 signatureText={capturedSignature} 
                 photoUrl={capturedPhotoUrl || mintData.defaultTemplateImageUrl} 
                 holeNumber={mintData.hole} 
                 courseName={mintData.courseName || "The Course"} 
                 parallel={mintData.primaryTier} 
                 serialNumber={mintData.primarySerial} 
               />
             )}
             
             {/* 2. Intro Card */}
             {mintData.cardType === 'intro' && (
               <IntroCard 
                 playerName={mintData.player} 
                 playerTeam={mintData.team}
                 photoUrl={mintData.videoKey ? playerVideos[mintData.videoKey] : null} 
                 parallel={mintData.primaryTier} 
                 serialNumber={mintData.primarySerial} 
               />
             )}
             
             {/* 3. Double Whammy */}
             {mintData.cardType === 'whammy' && (
               <WhammyCard 
                 playerName={mintData.player} 
                 date={new Date().toLocaleDateString()} 
               />
             )}
             
             {/* 4. OceanGate */}
             {mintData.cardType === 'oceangate' && (
               <OceanGate 
                 playerName={mintData.player} 
                 playerTeam={mintData.team}
                 signatureText={capturedSignature}
                 photoUrl={null} 
                 holeNumber={mintData.hole} 
                 courseName={mintData.courseName}
                 parallel={mintData.primaryTier}
                 serialNumber={mintData.primarySerial}
               />
             )}

          </div>

          <div className="shrink-0 p-6 pb-12 w-full max-w-sm mx-auto z-20 relative">
            <button 
              onClick={onComplete} 
              disabled={isMinting}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 font-black py-4 rounded-xl uppercase tracking-widest transition-all border border-white/5 active:scale-95 shadow-2xl"
            >
              {isMinting ? "Processing..." : "Return to Match"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}