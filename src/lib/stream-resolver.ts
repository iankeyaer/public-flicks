import {
  makeProviders,
  makeStandardFetcher,
  targets,
  type RunOutput,
  type ScrapeMedia,
  type Stream,
  type FullScraperEvents,
} from "@movie-web/providers";

// Initialize providers for BROWSER target — runs on user's device/IP
const providers = makeProviders({
  fetcher: makeStandardFetcher(fetch),
  target: targets.BROWSER,
});

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

function extractStreams(result: RunOutput): ResolvedStream[] {
  const streams: ResolvedStream[] = [];
  const sourceLabel = result.embedId || result.sourceId || "unknown";
  const captions = result.stream.captions?.map((c) => ({
    url: c.url,
    language: c.language,
    type: c.type,
  }));

  if (result.stream.type === "hls") {
    streams.push({
      provider: sourceLabel,
      quality: "auto",
      url: result.stream.playlist,
      type: "hls",
      headers: result.stream.headers,
      captions,
    });
  } else if (result.stream.type === "file") {
    // File-based: extract each quality
    const qualityOrder: string[] = ["4k", "1080", "720", "480", "360", "unknown"];
    for (const q of qualityOrder) {
      const file = result.stream.qualities[q as keyof typeof result.stream.qualities];
      if (file) {
        streams.push({
          provider: sourceLabel,
          quality: q === "unknown" ? "HD" : `${q}p`,
          url: file.url,
          type: "mp4",
          headers: result.stream.headers,
          captions,
        });
      }
    }
  }

  return streams;
}

function getFallbackEmbeds(
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
      name: "VidSrc Pro",
      quality: "1080p",
      url:
        mediaType === "movie"
          ? `https://vidsrc.pro/embed/movie/${id}`
          : `https://vidsrc.pro/embed/tv/${id}/${s}/${e}`,
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
  const { tmdbId, mediaType, title, releaseYear, season, episode, onEvent } = opts;

  const media: ScrapeMedia =
    mediaType === "tv"
      ? {
          type: "show" as const,
          tmdbId: String(tmdbId),
          title,
          releaseYear,
          season: { number: season || 1, tmdbId: String(tmdbId) },
          episode: { number: episode || 1, tmdbId: String(tmdbId) },
        }
      : {
          type: "movie" as const,
          tmdbId: String(tmdbId),
          title,
          releaseYear,
        };

  const events: FullScraperEvents = {
    init: (evt) => onEvent?.(`Checking ${evt.sourceIds.length} sources...`),
    start: (id) => onEvent?.(`Trying ${id}...`),
    update: (evt) => onEvent?.(`${evt.id}: ${evt.status}`),
  };

  try {
    const result = await providers.runAll({ media, events });

    if (!result) {
      console.log("[stream-resolver] No streams found from providers");
      return {
        streams: [],
        fallbackEmbeds: getFallbackEmbeds(tmdbId, mediaType, season, episode),
      };
    }

    const streams = extractStreams(result);
    console.log(`[stream-resolver] Resolved ${streams.length} stream(s) from ${result.sourceId}`);

    return {
      streams,
      fallbackEmbeds: streams.length === 0 ? getFallbackEmbeds(tmdbId, mediaType, season, episode) : [],
    };
  } catch (err) {
    console.error("[stream-resolver] Error:", err);
    return {
      streams: [],
      fallbackEmbeds: getFallbackEmbeds(tmdbId, mediaType, season, episode),
    };
  }
}
