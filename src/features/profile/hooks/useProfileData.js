import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';

// Helper function to safely parse Postgres array strings (e.g., "{b1,b2}") into JS arrays
export const parseBadges = (badges) => {
  if (typeof badges === 'string') {
    return badges.replace(/[{}]/g, '').split(',').filter(Boolean);
  } else if (Array.isArray(badges)) {
    return badges;
  }
  return [];
};

export function useProfileData() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [teams, setTeams] = useState([]); 

  const [profile, setProfile] = useState({
    id: null,
    auth_id: null,
    name: '',
    handicap: 0,
    avatar_url: '',
    team: '',
    archetype: 'All-Around',
    driving_dist: '',
    gir_percentage: '',
    avg_putts: '',
    power_rating: '',
    short_game_rating: '',
    unlocked_badges: [],
    equipped_badge_id: null
  });

  useEffect(() => {
    async function loadProfileAndTeams() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch available teams
        const { data: teamsData } = await supabase.from('teams').select('id, name');
        if (teamsData) setTeams(teamsData);

        // 2. Fetch player using auth_id
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .eq('auth_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          setProfile({
            id: data.id, // Primary key
            auth_id: data.auth_id,
            name: data.name || user.user_metadata?.full_name || '',
            handicap: data.handicap || 0,
            avatar_url: data.avatar_url || '',
            team: data.team || '',
            archetype: data.archetype || 'All-Around',
            driving_dist: data.driving_dist ?? '',
            gir_percentage: data.gir_percentage ?? '',
            avg_putts: data.avg_putts ?? '',
            power_rating: data.power_rating ?? '',
            short_game_rating: data.short_game_rating ?? '',
            unlocked_badges: parseBadges(data.unlocked_badges), // Safely parsed
            equipped_badge_id: data.equipped_badge_id || null
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfileAndTeams();
  }, []);

  const updateProfile = async (profileUpdateData) => {
    try {
      setUpdating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false };

      const payload = {
        name: profileUpdateData.name?.trim(),
        archetype: profileUpdateData.archetype,
        driving_dist: profileUpdateData.driving_dist !== '' && !isNaN(profileUpdateData.driving_dist) ? parseInt(profileUpdateData.driving_dist, 10) : null,
        gir_percentage: profileUpdateData.gir_percentage !== '' && !isNaN(profileUpdateData.gir_percentage) ? parseInt(profileUpdateData.gir_percentage, 10) : null,
        avg_putts: profileUpdateData.avg_putts !== '' && !isNaN(profileUpdateData.avg_putts) ? parseFloat(profileUpdateData.avg_putts) : null,
        power_rating: profileUpdateData.power_rating !== '' && !isNaN(profileUpdateData.power_rating) ? parseInt(profileUpdateData.power_rating, 10) : null,
        short_game_rating: profileUpdateData.short_game_rating !== '' && !isNaN(profileUpdateData.short_game_rating) ? parseInt(profileUpdateData.short_game_rating, 10) : null,
        updated_at: new Date().toISOString(),
      };

      // Only update fields explicitly passed to avoid overwriting with nulls
      if (profileUpdateData.avatar_url !== undefined) payload.avatar_url = profileUpdateData.avatar_url;
      if (profileUpdateData.team !== undefined) payload.team = profileUpdateData.team;
      if (profileUpdateData.equipped_badge_id !== undefined) payload.equipped_badge_id = profileUpdateData.equipped_badge_id;
      if (profileUpdateData.unlocked_badges !== undefined) payload.unlocked_badges = profileUpdateData.unlocked_badges;

      // 🎯 FIXED: Appended .select() so we can verify the row actually updated
      const { data, error } = await supabase
        .from('players')
        .update(payload)
        .eq('auth_id', user.id)
        .select();

      if (error) throw error;
      
      // 🎯 FIXED: Catch silent RLS failures and throw a real error
      if (!data || data.length === 0) {
        throw new Error("0 rows updated. Your Row Level Security (RLS) policy is blocking the save. Please update your Supabase UPDATE policy to: auth_id = auth.uid()");
      }
      
      setProfile(prev => ({ ...prev, ...payload }));
      return { success: true };
    } catch (error) {
      console.error('Error syncing profile:', error.message);
      return { success: false, error: error.message };
    } finally {
      setUpdating(false);
    }
  };

  const uploadAvatar = async (event) => {
    try {
      setUpdating(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('No asset image detected.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const { data: { user } } = await supabase.auth.getUser();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Save URL to DB instantly
      const { success, error } = await updateProfile({ avatar_url: publicUrl });
      if (!success) throw new Error(error);
      
      return { success: true };
    } catch (error) {
      console.error('Avatar pipeline storage failure:', error.message);
      return { success: false, error: error.message };
    } finally {
      setUpdating(false);
    }
  };

  return { profile, teams, loading, updating, updateProfile, uploadAvatar };
}