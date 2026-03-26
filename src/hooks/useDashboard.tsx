/**
 * useDashboard.tsx — данные для Dashboard.tsx через GET /api/dashboard.
 *
 * Один запрос заменяет три отдельных useEffect из оригинального Dashboard.tsx:
 *   - student_courses (Supabase)
 *   - bookings (Supabase)
 *   - courses (Supabase)
 *
 * Формат данных адаптирован в snake_case чтобы Dashboard.tsx работал
 * без изменений внутренней логики отображения.
 */

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/lib/apiClient';
import type { ApiDashboard, ApiBooking } from '@/lib/api.types';
import { adaptStudentCourse } from './useCourses';

// Адаптированный тип букинга — в snake_case как ожидает Dashboard.tsx
export interface DashboardBooking {
  id: string;
  schedule_id: string;
  booking_date: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  schedule: {
    lesson_type: 'individual' | 'group';
    start_time: string;
    end_time: string;
    course: { name: string };
    teacher: {
      profile: {
        first_name: string;
        last_name: string;
      };
    };
  };
}

function adaptBooking(b: ApiBooking): DashboardBooking {
  const [teacherFirst, ...rest] = b.teacherName.split(' ');
  const teacherLast = rest.join(' ');

  return {
    id: b.id,
    schedule_id: b.scheduleId,
    booking_date: b.bookingDate,
    status: b.status.toLowerCase() as DashboardBooking['status'],
    schedule: {
      lesson_type: b.lessonType.toLowerCase() as 'individual' | 'group',
      start_time: b.startTime,
      end_time: b.endTime,
      course: { name: b.courseName },
      teacher: {
        profile: { first_name: teacherFirst, last_name: teacherLast },
      },
    },
  };
}

export interface DashboardStats {
  totalIndividualRemaining: number;
  totalGroupRemaining: number;
  completedLessons: number;
  hasLowBalance: boolean;
}

export interface DashboardData {
  activeCourses: ReturnType<typeof adaptStudentCourse>[];
  upcomingBookings: DashboardBooking[];
  stats: DashboardStats;
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    api
      .get<ApiDashboard>('/dashboard', signal)
      .then((res) => {
        setData({
          activeCourses: res.activeCourses.map(adaptStudentCourse),
          upcomingBookings: res.upcomingBookings.map(adaptBooking),
          stats: res.stats,
        });
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(controller.signal);
    return () => controller.abort();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
