import { useState } from "react";
import { Loader2, AlertCircle, Server } from "lucide-react";
import { StreamSource } from "@/types/movie";

interface VideoPlayerProps {
  sources: StreamSource[];
  title: string;
}

const VideoPlayer = ({ sources, title }: VideoPlayerProps) => {
  const [activeServer, setActiveServer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleError = () => {
    setLoading(false);
    setError(true);
    // Auto-switch to next server
    if (activeServer < sources.length - 1) {
      setTimeout(() => {
        setActiveServer((prev) => prev + 1);
        setError(false);
        setLoading(true);
      }, 2000);
    }
  };

  const switchServer = (index: number) => {
    setActiveServer(index);
    setLoading(true);
    setError(false);
  };

  if (!sources.length) {
    return (
      <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No free links available right now</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-video bg-card rounded-lg overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">This link is down – trying another server...</p>
            </div>
          </div>
        )}
        <iframe
          src={sources[activeServer].url}
          title={title}
          className="w-full h-full"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          onLoad={() => setLoading(false)}
          onError={handleError}
          referrerPolicy="origin"
        />
      </div>

      {/* Server List */}
      <div className="mt-4 flex flex-wrap gap-2">
        {sources.map((source, i) => (
          <button
            key={i}
            onClick={() => switchServer(i)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              i === activeServer
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            <Server className="h-3.5 w-3.5" />
            {source.name}
            <span className="text-xs opacity-70">({source.quality})</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default VideoPlayer;
