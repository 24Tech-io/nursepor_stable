/**
 * Video URL Utilities
 * Parses YouTube and Vimeo links and converts them to embed URLs
 * with privacy and branding options
 */

export type VideoProvider = 'youtube' | 'vimeo' | 'direct' | 'unknown';

export interface ParsedVideoUrl {
  provider: VideoProvider;
  videoId: string | null;
  embedUrl: string;
  originalUrl: string;
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url: string): string | null {
  // Standard formats:
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtube.com/watch?v=VIDEO_ID
  // https://www.youtube.com/embed/VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/v/VIDEO_ID
  // https://youtube.com/v/VIDEO_ID

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1].split('&')[0].split('#')[0].split('?')[0];
    }
  }

  return null;
}

/**
 * Extract Vimeo video ID from various URL formats
 */
function extractVimeoId(url: string): string | null {
  // Standard formats:
  // https://vimeo.com/VIDEO_ID
  // https://www.vimeo.com/VIDEO_ID
  // https://player.vimeo.com/video/VIDEO_ID
  // https://vimeo.com/channels/CHANNEL/VIDEO_ID
  // https://vimeo.com/groups/GROUP/videos/VIDEO_ID

  const patterns = [
    /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/,
    /vimeo\.com\/channels\/[^\/]+\/(\d+)/,
    /vimeo\.com\/groups\/[^\/]+\/videos\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Parse video URL and extract provider and video ID
 */
export function parseVideoUrl(url: string): ParsedVideoUrl {
  if (!url || typeof url !== 'string') {
    return {
      provider: 'unknown',
      videoId: null,
      embedUrl: url,
      originalUrl: url,
    };
  }

  const trimmedUrl = url.trim();

  // Check if already an embed URL
  if (trimmedUrl.includes('youtube.com/embed/') || trimmedUrl.includes('player.vimeo.com/video/')) {
    // Already an embed URL, try to extract provider
    if (trimmedUrl.includes('youtube.com/embed/')) {
      const videoId = extractYouTubeId(trimmedUrl);
      if (videoId) {
        return {
          provider: 'youtube',
          videoId,
          embedUrl: `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&controls=1&autoplay=0`,
          originalUrl: url,
        };
      }
    } else if (trimmedUrl.includes('player.vimeo.com/video/')) {
      const videoId = extractVimeoId(trimmedUrl);
      if (videoId) {
        return {
          provider: 'vimeo',
          videoId,
          embedUrl: `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&badge=0`,
          originalUrl: url,
        };
      }
    }
  }

  // Try YouTube
  const youtubeId = extractYouTubeId(trimmedUrl);
  if (youtubeId) {
    return {
      provider: 'youtube',
      videoId: youtubeId,
      embedUrl: `https://www.youtube.com/embed/${youtubeId}?modestbranding=1&rel=0&showinfo=0&controls=1&autoplay=0&iv_load_policy=3`,
      originalUrl: url,
    };
  }

  // Try Vimeo
  const vimeoId = extractVimeoId(trimmedUrl);
  if (vimeoId) {
    return {
      provider: 'vimeo',
      videoId: vimeoId,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0&badge=0&autoplay=0`,
      originalUrl: url,
    };
  }

  // Check if it's a direct video file
  if (trimmedUrl.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i)) {
    return {
      provider: 'direct',
      videoId: null,
      embedUrl: trimmedUrl,
      originalUrl: url,
    };
  }

  // Unknown format - return as-is
  return {
    provider: 'unknown',
    videoId: null,
    embedUrl: trimmedUrl,
    originalUrl: url,
  };
}

/**
 * Convert video URL to embed URL (for storage in database)
 * This function should be called when saving video URLs
 */
export function convertToEmbedUrl(url: string): string {
  const parsed = parseVideoUrl(url);
  return parsed.embedUrl;
}

/**
 * Get video provider from URL
 */
export function getVideoProvider(url: string): VideoProvider {
  const parsed = parseVideoUrl(url);
  return parsed.provider;
}

/**
 * Validate if URL is a valid video URL (YouTube, Vimeo, or direct video file)
 */
export function isValidVideoUrl(url: string): boolean {
  const parsed = parseVideoUrl(url);
  return parsed.provider !== 'unknown' || parsed.provider === 'direct';
}




