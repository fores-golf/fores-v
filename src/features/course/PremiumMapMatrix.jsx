import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Polygon, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGeolocation } from '../../shared/hooks/useGeolocation';
import { useWeather } from '../../shared/hooks/useWeather';
import { calculateDistanceYards } from '../../shared/utils/geoMath';

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

export default function PremiumMapMatrix({ holeData, onLogScoreClick }) {
  const [mapType, setMapType] = useState('satellite');
  const [targetPos, setTargetPos] = useState(null);
  const [shotOrigin, setShotOrigin] = useState(null);
  
  const { location: userLocation } = useGeolocation();
  const mapCenter = holeData.leafletCenter; 
  const weather = useWeather(mapCenter[0], mapCenter[1]);

  useEffect(() => {
    if (userLocation && mapCenter && !targetPos) {
      setTargetPos([(userLocation[0] + mapCenter[0]) / 2, (userLocation[1] + mapCenter[1]) / 2]);
    }
  }, [userLocation, mapCenter]);

  const distanceToCenter = userLocation && mapCenter ? calculateDistanceYards(userLocation[0], userLocation[1], mapCenter[0], mapCenter[1]) : '---';
  const distanceToFront = userLocation && holeData.leafletFront ? calculateDistanceYards(userLocation[0], userLocation[1], holeData.leafletFront[0], holeData.leafletFront[1]) : '---';
  const distanceToBack = userLocation && holeData.leafletBack ? calculateDistanceYards(userLocation[0], userLocation[1], holeData.leafletBack[0], holeData.leafletBack[1]) : '---';
  
  const distanceToTarget = userLocation && targetPos ? calculateDistanceYards(userLocation[0], userLocation[1], targetPos[0], targetPos[1]) : '---';
  const targetToPin = targetPos && mapCenter ? calculateDistanceYards(targetPos[0], targetPos[1], mapCenter[0], mapCenter[1]) : '---';
  const driveDistance = shotOrigin && userLocation ? calculateDistanceYards(shotOrigin[0], shotOrigin[1], userLocation[0], userLocation[1]) : 0;

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

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col animate-fade-in">
      
      {/* --- FLOATING CONTEXT FLAPS (LEFT & RIGHT) --- */}
      <div className="absolute top-20 left-4 z-[400] pointer-events-none flex flex-col gap-2">
        {/* Left Hand Weather Display */}
        <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-xl p-2 px-3 flex items-center gap-3 shadow-lg pointer-events-auto">
          {weather ? (
            <div className="flex items-center gap-2 font-mono">
              <span className="text-[10px] font-black text-slate-200">{weather.temp}°F</span>
              <div className="w-px h-3 bg-slate-700" />
              <div className="flex items-center text-emerald-400 text-[10px] font-black gap-0.5">
                <span>{weather.windSpeed}</span>
                <span className="text-[8px] opacity-70">MPH</span>
                <svg style={{ transform: `rotate(${weather.windDeg}deg)` }} className="w-2.5 h-2.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19V5m0 0l-4 4m4-4l4 4" /></svg>
              </div>
            </div>
          ) : (
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Sensors...</span>
          )}
        </div>
      </div>

      <div className="absolute top-20 right-4 z-[400] pointer-events-none flex flex-col gap-2 items-end">
        {/* Right Hand Tool Tree */}
        <button 
          onClick={onLogScoreClick}
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
          className={`pointer-events-auto px-3 h-8 text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg border transition-all active:scale-95 ${shotOrigin ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_10px_rgba(249,115,22,0.4)]' : 'bg-slate-900/80 border-slate-800/80 text-slate-400'}`}
        >
          {shotOrigin ? `Tracker: ${driveDistance}y` : 'Mark Shot'}
        </button>
      </div>

      {/* --- LEAFLET WORKSPACE --- */}
      <div className="flex-1 z-0 relative">
        <MapContainer center={mapCenter} zoom={17} zoomControl={false} className="absolute inset-0 h-full w-full">
          <TileLayer url={tileUrl} maxZoom={20} attribution="&copy; Esri" />
          <RecenterMap center={mapCenter} />
          
          {windCone && <Polygon positions={windCone} pathOptions={{ color: 'transparent', fillColor: '#ef4444', fillOpacity: 0.15 }} />}
          {userLocation && targetPos && <Polyline positions={[userLocation, targetPos, mapCenter]} pathOptions={{ color: '#fbbf24', dashArray: '6, 6', weight: 1.5 }} />}
          {shotOrigin && userLocation && <Polyline positions={[shotOrigin, userLocation]} pathOptions={{ color: '#f97316', weight: 2.5 }} />}

          <CircleMarker center={mapCenter} radius={5} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1, weight: 1.5 }} />
          {userLocation && <CircleMarker center={userLocation} radius={5} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1, weight: 1.5 }} />}
          {shotOrigin && <CircleMarker center={shotOrigin} radius={3.5} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 1, weight: 1.5 }} />}

          {targetPos && (
            <Marker position={targetPos} draggable={true} icon={targetIcon} eventHandlers={{ drag: (e) => setTargetPos([e.target.getLatLng().lat, e.target.getLatLng().lng]) }}>
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

      {/* --- HUD TELEMETRY TRAIL (FLOATING RADAR FOOTER) --- */}
      <div className="absolute bottom-20 left-4 right-4 z-[400] pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 px-6 shadow-[0_-15px_35px_rgba(0,0,0,0.5)] pointer-events-auto grid grid-cols-3 items-center">
          
          {/* Front Number Block */}
          <div className="flex flex-col text-left">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">Front</span>
            <span className="text-xl font-black text-slate-400 font-mono tracking-tight">{distanceToFront}</span>
          </div>
          
          {/* Massive Hero Center Core */}
          <div className="flex flex-col items-center justify-center relative">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-0.5">Pin Center</span>
            <span className="text-4xl font-black text-white font-mono tracking-tighter leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">
              {distanceToCenter}
            </span>
          </div>
          
          {/* Back Number Block */}
          <div className="flex flex-col text-right">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">Back</span>
            <span className="text-xl font-black text-slate-400 font-mono tracking-tight">{distanceToBack}</span>
          </div>
          
        </div>
      </div>

    </div>
  );
}