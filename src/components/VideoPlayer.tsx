import { useState, useEffect } from "react";
import { Loader2, AlertCircle, Server, ExternalLink, ShieldCheck } from "lucide-react";
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
  const [showFallback, setShowFallback] = useState(false);
  const [showAdTip, setShowAdTip] = useState(() => {
    return !localStorage.getItem("hideAdTip");
  });

  useEffect(() => {
    setLoading(true);
    setError(false);
    setShowFallback(false);
    setIframeKey((k) => k + 1);

    // Auto-advance to next server if loading takes too long
    const loadTimer = setTimeout(() => {
      if (activeServer < sources.length - 1) {
        setActiveServer((prev) => prev + 1);
      } else {
        setShowFallback(true);
      }
    }, 12000);

    // Show fallback hint after 20s
    const fallbackTimer = setTimeout(() => setShowFallback(true), 20000);

    return () => {
      clearTimeout(loadTimer);
      clearTimeout(fallbackTimer);
    };
  }, [activeServer, sources.length]);

  const handleLoad = () => {
    setLoading(false);
    setShowFallback(false);
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

  const dismissAdTip = () => {
    setShowAdTip(false);
    localStorage.setItem("hideAdTip", "1");
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
      {/* Adblocker recommendation */}
      {showAdTip && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-xs text-foreground/80">
              For the cleanest experience, install{" "}
              <a
                href="https://ublockorigin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline"
              >
                uBlock Origin
              </a>{" "}
              — it blocks all ads from embed players.
            </p>
          </div>
          <button
            onClick={dismissAdTip}
            className="text-xs text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="relative aspect-video bg-card rounded-lg overflow-hidden border border-border">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Preparing your stream...</p>
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
          onLoad={() => { setLoading(false); setShowFallback(false); }}
          onError={handleError}
          referrerPolicy="no-referrer"
          style={{ border: 0 }}
        />
      </div>

      {/* Only show fallback after delay */}
      {showFallback && (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Having trouble? Try a different server below.
          </p>
          <a
            href={currentSource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Open externally <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

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
