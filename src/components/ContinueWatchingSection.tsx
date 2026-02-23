import { useWatchHistory } from "@/hooks/use-watch-history";
import { useAuth } from "@/contexts/AuthContext";
import { getImageUrl } from "@/lib/tmdb";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";

const ContinueWatchingSection = () => {
  const { user } = useAuth();
  const { continueWatching } = useWatchHistory();

  if (!user || !continueWatching.data?.length) return null;

  return (
    <section className="px-4 md:px-12 py-4">
      <h2 className="font-display text-2xl tracking-wide text-foreground mb-3">
        ▶ Continue Watching
      </h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {continueWatching.data.map((item) => (
          <Link
            key={`${item.tmdb_id}-${item.media_type}`}
            to={`/${item.media_type}/${item.tmdb_id}`}
            className="tv-focusable flex-shrink-0 w-40 group focus:scale-105 transition-transform"
          >
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-card">
              <img
                src={getImageUrl(item.poster_path)}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play className="h-8 w-8 text-white fill-white" />
              </div>
              {item.progress_seconds > 0 && item.duration_seconds > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min((item.progress_seconds / item.duration_seconds) * 100, 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-foreground mt-1.5 truncate">{item.title}</p>
            {item.media_type === "tv" && item.season && item.episode && (
              <p className="text-[10px] text-muted-foreground">S{item.season}E{item.episode}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ContinueWatchingSection;
