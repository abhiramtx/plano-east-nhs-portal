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
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";

function UserInterface({ user, onSignOut }: { user: User | null; onSignOut: () => void }) {
  if (!user) {
    return <Home />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} onSignOut={onSignOut} />
      <div className="flex-1 lg:ml-64 overflow-hidden">
        <Switch>
          <Route path="/user_interface" component={Dashboard} />
          <Route path="/user_interface/dashboard" component={Dashboard} />
          <Route path="/user_interface/hours" component={Hours} />
          <Route path="/user_interface/profile" component={Profile} />
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/hours" component={Hours} />
          <Route path="/profile" component={Profile} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function AdminInterface() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Wylie NAHS Admin Panel</h1>
        <p className="text-gray-600">Coming soon...</p>
      </div>
    </div>
  );
}

function Router({ user, onSignOut }: { user: User | null; onSignOut: () => void }) {
  return (
    <Switch>
      <Route path="/user_interface/:rest*">
        <UserInterface user={user} onSignOut={onSignOut} />
      </Route>
      <Route path="/user_interface">
        <UserInterface user={user} onSignOut={onSignOut} />
      </Route>
      <Route path="/admin/:rest*" component={AdminInterface} />
      <Route path="/admin" component={AdminInterface} />
      <Route path="/">
        {user ? (
          <UserInterface user={user} onSignOut={onSignOut} />
        ) : (
          <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Wylie NAHS Hours Tracker</h1>
              <p className="text-gray-600 mb-8">Choose your interface:</p>
              <div className="space-y-4">
                <div>
                  <a href="/user_interface" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                    Student Interface
                  </a>
                </div>
                <div>
                  <a href="/admin" className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
                    Admin Interface
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
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
