import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, Film } from "lucide-react";

const Navbar = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery("");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-background/95 to-background/0 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Film className="h-7 w-7 text-primary" />
          <span className="font-display text-2xl tracking-wider text-foreground">
            FREE<span className="text-primary">FLIX</span> HUB
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
            Home
          </Link>
          <Link to="/categories" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
            Categories
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2 animate-fade-in">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies & shows..."
                className="w-48 md:w-64 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button type="button" onClick={() => { setSearchOpen(false); setQuery(""); }}>
                <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </button>
            </form>
          ) : (
            <button onClick={() => setSearchOpen(true)} className="p-2 rounded-full hover:bg-secondary transition-colors">
              <Search className="h-5 w-5 text-foreground" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
