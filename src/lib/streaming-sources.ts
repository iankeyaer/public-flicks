import { supabase } from "@/integrations/supabase/client";
import { StreamSource } from "@/types/movie";

export interface StreamingResult {
  sources: StreamSource[];
  error?: string;
}

/**
 * Search yflix.to and sflix.ps for streaming links via the edge function.
 * Returns watch-page URLs that open in a new tab for seamless playback.
 */
export const fetchStreamingSources = async (
  title: string,
  type: "movie" | "tv",
  year?: string,
  season?: number,
  episode?: number
): Promise<StreamingResult> => {
  try {
    const { data, error } = await supabase.functions.invoke("yflix-search", {
      body: { title, type, year, season, episode },
    });

    if (error || !data?.success) {
      console.error("Streaming search failed:", error || data?.error);
      return { sources: [], error: data?.error || "Search failed" };
    }

    return { sources: data.sources || [] };
  } catch (err) {
    console.error("Streaming search error:", err);
    return { sources: [], error: "Network error" };
  }
};
