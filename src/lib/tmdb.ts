import { supabase } from "@/integrations/supabase/client";

// ⚠️ Replace with your own TMDB API key from https://www.themoviedb.org/settings/api
const API_KEY = "a1ec41d73036e72bad73615169e10c23";
const BASE_URL = "https://api.themoviedb.org/3";
export const IMG_BASE = "https://image.tmdb.org/t/p";

export const getImageUrl = (path: string | null, size = "w500") =>
  path ? `${IMG_BASE}/${size}${path}` : "/placeholder.svg";

const fetchTMDB = async (endpoint: string, params: Record<string, string> = {}) => {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);
  return res.json();
};

export const getTrending = (type: "movie" | "tv" | "all" = "movie") =>
  fetchTMDB(`/trending/${type}/week`);

export const getPopular = (type: "movie" | "tv" = "movie") =>
  fetchTMDB(`/${type}/popular`);

export const getNowPlaying = () => fetchTMDB("/movie/now_playing");

export const getTopRated = (type: "movie" | "tv" = "tv") =>
  fetchTMDB(`/${type}/top_rated`);

export const searchMulti = (query: string) =>
  fetchTMDB("/search/multi", { query });

export const getDetails = (type: "movie" | "tv", id: number) =>
  fetchTMDB(`/${type}/${id}`, { append_to_response: "credits,videos,similar" });

export const getGenres = (type: "movie" | "tv" = "movie") =>
  fetchTMDB(`/genre/${type}/list`);

export const discoverByGenre = (genreId: number, page = 1, type: "movie" | "tv" = "movie") =>
  fetchTMDB(`/discover/${type}`, { with_genres: String(genreId), page: String(page), sort_by: "popularity.desc" });

export const getStreamingSources = (
  type: "movie" | "tv",
  tmdbId: number,
  season?: number,
  episode?: number
): { name: string; quality: string; url: string }[] => {
  // Sources are now fetched async via searchYflixSources
  return [];
};

export interface YflixResult {
  sources: { name: string; quality: string; url: string }[];
  watchUrl?: string;
  fallback: boolean;
}

export const searchYflixSources = async (
  title: string,
  type: "movie" | "tv",
  year?: string,
  season?: number,
  episode?: number
): Promise<YflixResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('yflix-search', {
      body: { title, type, year, season, episode },
    });

    if (error || !data?.success) {
      console.error('yflix search failed:', error || data?.error);
      return { sources: [], fallback: true };
    }

    // If the edge function found embed URLs, use those
    if (data.sources && data.sources.length > 0) {
      return { sources: data.sources, watchUrl: data.watchUrl, fallback: false };
    }

    // Fallback: open yflix in a new tab
    return { sources: [], watchUrl: data.watchUrl, fallback: true };
  } catch (err) {
    console.error('yflix search error:', err);
    return { sources: [], fallback: true };
  }
};
