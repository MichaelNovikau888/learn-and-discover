import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Course } from '@/lib/types';
import type { ApiStudentCourse } from '@/lib/api.types';

// Адаптер ApiStudentCourse → формат совместимый с Dashboard.tsx (snake_case)
export function adaptStudentCourse(sc: ApiStudentCourse) {
  return {
    id: sc.id,
    course_id: sc.courseId,
    individual_lessons_remaining: sc.individualLessonsRemaining,
    group_lessons_remaining: sc.groupLessonsRemaining,
    expires_at: sc.expiresAt,
    is_repeat_purchase: sc.repeatPurchase,
    paid_online: sc.paidOnline,
    individual_low_balance: sc.individualLowBalance,
    group_low_balance: sc.groupLowBalance,
    course: { name: sc.courseName } as Course,
  };
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCourses(data as Course[]);
      }
      setLoading(false);
    };

    fetchCourses();
  }, []);

  return { courses, loading };
}
