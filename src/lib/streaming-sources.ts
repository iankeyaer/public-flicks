import { StreamSource } from "@/types/movie";

/**
 * Generate embed-friendly streaming sources using TMDB IDs.
 * These providers allow direct iframe playback — no external redirects.
 */
export const getEmbedSources = (
  type: "movie" | "tv",
  tmdbId: number,
  season?: number,
  episode?: number
): StreamSource[] => {
  const sources: StreamSource[] = [];

  // Provider 1
  if (type === "movie") {
    sources.push({ name: "Server 1", quality: "HD", url: `https://vidsrc.icu/embed/movie/${tmdbId}` });
  } else {
    sources.push({ name: "Server 1", quality: "HD", url: `https://vidsrc.icu/embed/tv/${tmdbId}/${season || 1}/${episode || 1}` });
  }

  // Provider 2
  if (type === "movie") {
    sources.push({ name: "Server 2", quality: "HD", url: `https://vidsrc.cc/v2/embed/movie/${tmdbId}` });
  } else {
    sources.push({ name: "Server 2", quality: "HD", url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season || 1}/${episode || 1}` });
  }

  // Provider 3
  if (type === "movie") {
    sources.push({ name: "Server 3", quality: "1080p", url: `https://moviesapi.club/movie/${tmdbId}` });
  } else {
    sources.push({ name: "Server 3", quality: "1080p", url: `https://moviesapi.club/tv/${tmdbId}-${season || 1}-${episode || 1}` });
  }

  // Provider 4
  if (type === "movie") {
    sources.push({ name: "Server 4", quality: "HD", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1` });
  } else {
    sources.push({ name: "Server 4", quality: "HD", url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season || 1}&e=${episode || 1}` });
  }

  return sources;
};
