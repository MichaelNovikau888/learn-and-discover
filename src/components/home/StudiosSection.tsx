import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSiteContent } from '@/hooks/useSiteContent';

export function StudiosSection() {
  const [showAll, setShowAll] = useState(false);
  const { content } = useSiteContent(['studios_gallery']);
  
  const galleryContent = content['studios_gallery'];
  const images: string[] = galleryContent?.content?.images || [];
  
  // Default placeholders
  const placeholders = [
    { id: 1, alt: 'Студия вокала 1' },
    { id: 2, alt: 'Студия вокала 2' },
    { id: 3, alt: 'Студия вокала 3' },
    { id: 4, alt: 'Студия вокала 4' },
  ];
  
  const visibleCount = showAll ? images.length || 4 : 4;
  const hasMoreImages = images.length > 4;

  return (
    <section className="py-20 bg-background">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="section-title mb-4">
            Занятия проходят в уютных студиях с профессиональным оборудованием
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Современное звуковое оборудование и комфортная атмосфера для вашего творческого развития
          </p>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {images.length > 0 ? (
            images.slice(0, visibleCount).map((imageUrl, index) => (
              <div
                key={index}
                className="aspect-[4/3] rounded-2xl overflow-hidden"
              >
                <img 
                  src={imageUrl} 
                  alt={`Студия ${index + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))
          ) : (
            placeholders.map((image) => (
              <div
                key={image.id}
                className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden"
              >
                <div className="text-center p-4">
                  <span className="text-5xl mb-2 block">🎙️</span>
                  <p className="text-sm text-muted-foreground">{image.alt}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Show More Button */}
        {(hasMoreImages && !showAll) || images.length === 0 ? (
          <div className="text-center">
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
