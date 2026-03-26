import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X, Phone, MapPin, Instagram } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
}

export function ScheduleModal({ open, onClose }: ScheduleModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
        <VisuallyHidden>
          <DialogTitle>График работы школы</DialogTitle>
        </VisuallyHidden>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pt-4 text-center">
          {/* Logo */}
          <img 
            src="/logo-fasol.png" 
            alt="Фа Соль" 
            className="h-16 mx-auto mb-4"
          />

          <h2 className="text-2xl font-display font-bold mb-1">ФА СОЛЬ</h2>
          <p className="text-sm text-muted-foreground mb-6">МИНСКАЯ ШКОЛА ВОКАЛА №1</p>

          {/* Schedule Info */}
          <div className="bg-primary text-primary-foreground rounded-2xl py-4 px-6 mb-6">
            <p className="text-2xl font-bold">с 10:00 до 22:00</p>
            <p className="text-sm opacity-90">БЕЗ ВЫХОДНЫХ</p>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 mb-6">
            <a 
              href="tel:+375257642061" 
              className="flex items-center justify-center gap-2 text-lg font-medium hover:text-primary transition-colors"
            >
              <Phone className="h-5 w-5" />
              +375 (25) 764-20-61
            </a>
            <p className="flex items-center justify-center gap-2 text-muted-foreground">
              <MapPin className="h-5 w-5" />
              г. МИНСК, УЛ. КУЛЬМАН 9
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <a 
              href="https://www.instagram.com/fasol.minsk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Instagram className="h-5 w-5" />
              FASOLMINSK
            </a>
            <a 
              href="https://vk.com/fasolminsk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.714-1.033-1.033-1.49-1.171-1.744-1.171-.356 0-.458.102-.458.593v1.563c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.684 4 8.245c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.862 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.491-.085.745-.576.745z"/>
              </svg>
              FASOL.MINSK
            </a>
          </div>

          {/* Description */}
          <div className="text-left text-sm text-muted-foreground space-y-3 border-t pt-6">
            <p>
              Школа работает ежедневно, без выходных, за исключением Нового года :)
            </p>
            <p>
              Уроки начинаются по четным часам: в 10, 12, 14, 16, 18 и 20 часов. Уроки идут по полтора часа.
            </p>
            <p>
              Для большей результативности обучения, мы рекомендуем регулярное посещение занятий. Для начала хватит и раза в неделю, чтобы ваши голосовые связки привыкли к работе, далее можно перейти на 2 раза в неделю, если у вас будет возможность :)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
