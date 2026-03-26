/**
 * useBookings.tsx — запись и отмена через /api/bookings.
 *
 * Ключевые отличия от оригинального Booking.tsx:
 *
 * БЫЛО (Supabase, два отдельных запроса, race condition):
 *   1. INSERT INTO bookings ...
 *   2. UPDATE student_courses SET individual_lessons_remaining = ...
 *   Если шаг 2 падал — баланс не списывался. Два параллельных пользователя
 *   могли оба пройти шаг 1 до того, как шаг 2 кого-то заблокировал.
 *
 * СТАЛО (бэкенд, одна транзакция + Redis lock):
 *   POST /api/bookings — атомарно: блокирует слот, списывает занятие,
 *   сохраняет запись. Возвращает ошибку 409 если мест нет или 402 если
 *   закончились занятия.
 *
 * БЫЛО (отмена, баланс не возвращался):
 *   UPDATE bookings SET status = 'cancelled' ...
 *
 * СТАЛО (компенсирующая транзакция):
 *   DELETE /api/bookings/{id} — меняет статус И возвращает занятие в баланс.
 */

import { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/apiClient';
import type { ApiBooking, ApiSchedule } from '@/lib/api.types';
import { format, addDays } from 'date-fns';

// ── Адаптер расписания ────────────────────────────────────────────────────────

export interface SlotSchedule {
  id: string;
  teacherId: string;
  courseId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  lessonType: 'individual' | 'group';
  maxParticipants: number;
  active: boolean;
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
    specialization: string | null;
    avatarUrl: string | null;
    // Для совместимости с Booking.tsx — ожидает вложенный profile
    profile: { first_name: string; last_name: string };
  };
  course?: {
    id: string;
    name: string;
  };
}

function adaptSchedule(s: ApiSchedule): SlotSchedule {
  return {
    id: s.id,
    teacherId: s.teacherId,
    courseId: s.courseId,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    lessonType: s.lessonType.toLowerCase() as 'individual' | 'group',
    maxParticipants: s.maxParticipants,
    active: s.active,
    teacher: s.teacher
      ? {
          id: s.teacher.id,
          firstName: s.teacher.firstName,
          lastName: s.teacher.lastName,
          specialization: s.teacher.specialization,
          avatarUrl: s.teacher.avatarUrl,
          profile: {
            first_name: s.teacher.firstName,
            last_name: s.teacher.lastName,
          },
        }
      : undefined,
    course: s.course ? { id: s.course.id, name: s.course.name } : undefined,
  };
}

// ── useSchedules — расписание на неделю ──────────────────────────────────────

export function useSchedules() {
  const [schedules, setSchedules] = useState<SlotSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    api
      .get<ApiSchedule[]>('/manager/schedules', controller.signal)
      .then((data) => setSchedules(data.map(adaptSchedule)))
      .catch((err) => {
        if (err instanceof ApiError) console.error('useSchedules:', err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return { schedules, loading };
}

// ── useWeekBookings — занятые слоты на выбранной неделе ──────────────────────

export interface WeekBooking {
  scheduleId: string;
  bookingDate: string;
  studentId?: string;  // только если текущий пользователь
  isOwnBooking: boolean;
}

/**
 * Возвращает все подтверждённые бронирования на неделю.
 * Используется в Booking.tsx для подсчёта свободных мест.
 */
export function useWeekBookings(weekStart: Date) {
  const [bookings, setBookings] = useState<WeekBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    // Получаем бронирования текущего студента — бэкенд вернёт только его
    api
      .get<ApiBooking[]>('/bookings/my', controller.signal)
      .then((data) => {
        const from = format(weekStart, 'yyyy-MM-dd');
        const to = format(addDays(weekStart, 6), 'yyyy-MM-dd');

        setBookings(
          data
            .filter(
              (b) =>
                b.status === 'CONFIRMED' &&
                b.bookingDate >= from &&
                b.bookingDate <= to,
            )
            .map((b) => ({
              scheduleId: b.scheduleId,
              bookingDate: b.bookingDate,
              isOwnBooking: true,
            })),
        );
      })
      .catch((err) => {
        if (err instanceof ApiError) console.error('useWeekBookings:', err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [weekStart]);

  return { bookings, loading };
}

// ── createBooking ─────────────────────────────────────────────────────────────

/**
 * Записывает студента на занятие.
 * Бэкенд атомарно: блокирует слот Redis lock → списывает занятие → сохраняет.
 */
export async function createBooking(
  scheduleId: string,
  bookingDate: string,
): Promise<{ data: ApiBooking | null; error: string | null }> {
  try {
    const data = await api.post<ApiBooking>('/bookings', {
      scheduleId,
      bookingDate,
    });
    return { data, error: null };
  } catch (err) {
    const message =
      err instanceof ApiError ? err.message : 'Не удалось записаться';
    return { data: null, error: message };
  }
}

// ── cancelBooking ─────────────────────────────────────────────────────────────

/**
 * Отменяет бронирование.
 * Бэкенд: меняет статус + возвращает занятие в баланс (компенсация).
 * Проверяет 24-часовой дедлайн — если меньше, вернёт 422.
 */
export async function cancelBooking(
  bookingId: string,
): Promise<{ error: string | null }> {
  try {
    await api.delete(`/bookings/${bookingId}`);
    return { error: null };
  } catch (err) {
    const message =
      err instanceof ApiError ? err.message : 'Не удалось отменить занятие';
    return { error: message };
  }
}
