import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useIsTV, useDpadFocusMode } from "@/hooks/use-tv";
import Navbar from "@/components/Navbar";
import TVNavBar from "@/components/TVNavBar";
import MobileNav from "@/components/MobileNav";
import Footer from "@/components/Footer";

import Index from "./pages/Index";
import MovieDetails from "./pages/MovieDetails";
import Search from "./pages/Search";
import Categories from "./pages/Categories";
import Favorites from "./pages/Favorites";
import Auth from "./pages/Auth";
import WatchHistory from "./pages/WatchHistory";
import Requests from "./pages/Requests";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const AppContent = () => {
  const isTV = useIsTV();
  useDpadFocusMode();

  return (
    <>
      {isTV ? <TVNavBar /> : <Navbar />}
      <div className={isTV ? "tv-mode" : ""}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/:type/:id" element={<MovieDetails />} />
          <Route path="/search" element={<Search />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/history" element={<WatchHistory />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {!isTV && <Footer />}
        {!isTV && <MobileNav />}
      </div>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
