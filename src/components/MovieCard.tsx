import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { Movie } from "@/types/movie";
import { getImageUrl } from "@/lib/tmdb";

interface MovieCardProps {
  movie: Movie;
  index?: number;
}

const MovieCard = ({ movie, index = 0 }: MovieCardProps) => {
  const type = movie.media_type === "tv" || movie.name && !movie.title ? "tv" : "movie";
  const title = movie.title || movie.name || "Untitled";
  const year = (movie.release_date || movie.first_air_date || "").slice(0, 4);

  return (
    <Link
      to={`/${type}/${movie.id}`}
      className="group relative flex-shrink-0 w-36 md:w-44 rounded-lg overflow-hidden transition-transform duration-300 hover:scale-105 hover:z-10"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="aspect-[2/3] bg-secondary">
        <img
          src={getImageUrl(movie.poster_path, "w342")}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="absolute inset-0 gradient-card opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
        <p className="text-xs font-semibold text-foreground line-clamp-2">{title}</p>
        <div className="flex items-center gap-2 mt-1">
          {year && <span className="text-xs text-muted-foreground">{year}</span>}
          <div className="flex items-center gap-0.5">
            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
            <span className="text-xs text-muted-foreground">{movie.vote_average.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default MovieCard;
