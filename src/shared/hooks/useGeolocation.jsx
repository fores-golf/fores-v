import { useState, useEffect } from 'react';

export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Check if the device supports GPS
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    // 2. Set up the active GPS watcher
    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        // PostGIS native format: [Latitude, Longitude] for Leaflet
        setLocation([position.coords.latitude, position.coords.longitude]);
        setError(null);
      },
      (err) => {
        setError(err.message);
      },
      { 
        enableHighAccuracy: true, // Forces device to use actual GPS, not just cell towers
        maximumAge: 0,            // Prevents device from using cached locations
        timeout: 5000 
      }
    );

    // 3. Clean up the watcher when the user leaves the map tab
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  return { location, error };
}