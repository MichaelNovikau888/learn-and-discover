import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Teacher, Profile } from '@/lib/types';

interface TeacherWithProfile extends Teacher {
  profile: Profile;
}

export function useTeachers() {
  const [teachers, setTeachers] = useState<TeacherWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeachers = async () => {
      const { data: teachersData, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('is_active', true);

      if (error || !teachersData) {
        setLoading(false);
        return;
      }

      const userIds = teachersData.map(t => t.user_id);
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));

      const merged = teachersData.map(t => ({
        ...t,
        profile: profileMap.get(t.user_id) as Profile,
      }));

      setTeachers(merged);
      setLoading(false);
    };

    fetchTeachers();
  }, []);

  return { teachers, loading };
}
