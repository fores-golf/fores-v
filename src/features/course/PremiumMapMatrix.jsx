import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Polygon, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGeolocation } from '../../shared/hooks/useGeolocation';
import { useWeather } from '../../shared/hooks/useWeather';
import { calculateDistanceYards } from '../../shared/utils/geoMath';

// --- CAMERA CONTROLLER ---
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 17, { animate: true, duration: 1 });
  }, [center, map]);
  return null;
}

// --- MATH: FORWARD PROJECTION (For Wind Cone) ---
// Calculates a new GPS coordinate given a starting point, distance, and bearing
function getDestinationPoint(lat, lng, distanceYds, bearingDeg) {
  const R = 6371e3; // Earth radius in meters
  const distMeters = distanceYds / 1.09361;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lng * Math.PI) / 180;

  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distMeters / R) + Math.cos(lat1) * Math.sin(distMeters / R) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(distMeters / R) * Math.cos(lat1), Math.cos(distMeters / R) - Math.sin(lat1) * Math.sin(lat2));

  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];
}

// --- VIRTUAL CADDIE LOGIC ---
const getClubRecommendation = (yards) => {
  if (!yards || yards === '---') return "---";
  if (yards > 240) return "Driver";
  if (yards > 220) return "3 Wood";
  if (yards > 200) return "5 Wood";
  if (yards > 185) return "4 Iron";
  if (yards > 170) return "5 Iron";
  if (yards > 160) return "6 Iron";
  if (yards > 150) return "7 Iron";
  if (yards > 140) return "8 Iron";
  if (yards > 125) return "9 Iron";
  if (yards > 110) return "Pitching Wedge";
  if (yards > 95) return "Gap Wedge";
  if (yards > 80) return "Sand Wedge";
  return "Lob Wedge";
};

// --- CUSTOM TARGET UI ---
const targetIcon = new L.divIcon({
  className: 'custom-target-icon',
  html: `<div class="w-8 h-8 border-[3px] border-yellow-400 rounded-full flex items-center justify-center bg-yellow-400/20 backdrop-blur-sm shadow-[0_0_15px_rgba(250,204,21,0.5)] cursor-move">
           <div class="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export default function PremiumMapMatrix({ holeData }) {
  const [mapType, setMapType] = useState('satellite');
  const [targetPos, setTargetPos] = useState(null);
  
  // FEATURE 1: Shot Tracking State
  const [shotOrigin, setShotOrigin] = useState(null);
  
  const { location: userLocation } = useGeolocation();
  const mapCenter = holeData.leafletCenter; 
  const weather = useWeather(mapCenter[0], mapCenter[1]);

  useEffect(() => {
    if (userLocation && mapCenter && !targetPos) {
      setTargetPos([(userLocation[0] + mapCenter[0]) / 2, (userLocation[1] + mapCenter[1]) / 2]);
    }
  }, [userLocation, mapCenter]);

  // --- MATH: CORE YARDAGES ---
  const distanceToCenter = userLocation && mapCenter ? calculateDistanceYards(userLocation[0], userLocation[1], mapCenter[0], mapCenter[1]) : '---';
  const distanceToFront = userLocation && holeData.leafletFront ? calculateDistanceYards(userLocation[0], userLocation[1], holeData.leafletFront[0], holeData.leafletFront[1]) : '---';
  const distanceToBack = userLocation && holeData.leafletBack ? calculateDistanceYards(userLocation[0], userLocation[1], holeData.leafletBack[0], holeData.leafletBack[1]) : '---';
  
  const distanceToTarget = userLocation && targetPos ? calculateDistanceYards(userLocation[0], userLocation[1], targetPos[0], targetPos[1]) : '---';
  const targetToPin = targetPos && mapCenter ? calculateDistanceYards(targetPos[0], targetPos[1], mapCenter[0], mapCenter[1]) : '---';

  // --- MATH: SHOT TRACKER ---
  const driveDistance = shotOrigin && userLocation ? calculateDistanceYards(shotOrigin[0], shotOrigin[1], userLocation[0], userLocation[1]) : 0;

  // --- MATH: VIRTUAL CADDIE ---
  // Super basic Plays Like calculation (Elevation adjustment)
  const playsLikeDistance = distanceToCenter !== '---' && holeData.elevation_green_ft 
    ? distanceToCenter + Math.round((holeData.elevation_green_ft - 5280) / 3) 
    : distanceToCenter;
  const caddieClub = getClubRecommendation(playsLikeDistance);

  // --- MATH: WIND DANGER ZONE CONE ---
  let windCone = null;
  if (weather && targetPos && weather.windSpeed > 3) {
    // Wind direction is where it's blowing FROM. We want where it pushes TO.
    const pushBearing = (weather.windDeg + 180) % 360;
    // Scale the danger zone size based on wind speed
    const visualLength = weather.windSpeed * 4; 
    
    // Draw a cone 20 degrees wide on either side of the wind vector
    const leftPoint = getDestinationPoint(targetPos[0], targetPos[1], visualLength, pushBearing - 20);
    const rightPoint = getDestinationPoint(targetPos[0], targetPos[1], visualLength, pushBearing + 20);
    
    windCone = [targetPos, leftPoint, rightPoint];
  }

  const tileUrl = mapType === 'satellite' 
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col animate-fade-in">
      
      {/* --- TOP HUD --- */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex justify-between items-start pointer-events-none">
        
        {/* Weather Block */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-3 flex items-center gap-4 shadow-lg pointer-events-auto min-w-[120px]">
          {weather ? (
            <>
              <div className="flex flex-col items-center border-r border-slate-700/50 pr-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Wind</span>
                <div className="flex items-center text-emerald-400 gap-1">
                  <span className="text-lg font-black">{weather.windSpeed}</span>
                  <span className="text-[10px]">MPH</span>
                  <svg style={{ transform: `rotate(${weather.windDeg}deg)` }} className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19V5m0 0l-4 4m4-4l4 4" /></svg>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black text-white">{weather.temp}°</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{weather.condition}</span>
              </div>
            </>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 animate-pulse">Radar...</span>
          )}
        </div>

        {/* Map & Shot Tracking Toggles */}
        <div className="flex flex-col gap-2 items-end pointer-events-auto">
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl flex overflow-hidden shadow-lg">
            <button onClick={() => setMapType('satellite')} className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${mapType === 'satellite' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>Sat</button>
            <button onClick={() => setMapType('topo')} className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors border-l border-slate-700/50 ${mapType === 'topo' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>Topo</button>
          </div>
          
          <button 
            onClick={() => setShotOrigin(shotOrigin ? null : userLocation)}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg border transition-colors ${shotOrigin ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-slate-900/80 border-slate-700/50 text-slate-400'}`}
          >
            {shotOrigin ? `Tracking: ${driveDistance}y` : 'Mark Shot'}
          </button>
        </div>
      </div>

      {/* --- MAP ENGINE --- */}
      <div className="flex-1 z-0 relative">
        <MapContainer center={mapCenter} zoom={17} zoomControl={false} className="absolute inset-0 h-full w-full">
          <TileLayer url={tileUrl} maxZoom={20} attribution="&copy; Esri" />
          <RecenterMap center={mapCenter} />
          
          {/* FEATURE 3: Wind Danger Zone Cone */}
          {windCone && (
            <Polygon positions={windCone} pathOptions={{ color: 'transparent', fillColor: '#ef4444', fillOpacity: 0.15 }} />
          )}

          {/* Laser Lines */}
          {userLocation && targetPos && (
            <Polyline positions={[userLocation, targetPos, mapCenter]} pathOptions={{ color: '#fbbf24', dashArray: '6, 6', weight: 2 }} />
          )}

          {/* FEATURE 1: Shot Tracking Path */}
          {shotOrigin && userLocation && (
            <Polyline positions={[shotOrigin, userLocation]} pathOptions={{ color: '#f97316', weight: 3, opacity: 0.8 }} />
          )}

          {/* Pins & User Locations */}
          <CircleMarker center={mapCenter} radius={6} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }} />
          {userLocation && <CircleMarker center={userLocation} radius={6} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }} />}
          {shotOrigin && <CircleMarker center={shotOrigin} radius={4} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 1, weight: 2 }} />}

          {/* Draggable Target */}
          {targetPos && (
            <Marker position={targetPos} draggable={true} icon={targetIcon} eventHandlers={{ drag: (e) => setTargetPos([e.target.getLatLng().lat, e.target.getLatLng().lng]) }}>
              <Tooltip permanent direction="top" className="!bg-slate-900/90 !backdrop-blur-sm !text-yellow-400 !font-black !text-xs !border-slate-700 !rounded-xl !px-4 !py-2 !whitespace-nowrap !shadow-xl" offset={[0, -15]}>
                <div className="flex items-center space-x-4 divide-x divide-slate-700/80">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest leading-none mb-1">Hit To Ring</span>
                    <span className="text-lg leading-none">{distanceToTarget}</span>
                  </div>
                  <div className="pl-4 flex flex-col items-center text-emerald-400">
                    <span className="text-[9px] text-emerald-700 uppercase tracking-widest leading-none mb-1">Ring To Pin</span>
                    <span className="text-lg leading-none">{targetToPin}</span>
                  </div>
                </div>
              </Tooltip>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* --- BOTTOM HUD --- */}
      <div className="absolute bottom-0 left-0 right-0 z-[400] bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pt-12 pb-6 px-6">
        <div className="grid grid-cols-3 divide-x divide-slate-800 text-center items-end relative">
          
          <div className="pb-2">
            <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Front</div>
            <div className="text-2xl font-black text-slate-300">{distanceToFront}</div>
          </div>
          
          <div className="flex flex-col justify-center relative items-center">
            <div className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-1">To Center</div>
            <div className="text-5xl font-black text-white tracking-tighter drop-shadow-lg leading-none mb-1">
              {distanceToCenter}
            </div>
            
            {/* FEATURE 2: Virtual Caddie Recommendation */}
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
              {caddieClub}
            </div>
            
            {playsLikeDistance !== '---' && holeData.elevation_green_ft && (
               <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1 shadow-xl whitespace-nowrap flex items-center gap-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase">Plays</span>
                 <span className="text-sm font-black text-yellow-400">{playsLikeDistance}</span>
               </div>
            )}
          </div>
          
          <div className="pb-2">
            <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Back</div>
            <div className="text-2xl font-black text-slate-300">{distanceToBack}</div>
          </div>
          
        </div>
      </div>
    </div>
  );
}