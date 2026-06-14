import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';

const DEFAULT_BAG = [
  { id: 'dr', name: 'Driver', distance: 250 },
  { id: '3w', name: '3W', distance: 230 },
  { id: '5i', name: '5i', distance: 185 },
  { id: '6i', name: '6i', distance: 175 },
  { id: '7i', name: '7i', distance: 165 },
  { id: '8i', name: '8i', distance: 155 },
  { id: '9i', name: '9i', distance: 145 },
  { id: 'pw', name: 'PW', distance: 135 },
  { id: 'sw', name: 'SW', distance: 115 },
  { id: 'pt', name: 'Putter', distance: 0 }
];

export function useGarageData() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hometown, setHometown] = useState('');
  const [bag, setBag] = useState(DEFAULT_BAG);

  useEffect(() => {
    async function loadGarageData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user's garage data
        const { data, error } = await supabase
          .from('garages')
          .select('bag_json, hometown')
          .eq('profile_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          if (data.bag_json) setBag(data.bag_json);
          if (data.hometown) setHometown(data.hometown);
        }
      } catch (err) {
        console.error('Error opening garage doors:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadGarageData();
  }, []);

  const saveGarage = async (updatedBag, updatedHometown) => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('garages').upsert({
        profile_id: user.id,
        bag_json: updatedBag,
        hometown: updatedHometown,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      setBag(updatedBag);
      setHometown(updatedHometown);
      return { success: true };
    } catch (err) {
      console.error('Error locking garage:', err.message);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  return { bag, hometown, loading, saving, setBag, setHometown, saveGarage };
}