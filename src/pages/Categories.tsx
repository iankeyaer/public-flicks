import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGenres, discoverByGenre } from "@/lib/tmdb";
import { Genre } from "@/types/movie";
import MovieCard from "@/components/MovieCard";
import { Loader2 } from "lucide-react";

const Categories = () => {
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const { data: genreData } = useQuery({
    queryKey: ["genres"],
    queryFn: () => getGenres("movie"),
  });

  const { data: movies, isLoading } = useQuery({
    queryKey: ["discover", selectedGenre, page],
    queryFn: () => discoverByGenre(selectedGenre!, page),
    enabled: !!selectedGenre,
  });

  const genres: Genre[] = genreData?.genres || [];

  return (
    <div className="min-h-screen bg-background pt-20 px-4 md:px-12">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
        Browse by Genre
      </h1>

      <div className="flex flex-wrap gap-2 mb-8">
        {genres.map((genre) => (
          <button
            key={genre.id}
            onClick={() => { setSelectedGenre(genre.id); setPage(1); }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selectedGenre === genre.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {genre.name}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      )}

      {!selectedGenre && (
        <p className="text-center text-muted-foreground py-12">Select a genre to explore movies</p>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
        {movies?.results?.map((movie: any) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>

      {movies?.results?.length > 0 && (
        <div className="flex justify-center gap-3 py-8">
          {page > 1 && (
            <button
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground hover:bg-accent transition-colors"
            >
              Previous
            </button>
          )}
          <button
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default Categories;
