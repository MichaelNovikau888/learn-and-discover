import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, BookOpen, Calendar, Settings, UserCog, Image, ClipboardList, GraduationCap } from 'lucide-react';
import { ContentManagement } from '@/components/admin/ContentManagement';
import { AdminScheduleView } from '@/components/admin/AdminScheduleView';
import { AdminTeachersView } from '@/components/admin/AdminTeachersView';
import { TrialRequestsManagement } from '@/components/manager/TrialRequestsManagement';
import { CourseManagement } from '@/components/manager/CourseManagement';
import { StudentManagement } from '@/components/manager/StudentManagement';

export default function AdminDashboard() {
  const { user, loading, rolesLoading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!loading && !rolesLoading && (!user || !hasRole('admin'))) {
      navigate('/dashboard');
    }
  }, [user, loading, rolesLoading, hasRole, navigate]);

  if (loading || rolesLoading) {
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
        <h1 className="text-3xl font-display font-bold mb-8">Админ-панель</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 flex flex-wrap">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" />
              Заявки
            </TabsTrigger>
            <TabsTrigger value="content">Контент сайта</TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              Тарифы
            </TabsTrigger>
            <TabsTrigger value="schedule">Расписание</TabsTrigger>
            <TabsTrigger value="teachers">Преподаватели</TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" />
              Ученики
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="shadow-soft hover-lift cursor-pointer" onClick={() => setActiveTab('content')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-primary" />
                    Контент сайта
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Управление изображениями и текстами</p>
                </CardContent>
              </Card>

              <Card className="shadow-soft hover-lift cursor-pointer" onClick={() => setActiveTab('courses')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Курсы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Управление курсами и ценами</p>
                </CardContent>
              </Card>

              <Card className="shadow-soft hover-lift cursor-pointer" onClick={() => setActiveTab('teachers')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCog className="h-5 w-5 text-primary" />
                    Преподаватели
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Управление преподавателями</p>
                </CardContent>
              </Card>

              <Card className="shadow-soft hover-lift cursor-pointer" onClick={() => setActiveTab('schedule')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Расписание
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Настройка расписания занятий</p>
                </CardContent>
              </Card>

              <Card className="shadow-soft hover-lift cursor-pointer" onClick={() => setActiveTab('students')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Ученики
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Управление учениками и балансами</p>
                </CardContent>
              </Card>

              <Card className="shadow-soft hover-lift cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Настройки
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Настройки школы</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <TrialRequestsManagement />
          </TabsContent>

          <TabsContent value="courses">
            <CourseManagement />
          </TabsContent>

          <TabsContent value="content">
            <ContentManagement />
          </TabsContent>

          <TabsContent value="schedule">
            <AdminScheduleView />
          </TabsContent>

          <TabsContent value="teachers">
            <AdminTeachersView />
          </TabsContent>

          <TabsContent value="students">
            <StudentManagement />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
