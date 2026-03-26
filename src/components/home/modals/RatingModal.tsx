import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  yandexUrl?: string;
}

export function RatingModal({ open, onClose, yandexUrl }: RatingModalProps) {
  const mapUrl = yandexUrl || 'https://yandex.by/maps/org/fa_sol/59207148345/?ll=27.580094%2C53.920990&z=15.3';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Рейтинг школы на Яндекс Картах</DialogTitle>
        </VisuallyHidden>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 bg-background/90 rounded-full flex items-center justify-center hover:bg-background transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="w-full h-[80vh] flex flex-col">
          <div className="flex-1 relative">
            <iframe
              src="https://yandex.ru/map-widget/v1/?um=constructor%3Aab54f9e8c0c2c18a57a2c9b3b73a1d6e7e8f9a0b&source=constructor"
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              loading="lazy"
              title="Яндекс Карты - Фа Соль"
              className="absolute inset-0"
            />
          </div>
          <div className="p-4 bg-background border-t">
            <a 
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              Открыть на Яндекс Картах
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
