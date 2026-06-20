import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getDetails, getImageUrl } from "@/lib/tmdb";
import { MovieDetails as MovieDetailsType } from "@/types/movie";
import MovieSection from "@/components/MovieSection";
import ReviewSection from "@/components/ReviewSection";
import { Star, Clock, Calendar, Loader2, Heart, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

import { useFavorites } from "@/hooks/use-favorites";
import { useWatchHistory } from "@/hooks/use-watch-history";
import { useAuth } from "@/contexts/AuthContext";

const MovieDetails = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const mediaType = (type === "tv" ? "tv" : "movie") as "movie" | "tv";
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [showPlayer, setShowPlayer] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string>("");
  const { toggleFavorite, isFavorite } = useFavorites();
  const { addToHistory } = useWatchHistory();
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery<MovieDetailsType>({
    queryKey: ["details", mediaType, id],
    queryFn: () => getDetails(mediaType, Number(id)),
    enabled: !!id,
  });

  // Lock body scroll when player is open
  useEffect(() => {
    if (showPlayer) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [showPlayer]);

  const handleWatch = () => {
    if (!data) return;

    if (user) {
      const title = data.title || data.name || "";
      addToHistory.mutate({
        tmdb_id: data.id, media_type: mediaType, title,
        poster_path: data.poster_path,
        season: mediaType === "tv" ? selectedSeason : undefined,
        episode: mediaType === "tv" ? selectedEpisode : undefined,
      });
    }

    let url: string;
    if (mediaType === "tv") {
      url = `https://player.videasy.net/tv/${data.id}/${selectedSeason}/${selectedEpisode}`;
    } else {
      url = `https://player.videasy.net/movie/${data.id}`;
    }
    setEmbedUrl(url);
    setShowPlayer(true);
  };

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

  return (
    <div className="min-h-screen bg-background">
      {/* Fullscreen Player Overlay */}
      {showPlayer && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 bg-black/80 backdrop-blur-sm">
            <button
              onClick={() => setShowPlayer(false)}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </button>
            <span className="text-sm text-white/80 truncate">
              {title}{mediaType === "tv" ? ` – S${selectedSeason}E${selectedEpisode}` : ""}
            </span>
          </div>
          <div className="flex-1 bg-black flex items-center justify-center">
            {loadingStreams ? (
              <div className="text-center space-y-3">
                <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
                <p className="text-sm text-white/80">Extracting stream...</p>
                <p className="text-xs text-white/50">This can take 30-60 seconds</p>
              </div>
            ) : streamError ? (
              <div className="text-center space-y-3 px-4">
                <AlertCircle className="h-10 w-10 text-primary mx-auto" />
                <p className="text-sm text-white/80">{streamError}</p>
                <button
                  onClick={handleWatch}
                  className="rounded-full gradient-brand px-5 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Try again
                </button>
              </div>
            ) : sources.length > 0 ? (
              <div className="w-full h-full">
                <VideoPlayer sources={sources} title={title} />
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Hero backdrop */}
      <div className="relative h-[55vh] md:h-[65vh]">
        <img
          src={getImageUrl(data.backdrop_path, "original")}
          alt={title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/50 to-transparent" />
      </div>

      <div className="relative -mt-56 z-10 container mx-auto px-4 md:px-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0 w-44 md:w-56 mx-auto md:mx-0">
            <img
              src={getImageUrl(data.poster_path, "w500")}
              alt={title}
              className="w-full rounded-xl shadow-2xl"
            />
          </div>

          {/* Info */}
          <div className="flex-1 pt-4">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-2">
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
                <Star className="h-4 w-4 text-primary fill-primary" />
                {data.vote_average.toFixed(1)} / 10
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {data.genres?.map((g) => (
                <span key={g.id} className="rounded-full bg-secondary border border-border px-3 py-1 text-xs text-secondary-foreground">
                  {g.name}
                </span>
              ))}
            </div>

            <p className="text-sm text-foreground/70 leading-relaxed mb-6 max-w-2xl">
              {data.overview}
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleWatch}
                className="flex items-center gap-2 rounded-full gradient-brand px-7 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity shadow-lg"
              >
                ▶ Watch Now
              </button>
              <button
                onClick={() => toggleFavorite({ id: data.id, title: data.title, name: data.name, poster_path: data.poster_path, backdrop_path: data.backdrop_path, overview: data.overview || "", vote_average: data.vote_average, release_date: data.release_date, first_air_date: data.first_air_date, media_type: mediaType, genre_ids: data.genres?.map(g => g.id) || [], popularity: 0 })}
                className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors ${
                  isFavorite(data.id)
                    ? "gradient-brand text-primary-foreground"
                    : "bg-foreground/10 border border-foreground/20 text-foreground hover:bg-foreground/20"
                }`}
              >
                <Heart className={`h-4 w-4 ${isFavorite(data.id) ? "fill-current" : ""}`} />
                {isFavorite(data.id) ? "In My List" : "My List"}
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
                className="bg-secondary text-foreground rounded-lg px-3 py-2 text-sm border border-border focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {data.seasons.filter(s => s.season_number > 0).map((s) => (
                  <option key={s.season_number} value={s.season_number}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Episode</label>
              <select
                value={selectedEpisode}
                onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                className="bg-secondary text-foreground rounded-lg px-3 py-2 text-sm border border-border focus:ring-1 focus:ring-primary focus:outline-none"
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

        {/* Trailer */}
        {trailer && (
          <div className="mt-10">
            <h3 className="text-xl font-bold text-foreground mb-3">Official Trailer</h3>
            <div className="aspect-video max-w-3xl rounded-xl overflow-hidden">
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
