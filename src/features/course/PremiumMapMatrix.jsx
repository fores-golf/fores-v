import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Polygon, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../config/supabaseClient';
import { useUser } from '../../context/UserContext';
import { useGeolocation } from '../../shared/hooks/useGeolocation';
import { useWeather } from '../../shared/hooks/useWeather';
import { calculateDistanceYards } from '../../shared/utils/geoMath';
import { MatchProbabilityBar } from '../probability/probability_engine';

// --- VIRTUAL CADDIE PHYSICS ENGINE ---
function getCaddieAdvice(rawYardage, courseElevFt, homeElevFt, garage) {
  if (!rawYardage || rawYardage === '---') return { playsLike: '---', club: '--' };

  const elevationDiff = courseElevFt - homeElevFt;
  const flightAdjustment = (elevationDiff / 1000) * 0.02;
  const playsLike = Math.round(rawYardage * (1 - flightAdjustment));

  let recommendedClub = '--';
  let closestDiff = Infinity;

  if (garage && garage.length > 0) {
    garage.forEach(item => {
      if (item.type === 'Putter' || item.distance === 0) return;
      
      const diff = Math.abs(item.distance - playsLike);
      if (diff < closestDiff) {
        closestDiff = diff;
        recommendedClub = item.club_name; 
      }
    });
  }

  return { playsLike, club: recommendedClub };
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 17, { animate: true, duration: 1 });
  }, [center, map]);
  return null;
}

function getDestinationPoint(lat, lng, distanceYds, bearingDeg) {
  const R = 6371e3;
  const distMeters = distanceYds / 1.09361;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distMeters / R) + Math.cos(lat1) * Math.sin(distMeters / R) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(distMeters / R) * Math.cos(lat1), Math.cos(distMeters / R) - Math.sin(lat1) * Math.sin(lat2));
  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];
}

const targetIcon = new L.divIcon({
  className: 'custom-target-icon',
  html: `<div class="w-8 h-8 border-[3px] border-yellow-400 rounded-full flex items-center justify-center bg-yellow-400/20 backdrop-blur-sm shadow-[0_0_15px_rgba(250,204,21,0.5)] cursor-move">
            <div class="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
          </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export default function PremiumMapMatrix({ holeData, insights, onLogScoreClick }) {
  const { player, refreshIdentity } = useUser();
  const [mapType, setMapType] = useState('satellite');
  const [targetPos, setTargetPos] = useState(null);
  const [shotOrigin, setShotOrigin] = useState(null);
  const [hasInitializedTarget, setHasInitializedTarget] = useState(false);
  const [showProTips, setShowProTips] = useState(false);
  const [playerGarage, setPlayerGarage] = useState([]);
  
  const { location: userLocation, isTracking, requestLocation } = useGeolocation();
  const mapCenter = holeData?.leafletCenter; 
  const weather = useWeather(mapCenter?.[0], mapCenter?.[1]);

  // Fetch and parse the user's bag_json from the garages table
  useEffect(() => {
    const fetchGarageData = async () => {
      // Safely ensure we have the auth_id before fetching
      if (!player?.auth_id) return;
      
      try {
        const { data, error } = await supabase
          .from('garages')
          .select('bag_json')
          // 🎯 FIXED: Matched the query to your Garage save logic
          .eq('profile_id', player.auth_id)
          .single(); 
          
        if (error) throw error;
        
        if (data && data.bag_json) {
          let parsedBag = data.bag_json;
          if (typeof parsedBag === 'string') {
            parsedBag = JSON.parse(parsedBag);
          }
          
          if (Array.isArray(parsedBag)) {
            const mappedClubs = parsedBag.map(club => ({
              club_name: club.name,
              distance: Number(club.distance) || 0,
              type: club.type
            }));
            setPlayerGarage(mappedClubs);
          }
        }
      } catch (err) {
        console.error("Error fetching garage data:", err.message);
      }
    };

    fetchGarageData();
  }, [player?.auth_id]); // Updated dependency

  useEffect(() => {
    setHasInitializedTarget(false);
    setShowProTips(false); 
  }, [holeData?.id || holeData?.hole_number]);

  useEffect(() => {
    if (mapCenter && !hasInitializedTarget) {
      if (userLocation) {
        setTargetPos([(userLocation[0] + mapCenter[0]) / 2, (userLocation[1] + mapCenter[1]) / 2]);
      } else {
        setTargetPos([mapCenter[0] - 0.0002, mapCenter[1] - 0.0002]);
      }
      setHasInitializedTarget(true);
    }
  }, [mapCenter, userLocation, hasInitializedTarget]); 

  const formatYardage = (val) => (val) ? val : '---';

  const distanceToCenter = userLocation && mapCenter ? formatYardage(calculateDistanceYards(userLocation[0], userLocation[1], mapCenter[0], mapCenter[1])) : '---';
  const distanceToFront = userLocation && holeData?.leafletFront ? formatYardage(calculateDistanceYards(userLocation[0], userLocation[1], holeData.leafletFront[0], holeData.leafletFront[1])) : '---';
  const distanceToBack = userLocation && holeData?.leafletBack ? formatYardage(calculateDistanceYards(userLocation[0], userLocation[1], holeData.leafletBack[0], holeData.leafletBack[1])) : '---';
  
  const distanceToTarget = userLocation && targetPos ? formatYardage(calculateDistanceYards(userLocation[0], userLocation[1], targetPos[0], targetPos[1])) : '---';
  const targetToPin = targetPos && mapCenter ? formatYardage(calculateDistanceYards(targetPos[0], targetPos[1], mapCenter[0], mapCenter[1])) : '---';
  const driveDistance = shotOrigin && userLocation ? calculateDistanceYards(shotOrigin[0], shotOrigin[1], userLocation[0], userLocation[1]) : 0;

  const homeElevationFt = 500; 
  const courseElevationFt = holeData?.elevation_green_ft || 1450; 

  const caddieAdvice = getCaddieAdvice(distanceToCenter, courseElevationFt, homeElevationFt, playerGarage);

  let windCone = null;
  if (weather && targetPos && weather.windSpeed > 3) {
    const pushBearing = (weather.windDeg + 180) % 360;
    const visualLength = weather.windSpeed * 4; 
    const leftPoint = getDestinationPoint(targetPos[0], targetPos[1], visualLength, pushBearing - 20);
    const rightPoint = getDestinationPoint(targetPos[0], targetPos[1], visualLength, pushBearing + 20);
    windCone = [targetPos, leftPoint, rightPoint];
  }

  const tileUrl = mapType === 'satellite' 
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";

  // --- INTERNAL DATABASE INJECTION ENGINE ---
  const handleInlineSaveScore = async (sheetData) => {
    if (!player || !holeData) return;

    try {
      const dbPayload = {
        player_id: player.id,
        matchup_id: Number(insights?.matchupId || 7),
        hole_number: Number(holeData.hole_number),
        hole_id: Number(holeData.id),
        gross_score: Number(sheetData.score || 0),
        putts: Number(sheetData.putts || 0),
        accuracy: sheetData.accuracy || '',
        penalty_strokes: Number(sheetData.penalties || 0),
        water_balls: Number(sheetData.water || 0),
        drinks: Number(sheetData.drinks || 0),
        par: Number(holeData.par) 
      };

      const { error: saveError } = await supabase
        .from('hole_scores')
        .upsert(dbPayload, { onConflict: 'player_id, hole_number, matchup_id' });

      if (saveError) throw saveError;

      const { data: scores, error: fetchError } = await supabase
        .from('hole_scores')
        .select('gross_score, par')
        .eq('player_id', player.id)
        .order('updated_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (scores && scores.length > 0) {
        let maxStreak = 0;
        let currentStreak = 0;

        scores.forEach((hole) => {
          if (hole.gross_score !== null && hole.par !== null && hole.gross_score <= hole.par) {
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
          } else {
            currentStreak = 0;
          }
        });

        const badgeTiers = [
          { id: 'b1', target: 2 }, { id: 'b2', target: 3 }, { id: 'b3', target: 4 },
          { id: 'b4', target: 5 }, { id: 'b5', target: 6 }, { id: 'b6', target: 7 },
          { id: 'b7', target: 8 }, { id: 'b8', target: 9 }, { id: 'b9', target: 10 }
        ];

        const currentlyUnlocked = player.unlocked_badges || [];
        const newUnlocks = badgeTiers
          .filter(tier => maxStreak >= tier.target && !currentlyUnlocked.includes(tier.id))
          .map(tier => tier.id);

        if (newUnlocks.length > 0) {
          const { error: patchError } = await supabase
            .from('players')
            .update({ unlocked_badges: [...currentlyUnlocked, ...newUnlocks] })
            .eq('id', player.id);

          if (patchError) throw patchError;
        }
      }

      await refreshIdentity();

    } catch (error) {
      console.error("Error saving score inline:", error.message);
      alert("Error saving score: " + error.message);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col animate-fade-in font-sans">
      
      {/* --- FLOATING LEFT STACK --- */}
      <div className="absolute top-10 left-4 z-[400] pointer-events-none flex flex-col gap-2 max-w-[140px]">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/60 rounded-xl p-2 px-3 flex items-center justify-between shadow-lg pointer-events-auto">
          {weather ? (
            <div className="flex items-center gap-2 font-mono text-[10px] font-black w-full justify-between">
              <span className="text-slate-200">{weather.temp}°</span>
              <div className="w-px h-2.5 bg-slate-800" />
              <div className="flex items-center text-emerald-400 gap-0.5">
                <span>{weather.windSpeed}</span>
                <span className="text-[7px] opacity-60">MPH</span>
                <svg style={{ transform: `rotate(${weather.windDeg}deg)` }} className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19V5m0 0l-4 4m4-4l4 4" /></svg>
              </div>
            </div>
          ) : (
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest animate-pulse">Sensors...</span>
          )}
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/60 rounded-xl p-2.5 shadow-lg pointer-events-auto flex flex-col font-mono">
           <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider mb-1 font-sans">Ryder Status</span>
           <div className="text-xs font-black text-orange-400 flex items-center gap-1">
             <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping inline-block" />
             {insights?.status || 'All Square'}
           </div>
           <div className="text-[9px] font-bold text-slate-400 mt-0.5">{insights?.thru || 'Thru 1'}</div>

           {(insights?.matchupId || insights?.matchId) && (
             <MatchProbabilityBar 
               matchId={insights?.matchupId || insights?.matchId}
               status="live" 
               variant="micro" 
               team1Name={insights?.team1Name || 'Team 1'}
               team2Name={insights?.team2Name || 'Team 2'}
             />
           )}

           <div className="text-[10px] font-black text-emerald-400 mt-1.5 border-t border-slate-800 pt-1.5 flex justify-between items-center">
             <span className="font-sans text-[7px] text-slate-600 uppercase font-black">Ledger</span>
             <span>{insights?.wagerStatus || 'LIVE'}</span>
           </div>
        </div>
      </div>

      {/* --- FLOATING RIGHT STACK --- */}
      <div className="absolute top-10 right-4 z-[400] pointer-events-none flex flex-col gap-2 items-end">
        <button 
          onClick={() => onLogScoreClick && onLogScoreClick(handleInlineSaveScore)}
          className="pointer-events-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[9px] h-9 px-4 rounded-xl shadow-lg border border-emerald-500 transition-all active:scale-95"
        >
          Log Score
        </button>

        <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-sm border border-slate-800/80 rounded-xl flex overflow-hidden shadow-lg p-0.5">
          <button onClick={() => setMapType('satellite')} className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest transition-all rounded-lg ${mapType === 'satellite' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Sat</button>
          <button onClick={() => setMapType('topo')} className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest transition-all rounded-lg ${mapType === 'topo' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Topo</button>
        </div>
        
        <button 
          onClick={() => setShotOrigin(shotOrigin ? null : userLocation)}
          className="pointer-events-auto px-3 h-8 text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg border transition-all active:scale-95 bg-slate-900/80 border-slate-800/80 text-slate-400"
          style={{
            backgroundColor: shotOrigin ? '#f97316' : '',
            borderColor: shotOrigin ? '#fb923c' : '',
            color: shotOrigin ? '#ffffff' : ''
          }}
        >
          {shotOrigin ? `Tracker: ${driveDistance}y` : 'Mark Shot'}
        </button>
      </div>

      {/* --- VIRTUAL CADDIE HUD INTERACTIVE OVERLAY --- */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[400] flex flex-col items-center gap-2 w-full max-w-[290px] pointer-events-none">
        {showProTips && holeData?.hole_tips && (
          <div className="bg-indigo-950/95 backdrop-blur-xl border border-indigo-500/40 p-3 rounded-2xl shadow-2xl text-left animate-slide-up max-w-[280px] pointer-events-auto">
            <span className="text-[7px] font-black uppercase text-indigo-400 tracking-[0.2em] block mb-1">
              Course Strategy
            </span>
            <p className="text-[10px] text-slate-300 font-medium leading-relaxed font-sans text-justify">
              {holeData.hole_tips}
            </p>
          </div>
        )}

        <div 
          onClick={() => holeData?.hole_tips && setShowProTips(!showProTips)}
          className={`bg-indigo-950/80 backdrop-blur-md border border-indigo-500/30 px-5 py-2.5 rounded-full flex items-center gap-4 shadow-[0_0_20px_rgba(99,102,241,0.15)] pointer-events-auto cursor-pointer select-none transition-all active:scale-95 ${holeData?.hole_tips ? 'hover:border-indigo-400' : ''}`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Caddie</span>
            {holeData?.hole_tips && (
              <span className="text-[8px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1 py-0.2 rounded-sm transform scale-90">
                {showProTips ? "Hide Tips" : "Pro Tips"}
              </span>
            )}
          </div>
          <div className="w-px h-3 bg-indigo-500/50" />
          
          <div className="flex flex-col items-center">
            <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">Plays Like</span>
            <span className="text-sm font-black text-white font-mono leading-none">{caddieAdvice.playsLike}</span>
          </div>

          <div className="w-px h-3 bg-indigo-500/50" />
          
          <div className="flex flex-col items-center">
            <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">Club</span>
            <span className="text-sm font-black text-indigo-300 uppercase leading-none tracking-wider">{caddieAdvice.club}</span>
          </div>
        </div>
      </div>

      {/* --- MAP CANVAS LAYER --- */}
      <div className="flex-1 z-0 relative">
        <MapContainer center={mapCenter || [47.5142, -92.2372]} zoom={17} zoomControl={false} className="absolute inset-0 h-full w-full">
          <TileLayer url={tileUrl} maxZoom={20} attribution="&copy; Esri" />
          {mapCenter && <RecenterMap center={mapCenter} />}
          
          {windCone && <Polygon positions={windCone} pathOptions={{ color: 'transparent', fillColor: '#ef4444', fillOpacity: 0.15 }} />}
          {userLocation && targetPos && distanceToTarget !== '---' && <Polyline positions={[userLocation, targetPos, mapCenter]} pathOptions={{ color: '#fbbf24', dashArray: '6, 6', weight: 1.5 }} />}
          {shotOrigin && userLocation && <Polyline positions={[shotOrigin, userLocation]} pathOptions={{ color: '#f97316', weight: 2.5 }} />}

          {mapCenter && <CircleMarker center={mapCenter} radius={5} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1, weight: 1.5 }} />}
          {userLocation && distanceToCenter !== '---' && <CircleMarker center={userLocation} radius={5} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1, weight: 1.5 }} />}
          {shotOrigin && userLocation && <CircleMarker center={shotOrigin} radius={3.5} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 1, weight: 1.5 }} />}

          {targetPos && (
            <Marker 
              position={targetPos} 
              draggable={true} 
              icon={targetIcon} 
              eventHandlers={{ 
                dragend: (e) => {
                  const latLng = e.target.getLatLng();
                  setTargetPos([latLng.lat, latLng.lng]);
                } 
              }}
            >
              <Tooltip permanent direction="top" className="!bg-slate-950/95 !backdrop-blur-md !text-yellow-400 !font-black !text-[10px] !border-slate-800 !rounded-xl !px-3 !py-1.5 !whitespace-nowrap !shadow-2xl" offset={[0, -12]}>
                <div className="flex items-center space-x-3 font-mono">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-slate-500 uppercase font-sans tracking-widest leading-none mb-0.5">To Target</span>
                    <span className="text-sm leading-none font-bold">{distanceToTarget}</span>
                  </div>
                  <div className="w-px h-4 bg-slate-800" />
                  <div className="flex flex-col items-center text-emerald-400">
                    <span className="text-[8px] text-emerald-700 uppercase font-sans tracking-widest leading-none mb-0.5">To Pin</span>
                    <span className="text-sm leading-none font-bold">{targetToPin}</span>
                  </div>
                </div>
              </Tooltip>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* --- HUD FOOTER TRAIL --- */}
      <div className="absolute bottom-8 left-4 right-4 z-[400] pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 px-6 shadow-[0_-15px_35px_rgba(0,0,0,0.5)] pointer-events-auto grid grid-cols-3 items-center">
          <div className="flex flex-col text-left">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">Front</span>
            <span className="text-xl font-black text-slate-400 font-mono tracking-tight">{distanceToFront}</span>
          </div>
          
          <div className="flex flex-col items-center justify-center relative">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-0.5">Pin Center</span>
            <span className="text-4xl font-black text-white font-mono tracking-tighter leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">
              {distanceToCenter}
            </span>
          </div>
          
          <div className="flex flex-col text-right">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">Back</span>
            <span className="text-xl font-black text-slate-400 font-mono tracking-tight">{distanceToBack}</span>
          </div>
        </div>
      </div>

    </div>
  );
}