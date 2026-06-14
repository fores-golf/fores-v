import React, { useEffect, useState } from 'react';
import MatchScreen from './features/scoring/MatchScreen';
import { supabase } from './config/supabaseClient';

function App() {
  const [dbStatus, setDbStatus] = useState('Connecting to Supabase...');

  useEffect(() => {
    async function testConnection() {
      // Attempt to fetch just the names of the courses we seeded
      const { data, error } = await supabase
        .from('courses')
        .select('name');

      if (error) {
        console.error('Supabase Error:', error);
        setDbStatus('❌ Failed to connect: ' + error.message);
      } else {
        console.log('Fetched Courses:', data);
        setDbStatus(`✅ Connected! Found ${data.length} courses in the database.`);
      }
    }

    testConnection();
  }, []);

  return (
    <>
      {/* Temporary connection banner */}
      <div className="bg-slate-900 text-xs text-slate-400 font-mono p-2 text-center border-b border-slate-800 shrink-0">
        {dbStatus}
      </div>
      
      {/* Your main UI */}
      <MatchScreen />
    </>
  );
}

export default App;