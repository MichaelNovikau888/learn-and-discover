import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface MethodModalProps {
  open: boolean;
  onClose: () => void;
}

export function MethodModal({ open, onClose }: MethodModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <VisuallyHidden>
          <DialogTitle>Американская методика Шерил Портер</DialogTitle>
        </VisuallyHidden>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pt-4">
          {/* Cheryl Porter Photo Placeholder */}
          <div className="w-48 h-48 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden">
            <span className="text-6xl">🎤</span>
          </div>

          <h2 className="text-sm font-medium text-primary uppercase tracking-wider text-center mb-2">
            АМЕРИКАНСКАЯ МЕТОДИКА
          </h2>
          <h3 className="text-2xl md:text-3xl font-display font-bold text-center mb-6">
            ШЕРИЛ ПОРТЕР
          </h3>

          <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
            <p>
              Список достижений Шерил длинный; от пения для Папы до итальянского саундтрека к фильму Дисней Король Лев, преподавая и выступая в более чем 35 странах, Шерил сделала все!
            </p>
            <p>
              Ее приглашал Лучано Паваротти, она делила сцену с такими музыкантами, как Дейв Брубек, Боно и U2, Андреа Бочелли, Тито Пуэнте, Братья Блюз, Паоло Конте, Пакито де Ривера, Эми Стюарт, Дэвид Кросби, Мэрайя Кэри и другие.
            </p>
            <p>
              Но ее решение стать тренером по вокалу было принято после того, как у нее возникли вопросы по поводу преподавания. В то время она этого не сделала, но говорит, что разговор с мужем убедил ее в том, что упущенная возможность принесет больше вреда, чем пользы.
            </p>
            <p>
              Это также было началом канала Шерил на YouTube. Она говорит, что записала все свои уроки, чтобы оглянуться на них и узнать, как стать лучшим учителем, но также решила загрузить несколько своих видео, чтобы потенциально помочь другим. Прежде чем она узнала об этом, ее канал собрал более двух миллионов подписчиков за год.
            </p>
            <p className="font-medium text-foreground">
              Особенность ее метода заключается в использовании физических упражнений, спортивного инвентаря и танцев для более эффективного прокачивания нужных мышц. А это — ускоряет процесс улучшения вокальной техники.
            </p>
            <p>
              В нашей школе большинство уроков проходят именно в группе 2-3 чел., что очень прокачивает гармонический слух, избавляет от страхов публичных выступлений, так быстрее и эффективнее идти — прорабатывать общие начальные проблемы (ритм, интонирование, дыхание и пр.), ну и, конечно, вы находите друзей!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
