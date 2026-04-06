import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { startOfWeek, addWeeks, subWeeks, addDays, format, differenceInHours, isBefore } from 'date-fns';
import { WeeklyScheduleGrid, type GridCellData } from '@/components/schedule/WeeklyScheduleGrid';

interface TeacherInfo { id: string; name: string; }

export function AdminScheduleView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [cellData, setCellData] = useState<Map<string, GridCellData[]>>(new Map());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [weekOffset, setWeekOffset] = useState(0);

  // Cell click dialog
  const [selectedCell, setSelectedCell] = useState<{ day: number; date: Date; time: string; data: GridCellData[] } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ bookingId: string; studentName: string; scheduleId: string; studentCourseId: string | null; lessonType?: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const currentWeekStart = useMemo(() => addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset), [weekOffset]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Schedules
    const { data: schedData } = await supabase
      .from('schedules').select('*').order('day_of_week').order('start_time');

    if (!schedData) { setLoading(false); return; }

    // Teacher profiles
    const teacherIds = [...new Set(schedData.map(s => s.teacher_id))];
    const { data: teacherRows } = await supabase.from('teachers').select('id, user_id').in('id', teacherIds);
    const userIds = teacherRows?.map(t => t.user_id) || [];
    const { data: profiles } = await supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', userIds);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    const teacherUserMap = new Map(teacherRows?.map(t => [t.id, t.user_id]) || []);

    const teacherNameMap = new Map<string, string>();
    teacherIds.forEach(tid => {
      const uid = teacherUserMap.get(tid);
      const p = uid ? profileMap.get(uid) : null;
      teacherNameMap.set(tid, p ? `${p.first_name} ${p.last_name}`.trim() : 'Без имени');
    });

    setTeachers(Array.from(teacherNameMap.entries()).map(([id, name]) => ({ id, name })));

    // Bookings for week
    const weekEnd = addDays(currentWeekStart, 6);
    const { data: bookData } = await supabase
      .from('bookings').select('*')
      .gte('booking_date', format(currentWeekStart, 'yyyy-MM-dd'))
      .lte('booking_date', format(weekEnd, 'yyyy-MM-dd'))
      .eq('status', 'confirmed');

    const studentIds = [...new Set((bookData || []).map(b => b.student_id))];
    let spMap = new Map<string, { first_name: string; last_name: string; phone: string | null }>();
    if (studentIds.length > 0) {
      const { data: sp } = await supabase.from('profiles').select('user_id, first_name, last_name, phone').in('user_id', studentIds);
      spMap = new Map((sp || []).map(p => [p.user_id, p]));
    }

    // Build grid
    const map = new Map<string, GridCellData[]>();
    for (const sched of schedData) {
      if (!sched.is_active) continue;
      const timeKey = sched.start_time.slice(0, 5);
      const key = `${sched.day_of_week}-${timeKey}`;
      const slotBookings = (bookData || []).filter(b => b.schedule_id === sched.id);
      const cell: GridCellData = {
        scheduleId: sched.id,
        teacherId: sched.teacher_id,
        teacherName: teacherNameMap.get(sched.teacher_id) || '',
        lessonType: sched.lesson_type as 'individual' | 'group',
        maxParticipants: sched.max_participants,
        isActive: sched.is_active,
        bookings: slotBookings.map(b => {
          const p = spMap.get(b.student_id);
          return {
            id: b.id,
            studentName: p ? `${p.first_name} ${p.last_name}`.trim() : 'Ученик',
            studentPhone: p?.phone,
            studentCourseId: b.student_course_id,
          };
        }),
      };
      map.set(key, [...(map.get(key) || []), cell]);
    }

    setCellData(map);
    setLoading(false);
  }, [currentWeekStart]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter by teacher
  const filteredCellData = useMemo(() => {
    if (selectedTeacher === 'all') return cellData;
    const filtered = new Map<string, GridCellData[]>();
    cellData.forEach((cells, key) => {
      const matching = cells.filter(c => c.teacherId === selectedTeacher);
      if (matching.length) filtered.set(key, matching);
    });
    return filtered;
  }, [cellData, selectedTeacher]);

  const handleCellClick = (dayOfWeek: number, date: Date, time: string, data: GridCellData[]) => {
    if (data.length > 0) {
      setSelectedCell({ day: dayOfWeek, date, time, data });
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget || !user) return;
    setCancelling(true);

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancelled_by: user.id, cancelled_at: new Date().toISOString() })
      .eq('id', cancelTarget.bookingId);

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      // Check penalty
      if (selectedCell) {
        const lessonDT = new Date(`${format(selectedCell.date, 'yyyy-MM-dd')}T${selectedCell.time}`);
        const hoursUntil = differenceInHours(lessonDT, new Date());
        if (hoursUntil < 24 && cancelTarget.studentCourseId) {
          const field = cancelTarget.lessonType === 'group' ? 'group_lessons_remaining' : 'individual_lessons_remaining';
          const { data: sc } = await supabase.from('student_courses')
            .select('id, individual_lessons_remaining, group_lessons_remaining, lessons_remaining')
            .eq('id', cancelTarget.studentCourseId).single();
          if (sc) {
            await supabase.from('student_courses').update({
              [field]: Math.max(0, (sc[field] as number) - 1),
              lessons_remaining: Math.max(0, sc.lessons_remaining - 1),
            }).eq('id', cancelTarget.studentCourseId);
          }
          toast({ title: 'Отменено со штрафом', description: 'Менее 24ч — занятие списано с баланса' });
        } else {
          toast({ title: 'Занятие отменено', description: 'Без штрафа' });
        }
      }
      setSelectedCell(null);
      fetchData();
    }
    setCancelling(false);
    setCancelTarget(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
          <SelectTrigger className="w-[220px]">
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

      <WeeklyScheduleGrid
        weekStart={currentWeekStart}
        onPrevWeek={() => setWeekOffset(w => w - 1)}
        onNextWeek={() => setWeekOffset(w => w + 1)}
        onToday={() => setWeekOffset(0)}
        showToday={weekOffset !== 0}
        cellData={filteredCellData}
        onCellClick={handleCellClick}
      />

      {/* Cell detail dialog */}
      <Dialog open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCell && `${format(selectedCell.date, 'dd.MM.yyyy')} — ${selectedCell.time}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {selectedCell?.data.map((cell, ci) => {
              const lessonDT = selectedCell ? new Date(`${format(selectedCell.date, 'yyyy-MM-dd')}T${selectedCell.time}`) : new Date();
              const isPast = isBefore(lessonDT, new Date());

              return (
                <div key={ci} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{cell.teacherName}</span>
                    <Badge variant={cell.lessonType === 'group' ? 'secondary' : 'outline'}>
                      {cell.lessonType === 'group' ? 'Групповое' : 'Индивид.'}
                    </Badge>
                  </div>
                  {cell.bookings && cell.bookings.length > 0 ? (
                    cell.bookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1.5">
                        <div>
                          <span className="text-sm">{b.studentName}</span>
                          {b.studentPhone && <span className="text-xs text-muted-foreground ml-2">{b.studentPhone}</span>}
                        </div>
                        {!isPast && (
                          <Button
                            variant="ghost" size="sm"
                            className="text-destructive h-7 px-2"
                            onClick={() => setCancelTarget({
                              bookingId: b.id,
                              studentName: b.studentName,
                              scheduleId: cell.scheduleId!,
                              studentCourseId: b.studentCourseId || null,
                              lessonType: cell.lessonType,
                            })}
                          >
                            <XCircle className="h-3 w-3 mr-1" />Отменить
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Нет записей</p>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить занятие?</AlertDialogTitle>
            <AlertDialogDescription>
              Отменить запись {cancelTarget?.studentName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Нет</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={cancelling}>
              {cancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Да, отменить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
