import { StreamSource } from "@/types/movie";

/**
 * Generate embed URLs from providers that accept TMDB IDs directly.
 * These providers allow iframe embedding for seamless in-app playback.
 */
export const getStreamingSources = (
  type: "movie" | "tv",
  tmdbId: number,
  season?: number,
  episode?: number
): StreamSource[] => {
  const sources: StreamSource[] = [];

  if (type === "movie") {
    sources.push(
      { name: "Server 1", quality: "HD", url: `https://vidsrc.to/embed/movie/${tmdbId}` },
      { name: "Server 2", quality: "HD", url: `https://vidsrc.cc/v2/embed/movie/${tmdbId}` },
      { name: "Server 3", quality: "HD", url: `https://www.2embed.cc/embed/movie?tmdb=${tmdbId}` },
      { name: "Server 4", quality: "HD", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1` },
      { name: "Server 5", quality: "HD", url: `https://embed.su/embed/movie/${tmdbId}` },
    );
  } else {
    const s = season || 1;
    const e = episode || 1;
    sources.push(
      { name: "Server 1", quality: "HD", url: `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}` },
      { name: "Server 2", quality: "HD", url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${s}/${e}` },
      { name: "Server 3", quality: "HD", url: `https://www.2embed.cc/embed/tv?tmdb=${tmdbId}&s=${s}&e=${e}` },
      { name: "Server 4", quality: "HD", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${s}&e=${e}` },
      { name: "Server 5", quality: "HD", url: `https://embed.su/embed/tv/${tmdbId}/${s}/${e}` },
    );
  }

  return sources;
};
