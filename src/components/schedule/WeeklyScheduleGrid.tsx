import { useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DAY_NAMES_SHORT } from '@/lib/types';

// Time slots: 10:00, 12:00, 14:00, 16:00, 18:00, 20:00
export const TIME_SLOTS = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

export interface GridCellData {
  scheduleId?: string;
  teacherId?: string;
  teacherName?: string;
  lessonType?: 'individual' | 'group';
  isActive?: boolean;
  bookings?: {
    id: string;
    studentName: string;
    studentPhone?: string | null;
    studentCourseId?: string | null;
  }[];
  maxParticipants?: number;
}

interface WeeklyScheduleGridProps {
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday?: () => void;
  showToday?: boolean;
  /** Map key: "dayOfWeek-timeSlot" e.g. "1-10:00" */
  cellData: Map<string, GridCellData[]>;
  onCellClick?: (dayOfWeek: number, date: Date, timeSlot: string, data: GridCellData[]) => void;
  renderCell?: (dayOfWeek: number, timeSlot: string, data: GridCellData[]) => React.ReactNode;
  title?: string;
}

export function WeeklyScheduleGrid({
  weekStart,
  onPrevWeek,
  onNextWeek,
  onToday,
  showToday = false,
  cellData,
  onCellClick,
  renderCell,
  title,
}: WeeklyScheduleGridProps) {
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  return (
    <div className="space-y-3">
      {/* Header with navigation */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {title && <h3 className="text-lg font-semibold">{title}</h3>}
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="icon" onClick={onPrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium whitespace-nowrap min-w-[160px] text-center">
            {format(weekStart, 'd MMM', { locale: ru })} — {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: ru })}
          </span>
          <Button variant="outline" size="icon" onClick={onNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {showToday && onToday && (
            <Button variant="ghost" size="sm" onClick={onToday}>Сегодня</Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <ScrollArea className="w-full">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border border-border rounded-lg overflow-hidden">
            {/* Header row */}
            <div className="bg-muted/50 p-2 text-xs font-medium text-muted-foreground border-b border-r border-border flex items-center justify-center">
              Время
            </div>
            {weekDays.map((day, i) => {
              const jsDay = day.getDay();
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              return (
                <div
                  key={i}
                  className={cn(
                    'p-2 text-center border-b border-r border-border last:border-r-0',
                    isToday ? 'bg-primary/10 font-semibold' : 'bg-muted/50',
                  )}
                >
                  <div className="text-xs font-medium">{DAY_NAMES_SHORT[jsDay]}</div>
                  <div className={cn('text-sm', isToday && 'text-primary')}>
                    {format(day, 'd', { locale: ru })}
                  </div>
                </div>
              );
            })}

            {/* Time rows */}
            {TIME_SLOTS.map((time) => (
              <>
                <div
                  key={`time-${time}`}
                  className="p-2 text-xs font-medium text-muted-foreground border-b border-r border-border flex items-center justify-center bg-muted/30 last:border-b-0"
                >
                  {time}
                </div>
                {weekDays.map((day, i) => {
                  const jsDay = day.getDay();
                  const key = `${jsDay}-${time}`;
                  const cells = cellData.get(key) || [];
                  const hasData = cells.length > 0;
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                  return (
                    <div
                      key={`${time}-${i}`}
                      className={cn(
                        'border-b border-r border-border last:border-r-0 last:border-b-0 min-h-[60px] p-1 transition-colors cursor-pointer',
                        isToday && 'bg-primary/5',
                        !hasData && 'hover:bg-muted/30',
                      )}
                      onClick={() => onCellClick?.(jsDay, day, time, cells)}
                    >
                      {renderCell
                        ? renderCell(jsDay, time, cells)
                        : cells.map((cell, ci) => (
                            <DefaultCell key={ci} data={cell} />
                          ))}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

function DefaultCell({ data }: { data: GridCellData }) {
  const colorClasses = data.lessonType === 'group'
    ? 'bg-accent text-accent-foreground border-accent'
    : 'bg-primary/15 text-primary border-primary/30';

  return (
    <div className={cn('rounded px-1.5 py-1 text-[11px] leading-tight border mb-0.5', colorClasses)}>
      {data.teacherName && (
        <div className="font-medium truncate">{data.teacherName}</div>
      )}
      <div className="truncate">
        {data.lessonType === 'group' ? 'Груп.' : 'Индив.'}
        {data.bookings && data.bookings.length > 0 && (
          <span className="ml-1 opacity-70">
            ({data.bookings.length}/{data.maxParticipants || 1})
          </span>
        )}
      </div>
      {data.bookings?.map((b, i) => (
        <div key={i} className="truncate opacity-80">👤 {b.studentName}</div>
      ))}
    </div>
  );
}
