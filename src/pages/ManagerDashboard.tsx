import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, Calendar, CreditCard, UserCog, BookOpen, GraduationCap, ClipboardList } from 'lucide-react';
import { RoleManagement } from '@/components/manager/RoleManagement';
import { CourseManagement } from '@/components/manager/CourseManagement';
import { TeacherManagement } from '@/components/manager/TeacherManagement';
import { ScheduleManagement } from '@/components/manager/ScheduleManagement';
import { TrialRequestsManagement } from '@/components/manager/TrialRequestsManagement';
import { StudentManagement } from '@/components/manager/StudentManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ManagerDashboard() {
  const { user, loading, rolesLoading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('requests');

  useEffect(() => {
    if (!loading && !rolesLoading && (!user || (!hasRole('manager') && !hasRole('admin')))) {
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
      <div className="container py-4 sm:py-8 px-3 sm:px-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold mb-4 sm:mb-6">Панель менеджера</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 mb-4 sm:mb-6">
            <TabsList className="inline-flex h-auto flex-wrap gap-1 w-full">
              <TabsTrigger value="requests" className="flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
                <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Заявки
              </TabsTrigger>
              <TabsTrigger value="courses" className="flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Тарифы
              </TabsTrigger>
              <TabsTrigger value="teachers" className="flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
                <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Препод.
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Расписание
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
                <UserCog className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Роли
              </TabsTrigger>
              <TabsTrigger value="students" className="flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Ученики
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Оплаты
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="requests">
            <TrialRequestsManagement />
          </TabsContent>

          <TabsContent value="courses">
            <CourseManagement />
          </TabsContent>

          <TabsContent value="teachers">
            <TeacherManagement />
          </TabsContent>

          <TabsContent value="schedule">
            <ScheduleManagement />
          </TabsContent>

          <TabsContent value="roles">
            <RoleManagement />
          </TabsContent>

          <TabsContent value="students">
            <StudentManagement />
          </TabsContent>

          <TabsContent value="payments">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Офлайн-оплаты
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Добавление занятий при офлайн-оплате (в разработке)</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
