import { useState } from 'react';
import { MousePointerClick } from 'lucide-react';
import { SiteContent } from '@/lib/types';

interface FeatureCardProps {
  content: SiteContent | undefined;
  fallbackTitle: string;
  fallbackDescription: string;
  fallbackGradient: string;
  fallbackEmoji: string;
  onClick: () => void;
}

export function FeatureCard({
  content,
  fallbackTitle,
  fallbackDescription,
  fallbackGradient,
  fallbackEmoji,
  onClick,
}: FeatureCardProps) {
  const title = content?.title || fallbackTitle;
  const description = content?.description || fallbackDescription;
  const imageUrl = content?.image_url;

  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-3xl cursor-pointer group hover-lift animate-fade-in min-h-[200px] md:min-h-[240px]"
    >
      {/* Background */}
      {imageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ) : (
        <div className={`absolute inset-0 ${fallbackGradient} flex items-center justify-center`}>
          <span className="text-8xl opacity-30">{fallbackEmoji}</span>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

      {/* Pulsing Click Icon */}
      <div className="absolute top-4 right-4 z-10">
        <div className="relative">
          <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-75" />
          <div className="relative w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg">
            <MousePointerClick className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <h3 className="font-display font-bold text-lg md:text-xl text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-white/80">{description}</p>
      </div>
    </div>
  );
}
