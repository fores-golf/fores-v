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
  const { player } = useUser();
  // Initialize state with the starter set
  const [bag, setBag] = useState(DEFAULT_BAG);
  const [hometown, setHometown] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordExists, setRecordExists] = useState(false);

  useEffect(() => {
    async function fetchGarage() {
      if (!player?.id) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('garages')
          .select('*')
          .eq('profile_id', player.id)
          .single();

        // PGRST116 means no row found. We safely ignore it and let them keep the DEFAULT_BAG.
        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setRecordExists(true);
          if (data.hometown) setHometown(data.hometown);
          
          // If they have a valid custom bag saved, overwrite the default bag
          if (data.bag_json && Array.isArray(data.bag_json)) {
            setBag(data.bag_json);
          } else if (data.bag_json && !Array.isArray(data.bag_json)) {
            // Safety catch: If they had the old legacy object format from earlier, reset to default starter set
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
  }, [player]);

  const saveGarage = async (currentBag, currentHometown) => {
    if (!player?.id) return;
    setSaving(true);
    
    try {
      const payload = {
        profile_id: player.id,
        bag_json: currentBag,
        hometown: currentHometown,
        updated_at: new Date()
      };

      if (recordExists) {
        const { error } = await supabase.from('garages').update(payload).eq('profile_id', player.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('garages').insert([payload]);
        if (error) throw error;
        setRecordExists(true);
      }
    } catch (err) {
      console.error('Error saving garage:', err.message);
    } finally {
      setSaving(false);
    }
  };

  return { bag, hometown, loading, saving, setBag, setHometown, saveGarage };
}