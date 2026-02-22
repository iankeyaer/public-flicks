import { Film } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-background px-4 md:px-12 py-8 pb-24 md:pb-8">
    <div className="container mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Film className="h-5 w-5 text-primary" />
        <span className="text-lg font-bold tracking-wide text-foreground" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
          ZIV<span className="text-primary">ORA</span>
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        © {new Date().getFullYear()} Zivora. This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </div>
  </footer>
);

export default Footer;
