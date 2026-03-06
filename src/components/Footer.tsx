const Footer = () => (
  <footer className="border-t border-border bg-background px-4 md:px-12 py-8 pb-24 md:pb-8">
    <div className="container mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg font-extrabold tracking-tight text-foreground lowercase" style={{ fontFamily: "'Nunito', sans-serif" }}>
          quo<span className="text-primary">rix</span>
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        © {new Date().getFullYear()} Quorix. This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </div>
  </footer>
);

export default Footer;
