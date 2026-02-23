import { useQuery } from "@tanstack/react-query";
import { getTrending, getImageUrl } from "@/lib/tmdb";
import { Link } from "react-router-dom";
import { Movie } from "@/types/movie";

const Top10Section = () => {
  const { data } = useQuery({
    queryKey: ["top-10"],
    queryFn: () => getTrending("all"),
  });

  const top10: Movie[] = (data?.results || []).slice(0, 10);

  if (!top10.length) return null;

  return (
    <section className="px-4 md:px-12 py-4">
      <h2 className="font-display text-2xl tracking-wide text-foreground mb-3">
        🏆 Top 10 This Week
      </h2>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {top10.map((movie, i) => (
          <Link
            key={movie.id}
            to={`/${movie.media_type || "movie"}/${movie.id}`}
            className="tv-focusable flex-shrink-0 flex items-end group focus:scale-105 transition-transform"
          >
            <span className="font-display text-[80px] md:text-[100px] leading-none text-foreground/10 -mr-4 z-10 select-none">
              {i + 1}
            </span>
            <div className="w-28 md:w-32 aspect-[2/3] rounded-lg overflow-hidden bg-card relative">
              <img
                src={getImageUrl(movie.poster_path)}
                alt={movie.title || movie.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default Top10Section;
