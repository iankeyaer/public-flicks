import { Heart } from "lucide-react";

const Favorites = () => (
  <div className="min-h-screen bg-background pt-20 px-4 md:px-12">
    <h1 className="font-display text-3xl md:text-4xl tracking-wide text-foreground mb-6">
      My Favorites
    </h1>
    <div className="flex flex-col items-center justify-center py-20">
      <Heart className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground text-center max-w-md">
        Sign in to save your favorite movies and shows. Your watchlist will appear here.
      </p>
      <p className="text-xs text-muted-foreground/50 mt-2">Coming soon with user accounts</p>
    </div>
  </div>
);

export default Favorites;
