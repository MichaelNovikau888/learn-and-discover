import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Schedule, StudentCourse, DAY_NAMES } from '@/lib/types';
import { Calendar, Clock, User, Users, Loader2, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Booking() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [studentCourses, setStudentCourses] = useState<StudentCourse[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedLessonType, setSelectedLessonType] = useState<string>('all');
  const [selectedWeekStart, setSelectedWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      const [coursesRes, schedulesRes, bookingsRes] = await Promise.all([
        supabase
          .from('student_courses')
          .select('*, courses (*)')
          .eq('student_id', user.id)
          .or('individual_lessons_remaining.gt.0,group_lessons_remaining.gt.0'),
        supabase
          .from('schedules')
          .select('*, teachers (*, profiles:user_id (*)), courses (*)')
          .eq('is_active', true),
        supabase
          .from('bookings')
          .select('*')
          .gte('booking_date', format(selectedWeekStart, 'yyyy-MM-dd'))
          .lte('booking_date', format(addDays(selectedWeekStart, 6), 'yyyy-MM-dd'))
          .neq('status', 'cancelled'),
      ]);

      if (coursesRes.data) {
        setStudentCourses(coursesRes.data.map((sc: any) => ({ ...sc, course: sc.courses })));
      }
      if (schedulesRes.data) {
        setSchedules(schedulesRes.data.map((s: any) => ({
          ...s,
          teacher: { ...s.teachers, profile: s.teachers?.profiles },
          course: s.courses,
        })));
      }
      if (bookingsRes.data) {
        setExistingBookings(bookingsRes.data);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, selectedWeekStart]);

  // Unique teachers for filter
  const teachers = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    schedules.forEach(s => {
      if (s.teacher) {
        map.set(s.teacher.id, {
          id: s.teacher.id,
          name: `${s.teacher.profile?.first_name || ''} ${s.teacher.profile?.last_name || ''}`.trim(),
        });
      }
    });
    return Array.from(map.values());
  }, [schedules]);

  // Check if student has remaining lessons of this type
  const hasLessonsForType = (lessonType: string) => {
    if (lessonType === 'individual') {
      return studentCourses.some(sc => sc.individual_lessons_remaining > 0);
    }
    return studentCourses.some(sc => sc.group_lessons_remaining > 0);
  };

  // Find the right student_course for booking
  const findStudentCourseForSchedule = (schedule: Schedule) => {
    const lessonType = schedule.lesson_type;
    return studentCourses.find(sc => {
      if (lessonType === 'individual') return sc.individual_lessons_remaining > 0;
      return sc.group_lessons_remaining > 0;
    });
  };

  const getAvailableSlots = () => {
    let filtered = schedules;
    
    if (selectedTeacher !== 'all') {
      filtered = filtered.filter(s => s.teacher?.id === selectedTeacher);
    }
    if (selectedLessonType !== 'all') {
      filtered = filtered.filter(s => s.lesson_type === selectedLessonType);
    }

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(selectedWeekStart, i));

    return weekDays.flatMap(day => {
      const dayOfWeek = day.getDay();
      return filtered.filter(s => s.day_of_week === dayOfWeek).map(schedule => {
        const bookingsForSlot = existingBookings.filter(
          b => b.schedule_id === schedule.id && b.booking_date === format(day, 'yyyy-MM-dd')
        );
        const maxP = schedule.max_participants || 1;
        const availableSpots = maxP - bookingsForSlot.length;
        const isUserBooked = bookingsForSlot.some(b => b.student_id === user?.id);

        return {
          schedule,
          date: day,
          availableSpots,
          isUserBooked,
          isFull: availableSpots <= 0,
          isPast: day < new Date(new Date().toDateString()),
          hasLessons: hasLessonsForType(schedule.lesson_type),
        };
      });
    }).sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const handleBook = async (scheduleId: string, date: Date, lessonType: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const studentCourse = findStudentCourseForSchedule(schedule);
    if (!studentCourse) {
      toast({ title: 'Ошибка', description: 'Нет оставшихся занятий этого типа', variant: 'destructive' });
      return;
    }

    setBooking(true);

    const { error: bookingError } = await supabase
      .from('bookings')
      .insert({
        student_id: user?.id,
        schedule_id: scheduleId,
        student_course_id: studentCourse.id,
        booking_date: format(date, 'yyyy-MM-dd'),
        status: 'confirmed',
      });

    if (bookingError) {
      toast({ title: 'Ошибка', description: 'Не удалось записаться на занятие', variant: 'destructive' });
      setBooking(false);
      return;
    }

    // Decrease the right type of lessons
    const updateField = lessonType === 'individual' 
      ? { individual_lessons_remaining: studentCourse.individual_lessons_remaining - 1, lessons_remaining: studentCourse.lessons_remaining - 1 }
      : { group_lessons_remaining: studentCourse.group_lessons_remaining - 1, lessons_remaining: studentCourse.lessons_remaining - 1 };

    await supabase.from('student_courses').update(updateField).eq('id', studentCourse.id);

    // Update local state
    setStudentCourses(prev =>
      prev.map(sc => sc.id === studentCourse.id ? { ...sc, ...updateField } : sc)
    );
    setExistingBookings(prev => [...prev, {
      schedule_id: scheduleId,
      booking_date: format(date, 'yyyy-MM-dd'),
      student_id: user?.id,
    }]);

    toast({ title: 'Записались!', description: `Вы записаны на ${format(date, 'd MMMM', { locale: ru })}` });
    setBooking(false);
  };

  const slots = getAvailableSlots();
  const hasAnyCourses = studentCourses.length > 0;

  if (authLoading || loading) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="container py-8">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Назад
        </Button>

        <h1 className="text-3xl font-display font-bold mb-2">Записаться на занятие</h1>
        <p className="text-muted-foreground mb-8">
          Выберите преподавателя, тип занятия и удобное время
        </p>

        {!hasAnyCourses ? (
          <Card className="shadow-soft">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет активных курсов</h3>
              <p className="text-muted-foreground mb-4">Для записи необходимо приобрести курс</p>
              <Button onClick={() => navigate('/dashboard')}>В личный кабинет</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters */}
            <Card className="shadow-soft mb-6">
              <CardContent className="py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Преподаватель</label>
                    <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все преподаватели" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все преподаватели</SelectItem>
                        {teachers.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Тип занятия</label>
                    <Select value={selectedLessonType} onValueChange={setSelectedLessonType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все типы" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все типы</SelectItem>
                        <SelectItem value="individual">Индивидуальное</SelectItem>
                        <SelectItem value="group">Групповое</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Remaining lessons info */}
                <div className="flex gap-4 mt-4 text-sm">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3 text-primary" />
                    Инд.: <strong>{studentCourses.reduce((s, sc) => s + sc.individual_lessons_remaining, 0)}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-primary" />
                    Груп.: <strong>{studentCourses.reduce((s, sc) => s + sc.group_lessons_remaining, 0)}</strong>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Week navigation */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <Button variant="outline" onClick={() => setSelectedWeekStart(prev => addDays(prev, -7))}>
                ← Пред. неделя
              </Button>
              <h2 className="text-lg font-semibold text-center">
                {format(selectedWeekStart, 'd MMMM', { locale: ru })} —{' '}
                {format(addDays(selectedWeekStart, 6), 'd MMMM yyyy', { locale: ru })}
              </h2>
              <Button variant="outline" onClick={() => setSelectedWeekStart(prev => addDays(prev, 7))}>
                След. неделя →
              </Button>
            </div>

            {/* Slots */}
            {slots.length === 0 ? (
              <Card className="shadow-soft">
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Нет доступных занятий на этой неделе</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slots.map((slot) => (
                  <Card
                    key={`${slot.schedule.id}-${slot.date.toISOString()}`}
                    className={`shadow-soft ${slot.isPast || slot.isFull || !slot.hasLessons ? 'opacity-60' : ''}`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium">{format(slot.date, 'EEEE, d MMMM', { locale: ru })}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            {slot.schedule.start_time?.slice(0, 5)} — {slot.schedule.end_time?.slice(0, 5)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-xs">
                            {slot.schedule.lesson_type === 'group' ? 'Групповое' : 'Индивидуальное'}
                          </Badge>
                          {slot.isUserBooked ? (
                            <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Записаны</Badge>
                          ) : slot.isFull ? (
                            <Badge variant="destructive">Нет мест</Badge>
                          ) : slot.isPast ? (
                            <Badge variant="secondary">Прошло</Badge>
                          ) : !slot.hasLessons ? (
                            <Badge variant="secondary">Нет занятий</Badge>
                          ) : (
                            <Badge variant="outline">
                              {slot.availableSpots} {slot.availableSpots === 1 ? 'место' : 'мест'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {slot.schedule.lesson_type === 'group' ? (
                            <Users className="h-4 w-4 text-primary" />
                          ) : (
                            <User className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {slot.schedule.teacher?.profile?.first_name}{' '}
                            {slot.schedule.teacher?.profile?.last_name}
                          </p>
                          {slot.schedule.teacher?.specialization && (
                            <p className="text-xs text-muted-foreground">{slot.schedule.teacher.specialization}</p>
                          )}
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        disabled={slot.isPast || slot.isFull || slot.isUserBooked || !slot.hasLessons || booking}
                        onClick={() => handleBook(slot.schedule.id, slot.date, slot.schedule.lesson_type)}
                      >
                        {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : slot.isUserBooked ? 'Вы уже записаны' : 'Записаться'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
