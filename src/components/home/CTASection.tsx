import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';
import { TrialLessonDialog } from './TrialLessonDialog';

export function CTASection() {
  return (
    <section className="py-20 bg-primary">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary-foreground mb-6">
            Запишитесь на занятие и получите подарок
          </h2>
          
          <div className="flex items-center justify-center gap-3 mb-8 p-4 bg-white/10 rounded-xl inline-flex">
            <Gift className="h-6 w-6 text-accent" />
            <p className="text-primary-foreground">
              <span className="font-semibold">В подарок</span> отправим видеоурок о развитии голоса
            </p>
          </div>

          <TrialLessonDialog>
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-10 py-6 rounded-full font-semibold"
            >
              Записаться на бесплатный урок
            </Button>
          </TrialLessonDialog>

          <p className="text-sm text-primary-foreground/70 mt-6">
            Проведем диагностический урок на основе методики Российской Академии голоса
          </p>
        </div>
      </div>
    </section>
  );
}
