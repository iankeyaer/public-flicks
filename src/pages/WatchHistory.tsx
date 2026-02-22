import { useWatchHistory } from "@/hooks/use-watch-history";
import { useAuth } from "@/contexts/AuthContext";
import { getImageUrl } from "@/lib/tmdb";
import { Link, Navigate } from "react-router-dom";
import { Clock, Loader2 } from "lucide-react";

const WatchHistory = () => {
  const { user, loading } = useAuth();
  const { history } = useWatchHistory();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 px-4 md:px-12">
      <h1 className="font-display text-4xl tracking-wide text-foreground mb-2">Watch History</h1>
      <p className="text-sm text-muted-foreground mb-8">Everything you've watched.</p>

      {history.isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      )}

      {history.data?.length === 0 && (
        <div className="text-center py-16">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nothing here yet. Start watching!</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {history.data?.map((item) => (
          <Link
            key={item.id}
            to={`/${item.media_type}/${item.tmdb_id}`}
            className="group"
          >
            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-card">
              <img
                src={getImageUrl(item.poster_path)}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <p className="text-xs text-foreground mt-1.5 truncate">{item.title}</p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(item.watched_at).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default WatchHistory;
