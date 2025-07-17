import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { User, onAuthStateChanged, initializeAuth, handleSignOut } from "@/lib/firebase";
import { Sidebar } from "@/components/sidebar";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Hours from "@/pages/hours";
import NotFound from "@/pages/not-found";

function Router({ user, onSignOut }: { user: User | null; onSignOut: () => void }) {
  if (!user) {
    return <Home />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} onSignOut={onSignOut} />
      <div className="flex-1 overflow-hidden">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/hours" component={Hours} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Initialize auth state from localStorage
    initializeAuth();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged((user) => {
      setUser(user);
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOutClick = async () => {
    await handleSignOut();
    setUser(null);
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router user={user} onSignOut={handleSignOutClick} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
