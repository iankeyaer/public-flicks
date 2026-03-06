import { Link } from "react-router-dom";
import { Movie } from "@/types/movie";
import { getImageUrl } from "@/lib/tmdb";

interface MovieCardProps {
  movie: Movie;
  index?: number;
}

const MovieCard = ({ movie, index = 0 }: MovieCardProps) => {
  const type = movie.media_type === "tv" || movie.name && !movie.title ? "tv" : "movie";
  const title = movie.title || movie.name || "Untitled";

  return (
    <Link
      to={`/${type}/${movie.id}`}
      className="tv-focusable group relative flex-shrink-0 w-32 sm:w-36 md:w-44 lg:w-48 2xl:w-56 transition-transform duration-300 hover:scale-105 hover:z-10 focus:scale-105 focus:z-10"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="aspect-[2/3] bg-card rounded-lg overflow-hidden relative">
        <img
          src={getImageUrl(movie.poster_path, "w342")}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Showmax-style bottom gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
      </div>
      <p className="text-[11px] sm:text-xs 2xl:text-sm font-medium text-foreground mt-2 line-clamp-1">{title}</p>
    </Link>
  );
};

export default MovieCard;
