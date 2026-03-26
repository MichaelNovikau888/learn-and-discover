import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Calendar, User, Users } from 'lucide-react';
import { Schedule, Teacher, Profile, DAY_NAMES, LessonType } from '@/lib/types';

interface ScheduleWithRelations extends Schedule {
  teacher: Teacher & { profile: Profile };
}

interface TeacherWithProfile extends Teacher {
  profile: Profile;
}

export function ScheduleManagement() {
  const [schedules, setSchedules] = useState<ScheduleWithRelations[]>([]);
  const [teachers, setTeachers] = useState<TeacherWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleWithRelations | null>(null);
  const { toast } = useToast();

  // Form state - расписание теперь имеет тип занятия (индивидуальное/групповое)
  const [formData, setFormData] = useState({
    teacher_id: '',
    lesson_type: 'individual' as LessonType,
    max_participants: 1,
    day_of_week: 1,
    start_time: '10:00',
    end_time: '11:00',
  });

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return [`${hour}:00`, `${hour}:30`];
  }).flat();

  const fetchSchedules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        *,
        teachers!schedules_teacher_id_fkey (
          *
        )
      `)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Schedule fetch error:', error);
      toast({ title: 'Ошибка', description: 'Не удалось загрузить расписание', variant: 'destructive' });
    } else if (data) {
      // Fetch profiles separately for teachers
      const teacherIds = [...new Set(data.map((s: any) => s.teachers?.user_id).filter(Boolean))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', teacherIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const mapped = data.map((s: any) => ({
        ...s,
        teacher: {
          ...s.teachers,
          profile: profileMap.get(s.teachers?.user_id) || null,
        },
      }));
      setSchedules(mapped);
    }
    setLoading(false);
  };

  const fetchTeachers = async () => {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Teachers fetch error:', error);
      return;
    }

    if (data && data.length > 0) {
      // Fetch profiles separately
      const userIds = data.map(t => t.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const mapped = data.map(t => ({
        ...t,
        profile: profileMap.get(t.user_id) as Profile,
      }));
      setTeachers(mapped);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchTeachers();
  }, []);

  const resetForm = () => {
    setFormData({
      teacher_id: '',
      lesson_type: 'individual',
      max_participants: 1,
      day_of_week: 1,
      start_time: '10:00',
      end_time: '11:00',
    });
    setEditingSchedule(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (schedule: ScheduleWithRelations) => {
    setEditingSchedule(schedule);
    setFormData({
      teacher_id: schedule.teacher_id,
      lesson_type: (schedule.lesson_type as LessonType) || 'individual',
      max_participants: schedule.max_participants || 1,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time.slice(0, 5),
      end_time: schedule.end_time.slice(0, 5),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.teacher_id) {
      toast({ title: 'Ошибка', description: 'Выберите преподавателя', variant: 'destructive' });
      return;
    }

    setSaving(true);

    // Для групповых занятий max_participants = 3, для индивидуальных = 1
    const maxParticipants = formData.lesson_type === 'group' ? 3 : 1;

    const scheduleData = {
      teacher_id: formData.teacher_id,
      lesson_type: formData.lesson_type,
      max_participants: maxParticipants,
      day_of_week: formData.day_of_week,
      start_time: formData.start_time,
      end_time: formData.end_time,
      is_active: true,
      // course_id is now optional, we'll use a placeholder
      course_id: editingSchedule?.course_id || null,
    };

    let error;
    if (editingSchedule) {
      const result = await supabase
        .from('schedules')
        .update(scheduleData)
        .eq('id', editingSchedule.id);
      error = result.error;
    } else {
      // For new schedules, we need to handle the foreign key constraint
      // Get the first course or create a dummy one
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .limit(1);
      
      if (!courses || courses.length === 0) {
        toast({ 
          title: 'Ошибка', 
          description: 'Сначала создайте хотя бы один тариф во вкладке "Курсы"', 
          variant: 'destructive' 
        });
        setSaving(false);
        return;
      }

      const result = await supabase
        .from('schedules')
        .insert({ ...scheduleData, course_id: courses[0].id });
      error = result.error;
    }

    if (error) {
      console.error('Schedule save error:', error);
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Успешно', description: editingSchedule ? 'Расписание обновлено' : 'Слот добавлен' });
      setDialogOpen(false);
      resetForm();
      fetchSchedules();
    }

    setSaving(false);
  };

  const deleteSchedule = async (id: string) => {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить', variant: 'destructive' });
    } else {
      toast({ title: 'Удалено', description: 'Слот расписания удалён' });
      fetchSchedules();
    }
  };

  const toggleScheduleActive = async (schedule: ScheduleWithRelations) => {
    const { error } = await supabase
      .from('schedules')
      .update({ is_active: !schedule.is_active })
      .eq('id', schedule.id);

    if (error) {
      toast({ title: 'Ошибка', description: 'Не удалось изменить статус', variant: 'destructive' });
    } else {
      fetchSchedules();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const noTeachers = teachers.length === 0;

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Управление расписанием
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} disabled={noTeachers} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Добавить слот
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingSchedule ? 'Редактировать слот' : 'Новый слот расписания'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Преподаватель *</Label>
                <Select
                  value={formData.teacher_id}
                  onValueChange={(val) => setFormData({ ...formData, teacher_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите преподавателя" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.profile?.first_name} {teacher.profile?.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Тип занятия *</Label>
                <Select
                  value={formData.lesson_type}
                  onValueChange={(val) => setFormData({ 
                    ...formData, 
                    lesson_type: val as LessonType,
                    max_participants: val === 'group' ? 3 : 1
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Индивидуальное (1 человек)
                      </div>
                    </SelectItem>
                    <SelectItem value="group">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Групповое (до 3 человек)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>День недели</Label>
                <Select
                  value={formData.day_of_week.toString()}
                  onValueChange={(val) => setFormData({ ...formData, day_of_week: parseInt(val) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map((day, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Начало</Label>
                  <Select
                    value={formData.start_time}
                    onValueChange={(val) => setFormData({ ...formData, start_time: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Конец</Label>
                  <Select
                    value={formData.end_time}
                    onValueChange={(val) => setFormData({ ...formData, end_time: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingSchedule ? 'Сохранить' : 'Добавить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {noTeachers ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Для создания расписания сначала добавьте преподавателей</p>
            <p className="text-sm mt-2">Перейдите во вкладку "Преподаватели"</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Расписание пустое. Нажмите "Добавить слот" для создания.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>День</TableHead>
                  <TableHead>Время</TableHead>
                  <TableHead>Преподаватель</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      {DAY_NAMES[schedule.day_of_week]}
                    </TableCell>
                    <TableCell>
                      {schedule.start_time.slice(0, 5)} — {schedule.end_time.slice(0, 5)}
                    </TableCell>
                    <TableCell>
                      {schedule.teacher?.profile?.first_name} {schedule.teacher?.profile?.last_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={schedule.lesson_type === 'individual' ? 'outline' : 'secondary'}>
                        {schedule.lesson_type === 'individual' ? (
                          <><User className="h-3 w-3 mr-1" /> Индивид.</>
                        ) : (
                          <><Users className="h-3 w-3 mr-1" /> Группа (до 3)</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={schedule.is_active ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleScheduleActive(schedule)}
                      >
                        {schedule.is_active ? 'Активен' : 'Скрыт'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(schedule)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteSchedule(schedule.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
