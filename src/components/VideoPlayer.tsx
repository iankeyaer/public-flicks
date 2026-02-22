import { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertCircle,
  ShieldCheck,
  Maximize,
  Minimize,
  Flag,
  ChevronDown,
  Check,
  RefreshCw,
  Settings,
  Volume2,
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

  // Loading & auto-advance logic
  useEffect(() => {
    setIframeLoaded(false);
    setMinLoadMet(false);
    setError(false);
    setReported(false);
    setIframeKey((k) => k + 1);

    const minTimer = setTimeout(() => setMinLoadMet(true), 3000);
    const loadTimer = setTimeout(() => {
      if (activeServer < sources.length - 1) {
        setActiveServer((prev) => prev + 1);
      }
    }, 12000);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(loadTimer);
    };
  }, [activeServer, sources.length]);

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
      <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">This content is currently unavailable</p>
        </div>
      </div>
    );
  }

  const currentSource = sources[activeServer];

  return (
    <div className="space-y-2">
      {/* Ad tip */}
      <AnimatePresence>
        {showAdTip && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between gap-3 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2.5"
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
        className="relative overflow-hidden bg-black group"
        style={{ borderRadius: isFullscreen ? 0 : 8 }}
        onMouseMove={resetControlsTimer}
        onTouchStart={resetControlsTimer}
      >
        {/* Video area */}
        <div className="relative aspect-video bg-black">
          {/* Netflix-style loading overlay */}
          <AnimatePresence>
            {showLoading && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20"
              >
                {/* Netflix-style loading animation */}
                <div className="flex flex-col items-center gap-6">
                  {/* Pulsing ring loader */}
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-[3px] border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary animate-spin" />
                    <div className="absolute inset-[6px] rounded-full border-[2px] border-transparent border-b-primary/60 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[13px] font-medium text-white/90 tracking-wide">Loading</p>
                    <p className="text-[11px] text-white/40">Please wait...</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error overlay */}
          {error && activeServer >= sources.length - 1 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                  <AlertCircle className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white/90">Something went wrong</p>
                  <p className="text-xs text-white/40">This content is temporarily unavailable</p>
                </div>
                <button
                  onClick={() => setActiveServer(0)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors bg-primary/10 px-4 py-2 rounded-md"
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
                className="absolute top-4 right-4 z-30 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 shadow-2xl flex items-center gap-2"
              >
                <Check className="h-4 w-4 text-primary" />
                <span className="text-xs text-white/90">Switching source...</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Iframe */}
          <iframe
            key={iframeKey}
            src={currentSource.url}
            title={title}
            className={`w-full h-full border-0 transition-opacity duration-500 ${showLoading ? "opacity-0" : "opacity-100"}`}
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            onLoad={() => setIframeLoaded(true)}
            onError={handleError}
            referrerPolicy="no-referrer"
            style={{ border: 0, background: '#000', colorScheme: 'dark' }}
          />
        </div>

        {/* Netflix-style bottom controls */}
        <AnimatePresence>
          {(showControls || showSourceMenu || showReportMenu) && !showLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-0 right-0 z-30"
            >
              {/* Gradient backdrop */}
              <div className="bg-gradient-to-t from-black via-black/70 to-transparent pt-20 pb-0">
                {/* Fake progress bar */}
                <div className="px-4 mb-2">
                  <div className="w-full h-[3px] bg-white/20 rounded-full overflow-hidden group/progress cursor-pointer hover:h-[5px] transition-all">
                    <div className="h-full bg-primary rounded-full w-0 group-hover/progress:shadow-[0_0_8px_hsl(var(--primary))]" />
                  </div>
                </div>

                {/* Controls row */}
                <div className="flex items-center justify-between px-4 pb-3">
                  {/* Left side */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Volume2 className="h-5 w-5 text-white/80 hover:text-white cursor-pointer transition-colors flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{title}</p>
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex items-center gap-0.5">
                    {/* Source selector */}
                    <div className="relative" ref={sourceMenuRef}>
                      <button
                        onClick={() => { setShowSourceMenu(!showSourceMenu); setShowReportMenu(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        <span>{currentSource.quality}</span>
                        <ChevronDown className={`h-3 w-3 transition-transform ${showSourceMenu ? "rotate-180" : ""}`} />
                      </button>

                      <AnimatePresence>
                        {showSourceMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.12 }}
                            className="absolute bottom-full mb-2 right-0 w-52 bg-black/95 backdrop-blur-xl border border-white/10 rounded-md shadow-2xl overflow-hidden z-50"
                          >
                            <div className="px-3 py-2 border-b border-white/10">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Quality</p>
                            </div>
                            {sources.map((source, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSourceChange(idx)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs transition-colors ${
                                  idx === activeServer
                                    ? "bg-white/10 text-white"
                                    : "text-white/70 hover:bg-white/5 hover:text-white"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {idx === activeServer ? (
                                    <Check className="h-3.5 w-3.5 text-primary" />
                                  ) : (
                                    <span className="w-3.5" />
                                  )}
                                  <span className={idx === activeServer ? "font-semibold" : ""}>{source.name}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  source.quality === "1080p"
                                    ? "bg-primary/20 text-primary"
                                    : "bg-white/10 text-white/50"
                                }`}>
                                  {source.quality}
                                </span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Report */}
                    <div className="relative" ref={reportMenuRef}>
                      <button
                        onClick={() => { setShowReportMenu(!showReportMenu); setShowSourceMenu(false); }}
                        className="p-2 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                        title="Report issue"
                      >
                        <Flag className="h-4 w-4" />
                      </button>

                      <AnimatePresence>
                        {showReportMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.12 }}
                            className="absolute bottom-full mb-2 right-0 w-48 bg-black/95 backdrop-blur-xl border border-white/10 rounded-md shadow-2xl overflow-hidden z-50"
                          >
                            <div className="px-3 py-2 border-b border-white/10">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Report Issue</p>
                            </div>
                            {["Not playing", "Bad quality", "Wrong content", "Audio issues"].map((issue) => (
                              <button
                                key={issue}
                                onClick={handleReport}
                                className="w-full text-left px-3 py-2.5 text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors"
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
                      className="p-2 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                      title="Fullscreen (F)"
                    >
                      {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                    </button>
                  </div>
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
