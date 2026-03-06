import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, User, LogOut, Clock, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { searchMulti, getImageUrl } from "@/lib/tmdb";

const Navbar = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: suggestions } = useQuery({
    queryKey: ["search-suggestions", debouncedQuery],
    queryFn: () => searchMulti(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  const topResults = (suggestions?.results || [])
    .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 5);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery("");
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/95 backdrop-blur-md border-b border-border" : "bg-gradient-to-b from-background/80 to-transparent"}`}>
      <div className="container mx-auto flex items-center justify-between px-4 md:px-8 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-extrabold tracking-tight text-foreground lowercase" style={{ fontFamily: "'Nunito', sans-serif" }}>
            quo<span className="text-primary">rix</span>
          </span>
        </Link>

        {/* Nav Links - Showmax style: simple, clean, spaced */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Home</Link>
          <Link to="/categories" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Series</Link>
          <Link to="/categories" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Movies</Link>
          <Link to="/favorites" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">My List</Link>
          <Link to="/requests" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Requests</Link>
          {user && (
            <Link to="/history" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">History</Link>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {searchOpen ? (
            <div ref={searchRef} className="relative animate-fade-in">
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search..."
                  className="w-48 md:w-64 rounded-full border border-border bg-secondary px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button type="button" onClick={() => { setSearchOpen(false); setQuery(""); setShowSuggestions(false); }}>
                  <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                </button>
              </form>
              {showSuggestions && topResults.length > 0 && (
                <div className="absolute right-0 top-12 w-72 md:w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                  {topResults.map((item: any) => (
                    <Link
                      key={item.id}
                      to={`/${item.media_type}/${item.id}`}
                      onClick={() => { setSearchOpen(false); setQuery(""); setShowSuggestions(false); }}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors"
                    >
                      <img
                        src={getImageUrl(item.poster_path, "w92")}
                        alt={item.title || item.name}
                        className="w-10 h-14 rounded-md object-cover bg-muted flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.title || item.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.media_type} · {(item.release_date || item.first_air_date || "").slice(0, 4)}</p>
                      </div>
                    </Link>
                  ))}
                  <Link
                    to={`/search?q=${encodeURIComponent(query)}`}
                    onClick={() => { setSearchOpen(false); setQuery(""); setShowSuggestions(false); }}
                    className="block text-center text-xs text-primary py-2.5 border-t border-border hover:bg-secondary transition-colors"
                  >
                    View all results
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} className="p-2 rounded-full hover:bg-secondary transition-colors">
              <Search className="h-5 w-5 text-foreground" />
            </button>
          )}

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="h-8 w-8 rounded-full gradient-brand flex items-center justify-center text-primary-foreground text-sm font-bold"
              >
                {user.email?.charAt(0).toUpperCase()}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-48 bg-card border border-border rounded-xl shadow-2xl py-1 z-50">
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
              className="rounded-full gradient-brand px-5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
