import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, RefreshCw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type StudentStatus = 'all' | 'trial' | 'active' | 'low_balance' | 'inactive' | 'repeat';

interface StudentRow {
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: StudentStatus;
  statusLabel: string;
  courses: {
    course_name: string;
    individual_remaining: number;
    individual_total: number;
    group_remaining: number;
    group_total: number;
    is_repeat: boolean;
  }[];
}

interface TrialStudent {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  status: string;
}

const STATUS_OPTIONS: { value: StudentStatus; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'trial', label: 'На пробное' },
  { value: 'active', label: 'Активные' },
  { value: 'low_balance', label: '10% остатка' },
  { value: 'repeat', label: 'Повторные' },
  { value: 'inactive', label: 'Неактивные' },
];

function getStatusBadge(status: StudentStatus) {
  switch (status) {
    case 'trial':
      return <Badge variant="outline" className="border-blue-500 text-blue-600">На пробное</Badge>;
    case 'active':
      return <Badge className="bg-green-600 hover:bg-green-700">Активный</Badge>;
    case 'low_balance':
      return <Badge className="bg-amber-500 hover:bg-amber-600">10% остатка</Badge>;
    case 'inactive':
      return <Badge variant="secondary">Неактивный</Badge>;
    case 'repeat':
      return <Badge variant="outline" className="border-primary text-primary">Повторный</Badge>;
    default:
      return null;
  }
}

function computeStudentStatus(courses: StudentRow['courses']): { status: StudentStatus; label: string } {
  if (!courses || courses.length === 0) return { status: 'inactive', label: 'Неактивный' };

  const hasRepeat = courses.some(c => c.is_repeat);
  const hasRemaining = courses.some(c => c.individual_remaining > 0 || c.group_remaining > 0);
  const hasLowBalance = courses.some(c => {
    const indTotal = c.individual_total;
    const grpTotal = c.group_total;
    const indLow = indTotal > 0 && c.individual_remaining > 0 && c.individual_remaining <= Math.ceil(indTotal * 0.1);
    const grpLow = grpTotal > 0 && c.group_remaining > 0 && c.group_remaining <= Math.ceil(grpTotal * 0.1);
    return indLow || grpLow;
  });

  if (hasLowBalance) return { status: 'low_balance', label: '10% остатка' };
  if (hasRepeat) return { status: 'repeat', label: 'Повторный' };
  if (hasRemaining) return { status: 'active', label: 'Активный' };
  return { status: 'inactive', label: 'Неактивный' };
}

export function StudentManagement() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StudentStatus>('all');
  const { toast } = useToast();

  const fetchStudents = async () => {
    setLoading(true);

    // Fetch trial requests (new/contacted/scheduled)
    const { data: trialRequests } = await supabase
      .from('trial_requests')
      .select('*')
      .in('status', ['new', 'contacted', 'scheduled'])
      .order('created_at', { ascending: false });

    // Fetch student_courses with course info
    const { data: studentCourses, error: scError } = await supabase
      .from('student_courses')
      .select('*, courses(name, individual_lessons, group_lessons)')
      .order('created_at', { ascending: false });

    if (scError) {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить учеников', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Get profiles for students with courses
    const studentIds = [...new Set((studentCourses || []).map(sc => sc.student_id))];
    let profileMap = new Map<string, { first_name: string; last_name: string; phone: string | null }>();

    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone')
        .in('user_id', studentIds);
      profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    }

    const result: StudentRow[] = [];

    // Add trial students
    if (trialRequests) {
      for (const tr of trialRequests) {
        result.push({
          user_id: `trial-${tr.id}`,
          first_name: tr.first_name,
          last_name: tr.last_name || '',
          phone: tr.phone,
          status: 'trial',
          statusLabel: 'На пробное',
          courses: [],
        });
      }
    }

    // Group course students
    const grouped = new Map<string, StudentRow>();
    for (const sc of (studentCourses || [])) {
      const profile = profileMap.get(sc.student_id);
      if (!grouped.has(sc.student_id)) {
        grouped.set(sc.student_id, {
          user_id: sc.student_id,
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          phone: profile?.phone || null,
          status: 'active',
          statusLabel: 'Активный',
          courses: [],
        });
      }
      const courseData = sc.courses as any;
      grouped.get(sc.student_id)!.courses.push({
        course_name: courseData?.name || 'Без тарифа',
        individual_remaining: sc.individual_lessons_remaining,
        individual_total: courseData?.individual_lessons || 0,
        group_remaining: sc.group_lessons_remaining,
        group_total: courseData?.group_lessons || 0,
        is_repeat: sc.is_repeat_purchase,
      });
    }

    // Compute statuses
    for (const student of grouped.values()) {
      const { status, label } = computeStudentStatus(student.courses);
      student.status = status;
      student.statusLabel = label;
      result.push(student);
    }

    setStudents(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filtered = filter === 'all' ? students : students.filter(s => s.status === filter);

  const counts = {
    all: students.length,
    trial: students.filter(s => s.status === 'trial').length,
    active: students.filter(s => s.status === 'active').length,
    low_balance: students.filter(s => s.status === 'low_balance').length,
    inactive: students.filter(s => s.status === 'inactive').length,
    repeat: students.filter(s => s.status === 'repeat').length,
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
          Ученики ({filtered.length})
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select value={filter} onValueChange={(v) => setFilter(v as StudentStatus)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label} ({counts[opt.value]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchStudents} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Нет учеников в этой категории</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop table */}
            <div className="hidden sm:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ученик</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Тариф</TableHead>
                    <TableHead>Инд.</TableHead>
                    <TableHead>Груп.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((student) =>
                    student.courses.length === 0 ? (
                      <TableRow key={student.user_id}>
                        <TableCell className="font-medium">
                          {student.first_name} {student.last_name}
                        </TableCell>
                        <TableCell>{student.phone || '—'}</TableCell>
                        <TableCell>{getStatusBadge(student.status)}</TableCell>
                        <TableCell colSpan={3} className="text-muted-foreground">—</TableCell>
                      </TableRow>
                    ) : (
                      student.courses.map((course, idx) => (
                        <TableRow key={`${student.user_id}-${idx}`}>
                          {idx === 0 && (
                            <>
                              <TableCell rowSpan={student.courses.length} className="font-medium align-top">
                                {student.first_name} {student.last_name}
                              </TableCell>
                              <TableCell rowSpan={student.courses.length} className="align-top">
                                {student.phone || '—'}
                              </TableCell>
                              <TableCell rowSpan={student.courses.length} className="align-top">
                                {getStatusBadge(student.status)}
                              </TableCell>
                            </>
                          )}
                          <TableCell>{course.course_name}</TableCell>
                          <TableCell>
                            <Badge variant={course.individual_remaining > 0 ? 'default' : 'secondary'}>
                              {course.individual_remaining}/{course.individual_total}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={course.group_remaining > 0 ? 'default' : 'secondary'}>
                              {course.group_remaining}/{course.group_total}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {filtered.map((student) => (
                <Card key={student.user_id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">
                      {student.first_name} {student.last_name}
                    </span>
                    {getStatusBadge(student.status)}
                  </div>
                  {student.phone && (
                    <div className="text-sm text-muted-foreground mb-2">{student.phone}</div>
                  )}
                  {student.courses.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Нет тарифа</div>
                  ) : (
                    student.courses.map((course, idx) => (
                      <div key={idx} className="border-t pt-2 mt-2 first:border-t-0 first:pt-0 first:mt-0">
                        <div className="text-sm font-medium mb-1">{course.course_name}</div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant={course.individual_remaining > 0 ? 'default' : 'secondary'}>
                            Инд: {course.individual_remaining}/{course.individual_total}
                          </Badge>
                          <Badge variant={course.group_remaining > 0 ? 'default' : 'secondary'}>
                            Груп: {course.group_remaining}/{course.group_total}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
