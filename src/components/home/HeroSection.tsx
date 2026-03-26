import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';
import heroImage from '@/assets/hero-singer.jpg';
import { TrialLessonDialog } from './TrialLessonDialog';

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-background">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="animate-slide-right">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6">
              <span className="text-primary">Научим петь любого,</span>
              <br />
              благодаря современной методике и опыту работы более 5 лет
            </h1>
            
            <p className="text-lg md:text-xl text-foreground mb-2">
              ЗАПИШИСЬ НА ПЕРВОЕ ПРОБНОЕ ЗАНЯТИЕ{' '}
              <span className="font-bold">БЕСПЛАТНО</span>
            </p>

            <TrialLessonDialog>
              <Button
                size="lg"
                className="btn-primary text-lg px-10 py-6 mt-6"
              >
                Записаться на занятие
              </Button>
            </TrialLessonDialog>

            {/* Gift Banner */}
            <div className="flex items-start gap-4 mt-8 p-4 bg-secondary rounded-xl">
              <div className="flex-shrink-0 w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                <Gift className="h-6 w-6 text-accent-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">В подарок</span> отправим 
                видеоурок «Как за 5 минут в день улучшить речь и прокачать уверенность»
              </p>
            </div>
          </div>

          {/* Right Content - Image with blob shape */}
          <div className="relative animate-fade-in">
            <div className="relative">
              {/* Purple blob background */}
              <div className="absolute inset-0 bg-primary blob-shape scale-110 -z-10" />
              
              {/* Singer image */}
              <img
                src={heroImage}
                alt="Вокалистка на сцене"
                className="w-full h-auto blob-shape object-cover max-w-xs mx-auto md:max-w-sm lg:max-w-full"
              />

              {/* Microphone decoration - hidden on mobile */}
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-6xl hidden lg:block">
                🎤
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
