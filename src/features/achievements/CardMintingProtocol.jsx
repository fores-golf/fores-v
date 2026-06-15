import React, { useState } from 'react';
import { supabase } from '../../config/supabaseClient'; 
import { playerVideos } from './assetMap'; 

// Import your bulletproofed card layout template files
import BanquetCard from './cards/BanquetCard';
import IntroCard from './cards/IntroCard';
import WhammyCard from './cards/WhammyCard';
import OceanGate from './cards/OceanGate';

export default function CardMintingProtocol({ mintData, onComplete }) {
  const [step, setStep] = useState(mintData.requiresCapture ? 'capture' : 'reveal');
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState(null);
  const [capturedPhotoFile, setCapturedPhotoFile] = useState(null);
  const [capturedSignature, setCapturedSignature] = useState('');
  const [isMinting, setIsMinting] = useState(false);

  const handlePhotoCapture = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCapturedPhotoFile(file);
      setCapturedPhotoUrl(URL.createObjectURL(file));
    }
  };

  const handleMintToVault = async () => {
    setIsMinting(true);
    
    try {
      let dynamicImageUrl = null;

      // Upload captured photo file to public storage if it was snapped
      if (capturedPhotoFile) {
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

      // 1. Generate multi-tier variant records using accurate scorecard values
      const vaultInserts = mintData.tiers.map(t => ({
        player_id: null, // Left NULL for subsequent randomized pack drops
        template_id: mintData.templateId,
        is_in_pack: true,
        minted_at: new Date(),
        captured_metadata: {
          card_type: mintData.cardType,
          player_name: mintData.player, // Raw live name string
          parallel: t.tier,            // '1/1', '/5', etc.
          serial_number: t.serial,
          signature_data: capturedSignature || null,
          custom_image_url: dynamicImageUrl || mintData.defaultTemplateImageUrl || null,
          hole_triggered: mintData.hole,
          course_name: mintData.courseName || "Fores V Master Course"
        }
      }));

      const { error: cardError } = await supabase
        .from('player_cards')
        .insert(vaultInserts);

      if (cardError) throw cardError;

      // 2. Insert profile-facing badge row token link
      if (mintData.earnedByUserId && mintData.achievementId) {
        await supabase
          .from('unlocked_achievements')
          .insert({
            player_id: mintData.earnedByUserId,
            achievement_id: mintData.achievementId,
            unlocked_at: new Date()
          });
      }

    } catch (error) {
      console.error("F5 Card Minting System Failure:", error.message);
      alert("Minting Error: " + error.message);
    } finally {
      setIsMinting(false);
      setStep('reveal');
    }
  };

  return (
    <div className="fixed inset-0 min-h-screen bg-[#060911] flex flex-col justify-center font-sans z-[999] overflow-hidden">
      
      {/* --- STEP 1: CAPTURE OVERLAY (IF REQUIRED) --- */}
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

      {/* --- STEP 2: REVEAL OVERLAY (DYNAMIC WIRE INTEGRATION) --- */}
      {step === 'reveal' && (
        <div className="animate-fade-in w-full h-[100dvh] flex flex-col justify-center overflow-hidden bg-[#060911]">
          <div className="text-center pt-8 shrink-0 z-20 relative space-y-1">
             <h3 className="text-[#34d399] font-black uppercase tracking-widest text-xs animate-pulse">Primary Pull Displayed</h3>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px]">
               All {mintData.tiers?.length || 1} variants safely stored in Vault
             </p>
          </div>
          
          {/* THE LIVE COMPONENT RE-WIRE FRAME */}
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full scale-95 origin-center">
             
             {/* 1. Banquet Birdie: Injecting real player name, local camera image preview, active hole, and tier serials */}
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
             
             {/* 2. Intro Card: Injecting real account player values dynamically */}
             {mintData.cardType === 'intro' && (
               <IntroCard 
                 playerName={mintData.player} 
                 photoUrl={mintData.videoKey ? playerVideos[mintData.videoKey] : null} 
                 parallel={mintData.primaryTier} 
                 serialNumber={mintData.primarySerial} 
               />
             )}
             
             {/* 3. Double Whammy: Injecting live golfer identity */}
             {mintData.cardType === 'whammy' && (
               <WhammyCard 
                 playerName={mintData.player} 
                 date={new Date().toLocaleDateString()} 
               />
             )}
             
             {/* 4. OceanGate: Injecting actual scorecard location hole */}
             {mintData.cardType === 'oceangate' && (
               <OceanGate 
                 playerName={mintData.player} 
                 signatureText={capturedSignature}
                 photoUrl={capturedPhotoUrl}
                 holeNumber={mintData.hole} 
                 courseName={mintData.courseName}
                 parallel={mintData.primaryTier}
                 serialNumber={mintData.primarySerial}
               />
             )}

          </div>

          <div className="shrink-0 p-6 pb-12 w-full max-w-sm mx-auto z-20 relative">
            <button onClick={onComplete} className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-black py-4 rounded-xl uppercase tracking-widest transition-all border border-white/5 active:scale-95 shadow-2xl">
              Return to Match
            </button>
          </div>
        </div>
      )}
    </div>
  );
}