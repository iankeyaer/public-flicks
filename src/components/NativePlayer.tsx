import { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import {
  AlertCircle,
  Maximize,
  Minimize,
  MonitorPlay,
  Flag,
  ChevronDown,
  Check,
  RefreshCw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StreamSource {
  provider: string;
  quality: string;
  url: string;
  type: "hls" | "mp4";
  headers?: Record<string, string>;
}

interface FallbackEmbed {
  name: string;
  quality: string;
  url: string;
}

interface NativePlayerProps {
  streams: StreamSource[];
  fallbackEmbeds: FallbackEmbed[];
  title: string;
  isLoading?: boolean;
  proxyBaseUrl: string;
}

const NativePlayer = ({ streams, fallbackEmbeds, title, isLoading = false, proxyBaseUrl }: NativePlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();
  const sourceMenuRef = useRef<HTMLDivElement>(null);
  const reportMenuRef = useRef<HTMLDivElement>(null);

  const [activeStream, setActiveStream] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [error, setError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [reported, setReported] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [qualities, setQualities] = useState<{ level: number; height: number; label: string }[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1);

  const hasStreams = streams.length > 0;
  const hasFallbacks = fallbackEmbeds.length > 0;

  // Initialize or switch stream
  useEffect(() => {
    if (isLoading || usingFallback) return;
    if (!hasStreams) {
      if (hasFallbacks) {
        setUsingFallback(true);
      } else {
        setError(true);
      }
      return;
    }

    const stream = streams[activeStream];
    if (!stream) return;

    const video = videoRef.current;
    if (!video) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setVideoLoading(true);
    setError(false);

    if (stream.type === "hls") {
      if (Hls.isSupported()) {
        const hls = new Hls({
          xhrSetup: (xhr, url) => {
            // Proxy m3u8 segments through our edge function to handle CORS
            const proxiedUrl = `${proxyBaseUrl}?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(stream.headers?.Referer || '')}&origin=${encodeURIComponent(stream.headers?.Origin || '')}`;
            xhr.open("GET", proxiedUrl, true);
          },
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          startLevel: -1, // Auto quality
        });

        hls.loadSource(stream.url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          setVideoLoading(false);
          const q = data.levels.map((level, i) => ({
            level: i,
            height: level.height,
            label: `${level.height}p`,
          }));
          setQualities([{ level: -1, height: 0, label: "Auto" }, ...q]);
          setCurrentQuality(-1);
          video.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.error("HLS error:", data);
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              // Try to recover
              hls.startLoad();
            } else {
              handleStreamError();
            }
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          setCurrentQuality(data.level);
        });

        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS
        video.src = stream.url;
        video.addEventListener("loadedmetadata", () => {
          setVideoLoading(false);
          video.play().catch(() => {});
        });
      }
    } else {
      // MP4 direct playback
      video.src = stream.url;
      video.addEventListener("loadedmetadata", () => {
        setVideoLoading(false);
        video.play().catch(() => {});
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeStream, streams, isLoading, usingFallback, hasStreams, hasFallbacks, proxyBaseUrl]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    const onProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onWaiting = () => setVideoLoading(true);
    const onPlaying = () => setVideoLoading(false);
    const onError = () => handleStreamError();

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("progress", onProgress);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
    };
  }, []);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (usingFallback) return;
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          playing ? video.pause() : video.play();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          setMuted((m) => !m);
          break;
        case "ArrowLeft":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case "ArrowRight":
          e.preventDefault();
          video.currentTime = Math.min(duration, video.currentTime + 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((v) => Math.min(1, v + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((v) => Math.max(0, v - 0.1));
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, duration, usingFallback]);

  // Apply volume/mute
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

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

  const handleStreamError = () => {
    // Try next stream
    if (activeStream < streams.length - 1) {
      setActiveStream((prev) => prev + 1);
    } else if (hasFallbacks) {
      // Switch to fallback embeds
      setUsingFallback(true);
    } else {
      setError(true);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    playing ? videoRef.current.pause() : videoRef.current.play();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (videoRef.current) {
      videoRef.current.currentTime = percent * duration;
    }
  };

  const handleQualityChange = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentQuality(level);
    }
    setShowSourceMenu(false);
  };

  const handleReport = () => {
    setReported(true);
    setShowReportMenu(false);
    handleStreamError();
  };

  const formatTime = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ─── Fallback iframe mode ───
  if (usingFallback && hasFallbacks) {
    const currentFallback = fallbackEmbeds[fallbackIndex];
    return (
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="relative rounded-xl overflow-hidden border border-border bg-background group"
        >
          <div className="relative aspect-video bg-black">
            <iframe
              src={currentFallback.url}
              title={title}
              className="w-full h-full border-0 bg-black"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="no-referrer"
            />
          </div>
          {/* Minimal controls for fallback */}
          <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-8 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MonitorPlay className="h-4 w-4 text-primary" />
                <span className="text-xs text-white truncate">{title}</span>
                <span className="text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded">Embed</span>
              </div>
              <div className="flex items-center gap-1">
                {fallbackEmbeds.length > 1 && (
                  <select
                    value={fallbackIndex}
                    onChange={(e) => setFallbackIndex(Number(e.target.value))}
                    className="bg-white/10 text-white text-xs rounded px-2 py-1 border-0"
                  >
                    {fallbackEmbeds.map((fb, i) => (
                      <option key={i} value={i}>{fb.name} ({fb.quality})</option>
                    ))}
                  </select>
                )}
                <button onClick={toggleFullscreen} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading state ───
  if (isLoading) {
    return (
      <div className="aspect-video bg-black rounded-xl flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto" />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">Resolving streams...</p>
            <p className="text-xs text-muted-foreground">Finding the best quality source for you</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ───
  if (error) {
    return (
      <div className="aspect-video bg-black rounded-xl flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">This content is temporarily unavailable.</p>
          <button
            onClick={() => {
              setActiveStream(0);
              setError(false);
              setUsingFallback(false);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        </div>
      </div>
    );
  }

  const currentStream = streams[activeStream];

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden border border-border bg-black group cursor-pointer"
        onMouseMove={resetControlsTimer}
        onTouchStart={resetControlsTimer}
        onClick={(e) => {
          // Only toggle play if clicking the video area (not controls)
          if ((e.target as HTMLElement).tagName === "VIDEO" || (e.target as HTMLElement).closest(".video-click-area")) {
            togglePlay();
          }
        }}
      >
        <div className="relative aspect-video bg-black video-click-area">
          {/* Native video element */}
          <video
            ref={videoRef}
            className="w-full h-full bg-black"
            playsInline
            crossOrigin="anonymous"
          />

          {/* Loading spinner overlay */}
          <AnimatePresence>
            {videoLoading && !error && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/60 z-10"
              >
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Center play button when paused */}
          <AnimatePresence>
            {!playing && !videoLoading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center z-10"
              >
                <div className="h-16 w-16 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm">
                  <Play className="h-7 w-7 text-primary-foreground fill-primary-foreground ml-1" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reported toast */}
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
        </div>

        {/* Bottom controls */}
        <AnimatePresence>
          {(showControls || showSourceMenu || showReportMenu) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-16 pb-3 px-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress bar */}
              <div
                className="w-full h-1 bg-white/20 rounded-full cursor-pointer mb-3 group/progress relative"
                onClick={handleSeek}
              >
                {/* Buffered */}
                <div
                  className="absolute h-full bg-white/30 rounded-full"
                  style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
                />
                {/* Progress */}
                <div
                  className="absolute h-full bg-primary rounded-full"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
                {/* Thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-primary rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
                  style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%`, transform: 'translate(-50%, -50%)' }}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                {/* Left controls */}
                <div className="flex items-center gap-2">
                  <button onClick={togglePlay} className="p-1.5 rounded-lg text-white hover:bg-white/10">
                    {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
                  </button>

                  <button onClick={() => setMuted(!muted)} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                    {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(Number(e.target.value));
                      setMuted(false);
                    }}
                    className="w-16 h-1 accent-primary"
                  />

                  <span className="text-xs text-white/70 tabular-nums ml-1">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-1">
                  {/* Source info */}
                  <span className="text-[10px] text-white/50 mr-1 hidden sm:inline">
                    {currentStream?.provider}
                  </span>

                  {/* Quality / source selector */}
                  <div className="relative" ref={sourceMenuRef}>
                    <button
                      onClick={() => { setShowSourceMenu(!showSourceMenu); setShowReportMenu(false); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span className="text-primary font-semibold">
                        {currentQuality >= 0 ? `${streams[activeStream]?.quality || 'HD'}` : 'Auto'}
                      </span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSourceMenu ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {showSourceMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          className="absolute bottom-full mb-2 right-0 w-52 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50"
                        >
                          {/* Quality levels */}
                          {qualities.length > 0 && (
                            <>
                              <div className="px-3 py-2 border-b border-border">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quality</p>
                              </div>
                              {qualities.map((q) => (
                                <button
                                  key={q.level}
                                  onClick={() => handleQualityChange(q.level)}
                                  className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                                    currentQuality === q.level ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
                                  }`}
                                >
                                  <span>{q.label}</span>
                                  {currentQuality === q.level && <Check className="h-3.5 w-3.5" />}
                                </button>
                              ))}
                            </>
                          )}

                          {/* Sources */}
                          {streams.length > 1 && (
                            <>
                              <div className="px-3 py-2 border-b border-t border-border">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source</p>
                              </div>
                              {streams.map((s, i) => (
                                <button
                                  key={i}
                                  onClick={() => { setActiveStream(i); setShowSourceMenu(false); }}
                                  className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                                    i === activeStream ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
                                  }`}
                                >
                                  <span>{s.provider}</span>
                                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{s.quality}</span>
                                </button>
                              ))}
                            </>
                          )}

                          {/* Fallback option */}
                          {hasFallbacks && (
                            <button
                              onClick={() => { setUsingFallback(true); setShowSourceMenu(false); }}
                              className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-secondary border-t border-border"
                            >
                              Switch to embed player →
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Report */}
                  <div className="relative" ref={reportMenuRef}>
                    <button
                      onClick={() => { setShowReportMenu(!showReportMenu); setShowSourceMenu(false); }}
                      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <Flag className="h-4 w-4" />
                    </button>
                    <AnimatePresence>
                      {showReportMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          className="absolute bottom-full mb-2 right-0 w-48 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50"
                        >
                          <div className="px-3 py-2 border-b border-border">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Report Issue</p>
                          </div>
                          {["Not playing", "Bad quality", "Wrong content", "Audio issues"].map((issue) => (
                            <button
                              key={issue}
                              onClick={handleReport}
                              className="w-full text-left px-3 py-2.5 text-xs text-foreground hover:bg-secondary"
                            >
                              {issue}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Fullscreen */}
                  <button onClick={toggleFullscreen} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
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

export default NativePlayer;
