import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Shield, UserCog, GraduationCap, Users } from 'lucide-react';
import { AppRole } from '@/lib/types';

interface UserWithRoles {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: AppRole[];
}

const ROLE_LABELS: Record<AppRole, string> = {
  student: 'Ученик',
  teacher: 'Преподаватель',
  manager: 'Менеджер',
  admin: 'Администратор',
};

const ROLE_ICONS: Record<AppRole, React.ReactNode> = {
  student: <GraduationCap className="h-4 w-4" />,
  teacher: <Users className="h-4 w-4" />,
  manager: <UserCog className="h-4 w-4" />,
  admin: <Shield className="h-4 w-4" />,
};

const ROLE_COLORS: Record<AppRole, string> = {
  student: 'bg-blue-100 text-blue-800',
  teacher: 'bg-green-100 text-green-800',
  manager: 'bg-orange-100 text-orange-800',
  admin: 'bg-red-100 text-red-800',
};

export function RoleManagement() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const fetchUsersWithRoles = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name');

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get user emails from auth (we'll use user_id as fallback)
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => {
        const userRoles = (roles || [])
          .filter(r => r.user_id === profile.user_id)
          .map(r => r.role as AppRole);

        return {
          user_id: profile.user_id,
          email: '', // We can't access auth.users directly
          first_name: profile.first_name,
          last_name: profile.last_name,
          roles: userRoles.length > 0 ? userRoles : ['student' as AppRole],
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список пользователей',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersWithRoles();
  }, []);

  const toggleRole = async (userId: string, role: AppRole, hasRole: boolean) => {
    setSaving(userId);
    try {
      if (hasRole) {
        // Remove role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);

        if (error) throw error;
      } else {
        // Add role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });

        if (error) throw error;
      }

      // Update local state
      setUsers(prev =>
        prev.map(user => {
          if (user.user_id === userId) {
            return {
              ...user,
              roles: hasRole
                ? user.roles.filter(r => r !== role)
                : [...user.roles, role],
            };
          }
          return user;
        })
      );

      toast({
        title: 'Успешно',
        description: hasRole
          ? `Роль "${ROLE_LABELS[role]}" удалена`
          : `Роль "${ROLE_LABELS[role]}" добавлена`,
      });
    } catch (error: any) {
      console.error('Error toggling role:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить роль пользователя',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.first_name.toLowerCase().includes(searchLower) ||
      user.last_name.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          Управление ролями пользователей
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Текущие роли</TableHead>
                <TableHead>Ученик</TableHead>
                <TableHead>Преподаватель</TableHead>
                <TableHead>Менеджер</TableHead>
                <TableHead>Администратор</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {searchQuery ? 'Пользователи не найдены' : 'Нет зарегистрированных пользователей'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div className="font-medium">
                        {user.first_name} {user.last_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className={`${ROLE_COLORS[role]} flex items-center gap-1`}
                          >
                            {ROLE_ICONS[role]}
                            {ROLE_LABELS[role]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    {(['student', 'teacher', 'manager', 'admin'] as AppRole[]).map((role) => (
                      <TableCell key={role}>
                        <Checkbox
                          checked={user.roles.includes(role)}
                          onCheckedChange={() =>
                            toggleRole(user.user_id, role, user.roles.includes(role))
                          }
                          disabled={saving === user.user_id}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>💡 Подсказка: Каждый пользователь может иметь несколько ролей одновременно.</p>
          <ul className="mt-2 space-y-1">
            <li>• <strong>Ученик</strong> — может бронировать занятия и смотреть расписание</li>
            <li>• <strong>Преподаватель</strong> — видит своё расписание и список учеников</li>
            <li>• <strong>Менеджер</strong> — управляет расписанием, курсами и ролями</li>
            <li>• <strong>Администратор</strong> — полный доступ ко всем функциям</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
