import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useWatchHistory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const history = useQuery({
    queryKey: ["watch-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watch_history")
        .select("*")
        .order("watched_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const continueWatching = useQuery({
    queryKey: ["continue-watching", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watch_history")
        .select("*")
        .gt("progress_seconds", 0)
        .order("watched_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      // Deduplicate by tmdb_id, keep latest
      const seen = new Set<string>();
      return data.filter((item) => {
        const key = `${item.tmdb_id}-${item.media_type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    enabled: !!user,
  });

  const addToHistory = useMutation({
    mutationFn: async (entry: {
      tmdb_id: number;
      media_type: "movie" | "tv";
      title: string;
      poster_path: string | null;
      season?: number;
      episode?: number;
    }) => {
      if (!user) return;
      const { error } = await supabase.from("watch_history").upsert(
        {
          user_id: user.id,
          tmdb_id: entry.tmdb_id,
          media_type: entry.media_type,
          title: entry.title,
          poster_path: entry.poster_path,
          season: entry.season || null,
          episode: entry.episode || null,
          watched_at: new Date().toISOString(),
        },
        { onConflict: "user_id,tmdb_id,media_type,season,episode" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-history"] });
      queryClient.invalidateQueries({ queryKey: ["continue-watching"] });
    },
  });

  return { history, continueWatching, addToHistory };
};
