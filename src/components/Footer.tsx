import { Film } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-background px-4 md:px-12 py-8 pb-24 md:pb-8">
    <div className="container mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Film className="h-5 w-5 text-primary" />
        <span className="font-display text-lg tracking-wider text-foreground">
          LEON<span className="text-primary">AX</span>
        </span>
      </div>
      <p className="text-xs text-muted-foreground max-w-2xl mb-4">
        <strong className="text-primary">Legal Disclaimer:</strong> This app only links to publicly available free sources. 
        We do not host, upload, or store any video files on our servers. Streaming copyrighted content may be illegal in your country. 
        Use at your own risk. All movie metadata provided by TMDB.
      </p>
      <p className="text-xs text-muted-foreground">
        © {new Date().getFullYear()} Leonax. This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </div>
  </footer>
);

export default Footer;
