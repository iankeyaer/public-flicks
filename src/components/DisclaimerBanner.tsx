import { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";

const DisclaimerBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("freeflix-disclaimer");
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem("freeflix-disclaimer", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-50 bg-secondary/95 backdrop-blur-md border-t border-border px-4 py-3 animate-slide-up">
      <div className="container mx-auto flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs md:text-sm text-foreground/90">
            <strong>Legal Disclaimer:</strong> This app only links to publicly available free sources. 
            We do not host, upload, or store any video files. Streaming copyrighted content may be illegal in your country. Use at your own risk.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default DisclaimerBanner;
