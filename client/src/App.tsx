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
    <div className="flex h-screen bg-white">
      <Sidebar user={user} onSignOut={onSignOut} />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-0">
        <Switch>
          <Route path="/student" component={Dashboard} />
          <Route path="/student/dashboard" component={Dashboard} />
          <Route path="/student/hours" component={Hours} />
          <Route path="/student/profile" component={Profile} />
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
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-full mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Wylie NAHS Admin Panel</h1>
        <p className="text-gray-600 mb-6">The admin interface is currently under development. This will include features for reviewing student submissions, managing requirements, and overseeing the NAHS hours program.</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">🚧 Coming Soon</p>
        </div>
        <a href="/" className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors">
          Back to Interface Selection
        </a>
      </div>
    </div>
  );
}

function Router({ user, onSignOut }: { user: User | null; onSignOut: () => void }) {
  return (
    <Switch>
      <Route path="/student/:rest*">
        <UserInterface user={user} onSignOut={onSignOut} />
      </Route>
      <Route path="/student">
        <UserInterface user={user} onSignOut={onSignOut} />
      </Route>
      <Route path="/admin/:rest*" component={AdminInterface} />
      <Route path="/admin" component={AdminInterface} />
      <Route path="/">
        {user ? (
          <UserInterface user={user} onSignOut={onSignOut} />
        ) : (
          <div className="flex items-center justify-center h-screen bg-white">
            <div className="w-full max-w-4xl mx-auto px-4">
              <div className="text-center mb-12">
                <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Wylie NAHS Hours Tracker</h1>
                <p className="text-xl text-gray-600 mb-2">National Art Honor Society</p>
                <p className="text-gray-500">Choose your interface to get started</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                <div className="bg-white border-2 border-gray-200 rounded-xl p-8 hover:border-blue-500 hover:shadow-lg transition-all duration-300 group">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mx-auto mb-4 group-hover:bg-blue-100 transition-colors">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Student Interface</h3>
                    <p className="text-gray-600 mb-6">Track your service hours, submit new entries, and monitor your progress toward the 15-hour requirement.</p>
                    <a href="/student" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      Access Student Portal
                    </a>
                  </div>
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-xl p-8 hover:border-green-500 hover:shadow-lg transition-all duration-300 group">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mx-auto mb-4 group-hover:bg-green-100 transition-colors">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Admin Interface</h3>
                    <p className="text-gray-600 mb-6">Review and approve student submissions, manage requirements, and oversee the NAHS hours program.</p>
                    <a href="/admin" className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium">
                      Access Admin Portal
                    </a>
                  </div>
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
