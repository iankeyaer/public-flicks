import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import MovieCard from "@/components/MovieCard";

const Favorites = () => {
  const { favorites } = useFavorites();

  return (
    <div className="min-h-screen bg-background pt-20 px-4 md:px-12">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
        My List
      </h1>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Heart className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-center max-w-md">
            You haven't added anything to your list yet. Browse movies and tap the heart icon to save them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {favorites.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;
