import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useUser } from '../../../context/UserContext';

// The baseline starter set loaded for brand-new users
const DEFAULT_BAG = [
  { id: 'dr', name: 'Driver', type: 'Driver', distance: 265 },
  { id: '3w', name: '3 Wood', type: 'Wood', distance: 235 },
  { id: '5i', name: '5i', type: 'Iron', distance: 195 },
  { id: '6i', name: '6i', type: 'Iron', distance: 180 },
  { id: '7i', name: '7i', type: 'Iron', distance: 165 },
  { id: '8i', name: '8i', type: 'Iron', distance: 150 },
  { id: '9i', name: '9i', type: 'Iron', distance: 135 },
  { id: 'pw', name: 'Pitching Wedge', type: 'Wedge', distance: 120 },
  { id: 'sw', name: 'Sand Wedge', type: 'Wedge', distance: 105 },
  { id: 'pt', name: 'Putter', type: 'Putter', distance: 0 }
];

export function useGarageData() {
  // 1. Grab both player AND session to guarantee we have the master database ID
  const { player, session } = useUser();
  
  // 2. Safely extract the definitive Auth UUID
  const activeUserId = session?.user?.id || player?.id;

  const [bag, setBag] = useState(DEFAULT_BAG);
  const [hometown, setHometown] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- FETCH EXISTING BAG ON LOAD ---
  useEffect(() => {
    async function fetchGarage() {
      // Don't run until we have the definitive ID
      if (!activeUserId) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('garages')
          .select('*')
          .eq('profile_id', activeUserId) // Using the safe ID here
          .maybeSingle();

        if (error) throw error;

        if (data) {
          if (data.hometown) setHometown(data.hometown);
          
          if (data.bag_json && Array.isArray(data.bag_json) && data.bag_json.length > 0) {
            setBag(data.bag_json);
          } else if (data.bag_json && !Array.isArray(data.bag_json)) {
            setBag(DEFAULT_BAG);
          }
        }
      } catch (err) {
        console.error('Error fetching garage:', err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchGarage();
  }, [activeUserId]);

  // --- SAVE CUSTOM BAG TO DATABASE ---
  const saveGarage = async (currentBag, currentHometown) => {
    // Failsafe block
    if (!activeUserId) {
      console.error("Missing activeUserId, cannot save.");
      return;
    }

    setSaving(true);
    
    try {
      const payload = {
        profile_id: activeUserId, // The database will 100% accept this ID
        bag_json: currentBag,
        hometown: currentHometown,
        updated_at: new Date()
      };

      const { error } = await supabase
        .from('garages')
        .upsert(payload, { onConflict: 'profile_id' });

      if (error) throw error;

    } catch (err) {
      console.error('Error saving garage:', err.message);
      alert('Failed to save garage data: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return { bag, hometown, loading, saving, setBag, setHometown, saveGarage };
}