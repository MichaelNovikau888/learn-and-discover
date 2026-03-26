import { useState } from 'react';
import { Play, X } from 'lucide-react';
import { useSiteContent } from '@/hooks/useSiteContent';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { getYouTubeId, getYouTubeThumbnail } from '@/lib/youtube';

interface VideoItem {
  url: string;
  title?: string;
  name?: string;
}

const defaultTestimonials = [
  {
    id: 1,
    name: 'Анна',
    description: 'Выступление на отчетном концерте',
    color: 'from-primary/20 to-primary/5',
  },
  {
    id: 2,
    name: 'Михаил',
    description: 'Квартирник в уютной атмосфере',
    color: 'from-accent/20 to-accent/5',
  },
  {
    id: 3,
    name: 'Елена',
    description: 'Первое сольное выступление',
    color: 'from-success/20 to-success/5',
  },
];

export function TestimonialsSection() {
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const { content } = useSiteContent(['students_videos']);
  
  const videosContent = content['students_videos'];
  const videos: VideoItem[] = videosContent?.content?.videos || [];

  const handleVideoClick = (url: string) => {
    const videoId = getYouTubeId(url);
    if (videoId) {
      setPlayingVideo(videoId);
    }
  };

  return (
    <section id="teachers" className="py-20 bg-background scroll-mt-48">
      <div className="container">
        <h2 className="section-title mb-4">
          Как поют наши ученики
        </h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-16">
          Посмотрите видео выступлений наших учеников на концертах и мероприятиях
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {videos.length > 0 ? (
            videos.slice(0, 6).map((video, index) => {
              const videoId = getYouTubeId(video.url);
              const thumbnailUrl = videoId ? getYouTubeThumbnail(videoId, 'mq') : null;

              return (
                <div
                  key={index}
                  onClick={() => handleVideoClick(video.url)}
                  className="group relative aspect-video rounded-2xl overflow-hidden cursor-pointer hover-lift animate-fade-in"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  {thumbnailUrl ? (
                    <img 
                      src={thumbnailUrl} 
                      alt={video.title || video.name || 'Видео'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                  )}
                  
                  {/* Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-transform shadow-lg">
                      <Play className="h-6 w-6 ml-1" />
                    </div>
                  </div>

                  {/* Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-foreground/80 to-transparent">
                    <p className="font-semibold text-background">{video.name || video.title || `Ученик ${index + 1}`}</p>
                    {video.title && video.name && (
                      <p className="text-sm text-background/80">{video.title}</p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            defaultTestimonials.map((testimonial, index) => (
              <div
                key={testimonial.id}
                className="group relative aspect-video rounded-2xl overflow-hidden cursor-pointer hover-lift animate-fade-in"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${testimonial.color}`} />
                
                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-transform shadow-lg">
                    <Play className="h-6 w-6 ml-1" />
                  </div>
                </div>

                {/* Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-foreground/80 to-transparent">
                  <p className="font-semibold text-background">{testimonial.name}</p>
                  <p className="text-sm text-background/80">{testimonial.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-black">
          <VisuallyHidden>
            <DialogTitle>Видео ученика</DialogTitle>
          </VisuallyHidden>
          
          <button
            onClick={() => setPlayingVideo(null)}
            className="absolute top-4 right-4 z-50 w-10 h-10 bg-background/90 rounded-full flex items-center justify-center hover:bg-background transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {playingVideo && (
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${playingVideo}?autoplay=1`}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
