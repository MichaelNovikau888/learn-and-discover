import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';

interface StudentBooking {
  studentName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  lessonType: string;
  dayOfWeek: number;
}

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

export function TeacherStudentsView() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  useEffect(() => {
    if (user) fetchStudents();
  }, [user]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!teacher) { setStudents([]); setLoading(false); return; }

      const { data: schedules } = await supabase
        .from('schedules')
        .select('id, day_of_week, start_time, end_time, lesson_type')
        .eq('teacher_id', teacher.id)
        .eq('is_active', true);

      if (!schedules || schedules.length === 0) { setStudents([]); setLoading(false); return; }

      const scheduleMap = new Map(schedules.map(s => [s.id, s]));
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

      const { data: bookings } = await supabase
        .from('bookings')
        .select('student_id, schedule_id, booking_date')
        .in('schedule_id', schedules.map(s => s.id))
        .gte('booking_date', weekStartStr)
        .lte('booking_date', weekEndStr)
        .eq('status', 'confirmed');

      if (!bookings || bookings.length === 0) { setStudents([]); setLoading(false); return; }

      const studentIds = [...new Set(bookings.map(b => b.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', studentIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const result: StudentBooking[] = bookings.map(b => {
        const schedule = scheduleMap.get(b.schedule_id)!;
        const profile = profileMap.get(b.student_id);
        return {
          studentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Ученик',
          bookingDate: b.booking_date,
          startTime: schedule.start_time.slice(0, 5),
          endTime: schedule.end_time.slice(0, 5),
          lessonType: schedule.lesson_type,
          dayOfWeek: schedule.day_of_week,
        };
      });

      result.sort((a, b) => a.bookingDate.localeCompare(b.bookingDate) || a.startTime.localeCompare(b.startTime));
      setStudents(result);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
          На этой неделе нет записанных учеников
        </CardContent>
      </Card>
    );
  }

  // Group by date
  const grouped = students.reduce<Record<string, StudentBooking[]>>((acc, s) => {
    (acc[s.bookingDate] = acc[s.bookingDate] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {format(weekStart, 'd MMM', { locale: ru })} — {format(weekEnd, 'd MMM yyyy', { locale: ru })}
      </p>
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} className="space-y-2">
          <h3 className="font-semibold text-sm">
            {DAY_NAMES[new Date(date).getDay()]}, {format(new Date(date), 'd MMMM', { locale: ru })}
          </h3>
          <div className="grid gap-2">
            {items.map((item, i) => (
              <Card key={i} className="shadow-soft">
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                  <span className="font-medium">{item.startTime} — {item.endTime}</span>
                  <Badge variant={item.lessonType === 'individual' ? 'default' : 'secondary'}>
                    {item.lessonType === 'individual' ? 'Индив.' : 'Групповое'}
                  </Badge>
                  <span className="text-sm">👤 {item.studentName}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
