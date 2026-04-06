import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, User, Users } from 'lucide-react';
import { DAY_NAMES, type LessonType, type Profile, type Teacher } from '@/lib/types';
import { startOfWeek, addWeeks, subWeeks, addDays, format } from 'date-fns';
import { WeeklyScheduleGrid, TIME_SLOTS, type GridCellData } from '@/components/schedule/WeeklyScheduleGrid';

interface TeacherWithProfile extends Teacher { profile: Profile; }

export function ScheduleManagement() {
  const [teachers, setTeachers] = useState<TeacherWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [weekOffset, setWeekOffset] = useState(0);
  const [cellData, setCellData] = useState<Map<string, GridCellData[]>>(new Map());
  const [allSchedules, setAllSchedules] = useState<any[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    teacher_id: '',
    lesson_type: 'individual' as LessonType,
    day_of_week: 1,
    start_time: '10:00',
    end_time: '11:30',
  });

  const currentWeekStart = useMemo(
    () => addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset),
    [weekOffset]
  );

  const fetchTeachers = useCallback(async () => {
    const { data } = await supabase.from('teachers').select('*').eq('is_active', true);
    if (!data?.length) { setTeachers([]); return; }
    const userIds = data.map(t => t.user_id);
    const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
    const pMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    setTeachers(data.map(t => ({ ...t, profile: pMap.get(t.user_id) as Profile })));
  }, []);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const { data: schedData } = await supabase
      .from('schedules').select('*').order('day_of_week').order('start_time');

    if (!schedData) { setLoading(false); return; }
    setAllSchedules(schedData);

    // Teacher names
    const teacherIds = [...new Set(schedData.map(s => s.teacher_id))];
    const { data: tRows } = await supabase.from('teachers').select('id, user_id').in('id', teacherIds);
    const uids = tRows?.map(t => t.user_id) || [];
    const { data: profs } = await supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', uids);
    const pMap = new Map(profs?.map(p => [p.user_id, p]) || []);
    const tUserMap = new Map(tRows?.map(t => [t.id, t.user_id]) || []);

    const nameMap = new Map<string, string>();
    teacherIds.forEach(tid => {
      const uid = tUserMap.get(tid);
      const p = uid ? pMap.get(uid) : null;
      nameMap.set(tid, p ? `${p.first_name} ${p.last_name}`.trim() : 'Без имени');
    });

    // Bookings for this week
    const weekEnd = addDays(currentWeekStart, 6);
    const { data: bookData } = await supabase
      .from('bookings').select('id, schedule_id, student_id, booking_date, status')
      .gte('booking_date', format(currentWeekStart, 'yyyy-MM-dd'))
      .lte('booking_date', format(weekEnd, 'yyyy-MM-dd'))
      .eq('status', 'confirmed');

    const studentIds = [...new Set((bookData || []).map(b => b.student_id))];
    let spMap = new Map<string, { first_name: string; last_name: string }>();
    if (studentIds.length > 0) {
      const { data: sp } = await supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', studentIds);
      spMap = new Map((sp || []).map(p => [p.user_id, p]));
    }

    const map = new Map<string, GridCellData[]>();
    for (const sched of schedData) {
      const timeKey = sched.start_time.slice(0, 5);
      const key = `${sched.day_of_week}-${timeKey}`;
      const slotBookings = (bookData || []).filter(b => b.schedule_id === sched.id);
      const cell: GridCellData = {
        scheduleId: sched.id,
        teacherId: sched.teacher_id,
        teacherName: nameMap.get(sched.teacher_id) || '',
        lessonType: sched.lesson_type as 'individual' | 'group',
        maxParticipants: sched.max_participants,
        isActive: sched.is_active,
        bookings: slotBookings.map(b => {
          const p = spMap.get(b.student_id);
          return { id: b.id, studentName: p ? `${p.first_name} ${p.last_name}`.trim() : 'Ученик' };
        }),
      };
      map.set(key, [...(map.get(key) || []), cell]);
    }
    setCellData(map);
    setLoading(false);
  }, [currentWeekStart]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);
  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const filteredCellData = useMemo(() => {
    if (selectedTeacher === 'all') return cellData;
    const filtered = new Map<string, GridCellData[]>();
    cellData.forEach((cells, key) => {
      const matching = cells.filter(c => c.teacherId === selectedTeacher);
      if (matching.length) filtered.set(key, matching);
    });
    return filtered;
  }, [cellData, selectedTeacher]);

  const handleCellClick = (dayOfWeek: number, date: Date, timeSlot: string, data: GridCellData[]) => {
    if (data.length === 0) {
      // Open create dialog for this slot
      setEditingId(null);
      setFormData({
        teacher_id: selectedTeacher !== 'all' ? selectedTeacher : '',
        lesson_type: 'individual',
        day_of_week: dayOfWeek,
        start_time: timeSlot,
        end_time: `${(parseInt(timeSlot) + 1).toString().padStart(2, '0')}:30`,
      });
      setDialogOpen(true);
    } else if (data.length === 1) {
      // Edit the existing slot
      const cell = data[0];
      setEditingId(cell.scheduleId || null);
      const sched = allSchedules.find(s => s.id === cell.scheduleId);
      setFormData({
        teacher_id: cell.teacherId || '',
        lesson_type: cell.lessonType || 'individual',
        day_of_week: dayOfWeek,
        start_time: sched?.start_time?.slice(0, 5) || timeSlot,
        end_time: sched?.end_time?.slice(0, 5) || `${(parseInt(timeSlot) + 1).toString().padStart(2, '0')}:30`,
      });
      setDialogOpen(true);
    }
  };

  const handleSubmit = async () => {
    if (!formData.teacher_id) {
      toast({ title: 'Ошибка', description: 'Выберите преподавателя', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const maxP = formData.lesson_type === 'group' ? 3 : 1;

    if (editingId) {
      const { error } = await supabase.from('schedules').update({
        teacher_id: formData.teacher_id,
        lesson_type: formData.lesson_type,
        max_participants: maxP,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
      }).eq('id', editingId);
      if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      else toast({ title: 'Обновлено' });
    } else {
      const { data: courses } = await supabase.from('courses').select('id').limit(1);
      if (!courses?.length) {
        toast({ title: 'Ошибка', description: 'Сначала создайте тариф', variant: 'destructive' });
        setSaving(false);
        return;
      }
      const { error } = await supabase.from('schedules').insert({
        teacher_id: formData.teacher_id,
        lesson_type: formData.lesson_type,
        max_participants: maxP,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        course_id: courses[0].id,
        is_active: true,
      });
      if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      else toast({ title: 'Слот добавлен' });
    }
    setDialogOpen(false);
    setSaving(false);
    fetchSchedules();
  };

  const handleDelete = async () => {
    if (!editingId) return;
    const { error } = await supabase.from('schedules').delete().eq('id', editingId);
    if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    else toast({ title: 'Удалено' });
    setDialogOpen(false);
    fetchSchedules();
  };

  const renderCell = (dayOfWeek: number, time: string, data: GridCellData[]) => {
    if (data.length === 0) {
      return (
        <div className="h-full min-h-[56px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Plus className="h-4 w-4 text-muted-foreground" />
        </div>
      );
    }
    return data.map((cell, i) => {
      const isFilled = (cell.bookings?.length || 0) > 0;
      const isGroup = cell.lessonType === 'group';
      const colorClasses = !cell.isActive
        ? 'bg-muted text-muted-foreground border-muted'
        : isGroup
          ? isFilled
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700'
            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
          : isFilled
            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700'
            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700';

      return (
        <div key={i} className={`rounded px-1.5 py-1 text-[11px] leading-tight border mb-0.5 ${colorClasses}`}>
          <div className="font-medium truncate">{cell.teacherName}</div>
          <div className="flex items-center gap-1">
            <span>{isGroup ? 'Груп.' : 'Инд.'}</span>
            <span className="opacity-70">{cell.bookings?.length || 0}/{cell.maxParticipants}</span>
          </div>
          {cell.bookings?.map((b, bi) => (
            <div key={bi} className="truncate opacity-80">👤 {b.studentName}</div>
          ))}
        </div>
      );
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Все преподаватели" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все преподаватели</SelectItem>
              {teachers.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.profile?.first_name} {t.profile?.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => {
          setEditingId(null);
          setFormData({ teacher_id: '', lesson_type: 'individual', day_of_week: 1, start_time: '10:00', end_time: '11:30' });
          setDialogOpen(true);
        }} disabled={!teachers.length}>
          <Plus className="h-4 w-4 mr-2" />Добавить слот
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-purple-200 dark:bg-purple-900/40 border border-purple-300" /> Индивид. (свободно)</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-900/40 border border-orange-300" /> Индивид. (занято)</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-200 dark:bg-blue-900/40 border border-blue-300" /> Груп. (свободно)</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/40 border border-green-300" /> Груп. (занято)</div>
      </div>

      <WeeklyScheduleGrid
        weekStart={currentWeekStart}
        onPrevWeek={() => setWeekOffset(w => w - 1)}
        onNextWeek={() => setWeekOffset(w => w + 1)}
        onToday={() => setWeekOffset(0)}
        showToday={weekOffset !== 0}
        cellData={filteredCellData}
        onCellClick={handleCellClick}
        renderCell={renderCell}
      />

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Редактировать слот' : 'Новый слот'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Преподаватель *</Label>
              <Select value={formData.teacher_id} onValueChange={v => setFormData({ ...formData, teacher_id: v })}>
                <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.profile?.first_name} {t.profile?.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Тип занятия</Label>
              <Select value={formData.lesson_type} onValueChange={v => setFormData({ ...formData, lesson_type: v as LessonType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual"><div className="flex items-center gap-2"><User className="h-4 w-4" />Индивидуальное</div></SelectItem>
                  <SelectItem value="group"><div className="flex items-center gap-2"><Users className="h-4 w-4" />Групповое (до 3)</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>День недели</Label>
              <Select value={formData.day_of_week.toString()} onValueChange={v => setFormData({ ...formData, day_of_week: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((d, i) => <SelectItem key={i} value={i.toString()}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Начало</Label>
                <Select value={formData.start_time} onValueChange={v => setFormData({ ...formData, start_time: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Конец</Label>
                <Select value={formData.end_time} onValueChange={v => setFormData({ ...formData, end_time: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['11:30','13:30','15:30','17:30','19:30','21:30'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            {editingId && (
              <Button variant="destructive" onClick={handleDelete} className="mr-auto">
                <Trash2 className="h-4 w-4 mr-1" />Удалить
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
