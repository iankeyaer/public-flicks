import { useState, useEffect } from "react";

/**
 * Detects if the app is running on an Android TV or similar large-screen device
 * with D-pad/remote navigation (no touch).
 */
export function useIsTV() {
  const [isTV, setIsTV] = useState(false);

  useEffect(() => {
    // Detect TV via user agent hints or large screen with no touch
    const ua = navigator.userAgent.toLowerCase();
    const isTVUA =
      ua.includes("android tv") ||
      ua.includes("smart-tv") ||
      ua.includes("smarttv") ||
      ua.includes("googletv") ||
      ua.includes("crkey") || // Chromecast
      ua.includes("aftt") || // Fire TV
      ua.includes("aftm") || // Fire TV Stick
      ua.includes("bravia"); // Sony TV

    const isLargeNoTouch =
      window.screen.width >= 960 &&
      !("ontouchstart" in window) &&
      !navigator.maxTouchPoints;

    setIsTV(isTVUA || isLargeNoTouch);
  }, []);

  return isTV;
}

/**
 * Enables keyboard-style (D-pad) focus mode globally.
 * Adds a class to <body> when keyboard nav is detected.
 */
export function useDpadFocusMode() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Tab"].includes(e.key)
      ) {
        document.body.classList.add("dpad-mode");
      }
    };

    const handleMouseMove = () => {
      document.body.classList.remove("dpad-mode");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);
}
