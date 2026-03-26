import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/lib/types';
import { useAuth } from './useAuth';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data as Profile);
    }

    return { data, error };
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return { error: new Error('Not authenticated'), url: null };

    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const fileName = `${user.id}/avatar_${timestamp}.${fileExt}`;

    // Delete old avatar files first
    const { data: existingFiles } = await supabase.storage
      .from('avatars')
      .list(user.id);
    
    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`);
      await supabase.storage.from('avatars').remove(filesToDelete);
    }

    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { 
        upsert: true,
        cacheControl: '0'
      });

    if (uploadError) {
      return { error: uploadError, url: null };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Add cache-busting parameter
    const urlWithCacheBust = `${publicUrl}?t=${timestamp}`;
    await updateProfile({ avatar_url: urlWithCacheBust });

    return { error: null, url: urlWithCacheBust };
  };

  return { profile, loading, updateProfile, uploadAvatar };
}
