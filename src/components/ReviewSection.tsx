import { useState } from "react";
import { useReviews } from "@/hooks/use-reviews";
import { useAuth } from "@/contexts/AuthContext";
import { Star, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface ReviewSectionProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
}

const ReviewSection = ({ tmdbId, mediaType }: ReviewSectionProps) => {
  const { user } = useAuth();
  const { reviews, addReview } = useReviews(tmdbId, mediaType);
  const [rating, setRating] = useState(7);
  const [comment, setComment] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await addReview.mutateAsync({ rating, comment: comment.trim() });
      setComment("");
      toast({ title: "Review posted!" });
    } catch {
      toast({ title: "Error posting review", variant: "destructive" });
    }
  };

  return (
    <div className="mt-10">
      <h3 className="font-display text-xl tracking-wide text-foreground mb-4">Reviews</h3>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-6 bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-1 mb-3">
            {Array.from({ length: 10 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i + 1)}
                onMouseEnter={() => setHoverRating(i + 1)}
                onMouseLeave={() => setHoverRating(0)}
              >
                <Star
                  className={`h-5 w-5 transition-colors ${
                    i < (hoverRating || rating)
                      ? "text-yellow-500 fill-yellow-500"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
            <span className="text-sm text-muted-foreground ml-2">{hoverRating || rating}/10</span>
          </div>
          <div className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your review..."
              className="flex-1 rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={addReview.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">
            <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to leave a review
          </p>
        </div>
      )}

      <div className="space-y-3">
        {reviews.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">No reviews yet. Be the first!</p>
        )}
        {reviews.data?.map((review: any) => (
          <div key={review.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                {review.profiles?.username || "Anonymous"}
              </span>
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-xs text-muted-foreground">{review.rating}/10</span>
              </div>
            </div>
            <p className="text-sm text-foreground/80">{review.comment}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(review.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewSection;
