import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, MessageCircle, Calendar, Eye, RefreshCw } from 'lucide-react';
import { TrialRequest } from '@/lib/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  new: { label: 'Новая', variant: 'default' },
  contacted: { label: 'Связались', variant: 'secondary' },
  scheduled: { label: 'Записан', variant: 'outline' },
  completed: { label: 'Завершён', variant: 'outline' },
  cancelled: { label: 'Отменён', variant: 'destructive' },
};

export function TrialRequestsManagement() {
  const [requests, setRequests] = useState<TrialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TrialRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trial_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching trial requests:', error);
      toast({ title: 'Ошибка', description: 'Не удалось загрузить заявки', variant: 'destructive' });
    } else {
      setRequests(data as TrialRequest[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('trial_requests')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({ title: 'Ошибка', description: 'Не удалось обновить статус', variant: 'destructive' });
    } else {
      toast({ title: 'Успешно', description: 'Статус обновлён' });
      fetchRequests();
    }
  };

  const openDetails = (request: TrialRequest) => {
    setSelectedRequest(request);
    setNotes(request.notes || '');
    setDialogOpen(true);
  };

  const saveNotes = async () => {
    if (!selectedRequest) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('trial_requests')
      .update({ notes })
      .eq('id', selectedRequest.id);

    if (error) {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить заметки', variant: 'destructive' });
    } else {
      toast({ title: 'Успешно', description: 'Заметки сохранены' });
      fetchRequests();
      setDialogOpen(false);
    }
    setSaving(false);
  };

  const newRequestsCount = requests.filter(r => r.status === 'new').length;

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
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Calendar className="h-5 w-5 text-primary" />
          Заявки на пробное занятие
          {newRequestsCount > 0 && (
            <Badge variant="destructive">{newRequestsCount} новых</Badge>
          )}
        </CardTitle>
        <Button variant="outline" onClick={fetchRequests} className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Заявок пока нет</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Имя</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id} className={request.status === 'new' ? 'bg-primary/5' : ''}>
                    <TableCell className="text-sm">
                      {format(new Date(request.created_at), 'dd MMM, HH:mm', { locale: ru })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {request.first_name} {request.last_name}
                    </TableCell>
                    <TableCell>
                      <a href={`tel:${request.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                        <Phone className="h-3 w-3" />
                        {request.phone}
                      </a>
                    </TableCell>
                    <TableCell>
                      {request.wants_whatsapp ? (
                        <a 
                          href={`https://wa.me/${request.phone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-green-600 hover:underline"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Да
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Нет</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={request.status}
                        onValueChange={(val) => updateStatus(request.id, val)}
                      >
                        <SelectTrigger className="w-32">
                          <Badge variant={statusLabels[request.status]?.variant || 'default'}>
                            {statusLabels[request.status]?.label || request.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openDetails(request)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Детали заявки</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Имя:</span>
                  <p className="font-medium">{selectedRequest.first_name} {selectedRequest.last_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Телефон:</span>
                  <p className="font-medium">{selectedRequest.phone}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">WhatsApp:</span>
                  <p className="font-medium">{selectedRequest.wants_whatsapp ? 'Да' : 'Нет'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Дата заявки:</span>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.created_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Заметки:</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Добавьте заметки о клиенте..."
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Закрыть</Button>
            <Button onClick={saveNotes} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
