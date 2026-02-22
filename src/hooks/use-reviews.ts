import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useReviews = (tmdbId: number, mediaType: "movie" | "tv") => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const reviews = useQuery({
    queryKey: ["reviews", tmdbId, mediaType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, profiles(username, avatar_url)")
        .eq("tmdb_id", tmdbId)
        .eq("media_type", mediaType)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addReview = useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment: string }) => {
      if (!user) throw new Error("Must be logged in");
      const { error } = await supabase.from("reviews").upsert(
        {
          user_id: user.id,
          tmdb_id: tmdbId,
          media_type: mediaType,
          rating,
          comment,
        },
        { onConflict: "user_id,tmdb_id,media_type" }
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews", tmdbId, mediaType] }),
  });

  return { reviews, addReview };
};
