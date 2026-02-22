import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Play, Info } from "lucide-react";
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
    <div className="relative h-[60vh] sm:h-[70vh] md:h-[85vh] 2xl:h-[90vh] w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={movie.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <img
            src={getImageUrl(movie.backdrop_path, "original")}
            alt={movie.title || movie.name || ""}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/30 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-20 sm:bottom-16 md:bottom-24 left-0 px-4 md:px-12 max-w-2xl z-10">
        <motion.div
          key={movie.id + "-text"}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h1 className="font-display text-3xl sm:text-4xl md:text-6xl lg:text-7xl 2xl:text-8xl tracking-wide text-foreground text-shadow-hero mb-2 sm:mb-3">
            {movie.title || movie.name}
          </h1>
          <p className="text-xs sm:text-sm md:text-base 2xl:text-lg text-foreground/80 line-clamp-2 sm:line-clamp-3 mb-4 sm:mb-5 max-w-lg">
            {movie.overview}
          </p>
          <div className="flex gap-3">
            <Link
              to={`/${type}/${movie.id}`}
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Play className="h-4 w-4 fill-current" />
              Watch Now
            </Link>
            <Link
              to={`/${type}/${movie.id}`}
              className="flex items-center gap-2 rounded-md bg-secondary/80 px-5 py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary transition-colors backdrop-blur-sm"
            >
              <Info className="h-4 w-4" />
              More Info
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? "w-8 bg-primary" : "w-3 bg-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
