import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Film } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <Film className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="font-display text-6xl text-foreground mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">This page doesn't exist</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
