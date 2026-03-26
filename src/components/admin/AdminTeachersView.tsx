import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Users, Calendar, XCircle, ChevronLeft, ChevronRight, Music } from 'lucide-react';
import { DAY_NAMES, type Profile } from '@/lib/types';
import { format, startOfWeek, addDays, addWeeks, isBefore, differenceInHours } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TeacherWithProfile {
  id: string;
  user_id: string;
  bio: string | null;
  specialization: string | null;
  avatar_url: string | null;
  is_active: boolean;
  profile: Profile;
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
  course_name: string;
}

interface BookingWithStudent {
  id: string;
  student_id: string;
  schedule_id: string;
  student_course_id: string | null;
  booking_date: string;
  status: string;
  student_name: string;
  student_phone: string | null;
  schedule_lesson_type?: string;
}

export function AdminTeachersView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<TeacherWithProfile[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherWithProfile | null>(null);
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [bookings, setBookings] = useState<BookingWithStudent[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addWeeks(start, weekOffset);
  }, [weekOffset]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const fetchTeachers = async () => {
    setLoading(true);
    const { data: teachersData } = await supabase
      .from('teachers')
      .select('*')
      .eq('is_active', true);

    if (!teachersData) { setLoading(false); return; }

    const userIds = teachersData.map(t => t.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    setTeachers(teachersData.map(t => ({
      ...t,
      profile: profileMap.get(t.user_id) as Profile,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchTeachers(); }, []);

  const fetchTeacherSchedule = async (teacher: TeacherWithProfile) => {
    setScheduleLoading(true);

    const { data: schedData } = await supabase
      .from('schedules')
      .select('*')
      .eq('teacher_id', teacher.id)
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time');

    if (schedData && schedData.length > 0) {
      const courseIds = [...new Set(schedData.map(s => s.course_id))];
      const { data: courses } = await supabase
        .from('courses')
        .select('id, name')
        .in('id', courseIds);
      const courseMap = new Map((courses || []).map(c => [c.id, c.name]));

      setSchedules(schedData.map(s => ({
        ...s,
        course_name: courseMap.get(s.course_id) || 'Курс',
      })));

      // Fetch bookings for this week
      const weekEnd = addDays(weekStart, 6);
      const scheduleIds = schedData.map(s => s.id);
      const { data: bookData } = await supabase
        .from('bookings')
        .select('*')
        .in('schedule_id', scheduleIds)
        .gte('booking_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('booking_date', format(weekEnd, 'yyyy-MM-dd'))
        .eq('status', 'confirmed');

      if (bookData && bookData.length > 0) {
        const studentIds = [...new Set(bookData.map(b => b.student_id))];
        const { data: studentProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', studentIds);
        const spMap = new Map((studentProfiles || []).map(p => [p.user_id, p]));

        setBookings(bookData.map(b => {
          const sp = spMap.get(b.student_id);
          const sched = schedData.find(s => s.id === b.schedule_id);
          return {
            ...b,
            student_name: sp ? `${sp.first_name} ${sp.last_name}`.trim() : 'Ученик',
            student_phone: sp?.phone || null,
            schedule_lesson_type: sched?.lesson_type,
          };
        }));
      } else {
        setBookings([]);
      }
    } else {
      setSchedules([]);
      setBookings([]);
    }

    setScheduleLoading(false);
  };

  useEffect(() => {
    if (selectedTeacher) {
      fetchTeacherSchedule(selectedTeacher);
    }
  }, [selectedTeacher, weekOffset]);

  const handleCancel = async (booking: BookingWithStudent) => {
    if (!user) return;
    setCancelling(booking.id);

    const schedule = schedules.find(s => s.id === booking.schedule_id);
    if (!schedule) {
      toast({ title: 'Ошибка', description: 'Слот не найден', variant: 'destructive' });
      setCancelling(null);
      return;
    }

    const lessonDateTime = new Date(`${booking.booking_date}T${schedule.start_time}`);
    const hoursUntil = differenceInHours(lessonDateTime, new Date());
    const penalize = hoursUntil < 24;

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

    if (penalize && booking.student_course_id) {
      const lessonType = booking.schedule_lesson_type || 'individual';
      const field = lessonType === 'group' ? 'group_lessons_remaining' : 'individual_lessons_remaining';

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
    if (selectedTeacher) fetchTeacherSchedule(selectedTeacher);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Нет активных преподавателей</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map(teacher => {
          const name = teacher.profile
            ? `${teacher.profile.first_name} ${teacher.profile.last_name}`.trim()
            : 'Без имени';
          const initials = teacher.profile
            ? `${teacher.profile.first_name?.[0] || ''}${teacher.profile.last_name?.[0] || ''}`
            : '?';

          return (
            <Card
              key={teacher.id}
              className="shadow-soft hover-lift cursor-pointer transition-all"
              onClick={() => setSelectedTeacher(teacher)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={teacher.avatar_url || teacher.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{name}</p>
                  {teacher.specialization && (
                    <p className="text-sm text-muted-foreground truncate">{teacher.specialization}</p>
                  )}
                  {teacher.profile?.phone && (
                    <p className="text-xs text-muted-foreground">{teacher.profile.phone}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Teacher schedule dialog */}
      <Dialog open={!!selectedTeacher} onOpenChange={(open) => { if (!open) { setSelectedTeacher(null); setWeekOffset(0); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Расписание: {selectedTeacher?.profile
                ? `${selectedTeacher.profile.first_name} ${selectedTeacher.profile.last_name}`.trim()
                : ''}
            </DialogTitle>
          </DialogHeader>

          {/* Week navigation */}
          <div className="flex items-center justify-center gap-2 mb-4">
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

          {scheduleLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : schedules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">У преподавателя нет активных слотов</p>
          ) : (
            <div className="space-y-4">
              {weekDays.map((day, dayIdx) => {
                const jsDay = day.getDay();
                const daySchedules = schedules.filter(s => s.day_of_week === jsDay);
                if (daySchedules.length === 0) return null;

                const dateStr = format(day, 'yyyy-MM-dd');

                return (
                  <div key={dayIdx} className="space-y-2">
                    <h4 className="font-semibold text-sm text-foreground">
                      {DAY_NAMES[jsDay]}, {format(day, 'd MMMM', { locale: ru })}
                    </h4>
                    {daySchedules.map(schedule => {
                      const slotBookings = bookings.filter(
                        b => b.schedule_id === schedule.id && b.booking_date === dateStr
                      );
                      const lessonDateTime = new Date(`${dateStr}T${schedule.start_time}`);
                      const isPast = isBefore(lessonDateTime, new Date());

                      return (
                        <div key={schedule.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex flex-wrap items-center gap-2 justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">
                                {schedule.start_time.slice(0, 5)} — {schedule.end_time.slice(0, 5)}
                              </span>
                              <span className="text-muted-foreground text-xs">{schedule.course_name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge variant={schedule.lesson_type === 'individual' ? 'outline' : 'secondary'} className="text-xs">
                                {schedule.lesson_type === 'individual' ? (
                                  <><User className="h-3 w-3 mr-1" />Индивид.</>
                                ) : (
                                  <><Users className="h-3 w-3 mr-1" />Группа ({slotBookings.length}/{schedule.max_participants})</>
                                )}
                              </Badge>
                              {isPast && <Badge variant="outline" className="text-xs text-muted-foreground">Прошло</Badge>}
                            </div>
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
                                      {booking.student_name}
                                      {booking.student_phone && (
                                        <span className="text-muted-foreground ml-2 text-xs">{booking.student_phone}</span>
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
                                            <AlertDialogAction onClick={() => handleCancel(booking)}>
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
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
