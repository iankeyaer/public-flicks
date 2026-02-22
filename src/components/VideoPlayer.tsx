import { useState, useEffect } from "react";
import { Loader2, AlertCircle, Server, ExternalLink } from "lucide-react";
import { StreamSource } from "@/types/movie";

interface VideoPlayerProps {
  sources: StreamSource[];
  title: string;
}

const VideoPlayer = ({ sources, title }: VideoPlayerProps) => {
  const [activeServer, setActiveServer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setIframeKey((k) => k + 1);
  }, [activeServer]);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
    if (activeServer < sources.length - 1) {
      setTimeout(() => {
        setActiveServer((prev) => prev + 1);
      }, 2000);
    }
  };

  const switchServer = (index: number) => {
    setActiveServer(index);
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

  const currentSource = sources[activeServer];

  return (
    <div>
      <div className="relative aspect-video bg-card rounded-lg overflow-hidden border border-border">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Loading {currentSource.name}...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {activeServer < sources.length - 1
                  ? "This link is down – trying another server..."
                  : "All servers are currently unavailable"}
              </p>
            </div>
          </div>
        )}
        <iframe
          key={iframeKey}
          src={currentSource.url}
          title={title}
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          onLoad={handleLoad}
          onError={handleError}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
          referrerPolicy="no-referrer"
          style={{ border: 0 }}
        />
      </div>

      {/* Open in new tab fallback */}
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Player not loading? Try opening in a new tab or switch servers below.
        </p>
        <a
          href={currentSource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Open in new tab <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Server List */}
      <div className="mt-3 flex flex-wrap gap-2">
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
