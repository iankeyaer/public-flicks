import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getDetails, getImageUrl, getStreamingSources } from "@/lib/tmdb";
import { MovieDetails as MovieDetailsType } from "@/types/movie";
import VideoPlayer from "@/components/VideoPlayer";
import MovieSection from "@/components/MovieSection";
import ReviewSection from "@/components/ReviewSection";
import { Star, Clock, Calendar, Loader2, Flag, Heart } from "lucide-react";
import { useState } from "react";
import { useFavorites } from "@/hooks/use-favorites";
import { useWatchHistory } from "@/hooks/use-watch-history";
import { useAuth } from "@/contexts/AuthContext";

const MovieDetails = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const mediaType = (type === "tv" ? "tv" : "movie") as "movie" | "tv";
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const { toggleFavorite, isFavorite } = useFavorites();
  const { addToHistory } = useWatchHistory();
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery<MovieDetailsType>({
    queryKey: ["details", mediaType, id],
    queryFn: () => getDetails(mediaType, Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Failed to load details.</p>
      </div>
    );
  }

  const title = data.title || data.name || "";
  const year = (data.release_date || data.first_air_date || "").slice(0, 4);
  const trailer = data.videos?.results.find(
    (v) => v.type === "Trailer" && v.site === "YouTube"
  );
  
  const sources = getStreamingSources(mediaType, data.id, selectedSeason, selectedEpisode);

  return (
    <div className="min-h-screen bg-background">
      {/* Backdrop */}
      <div className="relative h-[50vh] md:h-[60vh]">
        <img
          src={getImageUrl(data.backdrop_path, "original")}
          alt={title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />
      </div>

      <div className="relative -mt-48 z-10 container mx-auto px-4 md:px-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0 w-48 md:w-64 mx-auto md:mx-0">
            <img
              src={getImageUrl(data.poster_path, "w500")}
              alt={title}
              className="w-full rounded-lg shadow-2xl"
            />
          </div>

          {/* Info */}
          <div className="flex-1 pt-4">
            <h1 className="font-display text-4xl md:text-5xl tracking-wide text-foreground mb-2">
              {title}
            </h1>
            {data.tagline && (
              <p className="text-sm text-primary italic mb-3">"{data.tagline}"</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              {year && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> {year}
                </span>
              )}
              {data.runtime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" /> {data.runtime} min
                </span>
              )}
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                {data.vote_average.toFixed(1)} / 10
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {data.genres?.map((g) => (
                <span key={g.id} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                  {g.name}
                </span>
              ))}
            </div>

            <p className="text-sm text-foreground/80 leading-relaxed mb-6 max-w-2xl">
              {data.overview}
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={() => {
                  setShowPlayer(true);
                  if (user) {
                    addToHistory.mutate({
                      tmdb_id: data.id,
                      media_type: mediaType,
                      title,
                      poster_path: data.poster_path,
                      season: mediaType === "tv" ? selectedSeason : undefined,
                      episode: mediaType === "tv" ? selectedEpisode : undefined,
                    });
                  }
                }}
                className="flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                ▶ Watch Now
              </button>
              <button
                onClick={() => toggleFavorite({ id: data.id, title: data.title, name: data.name, poster_path: data.poster_path, backdrop_path: data.backdrop_path, overview: data.overview || "", vote_average: data.vote_average, release_date: data.release_date, first_air_date: data.first_air_date, media_type: mediaType, genre_ids: data.genres?.map(g => g.id) || [], popularity: 0 })}
                className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${
                  isFavorite(data.id)
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                <Heart className={`h-4 w-4 ${isFavorite(data.id) ? "fill-primary text-primary" : ""}`} />
                {isFavorite(data.id) ? "Favorited" : "Add to Favorites"}
              </button>
              <button className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2.5 text-sm text-secondary-foreground hover:bg-accent transition-colors">
                <Flag className="h-4 w-4" /> Report
              </button>
            </div>

          </div>
        </div>

        {/* TV Season/Episode Selector */}
        {mediaType === "tv" && data.seasons && (
          <div className="mt-8 flex flex-wrap gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Season</label>
              <select
                value={selectedSeason}
                onChange={(e) => { setSelectedSeason(Number(e.target.value)); setSelectedEpisode(1); }}
                className="bg-secondary text-foreground rounded-md px-3 py-2 text-sm border border-border"
              >
                {data.seasons.filter(s => s.season_number > 0).map((s) => (
                  <option key={s.season_number} value={s.season_number}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Episode</label>
              <select
                value={selectedEpisode}
                onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                className="bg-secondary text-foreground rounded-md px-3 py-2 text-sm border border-border"
              >
                {Array.from(
                  { length: data.seasons.find(s => s.season_number === selectedSeason)?.episode_count || 1 },
                  (_, i) => (
                    <option key={i + 1} value={i + 1}>Episode {i + 1}</option>
                  )
                )}
              </select>
            </div>
          </div>
        )}

        {/* Player */}
        {showPlayer && (
          <div className="mt-8 animate-fade-in">
            <h3 className="font-display text-xl tracking-wide text-foreground mb-3">
              Now Playing: {title}
              {mediaType === "tv" && ` – S${selectedSeason}E${selectedEpisode}`}
            </h3>
            <VideoPlayer sources={sources} title={title} />
          </div>
        )}

        {/* Trailer */}
        {trailer && (
          <div className="mt-10">
            <h3 className="font-display text-xl tracking-wide text-foreground mb-3">Official Trailer</h3>
            <div className="aspect-video max-w-3xl rounded-lg overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}`}
                title="Trailer"
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        )}

        {/* Reviews */}
        <ReviewSection tmdbId={data.id} mediaType={mediaType} />

        {/* Similar */}
        {data.similar?.results && data.similar.results.length > 0 && (
          <div className="mt-10">
            <MovieSection title="You Might Also Like" movies={data.similar.results} />
          </div>
        )}
      </div>

      <div className="h-12" />
    </div>
  );
};

export default MovieDetails;
