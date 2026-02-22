import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ThumbsUp, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const Requests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const requests = useQuery({
    queryKey: ["movie-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movie_requests")
        .select("*, profiles(username), request_votes(user_id)")
        .order("votes", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addRequest = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");
      const { error } = await supabase.from("movie_requests").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movie-requests"] });
      setTitle("");
      setDescription("");
      toast({ title: "Request submitted!" });
    },
  });

  const vote = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error("Must be logged in");
      // Check if already voted
      const { data: existing } = await supabase
        .from("request_votes")
        .select("id")
        .eq("user_id", user.id)
        .eq("request_id", requestId)
        .maybeSingle();

      if (existing) {
        await supabase.from("request_votes").delete().eq("id", existing.id);
        await supabase.from("movie_requests").update({ votes: 0 }).eq("id", requestId);
        // Recount
        const { count } = await supabase
          .from("request_votes")
          .select("*", { count: "exact", head: true })
          .eq("request_id", requestId);
        await supabase.from("movie_requests").update({ votes: (count || 0) + 1 }).eq("id", requestId);
      } else {
        await supabase.from("request_votes").insert({ user_id: user.id, request_id: requestId });
        const { count } = await supabase
          .from("request_votes")
          .select("*", { count: "exact", head: true })
          .eq("request_id", requestId);
        await supabase.from("movie_requests").update({ votes: (count || 0) + 1 }).eq("id", requestId);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["movie-requests"] }),
  });

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 px-4 md:px-12">
      <h1 className="font-display text-4xl tracking-wide text-foreground mb-2">Request a Movie</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Can't find something? Request it and vote for others' requests!
      </p>

      {user ? (
        <form
          onSubmit={(e) => { e.preventDefault(); addRequest.mutate(); }}
          className="mb-8 bg-card border border-border rounded-xl p-5 max-w-xl"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Movie or TV show title..."
            className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-3"
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any details? (optional)"
            rows={2}
            className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-3 resize-none"
          />
          <button
            type="submit"
            disabled={addRequest.isPending || !title.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Submit Request
          </button>
        </form>
      ) : (
        <div className="mb-8 bg-card border border-border rounded-xl p-5 text-center">
          <p className="text-sm text-muted-foreground">
            <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to submit a request
          </p>
        </div>
      )}

      {requests.isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      )}

      <div className="space-y-3 max-w-xl">
        {requests.data?.map((req: any) => {
          const hasVoted = req.request_votes?.some((v: any) => v.user_id === user?.id);
          return (
            <div key={req.id} className="bg-card border border-border rounded-lg p-4 flex items-start gap-4">
              <button
                onClick={() => user && vote.mutate(req.id)}
                disabled={!user}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                  hasVoted ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ThumbsUp className={`h-5 w-5 ${hasVoted ? "fill-primary" : ""}`} />
                <span className="text-xs font-medium">{req.votes}</span>
              </button>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">{req.title}</h4>
                {req.description && (
                  <p className="text-xs text-muted-foreground mt-1">{req.description}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">
                  by {req.profiles?.username || "Anonymous"} · {new Date(req.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                req.status === "approved" ? "bg-green-500/20 text-green-400" :
                req.status === "rejected" ? "bg-red-500/20 text-red-400" :
                "bg-muted text-muted-foreground"
              }`}>
                {req.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Requests;
