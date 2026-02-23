export interface ResolvedStream {
  provider: string;
  quality: string;
  url: string;
  type: "hls" | "mp4";
  headers?: Record<string, string>;
  captions?: { url: string; language: string; type: string }[];
}

export interface FallbackEmbed {
  name: string;
  quality: string;
  url: string;
}

export interface StreamResult {
  streams: ResolvedStream[];
  fallbackEmbeds: FallbackEmbed[];
}

function getEmbeds(
  tmdbId: string | number,
  mediaType: "movie" | "tv",
  season?: number,
  episode?: number
): FallbackEmbed[] {
  const id = String(tmdbId);
  const s = season || 1;
  const e = episode || 1;

  return [
    {
      name: "VidSrc PRO",
      quality: "1080p",
      url:
        mediaType === "movie"
          ? `https://vidsrc.pro/embed/movie/${id}`
          : `https://vidsrc.pro/embed/tv/${id}/${s}/${e}`,
    },
    {
      name: "VidSrc ICU",
      quality: "1080p",
      url:
        mediaType === "movie"
          ? `https://vidsrc.icu/embed/movie/${id}`
          : `https://vidsrc.icu/embed/tv/${id}/${s}/${e}`,
    },
    {
      name: "Embed SU",
      quality: "HD",
      url:
        mediaType === "movie"
          ? `https://embed.su/embed/movie/${id}`
          : `https://embed.su/embed/tv/${id}/${s}/${e}`,
    },
    {
      name: "VidSrc CC",
      quality: "1080p",
      url:
        mediaType === "movie"
          ? `https://vidsrc.cc/v2/embed/movie/${id}`
          : `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
    },
    {
      name: "VidSrc XYZ",
      quality: "HD",
      url:
        mediaType === "movie"
          ? `https://vidsrc.xyz/embed/movie/${id}`
          : `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}`,
    },
  ];
}

export async function resolveStreams(opts: {
  tmdbId: string | number;
  mediaType: "movie" | "tv";
  title: string;
  releaseYear: number;
  season?: number;
  episode?: number;
  onEvent?: (msg: string) => void;
}): Promise<StreamResult> {
  const { tmdbId, mediaType, season, episode } = opts;

  // Go directly to iframe embeds — scraping providers block datacenter/cloud IPs
  return {
    streams: [],
    fallbackEmbeds: getEmbeds(tmdbId, mediaType, season, episode),
  };
}
