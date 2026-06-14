import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';

export function useProfileData() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [teams, setTeams] = useState([]); // Storage for selecting teams
  const [profile, setProfile] = useState({
    username: '',
    handicap: 0,
    avatar_url: '',
    team_name: '' // Added team track
  });

  useEffect(() => {
    async function loadProfileAndTeams() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch available tournament teams
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name');
        if (teamsData) setTeams(teamsData);

        // 2. Fetch User Profile
        const { data, error } = await supabase
          .from('profiles')
          .select('username, handicap, avatar_url, team_name')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          setProfile({
            username: data.username || user.user_metadata?.full_name || '',
            handicap: data.handicap || 0,
            avatar_url: data.avatar_url || '',
            team_name: data.team_name || ''
          });
        }
      } catch (error) {
        console.error('Error loading tournament parameters:', error.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfileAndTeams();
  }, []);

  const updateProfile = async ({ username, handicap, avatar_url, team_name }) => {
    try {
      setUpdating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        id: user.id,
        username,
        handicap: parseFloat(handicap),
        avatar_url,
        team_name,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      
      setProfile({ username, handicap, avatar_url, team_name });
      return { success: true };
    } catch (error) {
      console.error('Error syncing profile card modifications:', error.message);
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
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      await updateProfile({ ...profile, avatar_url: publicUrl });

    } catch (error) {
      console.error('Avatar pipeline storage failure:', error.message);
    } finally {
      setUpdating(false);
    }
  };

  return { profile, teams, loading, updating, updateProfile, uploadAvatar };
}