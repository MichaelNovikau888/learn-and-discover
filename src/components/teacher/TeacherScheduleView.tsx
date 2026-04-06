import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { startOfWeek, addWeeks, subWeeks, format, addDays } from 'date-fns';
import { WeeklyScheduleGrid, TIME_SLOTS, type GridCellData } from '@/components/schedule/WeeklyScheduleGrid';

export function TeacherScheduleView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cellData, setCellData] = useState<Map<string, GridCellData[]>>(new Map());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: teacher } = await supabase
      .from('teachers').select('id').eq('user_id', user.id).maybeSingle();
    if (!teacher) { setCellData(new Map()); setLoading(false); return; }

    const { data: slots } = await supabase
      .from('schedules')
      .select('id, day_of_week, start_time, end_time, lesson_type, max_participants, course_id')
      .eq('teacher_id', teacher.id).eq('is_active', true);

    if (!slots?.length) { setCellData(new Map()); setLoading(false); return; }

    const weekEnd = addDays(weekStart, 6);
    const scheduleIds = slots.map(s => s.id);

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('id, booking_date, status, student_id, schedule_id')
      .in('schedule_id', scheduleIds)
      .gte('booking_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('booking_date', format(weekEnd, 'yyyy-MM-dd'))
      .eq('status', 'confirmed');

    const studentIds = [...new Set((bookingsData || []).map(b => b.student_id))];
    let profileMap = new Map<string, { first_name: string; last_name: string }>();
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles').select('user_id, first_name, last_name').in('user_id', studentIds);
      profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    }

    const map = new Map<string, GridCellData[]>();
    for (const slot of slots) {
      const timeKey = slot.start_time.slice(0, 5);
      const key = `${slot.day_of_week}-${timeKey}`;
      const slotBookings = (bookingsData || []).filter(b => b.schedule_id === slot.id);
      const cell: GridCellData = {
        scheduleId: slot.id,
        lessonType: slot.lesson_type as 'individual' | 'group',
        maxParticipants: slot.max_participants,
        bookings: slotBookings.map(b => {
          const p = profileMap.get(b.student_id);
          return { id: b.id, studentName: p ? `${p.first_name} ${p.last_name}`.trim() : 'Ученик' };
        }),
      };
      map.set(key, [...(map.get(key) || []), cell]);
    }
    setCellData(map);
    setLoading(false);
  }, [user, weekStart]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <WeeklyScheduleGrid
      title="Моё расписание"
      weekStart={weekStart}
      onPrevWeek={() => setWeekStart(s => subWeeks(s, 1))}
      onNextWeek={() => setWeekStart(s => addWeeks(s, 1))}
      onToday={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
      showToday
      cellData={cellData}
    />
  );
}
