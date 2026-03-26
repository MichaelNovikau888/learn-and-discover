import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface BookingWithStudent {
  id: string;
  booking_date: string;
  status: string;
  student_id: string;
  schedule_id: string;
  profile?: { first_name: string; last_name: string };
}

interface ScheduleSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  lesson_type: string;
  max_participants: number;
  course?: { name: string };
  bookings: BookingWithStudent[];
}

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

export function TeacherScheduleView() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  useEffect(() => {
    if (user) fetchData();
  }, [user, currentWeekStart]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get teacher record
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!teacher) {
        setSchedules([]);
        setLoading(false);
        return;
      }

      // 2. Get schedules with course info
      const { data: slotsData } = await supabase
        .from('schedules')
        .select('id, day_of_week, start_time, end_time, lesson_type, max_participants, course_id')
        .eq('teacher_id', teacher.id)
        .eq('is_active', true);

      if (!slotsData || slotsData.length === 0) {
        setSchedules([]);
        setLoading(false);
        return;
      }

      // 3. Get course names
      const courseIds = [...new Set(slotsData.map(s => s.course_id))];
      const { data: courses } = await supabase
        .from('courses')
        .select('id, name')
        .in('id', courseIds);

      const courseMap = new Map((courses || []).map(c => [c.id, c]));

      // 4. Get bookings for this week
      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
      const scheduleIds = slotsData.map(s => s.id);

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, booking_date, status, student_id, schedule_id')
        .in('schedule_id', scheduleIds)
        .gte('booking_date', weekStartStr)
        .lte('booking_date', weekEndStr)
        .eq('status', 'confirmed');

      // 5. Get student profiles
      const studentIds = [...new Set((bookingsData || []).map(b => b.student_id))];
      let profileMap = new Map<string, { first_name: string; last_name: string }>();
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', studentIds);
        profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      }

      // 6. Assemble
      const slots: ScheduleSlot[] = slotsData.map(s => ({
        ...s,
        course: courseMap.get(s.course_id),
        bookings: (bookingsData || [])
          .filter(b => b.schedule_id === s.id)
          .map(b => ({ ...b, profile: profileMap.get(b.student_id) })),
      }));

      slots.sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
      setSchedules(slots);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Group by day
  const groupedByDay = schedules.reduce<Record<number, ScheduleSlot[]>>((acc, s) => {
    (acc[s.day_of_week] = acc[s.day_of_week] || []).push(s);
    return acc;
  }, {});

  const getDateForDay = (dayOfWeek: number) => {
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return addDays(currentWeekStart, diff);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(s => subWeeks(s, 1))}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Пред.
        </Button>
        <span className="text-sm font-medium">
          {format(currentWeekStart, 'd MMM', { locale: ru })} — {format(weekEnd, 'd MMM yyyy', { locale: ru })}
        </span>
        <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(s => addWeeks(s, 1))}>
          След. <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            На эту неделю занятий нет
          </CardContent>
        </Card>
      ) : (
        [1, 2, 3, 4, 5, 6, 0].filter(d => groupedByDay[d]).map(day => (
          <div key={day} className="space-y-2">
            <h3 className="font-semibold text-sm">
              {DAY_NAMES[day]}, {format(getDateForDay(day), 'd MMMM', { locale: ru })}
            </h3>
            <div className="grid gap-2">
              {groupedByDay[day].map(slot => (
                <Card key={slot.id} className="shadow-soft">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-medium">
                        {slot.start_time.slice(0, 5)} — {slot.end_time.slice(0, 5)}
                      </span>
                      <Badge variant={slot.lesson_type === 'individual' ? 'default' : 'secondary'}>
                        {slot.lesson_type === 'individual' ? 'Индив.' : 'Групповое'}
                      </Badge>
                      {slot.course && (
                        <Badge variant="outline">{slot.course.name}</Badge>
                      )}
                    </div>
                    {slot.bookings.length > 0 ? (
                      <div className="space-y-1">
                        {slot.bookings.map(b => (
                          <div key={b.id} className="text-sm text-muted-foreground">
                            👤 {b.profile ? `${b.profile.first_name} ${b.profile.last_name}` : 'Ученик'}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Нет записей</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
