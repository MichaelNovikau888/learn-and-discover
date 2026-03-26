/**
 * Extract YouTube video ID from various URL formats
 * Supports: youtube.com/watch, youtu.be, youtube.com/shorts, youtube.com/embed
 */
export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  
  // Handle YouTube Shorts
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];
  
  // Handle youtu.be short links
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  
  // Handle youtube.com/embed
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  
  // Handle youtube.com/watch?v=
  const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  
  // Handle youtube.com/v/
  const vMatch = url.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
  if (vMatch) return vMatch[1];
  
  return null;
}

/**
 * Get YouTube thumbnail URL for a video ID
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'mq' | 'hq' | 'sd' | 'max' = 'mq'): string {
  const qualityMap = {
    default: 'default',
    mq: 'mqdefault',
    hq: 'hqdefault',
    sd: 'sddefault',
    max: 'maxresdefault',
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}
