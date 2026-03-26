import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Users, UserPlus, Upload } from 'lucide-react';
import { Teacher, Profile } from '@/lib/types';

interface TeacherWithProfile extends Teacher {
  profile: Profile;
}

interface UserWithProfile {
  user_id: string;
  first_name: string;
  last_name: string;
}

export function TeacherManagement() {
  const [teachers, setTeachers] = useState<TeacherWithProfile[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherWithProfile | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    user_id: '',
    bio: '',
    specialization: '',
  });

  const fetchTeachers = async () => {
    setLoading(true);
    const { data: teachersData, error } = await supabase
      .from('teachers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить преподавателей', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const userIds = (teachersData || []).map(t => t.user_id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', userIds);

    const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));

    const merged = (teachersData || []).map(t => ({
      ...t,
      profile: profileMap.get(t.user_id) as Profile,
    }));

    setTeachers(merged);
    setLoading(false);
  };

  const fetchAvailableUsers = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name');

    const { data: existingTeachers } = await supabase
      .from('teachers')
      .select('user_id');

    const existingIds = new Set((existingTeachers || []).map(t => t.user_id));
    const available = (profiles || []).filter(p => !existingIds.has(p.user_id));
    setAvailableUsers(available);
  };

  useEffect(() => {
    fetchTeachers();
    fetchAvailableUsers();
  }, []);

  const resetForm = () => {
    setFormData({ user_id: '', bio: '', specialization: '' });
    setEditingTeacher(null);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const openCreateDialog = () => {
    resetForm();
    fetchAvailableUsers();
    setDialogOpen(true);
  };

  const openEditDialog = (teacher: TeacherWithProfile) => {
    setEditingTeacher(teacher);
    setFormData({
      user_id: teacher.user_id,
      bio: teacher.bio || '',
      specialization: teacher.specialization || '',
    });
    setAvatarPreview(teacher.avatar_url || null);
    setAvatarFile(null);
    setDialogOpen(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Ошибка', description: 'Файл слишком большой (макс. 5 МБ)', variant: 'destructive' });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (teacherId: string): Promise<string | null> => {
    if (!avatarFile) return null;
    const ext = avatarFile.name.split('.').pop();
    const path = `teachers/${teacherId}.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true });

    if (error) {
      console.error('Avatar upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    return `${urlData.publicUrl}?t=${Date.now()}`;
  };

  const handleSubmit = async () => {
    if (!editingTeacher && !formData.user_id) {
      toast({ title: 'Ошибка', description: 'Выберите пользователя', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const teacherData: any = {
      bio: formData.bio.trim() || null,
      specialization: formData.specialization.trim() || null,
    };

    let teacherId: string | null = null;

    if (editingTeacher) {
      teacherId = editingTeacher.id;
      const { error } = await supabase
        .from('teachers')
        .update(teacherData)
        .eq('id', editingTeacher.id);
      if (error) {
        toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from('teachers')
        .insert({ ...teacherData, user_id: formData.user_id, is_active: true })
        .select('id')
        .single();
      if (error) {
        toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
      teacherId = data.id;

      // Add teacher role
      await supabase
        .from('user_roles')
        .insert({ user_id: formData.user_id, role: 'teacher' });
    }

    // Upload avatar if selected
    if (avatarFile && teacherId) {
      const avatarUrl = await uploadAvatar(teacherId);
      if (avatarUrl) {
        await supabase
          .from('teachers')
          .update({ avatar_url: avatarUrl })
          .eq('id', teacherId);
      }
    }

    toast({ title: 'Успешно', description: editingTeacher ? 'Данные обновлены' : 'Преподаватель добавлен' });
    setDialogOpen(false);
    resetForm();
    fetchTeachers();
    fetchAvailableUsers();
    setSaving(false);
  };

  const toggleTeacherActive = async (teacher: TeacherWithProfile) => {
    const { error } = await supabase
      .from('teachers')
      .update({ is_active: !teacher.is_active })
      .eq('id', teacher.id);

    if (error) {
      toast({ title: 'Ошибка', description: 'Не удалось изменить статус', variant: 'destructive' });
    } else {
      fetchTeachers();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Управление преподавателями
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4 mr-2" />
              Добавить преподавателя
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTeacher ? `Редактировать: ${editingTeacher.profile?.first_name} ${editingTeacher.profile?.last_name}` : 'Новый преподаватель'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!editingTeacher && (
                <div>
                  <Label>Пользователь *</Label>
                  <Select
                    value={formData.user_id}
                    onValueChange={(val) => setFormData({ ...formData, user_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите пользователя" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">Нет доступных пользователей</div>
                      ) : (
                        availableUsers.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.first_name} {user.last_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Пользователь должен сначала зарегистрироваться в системе
                  </p>
                </div>
              )}

              {/* Avatar Upload */}
              <div>
                <Label>Фото преподавателя</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarPreview || undefined} />
                    <AvatarFallback className="text-2xl">👩‍🏫</AvatarFallback>
                  </Avatar>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {avatarPreview ? 'Заменить фото' : 'Загрузить фото'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG до 5 МБ</p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Специализация</Label>
                <Input
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="Эстрадный вокал, академический вокал..."
                />
              </div>
              <div>
                <Label>О преподавателе</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Опыт работы, достижения, образование..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingTeacher ? 'Сохранить' : 'Добавить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {teachers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Преподаватели ещё не добавлены.</p>
            <p className="text-sm">Нажмите "Добавить преподавателя", чтобы назначить зарегистрированного пользователя преподавателем.</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Фото</TableHead>
                  <TableHead>Имя</TableHead>
                  <TableHead>Специализация</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={teacher.avatar_url || undefined} />
                        <AvatarFallback>
                          {(teacher.profile?.first_name?.[0] || '') + (teacher.profile?.last_name?.[0] || '')}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {teacher.profile?.first_name} {teacher.profile?.last_name}
                    </TableCell>
                    <TableCell>
                      {teacher.specialization || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={teacher.is_active ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleTeacherActive(teacher)}
                      >
                        {teacher.is_active ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(teacher)}>
                        <Pencil className="h-4 w-4" />
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
