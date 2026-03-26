import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, User, Users, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { DAY_NAMES, type Profile } from '@/lib/types';
import { format, startOfWeek, addDays, addWeeks, isBefore, differenceInHours, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface BookingWithDetails {
  id: string;
  student_id: string;
  schedule_id: string;
  student_course_id: string | null;
  booking_date: string;
  status: string;
  student_profile?: Profile;
  schedule_lesson_type?: string;
}

interface ScheduleSlot {
  id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  lesson_type: string;
  max_participants: number;
  is_active: boolean;
  teacher_name: string;
}

export function AdminScheduleView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    return addWeeks(start, weekOffset);
  }, [weekOffset]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const fetchData = async () => {
    setLoading(true);

    // Fetch schedules with teacher profiles
    const { data: schedData } = await supabase
      .from('schedules')
      .select('*')
      .order('day_of_week')
      .order('start_time');

    if (schedData) {
      const teacherIds = [...new Set(schedData.map(s => s.teacher_id))];
      const { data: teachers } = await supabase
        .from('teachers')
        .select('id, user_id')
        .in('id', teacherIds);

      const userIds = teachers?.map(t => t.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const teacherUserMap = new Map(teachers?.map(t => [t.id, t.user_id]) || []);

      setSchedules(schedData.map(s => {
        const userId = teacherUserMap.get(s.teacher_id);
        const profile = userId ? profileMap.get(userId) : null;
        return {
          ...s,
          teacher_name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Без имени',
        };
      }));
    }

    // Fetch bookings for the week
    const weekEnd = addDays(weekStart, 6);
    const { data: bookData } = await supabase
      .from('bookings')
      .select('*')
      .gte('booking_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('booking_date', format(weekEnd, 'yyyy-MM-dd'))
      .eq('status', 'confirmed');

    if (bookData && bookData.length > 0) {
      const studentIds = [...new Set(bookData.map(b => b.student_id))];
      const { data: studentProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', studentIds);

      const spMap = new Map(studentProfiles?.map(p => [p.user_id, p]) || []);

      // Get schedule lesson types
      const scheduleIds = [...new Set(bookData.map(b => b.schedule_id))];
      const { data: schedLookup } = await supabase
        .from('schedules')
        .select('id, lesson_type')
        .in('id', scheduleIds);
      const lessonTypeMap = new Map(schedLookup?.map(s => [s.id, s.lesson_type]) || []);

      setBookings(bookData.map(b => ({
        ...b,
        student_profile: spMap.get(b.student_id),
        schedule_lesson_type: lessonTypeMap.get(b.schedule_id),
      })));
    } else {
      setBookings([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [weekOffset]);

  const handleAdminCancel = async (booking: BookingWithDetails) => {
    if (!user) return;
    setCancelling(booking.id);

    const schedule = schedules.find(s => s.id === booking.schedule_id);
    if (!schedule) {
      toast({ title: 'Ошибка', description: 'Слот не найден', variant: 'destructive' });
      setCancelling(null);
      return;
    }

    // Check if less than 24h before lesson
    const lessonDateTime = new Date(`${booking.booking_date}T${schedule.start_time}`);
    const now = new Date();
    const hoursUntil = differenceInHours(lessonDateTime, now);
    const penalize = hoursUntil < 24;

    // Cancel the booking
    const { error: cancelError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    if (cancelError) {
      toast({ title: 'Ошибка', description: cancelError.message, variant: 'destructive' });
      setCancelling(null);
      return;
    }

    // If < 24h, deduct a lesson from student_course
    if (penalize && booking.student_course_id) {
      const lessonType = booking.schedule_lesson_type || 'individual';
      const field = lessonType === 'group' ? 'group_lessons_remaining' : 'individual_lessons_remaining';

      // Get current value
      const { data: sc } = await supabase
        .from('student_courses')
        .select('id, individual_lessons_remaining, group_lessons_remaining, lessons_remaining')
        .eq('id', booking.student_course_id)
        .single();

      if (sc) {
        const currentVal = sc[field] as number;
        await supabase
          .from('student_courses')
          .update({
            [field]: Math.max(0, currentVal - 1),
            lessons_remaining: Math.max(0, sc.lessons_remaining - 1),
          })
          .eq('id', booking.student_course_id);
      }
    }

    toast({
      title: 'Занятие отменено',
      description: penalize
        ? 'Менее 24ч до начала — занятие списано с баланса ученика'
        : 'Занятие отменено без штрафа',
    });

    setCancelling(null);
    fetchData();
  };

  const teachers = useMemo(() => {
    const map = new Map<string, string>();
    schedules.forEach(s => map.set(s.teacher_id, s.teacher_name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [schedules]);

  const filteredSchedules = useMemo(() =>
    selectedTeacher === 'all'
      ? schedules
      : schedules.filter(s => s.teacher_id === selectedTeacher),
    [schedules, selectedTeacher]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Все преподаватели" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все преподаватели</SelectItem>
            {teachers.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium whitespace-nowrap">
            {format(weekStart, 'd MMM', { locale: ru })} — {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: ru })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {weekOffset !== 0 && (
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>Сегодня</Button>
          )}
        </div>
      </div>

      {/* Schedule cards by day */}
      {weekDays.map((day, dayIdx) => {
        const jsDay = day.getDay(); // 0=Sun
        const daySchedules = filteredSchedules.filter(s => s.day_of_week === jsDay);
        if (daySchedules.length === 0) return null;

        const dateStr = format(day, 'yyyy-MM-dd');

        return (
          <Card key={dayIdx}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {DAY_NAMES[jsDay]}, {format(day, 'd MMMM', { locale: ru })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {daySchedules.map(schedule => {
                const slotBookings = bookings.filter(
                  b => b.schedule_id === schedule.id && b.booking_date === dateStr
                );

                const lessonDateTime = new Date(`${dateStr}T${schedule.start_time}`);
                const isPast = isBefore(lessonDateTime, new Date());

                return (
                  <div key={schedule.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span>{schedule.start_time.slice(0, 5)} — {schedule.end_time.slice(0, 5)}</span>
                        <span className="text-muted-foreground">·</span>
                        <span>{schedule.teacher_name}</span>
                      </div>
                      <Badge variant={schedule.lesson_type === 'individual' ? 'outline' : 'secondary'}>
                        {schedule.lesson_type === 'individual' ? (
                          <><User className="h-3 w-3 mr-1" />Индивид.</>
                        ) : (
                          <><Users className="h-3 w-3 mr-1" />Группа</>
                        )}
                      </Badge>
                    </div>

                    {slotBookings.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Нет записей</p>
                    ) : (
                      <div className="space-y-1">
                        {slotBookings.map(booking => {
                          const hoursUntil = differenceInHours(lessonDateTime, new Date());
                          const willPenalize = hoursUntil < 24;

                          return (
                            <div key={booking.id} className="flex items-center justify-between gap-2 bg-muted/50 rounded px-2 py-1.5">
                              <span className="text-sm">
                                {booking.student_profile
                                  ? `${booking.student_profile.first_name} ${booking.student_profile.last_name}`.trim()
                                  : 'Ученик'}
                                {booking.student_profile?.phone && (
                                  <span className="text-muted-foreground ml-2 text-xs">{booking.student_profile.phone}</span>
                                )}
                              </span>

                              {!isPast && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-destructive h-7 px-2">
                                      {cancelling === booking.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <><XCircle className="h-3 w-3 mr-1" />Отменить</>
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Отменить занятие?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {willPenalize
                                          ? 'До занятия менее 24 часов. Занятие будет списано с баланса ученика.'
                                          : 'До занятия более 24 часов. Занятие вернётся на баланс ученика.'}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Нет</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleAdminCancel(booking)}>
                                        Да, отменить
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {filteredSchedules.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Нет слотов расписания</p>
        </div>
      )}
    </div>
  );
}
