import { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
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
  SkipForward,
  Play,
  Pause,
  Volume2,
  VolumeX,
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
  const [contentLoaded, setContentLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [reported, setReported] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();
  const loadTimer = useRef<ReturnType<typeof setTimeout>>();
  const sourceMenuRef = useRef<HTMLDivElement>(null);
  const reportMenuRef = useRef<HTMLDivElement>(null);

  const currentSource = sources[activeServer];
  const isDirectStream = currentSource?.type === "hls" || currentSource?.type === "mp4";
  const showLoading = !contentLoaded || !minLoadMet;

  // ── Setup HLS / native video for direct streams ──
  useEffect(() => {
    if (!isDirectStream || !videoRef.current) return;

    const video = videoRef.current;
    setContentLoaded(false);
    setError(false);
    setMinLoadMet(false);

    const minTimer = setTimeout(() => setMinLoadMet(true), 1500);

    if (currentSource.type === "hls") {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });
        hlsRef.current = hls;
        hls.loadSource(currentSource.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setContentLoaded(true);
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            console.error("HLS fatal error:", data);
            setError(true);
            hls.destroy();
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS
        video.src = currentSource.url;
        video.addEventListener("loadedmetadata", () => {
          setContentLoaded(true);
          video.play().catch(() => {});
        });
      }
    } else {
      // MP4
      video.src = currentSource.url;
      video.addEventListener("loadedmetadata", () => {
        setContentLoaded(true);
        video.play().catch(() => {});
      });
    }

    // Auto-advance timer
    loadTimer.current = setTimeout(() => {
      if (activeServer < sources.length - 1) {
        setAutoAdvancing(true);
        setTimeout(() => setActiveServer((prev) => prev + 1), 1000);
      }
    }, 20000);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(loadTimer.current);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeServer, currentSource?.url, isDirectStream]);

  // ── Iframe loading for embed fallback ──
  useEffect(() => {
    if (isDirectStream) return;
    setContentLoaded(false);
    setMinLoadMet(false);
    setError(false);
    setReported(false);
    setAutoAdvancing(false);
    setIframeKey((k) => k + 1);

    const minTimer = setTimeout(() => setMinLoadMet(true), 2000);
    loadTimer.current = setTimeout(() => {
      if (activeServer < sources.length - 1) {
        setAutoAdvancing(true);
        setTimeout(() => setActiveServer((prev) => prev + 1), 1000);
      }
    }, 15000);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(loadTimer.current);
    };
  }, [activeServer, isDirectStream, sources.length]);

  // Cancel auto-advance when loaded
  useEffect(() => {
    if (contentLoaded) {
      clearTimeout(loadTimer.current);
      setAutoAdvancing(false);
    }
  }, [contentLoaded]);

  // Video time/progress tracking
  useEffect(() => {
    if (!isDirectStream || !videoRef.current) return;
    const video = videoRef.current;

    const onTimeUpdate = () => {
      setProgress(video.currentTime);
      setDuration(video.duration || 0);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => setError(true);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
    };
  }, [isDirectStream, activeServer]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") { e.preventDefault(); toggleFullscreen(); }
      if (e.key === " " && isDirectStream && videoRef.current) {
        e.preventDefault();
        videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDirectStream]);

  // Close menus on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (sourceMenuRef.current && !sourceMenuRef.current.contains(e.target as Node)) setShowSourceMenu(false);
      if (reportMenuRef.current && !reportMenuRef.current.contains(e.target as Node)) setShowReportMenu(false);
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
    if (document.fullscreenElement) await document.exitFullscreen();
    else await containerRef.current.requestFullscreen();
  };

  const goToNextSource = useCallback(() => {
    clearTimeout(loadTimer.current);
    setAutoAdvancing(false);
    setError(false);
    setReported(false);
    setActiveServer((prev) => (prev + 1) % sources.length);
  }, [sources.length]);

  const handleIframeError = () => {
    setContentLoaded(true);
    setError(true);
    if (sources.length > 1) setTimeout(() => goToNextSource(), 2000);
  };

  const handleSourceChange = (index: number) => {
    if (index !== activeServer) setActiveServer(index);
    setShowSourceMenu(false);
  };

  const handleReport = () => {
    setReported(true);
    setShowReportMenu(false);
    if (sources.length > 1) setTimeout(() => goToNextSource(), 1500);
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = ratio * duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
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

  return (
    <div className="space-y-3">
      {/* Player container */}
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden border border-border bg-background group"
        onMouseMove={resetControlsTimer}
        onTouchStart={resetControlsTimer}
      >
        <div className="relative aspect-video bg-black">
          {/* Loading overlay */}
          <AnimatePresence>
            {(showLoading || autoAdvancing) && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20"
              >
                <div className="text-center space-y-4">
                  <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto" />
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-foreground">
                      {autoAdvancing ? "Trying next server..." : "Loading"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {autoAdvancing
                        ? `${currentSource.name} timed out — switching automatically`
                        : `${currentSource.name} • ${isDirectStream ? "Connecting to stream..." : "Please be patient..."}`}
                    </p>
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
                  onClick={() => setActiveServer(0)}
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

          {/* ── Native video element for HLS/MP4 ── */}
          {isDirectStream ? (
            <video
              ref={videoRef}
              className={`w-full h-full bg-black transition-opacity duration-500 ${showLoading ? "opacity-0" : "opacity-100"}`}
              playsInline
              onClick={togglePlayPause}
            />
          ) : (
            /* ── Iframe for embed fallback ── */
            <iframe
              key={iframeKey}
              src={currentSource.url}
              title={title}
              className={`w-full h-full border-0 bg-black transition-opacity duration-500 ${showLoading ? "opacity-0" : "opacity-100"}`}
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              onLoad={() => setContentLoaded(true)}
              onError={handleIframeError}
              style={{ border: 0 }}
            />
          )}

          {/* Not-playing fallback button */}
          {!showLoading && contentLoaded && sources.length > 1 && !isDirectStream && (
            <div className="absolute bottom-14 left-0 right-0 flex justify-center z-20 px-3">
              <button
                onClick={goToNextSource}
                className="inline-flex items-center gap-1.5 text-xs rounded-md border border-white/20 bg-black/70 px-3 py-1.5 text-white/85 hover:text-white hover:bg-black/80 transition-colors"
              >
                <SkipForward className="h-3.5 w-3.5" />
                Not playing? Try next server
              </button>
            </div>
          )}
        </div>

        {/* ── Bottom control bar ── */}
        <AnimatePresence>
          {(showControls || showSourceMenu || showReportMenu) && !showLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 pb-3 px-4"
            >
              {/* Progress bar for direct streams */}
              {isDirectStream && duration > 0 && (
                <div
                  className="w-full h-1.5 bg-white/20 rounded-full mb-3 cursor-pointer group/progress"
                  onClick={seekTo}
                >
                  <div
                    className="h-full bg-white/30 rounded-full absolute left-0"
                    style={{ width: `${(buffered / duration) * 100}%` }}
                  />
                  <div
                    className="h-full bg-primary rounded-full relative"
                    style={{ width: `${(progress / duration) * 100}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Play/Pause for direct streams */}
                  {isDirectStream && (
                    <button onClick={togglePlayPause} className="p-1.5 rounded-lg text-white hover:bg-white/10 transition-colors">
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                  )}
                  {isDirectStream && (
                    <button onClick={toggleMute} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                  )}
                  {isDirectStream && duration > 0 && (
                    <span className="text-[10px] text-white/70 tabular-nums">
                      {formatTime(progress)} / {formatTime(duration)}
                    </span>
                  )}
                  {!isDirectStream && (
                    <>
                      <MonitorPlay className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-xs font-medium text-white truncate">{title}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Source selector */}
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
                          className="absolute bottom-full mb-2 right-0 w-48 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto"
                        >
                          <div className="px-3 py-2 border-b border-border">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Select Source</p>
                          </div>
                          {sources.map((source, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSourceChange(idx)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs transition-colors ${
                                idx === activeServer ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {idx === activeServer && <Check className="h-3.5 w-3.5 text-primary" />}
                                <span className={idx === activeServer ? "font-semibold" : ""}>{source.name}</span>
                                {(source.type === "hls" || source.type === "mp4") && (
                                  <span className="text-[9px] bg-primary/20 text-primary px-1 rounded">DIRECT</span>
                                )}
                              </div>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                source.quality === "1080p" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
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

                  {/* Next server */}
                  <button
                    onClick={goToNextSource}
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    title="Try next server"
                    disabled={sources.length < 2}
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>

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
