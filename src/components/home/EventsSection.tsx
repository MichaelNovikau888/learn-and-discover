import { useState } from 'react';
import { Play } from 'lucide-react';
import { useSiteContent } from '@/hooks/useSiteContent';
import { getYouTubeId, getYouTubeThumbnail } from '@/lib/youtube';

const eventTypes = [
  { id: 'concerts', label: 'Квартирники', emoji: '🏠', sectionKey: 'events_concerts' },
  { id: 'reports', label: 'Отчетные концерты', emoji: '🎤', sectionKey: 'events_reports' },
  { id: 'outdoor', label: 'Выездные мероприятия', emoji: '🎪', sectionKey: 'events_outdoor' },
  { id: 'masterclass', label: 'Мастер-классы', emoji: '🎓', sectionKey: 'events_masterclass' },
];

interface VideoItem {
  url: string;
  title?: string;
}

function YouTubeThumbnail({ video, onClick }: { video: VideoItem; onClick: () => void }) {
  const videoId = getYouTubeId(video.url);
  const thumbnailUrl = videoId ? getYouTubeThumbnail(videoId, 'mq') : null;

  return (
    <div
      onClick={onClick}
      className="aspect-video rounded-2xl overflow-hidden cursor-pointer group relative"
    >
      {thumbnailUrl ? (
        <img 
          src={thumbnailUrl} 
          alt={video.title || 'Видео'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <span className="text-6xl">🎤</span>
        </div>
      )}
      {/* Play Button Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-transform shadow-lg">
          <Play className="h-6 w-6 ml-1" />
        </div>
      </div>
      {video.title && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-sm text-white font-medium truncate">{video.title}</p>
        </div>
      )}
    </div>
  );
}

export function EventsSection() {
  const [activeTab, setActiveTab] = useState('concerts');
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  
  const sectionKeys = eventTypes.map(t => t.sectionKey);
  const { content } = useSiteContent(sectionKeys);
  
  const activeType = eventTypes.find(t => t.id === activeTab);
  const activeContent = activeType ? content[activeType.sectionKey] : null;
  const videos: VideoItem[] = activeContent?.content?.videos || [];

  const handleVideoClick = (url: string) => {
    const videoId = getYouTubeId(url);
    if (videoId) {
      setPlayingVideo(videoId);
    }
  };

  return (
    <section id="events" className="py-20 bg-secondary scroll-mt-48">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Content */}
          <div>
            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">
              Каждый может почувствовать себя звездой
            </p>
            <h2 className="section-title text-left mb-6">
              Для учеников проводим мероприятия на лучших площадках города
            </h2>
            <p className="text-muted-foreground mb-8">
              С фотографом, видеографом и ведущим — чтобы вы чувствовали себя настоящей звездой
            </p>

            {/* Event Type Tabs */}
            <div className="flex flex-wrap gap-3">
              {eventTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setActiveTab(type.id);
                    setPlayingVideo(null);
                  }}
                  className={`px-5 py-3 rounded-full font-medium transition-all ${
                    activeTab === type.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-foreground hover:bg-primary/10'
                  }`}
                >
                  <span className="mr-2">{type.emoji}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right - Event Gallery / Video Player */}
          <div>
            {playingVideo ? (
              <div className="aspect-video rounded-2xl overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${playingVideo}?autoplay=1`}
                  title="YouTube video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            ) : videos.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {videos.slice(0, 4).map((video, index) => (
                  <YouTubeThumbnail
                    key={index}
                    video={video}
                    onClick={() => handleVideoClick(video.url)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-6xl">🎤</span>
                </div>
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                  <span className="text-6xl">🎵</span>
                </div>
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center col-span-2">
                  <span className="text-6xl">🎶</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
