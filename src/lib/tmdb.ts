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
) => {
  const s = season || 1;
  const e = episode || 1;

  return [
    {
      name: "Server 1",
      quality: "1080p",
      url: type === "movie"
        ? `https://vidsrc.to/embed/movie/${tmdbId}`
        : `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`,
    },
    {
      name: "Server 2",
      quality: "1080p",
      url: type === "movie"
        ? `https://vidsrc.pro/embed/movie/${tmdbId}`
        : `https://vidsrc.pro/embed/tv/${tmdbId}/${s}/${e}`,
    },
    {
      name: "Server 3",
      quality: "HD",
      url: type === "movie"
        ? `https://embed.su/embed/movie/${tmdbId}`
        : `https://embed.su/embed/tv/${tmdbId}/${s}/${e}`,
    },
    {
      name: "Server 4",
      quality: "1080p",
      url: type === "movie"
        ? `https://vidsrc.cc/v2/embed/movie/${tmdbId}`
        : `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${s}/${e}`,
    },
    {
      name: "Server 5",
      quality: "1080p",
      url: type === "movie"
        ? `https://vidsrc.me/embed/movie/${tmdbId}`
        : `https://vidsrc.me/embed/tv/${tmdbId}/${s}/${e}`,
    },
    {
      name: "Server 6",
      quality: "HD",
      url: type === "movie"
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${s}&e=${e}`,
    },
    {
      name: "Server 7",
      quality: "HD",
      url: type === "movie"
        ? `https://vidbinge.dev/embed/movie/${tmdbId}`
        : `https://vidbinge.dev/embed/tv/${tmdbId}/${s}/${e}`,
    },
    {
      name: "Server 8",
      quality: "1080p",
      url: type === "movie"
        ? `https://player.autoembed.cc/embed/movie/${tmdbId}`
        : `https://player.autoembed.cc/embed/tv/${tmdbId}/${s}/${e}`,
    },
  ];
};
