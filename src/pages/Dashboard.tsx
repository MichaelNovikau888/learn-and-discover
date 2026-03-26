import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { StudentCourse, Booking, Course } from '@/lib/types';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  ArrowRight, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Users,
  FileText,
  ShoppingCart
} from 'lucide-react';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function Dashboard() {
  const { user, loading: authLoading, rolesLoading, isAdmin, isManager, isTeacher } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [studentCourses, setStudentCourses] = useState<StudentCourse[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCourseShop, setShowCourseShop] = useState(false);
  const [warningShown, setWarningShown] = useState(false);
  const [contractCourse, setContractCourse] = useState<Course | null>(null);
  const [contractAccepted, setContractAccepted] = useState(false);

  // Redirect to correct dashboard based on role
  useEffect(() => {
    if (!authLoading && !rolesLoading) {
      if (!user) {
        navigate('/auth');
      } else if (isAdmin) {
        navigate('/admin');
      } else if (isManager) {
        navigate('/manager');
      } else if (isTeacher) {
        navigate('/teacher');
      }
    }
  }, [user, authLoading, rolesLoading, isAdmin, isManager, isTeacher, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch student courses
      const { data: coursesData } = await supabase
        .from('student_courses')
        .select(`*, courses (*)`)
        .eq('student_id', user.id);

      if (coursesData) {
        const mapped = coursesData.map((sc: any) => ({
          ...sc,
          course: sc.courses,
        }));
        setStudentCourses(mapped);
      }

      // Fetch bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          schedules (
            *,
            teachers (
              *,
              profiles:user_id (*)
            ),
            courses (*)
          )
        `)
        .eq('student_id', user.id)
        .order('booking_date', { ascending: true });

      if (bookingsData) {
        const mapped = bookingsData.map((b: any) => ({
          ...b,
          schedule: {
            ...b.schedules,
            teacher: {
              ...b.schedules.teachers,
              profile: b.schedules.teachers.profiles,
            },
            course: b.schedules.courses,
          },
        }));
        setBookings(mapped);
      }

      // Fetch available courses for purchase
      const { data: allCourses } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (allCourses) {
        setAvailableCourses(allCourses as Course[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  // 10% warning effect
  useEffect(() => {
    if (warningShown || studentCourses.length === 0) return;
    
    studentCourses.forEach(sc => {
      const totalInd = sc.course?.individual_lessons || 0;
      const totalGrp = sc.course?.group_lessons || 0;
      const warnings: string[] = [];

      if (totalInd > 0 && sc.individual_lessons_remaining > 0 && sc.individual_lessons_remaining <= Math.ceil(totalInd * 0.1)) {
        warnings.push(`инд.: ${sc.individual_lessons_remaining} из ${totalInd}`);
      }
      if (totalGrp > 0 && sc.group_lessons_remaining > 0 && sc.group_lessons_remaining <= Math.ceil(totalGrp * 0.1)) {
        warnings.push(`груп.: ${sc.group_lessons_remaining} из ${totalGrp}`);
      }

      if (warnings.length > 0) {
        toast({
          title: `⚠️ Курс "${sc.course?.name}" заканчивается`,
          description: `Осталось: ${warnings.join(', ')}. Рекомендуем продлить!`,
          duration: 10000,
        });
        setWarningShown(true);
      }
    });
  }, [studentCourses, warningShown, toast]);

  const canCancelBooking = (booking: Booking) => {
    if (booking.status !== 'confirmed') return false;
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.schedule?.start_time}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilBooking >= 24;
  };

  const handleCancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_by: user?.id,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) {
      toast({ title: 'Ошибка', description: 'Не удалось отменить занятие', variant: 'destructive' });
    } else {
      toast({ title: 'Занятие отменено', description: 'Занятие было успешно отменено' });
      setBookings(prev => 
        prev.map(b => b.id === bookingId 
          ? { ...b, status: 'cancelled' as const, cancelled_at: new Date().toISOString() }
          : b
        )
      );
    }
    setCancellingId(null);
  };

  // Computed values
  const totalIndRemaining = studentCourses.reduce((sum, sc) => sum + sc.individual_lessons_remaining, 0);
  const totalGrpRemaining = studentCourses.reduce((sum, sc) => sum + sc.group_lessons_remaining, 0);
  const totalLessonsRemaining = totalIndRemaining + totalGrpRemaining;

  const today = new Date(new Date().toDateString());
  const weekEnd = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6);
  
  const upcomingBookings = bookings.filter(
    b => b.status === 'confirmed' && new Date(b.booking_date) >= today
  );
  const weekBookings = upcomingBookings.filter(
    b => new Date(b.booking_date) <= weekEnd
  );

  const showNoCoursesWarning = studentCourses.length > 0 && totalLessonsRemaining === 0;

  if (authLoading || rolesLoading || loading) {
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
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">
            Добро пожаловать, {profile?.first_name || 'Ученик'}!
          </h1>
          <p className="text-muted-foreground">Управляйте своими занятиями и курсами</p>
        </div>

        {/* Warning about no lessons */}
        {showNoCoursesWarning && (
          <Card className="mb-6 border-warning bg-warning/10">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertCircle className="h-8 w-8 text-warning flex-shrink-0" />
              <div>
                <p className="font-medium">У вас закончились занятия</p>
                <p className="text-sm text-muted-foreground">
                  Повторная покупка курса будет со скидкой!{' '}
                  <Button variant="link" className="p-0 h-auto" onClick={() => setShowCourseShop(true)}>
                    Выбрать курс
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4.1 Stats Cards — by type */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Индивидуальные</CardTitle>
              <User className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalIndRemaining}</div>
              <p className="text-xs text-muted-foreground">занятий осталось</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Групповые</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalGrpRemaining}</div>
              <p className="text-xs text-muted-foreground">занятий осталось</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">На этой неделе</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{weekBookings.length}</div>
              <p className="text-xs text-muted-foreground">занятий</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Активных курсов</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {studentCourses.filter(sc => sc.individual_lessons_remaining + sc.group_lessons_remaining > 0).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 4.3 My Courses */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-semibold">Мои курсы</h2>
              <Button variant="outline" size="sm" onClick={() => setShowCourseShop(true)}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Купить курс
              </Button>
            </div>

            {studentCourses.length === 0 ? (
              <Card className="shadow-soft">
                <CardContent className="py-8 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">У вас пока нет курсов</p>
                  <Button onClick={() => setShowCourseShop(true)}>Выбрать курс</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {studentCourses.map((sc) => (
                  <Card key={sc.id} className="shadow-soft">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{sc.course?.name || 'Курс'}</CardTitle>
                        <Badge variant={sc.individual_lessons_remaining + sc.group_lessons_remaining > 0 ? 'default' : 'secondary'}>
                          {sc.individual_lessons_remaining + sc.group_lessons_remaining > 0 ? 'Активен' : 'Завершён'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(sc.course?.individual_lessons || 0) > 0 && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-3 w-3 text-primary" />
                              <span>Индивидуальные</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{sc.individual_lessons_remaining} / {sc.course?.individual_lessons}</span>
                              <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(sc.individual_lessons_remaining / (sc.course?.individual_lessons || 1)) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        )}
                        {(sc.course?.group_lessons || 0) > 0 && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-3 w-3 text-primary" />
                              <span>Групповые</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{sc.group_lessons_remaining} / {sc.course?.group_lessons}</span>
                              <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(sc.group_lessons_remaining / (sc.course?.group_lessons || 1)) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* 4.2 Upcoming Bookings — week view with lesson type */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-semibold">Предстоящие занятия</h2>
              <Button size="sm" onClick={() => navigate('/booking')}>
                Записаться <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {weekBookings.length === 0 ? (
              <Card className="shadow-soft">
                <CardContent className="py-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Нет занятий на этой неделе</p>
                  <Button onClick={() => navigate('/booking')}>Записаться на занятие</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {weekBookings.map((booking) => {
                  const bookingDate = parseISO(booking.booking_date);
                  const canCancel = canCancelBooking(booking);
                  const lessonType = booking.schedule?.lesson_type;

                  return (
                    <Card key={booking.id} className={`shadow-soft ${booking.status === 'cancelled' ? 'opacity-60' : ''}`}>
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {lessonType === 'group' ? (
                                <Users className="h-6 w-6 text-primary" />
                              ) : (
                                <User className="h-6 w-6 text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {booking.schedule?.teacher?.profile?.first_name}{' '}
                                {booking.schedule?.teacher?.profile?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{booking.schedule?.course?.name}</p>
                              <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(bookingDate, 'EEEE, d MMMM', { locale: ru })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {booking.schedule?.start_time?.slice(0, 5)}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {lessonType === 'group' ? 'Групповое' : 'Индивидуальное'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {booking.status === 'confirmed' && <Badge variant="default">Подтверждено</Badge>}
                            {booking.status === 'cancelled' && <Badge variant="destructive">Отменено</Badge>}

                            {canCancel && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={cancellingId === booking.id}>
                                    {cancellingId === booking.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <><XCircle className="h-4 w-4 mr-1" />Отменить</>
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Отменить занятие?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Вы уверены, что хотите отменить занятие{' '}
                                      {format(bookingDate, 'd MMMM', { locale: ru })} в{' '}
                                      {booking.schedule?.start_time?.slice(0, 5)}?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Нет, оставить</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleCancelBooking(booking.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Да, отменить
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Show all bookings link */}
            {upcomingBookings.length > weekBookings.length && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Всего предстоящих: {upcomingBookings.length}
              </p>
            )}
          </div>
        </div>

        {/* 4.3 Course Shop Dialog */}
        <Dialog open={showCourseShop} onOpenChange={setShowCourseShop}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Выберите курс (тариф)</DialogTitle>
              <DialogDescription>Выберите подходящий тариф и оплатите онлайн</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {availableCourses.map((course) => {
                const hasDiscount = studentCourses.some(sc => sc.course_id === course.id);
                const price = hasDiscount && course.discount_price ? course.discount_price : course.price;
                const originalPrice = hasDiscount && course.discount_price ? course.price : null;

                return (
                  <Card key={course.id} className="shadow-soft">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{course.name}</CardTitle>
                        {hasDiscount && course.discount_price && (
                          <Badge variant="secondary">Скидка при повторной покупке</Badge>
                        )}
                      </div>
                      {course.description && (
                        <CardDescription>{course.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1 text-sm">
                          {course.individual_lessons > 0 && (
                            <p className="flex items-center gap-1">
                              <User className="h-3 w-3" /> {course.individual_lessons} инд. занятий
                            </p>
                          )}
                          {course.group_lessons > 0 && (
                            <p className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {course.group_lessons} груп. занятий
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {originalPrice && (
                            <p className="text-sm text-muted-foreground line-through">{Number(originalPrice).toLocaleString()} ₽</p>
                          )}
                          <p className="text-2xl font-bold">{Number(price).toLocaleString()} ₽</p>
                          <Button className="mt-2" onClick={() => {
                            if (course.contract_url) {
                              setContractCourse(course);
                              setContractAccepted(false);
                            } else {
                              toast({
                                title: 'Оплата',
                                description: 'Для подключения онлайн-оплаты необходимо настроить Stripe. Обратитесь к администратору.',
                              });
                            }
                          }}>
                            Купить
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {availableCourses.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Нет доступных курсов</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Contract Viewer Dialog */}
        <Dialog open={!!contractCourse} onOpenChange={(open) => { if (!open) { setContractCourse(null); setContractAccepted(false); } }}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Договор — {contractCourse?.name}
              </DialogTitle>
              <DialogDescription>Ознакомьтесь с договором и подтвердите согласие</DialogDescription>
            </DialogHeader>
            {contractCourse?.contract_url && (
              <iframe
                src={contractCourse.contract_url}
                className="w-full flex-1 min-h-[50vh] rounded-md border"
                title="Договор"
              />
            )}
            <div className="flex items-center gap-3 pt-4 border-t">
              <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
                <input
                  type="checkbox"
                  checked={contractAccepted}
                  onChange={(e) => setContractAccepted(e.target.checked)}
                  className="rounded border-input h-4 w-4 accent-primary"
                />
                Я ознакомился(-ась) с договором и принимаю его условия
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setContractCourse(null); setContractAccepted(false); }}>
                Отмена
              </Button>
              <Button
                disabled={!contractAccepted}
                onClick={() => {
                  setContractCourse(null);
                  setContractAccepted(false);
                  toast({
                    title: 'Оплата',
                    description: 'Для подключения онлайн-оплаты необходимо настроить Stripe. Обратитесь к администратору.',
                  });
                }}
              >
                Подтвердить и оплатить
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
