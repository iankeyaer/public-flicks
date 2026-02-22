import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, Film, User, LogOut, Clock, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

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
            LEON<span className="text-primary">AX</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">Home</Link>
          <Link to="/categories" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">Categories</Link>
          <Link to="/favorites" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">Favorites</Link>
          <Link to="/requests" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">Requests</Link>
          {user && (
            <Link to="/history" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">History</Link>
          )}
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

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold"
              >
                {user.email?.charAt(0).toUpperCase()}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                  <p className="px-3 py-2 text-xs text-muted-foreground truncate border-b border-border">
                    {user.email}
                  </p>
                  <Link to="/history" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors">
                    <Clock className="h-4 w-4" /> Watch History
                  </Link>
                  <Link to="/requests" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors">
                    <MessageSquare className="h-4 w-4" /> Requests
                  </Link>
                  <button
                    onClick={() => { signOut(); setMenuOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary w-full text-left transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <User className="h-3.5 w-3.5" /> Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
