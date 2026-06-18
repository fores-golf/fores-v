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
  const { player, session } = useUser();
  const activeUserId = session?.user?.id || player?.id;

  const [bag, setBag] = useState(DEFAULT_BAG);
  const [hometown, setHometown] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- FETCH EXISTING DATA ON LOAD ---
  useEffect(() => {
    async function fetchGarageData() {
      if (!activeUserId) return;
      
      try {
        setLoading(true);
        
        // Fetch from both tables simultaneously for maximum speed
        const [garageRes, playerRes] = await Promise.all([
          supabase.from('garages').select('bag_json').eq('profile_id', activeUserId).maybeSingle(),
          supabase.from('players').select('hometown').eq('auth_id', activeUserId).maybeSingle()
        ]);

        if (garageRes.error) throw garageRes.error;
        if (playerRes.error) throw playerRes.error;

        // 1. Set Hometown from players table
        if (playerRes.data?.hometown) {
          setHometown(playerRes.data.hometown);
        }
        
        // 2. Set Bag from garages table
        if (garageRes.data?.bag_json && Array.isArray(garageRes.data.bag_json) && garageRes.data.bag_json.length > 0) {
          setBag(garageRes.data.bag_json);
        } else {
          setBag(DEFAULT_BAG); // Fallback if no bag exists yet
        }
      } catch (err) {
        console.error('Error fetching garage data:', err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchGarageData();
  }, [activeUserId]);

  // --- SAVE CUSTOM BAG TO DATABASE ---
  const saveGarage = async (currentBag, currentHometown) => {
    if (!activeUserId) {
      console.error("Missing activeUserId, cannot save.");
      return;
    }

    setSaving(true);
    
    try {
      // 1. Write the bag data to the 'garages' table
      const garagePayload = {
        profile_id: activeUserId,
        bag_json: currentBag,
        updated_at: new Date()
      };

      const { error: garageError } = await supabase
        .from('garages')
        .upsert(garagePayload, { onConflict: 'profile_id' });

      if (garageError) throw garageError;

      // 2. Write the player profile data to the 'players' table
      const playerPayload = {
        hometown: currentHometown,
        // (If you need to update 'updated_at' on the players table, uncomment the line below)
        // updated_at: new Date() 
      };

      const { error: playerError } = await supabase
        .from('players')
        .update(playerPayload)
        .eq('auth_id', activeUserId);

      if (playerError) throw playerError;

    } catch (err) {
      console.error('Error saving data:', err.message);
      alert('Failed to save data: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return { bag, hometown, loading, saving, setBag, setHometown, saveGarage };
}