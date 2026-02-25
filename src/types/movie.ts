export interface Movie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids?: number[];
  media_type?: string;
  popularity: number;
}

export interface MovieDetails extends Movie {
  runtime?: number;
  episode_run_time?: number[];
  genres: { id: number; name: string }[];
  tagline?: string;
  credits?: {
    cast: {
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
    }[];
  };
  videos?: {
    results: { key: string; type: string; site: string; name: string }[];
  };
  similar?: {
    results: Movie[];
  };
  number_of_seasons?: number;
  seasons?: {
    season_number: number;
    episode_count: number;
    name: string;
    poster_path: string | null;
  }[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface StreamSource {
  name: string;
  quality: string;
  url: string;
  type: 'embed';
}
