import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { searchMulti } from "@/lib/tmdb";
import MovieCard from "@/components/MovieCard";
import { Search as SearchIcon, Loader2 } from "lucide-react";

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      if (query) setSearchParams({ q: query });
    }, 200);
    return () => clearTimeout(timer);
  }, [query, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchMulti(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  const results = (data?.results || []).filter(
    (r: any) => r.media_type === "movie" || r.media_type === "tv"
  );

  return (
    <div className="min-h-screen bg-background pt-20 px-4 md:px-12">
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies & TV shows..."
            className="w-full rounded-lg border border-border bg-secondary pl-12 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      )}

      {!isLoading && debouncedQuery && results.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No results found for "{debouncedQuery}"</p>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
        {results.map((movie: any) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
};

export default Search;
