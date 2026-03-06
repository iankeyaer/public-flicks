import { useQuery } from "@tanstack/react-query";
import { getTrending, getPopular, getNowPlaying, getTopRated } from "@/lib/tmdb";
import HeroCarousel from "@/components/HeroCarousel";
import MovieSection from "@/components/MovieSection";
import ContinueWatchingSection from "@/components/ContinueWatchingSection";
import Top10Section from "@/components/Top10Section";
import { Loader2 } from "lucide-react";

const Index = () => {
  const trending = useQuery({ queryKey: ["trending"], queryFn: () => getTrending("all") });
  const popular = useQuery({ queryKey: ["popular-movies"], queryFn: () => getPopular("movie") });
  const nowPlaying = useQuery({ queryKey: ["now-playing"], queryFn: () => getNowPlaying() });
  const topTV = useQuery({ queryKey: ["top-tv"], queryFn: () => getTopRated("tv") });
  const trendingTV = useQuery({ queryKey: ["trending-tv"], queryFn: () => getTrending("tv") });

  const isLoading = trending.isLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  if (trending.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <h2 className="text-3xl font-bold text-foreground mb-3">API Key Required</h2>
          <p className="text-muted-foreground text-sm mb-4">
            To use Quorix, you need a free TMDB API key.
          </p>
          <ol className="text-left text-sm text-muted-foreground space-y-2">
            <li>1. Go to <a href="https://www.themoviedb.org/signup" target="_blank" rel="noreferrer" className="text-primary underline">themoviedb.org</a> and create a free account</li>
            <li>2. Go to Settings → API → Create → Developer</li>
            <li>3. Copy your API Key (v3 auth)</li>
            <li>4. Paste it in <code className="bg-secondary px-1.5 py-0.5 rounded text-xs">src/lib/tmdb.ts</code></li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HeroCarousel movies={trending.data?.results || []} />
      <div className="-mt-16 relative z-10 space-y-2">
        <ContinueWatchingSection />
        <Top10Section />
        <MovieSection title="Trending Now" movies={trending.data?.results || []} />
        <MovieSection title="Popular Movies" movies={popular.data?.results || []} />
        <MovieSection title="New Releases" movies={nowPlaying.data?.results || []} />
        <MovieSection title="Top TV Shows" movies={topTV.data?.results || []} />
        <MovieSection title="Trending TV" movies={trendingTV.data?.results || []} />
      </div>
    </div>
  );
};

export default Index;
