import { useState, useEffect } from 'react';

export function useWeather(lat, lon) {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    if (!lat || !lon) return;

    async function fetchWeather() {
      try {
        const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
        if (!apiKey) {
          console.warn("Missing OpenWeatherMap API Key in .env.local");
          return;
        }

        // Fetch imperial data (Fahrenheit, MPH)
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        setWeather({
          temp: Math.round(data.main.temp),
          windSpeed: Math.round(data.wind.speed),
          windDeg: data.wind.deg, // Direction in degrees
          condition: data.weather[0].main
        });
      } catch (err) {
        console.error("Failed to fetch weather data:", err);
      }
    }

    fetchWeather();
    
    // Refresh weather every 15 minutes to save API calls
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [lat, lon]);

  return weather;
}