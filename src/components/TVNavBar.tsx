import { Link, useLocation } from "react-router-dom";
import { Home, Search, Grid3X3, Heart, MessageSquare, Clock, User, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/categories", icon: Grid3X3, label: "Categories" },
  { to: "/favorites", icon: Heart, label: "Favorites" },
  { to: "/requests", icon: MessageSquare, label: "Requests" },
];

const TVNavBar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <nav className="fixed left-0 top-0 bottom-0 z-50 w-20 hover:w-56 transition-all duration-300 bg-background/95 border-r border-border flex flex-col items-center py-6 group/nav overflow-hidden">
      {/* Logo */}
      <div className="mb-8 px-4 flex-shrink-0">
        <span className="text-xl font-extrabold tracking-tight text-foreground lowercase whitespace-nowrap" style={{ fontFamily: "'Nunito', sans-serif" }}>
          z<span className="text-primary">iv</span>
          <span className="opacity-0 group-hover/nav:opacity-100 transition-opacity">ora</span>
        </span>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-1 w-full px-2 flex-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`tv-focusable flex items-center gap-4 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${
                active
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="h-6 w-6 flex-shrink-0" />
              <span className="text-sm font-medium opacity-0 group-hover/nav:opacity-100 transition-opacity">
                {label}
              </span>
            </Link>
          );
        })}
        {user && (
          <Link
            to="/history"
            className={`tv-focusable flex items-center gap-4 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${
              location.pathname === "/history"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Clock className="h-6 w-6 flex-shrink-0" />
            <span className="text-sm font-medium opacity-0 group-hover/nav:opacity-100 transition-opacity">
              History
            </span>
          </Link>
        )}
      </div>

      {/* User section */}
      <div className="mt-auto w-full px-2">
        {user ? (
          <button
            onClick={() => signOut()}
            className="tv-focusable flex items-center gap-4 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full whitespace-nowrap"
          >
            <LogOut className="h-6 w-6 flex-shrink-0" />
            <span className="text-sm font-medium opacity-0 group-hover/nav:opacity-100 transition-opacity">
              Sign Out
            </span>
          </button>
        ) : (
          <Link
            to="/auth"
            className="tv-focusable flex items-center gap-4 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors whitespace-nowrap"
          >
            <User className="h-6 w-6 flex-shrink-0" />
            <span className="text-sm font-medium opacity-0 group-hover/nav:opacity-100 transition-opacity">
              Sign In
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default TVNavBar;
