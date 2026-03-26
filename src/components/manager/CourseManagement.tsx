import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, BookOpen, FileText, Trash2, Upload } from 'lucide-react';
import { Course } from '@/lib/types';

export function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    individual_lessons: 4,
    group_lessons: 4,
    price: 0,
    discount_price: null as number | null,
    contract_url: null as string | null,
  });

  const fetchCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить курсы', variant: 'destructive' });
    } else {
      setCourses(data as Course[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      individual_lessons: 4,
      group_lessons: 4,
      price: 0,
      discount_price: null,
      contract_url: null,
    });
    setEditingCourse(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      description: course.description || '',
      individual_lessons: course.individual_lessons || 0,
      group_lessons: course.group_lessons || 0,
      price: course.price,
      discount_price: course.discount_price,
      contract_url: course.contract_url,
    });
    setDialogOpen(true);
  };

  const handleUploadContract = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({ title: 'Ошибка', description: 'Допустимы только PDF файлы', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Ошибка', description: 'Максимальный размер файла — 10 МБ', variant: 'destructive' });
      return;
    }

    setUploading(true);
    const fileName = `contracts/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error } = await supabase.storage.from('site-content').upload(fileName, file, {
      contentType: 'application/pdf',
      upsert: false,
    });

    if (error) {
      toast({ title: 'Ошибка загрузки', description: error.message, variant: 'destructive' });
    } else {
      const { data: urlData } = supabase.storage.from('site-content').getPublicUrl(fileName);
      setFormData((prev) => ({ ...prev, contract_url: urlData.publicUrl }));
      toast({ title: 'Готово', description: 'Договор загружен' });
    }
    setUploading(false);
  };

  const removeContract = () => {
    setFormData((prev) => ({ ...prev, contract_url: null }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Ошибка', description: 'Введите название тарифа', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const totalLessons = formData.individual_lessons + formData.group_lessons;

    const courseData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      individual_lessons: formData.individual_lessons,
      group_lessons: formData.group_lessons,
      lessons_count: totalLessons,
      max_participants: 1,
      price: formData.price,
      discount_price: formData.discount_price,
      contract_url: formData.contract_url,
      is_active: true,
    };

    let error;
    if (editingCourse) {
      const result = await supabase
        .from('courses')
        .update(courseData)
        .eq('id', editingCourse.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('courses')
        .insert(courseData);
      error = result.error;
    }

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Успешно', description: editingCourse ? 'Тариф обновлён' : 'Тариф создан' });
      setDialogOpen(false);
      resetForm();
      fetchCourses();
    }

    setSaving(false);
  };

  const toggleCourseActive = async (course: Course) => {
    const { error } = await supabase
      .from('courses')
      .update({ is_active: !course.is_active })
      .eq('id', course.id);

    if (error) {
      toast({ title: 'Ошибка', description: 'Не удалось изменить статус', variant: 'destructive' });
    } else {
      fetchCourses();
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
          <BookOpen className="h-5 w-5 text-primary" />
          Управление тарифами
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Добавить тариф
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCourse ? 'Редактировать тариф' : 'Новый тариф'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Название тарифа *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Базовый / Стандарт / Премиум"
                />
              </div>
              <div>
                <Label>Описание</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Опишите тариф..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Индивидуальных занятий</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.individual_lessons}
                    onChange={(e) => setFormData({ ...formData, individual_lessons: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Групповых занятий</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.group_lessons}
                    onChange={(e) => setFormData({ ...formData, group_lessons: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Всего занятий: {formData.individual_lessons + formData.group_lessons}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Стоимость (BYN)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Цена со скидкой</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.discount_price || ''}
                    onChange={(e) => setFormData({ ...formData, discount_price: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Если есть"
                  />
                </div>
              </div>

              {/* Contract PDF upload */}
              <div>
                <Label>Договор (PDF)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadContract(file);
                    e.target.value = '';
                  }}
                />
                {formData.contract_url ? (
                  <div className="flex items-center gap-2 mt-1.5 p-2 rounded-md border bg-muted/50">
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <a
                      href={formData.contract_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline truncate flex-1"
                    >
                      Просмотреть договор
                    </a>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={removeContract}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full mt-1.5"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploading ? 'Загрузка...' : 'Загрузить PDF'}
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCourse ? 'Сохранить' : 'Создать'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Тарифы ещё не добавлены. Нажмите "Добавить тариф" для создания первого тарифа.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Индивид.</TableHead>
                  <TableHead>Групповых</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Договор</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{course.individual_lessons || 0} инд.</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{course.group_lessons || 0} груп.</Badge>
                    </TableCell>
                    <TableCell>
                      {course.discount_price ? (
                        <div>
                          <span className="line-through text-muted-foreground mr-2">{course.price} BYN</span>
                          <span className="text-primary font-medium">{course.discount_price} BYN</span>
                        </div>
                      ) : (
                        <span>{course.price} BYN</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {course.contract_url ? (
                        <a href={course.contract_url} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="cursor-pointer gap-1">
                            <FileText className="h-3 w-3" /> PDF
                          </Badge>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={course.is_active ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleCourseActive(course)}
                      >
                        {course.is_active ? 'Активен' : 'Скрыт'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(course)}>
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
