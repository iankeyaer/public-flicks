import { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertCircle,
  ShieldCheck,
  Maximize,
  Minimize,
  MonitorPlay,
  Flag,
  ChevronDown,
  Check,
  RefreshCw,
} from "lucide-react";
import { StreamSource } from "@/types/movie";
import { motion, AnimatePresence } from "framer-motion";

interface VideoPlayerProps {
  sources: StreamSource[];
  title: string;
}

const VideoPlayer = ({ sources, title }: VideoPlayerProps) => {
  const [activeServer, setActiveServer] = useState(0);
  const [error, setError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [minLoadMet, setMinLoadMet] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [reported, setReported] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showAdTip, setShowAdTip] = useState(() => !localStorage.getItem("hideAdTip"));

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();
  const sourceMenuRef = useRef<HTMLDivElement>(null);
  const reportMenuRef = useRef<HTMLDivElement>(null);

  const showLoading = !iframeLoaded || !minLoadMet;

  // Loading logic (no auto-advance — let user pick servers)
  useEffect(() => {
    setIframeLoaded(false);
    setMinLoadMet(false);
    setError(false);
    setReported(false);
    setIframeKey((k) => k + 1);

    const minTimer = setTimeout(() => setMinLoadMet(true), 2000);

    return () => {
      clearTimeout(minTimer);
    };
  }, [activeServer]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Keyboard shortcut: F for fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (sourceMenuRef.current && !sourceMenuRef.current.contains(e.target as Node)) {
        setShowSourceMenu(false);
      }
      if (reportMenuRef.current && !reportMenuRef.current.contains(e.target as Node)) {
        setShowReportMenu(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (!showSourceMenu && !showReportMenu) setShowControls(false);
    }, 3500);
  }, [showSourceMenu, showReportMenu]);

  useEffect(() => {
    resetControlsTimer();
    return () => clearTimeout(controlsTimer.current);
  }, [resetControlsTimer]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  };

  const handleError = () => {
    setIframeLoaded(true);
    setError(true);
    if (activeServer < sources.length - 1) {
      setTimeout(() => setActiveServer((prev) => prev + 1), 2000);
    }
  };

  const handleSourceChange = (index: number) => {
    if (index !== activeServer) {
      setActiveServer(index);
    }
    setShowSourceMenu(false);
  };

  const handleReport = () => {
    setReported(true);
    setShowReportMenu(false);
    // Auto-try next source
    if (activeServer < sources.length - 1) {
      setTimeout(() => setActiveServer((prev) => prev + 1), 1500);
    }
  };

  const dismissAdTip = () => {
    setShowAdTip(false);
    localStorage.setItem("hideAdTip", "1");
  };

  if (!sources.length) {
    return (
      <div className="aspect-video bg-secondary rounded-xl flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">This content is currently unavailable</p>
        </div>
      </div>
    );
  }

  const currentSource = sources[activeServer];

  return (
    <div className="space-y-3">
      {/* Ad tip */}
      <AnimatePresence>
        {showAdTip && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" />
              <p className="text-xs text-foreground/80">
                For the best experience, use an{" "}
                <a
                  href="https://ublockorigin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-medium hover:underline"
                >
                  adblocker
                </a>.
              </p>
            </div>
            <button onClick={dismissAdTip} className="text-xs text-muted-foreground hover:text-foreground flex-shrink-0">
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player container */}
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden border border-border bg-background group"
        onMouseMove={resetControlsTimer}
        onTouchStart={resetControlsTimer}
      >
        {/* Video area */}
        <div className="relative aspect-video bg-black">
          {/* Loading overlay */}
          <AnimatePresence>
            {showLoading && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20"
              >
                <div className="text-center space-y-4">
                  <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto" />
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-foreground">Loading</p>
                    <p className="text-xs text-muted-foreground">Please be patient, this may take a moment...</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error overlay */}
          {error && activeServer >= sources.length - 1 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
              <div className="text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">This content is temporarily unavailable.</p>
                <button
                  onClick={() => { setActiveServer(0); }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try again
                </button>
              </div>
            </div>
          )}

          {/* Reported confirmation */}
          <AnimatePresence>
            {reported && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-4 right-4 z-30 bg-card border border-border rounded-lg px-3 py-2 shadow-lg flex items-center gap-2"
              >
                <Check className="h-4 w-4 text-primary" />
                <span className="text-xs text-foreground">Reported — trying next source...</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Iframe */}
          <iframe
            key={iframeKey}
            src={currentSource.url}
            title={title}
            className={`w-full h-full border-0 bg-black transition-opacity duration-500 ${showLoading ? "opacity-0" : "opacity-100"}`}
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            onLoad={() => setIframeLoaded(true)}
            onError={handleError}
            referrerPolicy="no-referrer"
            style={{ border: 0 }}
          />

          {/* Fallback: open in new tab if iframe seems blocked */}
          {!showLoading && iframeLoaded && (
            <div className="absolute bottom-14 left-0 right-0 flex justify-center z-20 pointer-events-none">
              <button
                onClick={() => window.open(currentSource.url, '_blank')}
                className="pointer-events-auto text-[10px] text-white/50 hover:text-white/80 underline transition-colors"
              >
                Video not loading? Open in new tab
              </button>
            </div>
          )}
        </div>

        {/* Bottom control bar */}
        <AnimatePresence>
          {(showControls || showSourceMenu || showReportMenu) && !showLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 pb-3 px-4"
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left: title */}
                <div className="flex items-center gap-2 min-w-0">
                  <MonitorPlay className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-xs font-medium text-white truncate">{title}</span>
                </div>

                {/* Right: controls */}
                <div className="flex items-center gap-1">
                  {/* Source / quality selector */}
                  <div className="relative" ref={sourceMenuRef}>
                    <button
                      onClick={() => { setShowSourceMenu(!showSourceMenu); setShowReportMenu(false); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
                    >
                      <span className="text-primary font-semibold">{currentSource.quality}</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSourceMenu ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {showSourceMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full mb-2 right-0 w-48 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50"
                        >
                          <div className="px-3 py-2 border-b border-border">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Select Source</p>
                          </div>
                          {sources.map((source, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSourceChange(idx)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs transition-colors ${
                                idx === activeServer
                                  ? "bg-primary/10 text-primary"
                                  : "text-foreground hover:bg-secondary"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {idx === activeServer && <Check className="h-3.5 w-3.5 text-primary" />}
                                <span className={idx === activeServer ? "font-semibold" : ""}>{source.name}</span>
                              </div>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                source.quality === "1080p"
                                  ? "bg-primary/20 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {source.quality}
                              </span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Report issue */}
                  <div className="relative" ref={reportMenuRef}>
                    <button
                      onClick={() => { setShowReportMenu(!showReportMenu); setShowSourceMenu(false); }}
                      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                      title="Report issue"
                    >
                      <Flag className="h-4 w-4" />
                    </button>

                    <AnimatePresence>
                      {showReportMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full mb-2 right-0 w-52 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50"
                        >
                          <div className="px-3 py-2 border-b border-border">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Report Issue</p>
                          </div>
                          {["Not playing", "Bad quality", "Wrong content", "Audio issues"].map((issue) => (
                            <button
                              key={issue}
                              onClick={handleReport}
                              className="w-full text-left px-3 py-2.5 text-xs text-foreground hover:bg-secondary transition-colors"
                            >
                              {issue}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    title="Fullscreen (F)"
                  >
                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VideoPlayer;
