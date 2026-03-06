import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Play, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Movie } from "@/types/movie";
import { getImageUrl } from "@/lib/tmdb";

interface HeroCarouselProps {
  movies: Movie[];
}

const HeroCarousel = ({ movies }: HeroCarouselProps) => {
  const [current, setCurrent] = useState(0);
  const items = movies.slice(0, 5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (!items.length) return null;
  const movie = items[current];
  const type = movie.media_type === "tv" || movie.name ? "tv" : "movie";

  return (
    <div className="relative h-[65vh] sm:h-[70vh] md:h-[85vh] 2xl:h-[90vh] w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={movie.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <img
            src={getImageUrl(movie.backdrop_path, "original")}
            alt={movie.title || movie.name || ""}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-24 sm:bottom-20 md:bottom-28 left-0 px-4 md:px-12 max-w-2xl z-10">
        <motion.div
          key={movie.id + "-text"}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground text-shadow-hero mb-3">
            {movie.title || movie.name}
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-foreground/70 line-clamp-2 sm:line-clamp-3 mb-5 max-w-lg leading-relaxed">
            {movie.overview}
          </p>
          <div className="flex gap-3">
            <Link
              to={`/${type}/${movie.id}`}
              className="tv-focusable flex items-center gap-2 rounded-full gradient-brand px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity shadow-lg"
            >
              <Play className="h-4 w-4 fill-current" />
              Watch Now
            </Link>
            <Link
              to={`/${type}/${movie.id}`}
              className="tv-focusable flex items-center gap-2 rounded-full bg-foreground/10 border border-foreground/20 px-6 py-3 text-sm font-semibold text-foreground hover:bg-foreground/20 transition-colors backdrop-blur-sm"
            >
              <Plus className="h-4 w-4" />
              My List
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Progress bar indicators - Showmax style */}
      <div className="absolute bottom-8 md:bottom-12 left-4 md:left-12 flex gap-1.5 z-10">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="h-1 rounded-full transition-all duration-500 overflow-hidden bg-foreground/20"
            style={{ width: i === current ? '2rem' : '0.75rem' }}
          >
            {i === current && (
              <motion.div
                className="h-full gradient-brand rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 6, ease: "linear" }}
                key={`progress-${current}`}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
