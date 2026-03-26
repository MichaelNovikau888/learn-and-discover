import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Calendar, Users } from 'lucide-react';
import { TeacherScheduleView } from '@/components/teacher/TeacherScheduleView';
import { TeacherStudentsView } from '@/components/teacher/TeacherStudentsView';

export default function TeacherDashboard() {
  const { user, loading, rolesLoading, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !rolesLoading && (!user || (!hasRole('teacher') && !hasRole('admin')))) {
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
      <div className="container py-6 space-y-4">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Панель преподавателя</h1>

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="schedule" className="gap-1.5">
              <Calendar className="h-4 w-4" /> Моё расписание
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5">
              <Users className="h-4 w-4" /> Мои ученики
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <TeacherScheduleView />
          </TabsContent>
          <TabsContent value="students">
            <TeacherStudentsView />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
