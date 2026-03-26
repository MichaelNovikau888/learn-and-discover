import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSiteContent } from '@/hooks/useSiteContent';

export function MissionSection() {
  const [showAll, setShowAll] = useState(false);
  const { content } = useSiteContent(['mission_gallery']);
  
  const galleryContent = content['mission_gallery'];
  const images: string[] = galleryContent?.content?.images || [];
  
  // Default placeholders if no images uploaded
  const placeholders = [
    { emoji: '🎵', gradient: 'from-primary/30 to-primary/10' },
    { emoji: '🎤', gradient: 'from-accent/30 to-accent/10' },
    { emoji: '🎶', gradient: 'from-success/30 to-success/10' },
    { emoji: '⭐', gradient: 'from-warning/30 to-warning/10' },
  ];
  
  const visibleCount = showAll ? images.length || 4 : 4;
  const hasMoreImages = images.length > 4;

  return (
    <section id="mission" className="py-20 bg-secondary scroll-mt-48">
      <div className="container">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">
            Миссия школы
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-8">
            Найти <span className="text-primary">СЕБЯ</span>. 
            <span className="text-primary"> СВОЁ</span>. 
            <span className="text-primary"> СВОИХ</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Мы верим, что каждый голос уникален и заслуживает быть услышанным. 
            Наша задача — помочь вам раскрыть свой потенциал и найти свой неповторимый стиль.
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
          {images.length > 0 ? (
            images.slice(0, visibleCount).map((imageUrl, index) => (
              <div
                key={index}
                className="aspect-square rounded-2xl overflow-hidden"
              >
                <img 
                  src={imageUrl} 
                  alt={`Фото ${index + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))
          ) : (
            placeholders.map((item, index) => (
              <div
                key={index}
                className={`aspect-square rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center`}
              >
                <span className="text-6xl">{item.emoji}</span>
              </div>
            ))
          )}
        </div>

        {/* Show More Button */}
        {(hasMoreImages && !showAll) || images.length === 0 ? (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowAll(true)}
              className="rounded-full px-8"
              disabled={images.length === 0}
            >
              Смотреть ещё
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
