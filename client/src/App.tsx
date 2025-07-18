import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { User, onAuthStateChanged, initializeAuth, handleSignOut, auth } from "@/lib/firebase";
import { Sidebar } from "@/components/sidebar";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Hours from "@/pages/hours";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import { AdminDashboard } from "@/pages/admin-dashboard";
import { AdminStudents } from "@/pages/admin-students";
import { AdminManagement } from "@/pages/admin-management";

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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        const userData: User = {
          email: authUser.email,
          name: authUser.displayName || authUser.email?.split('@')[0] || 'User',
          photoURL: authUser.photoURL
        };
        setUser(userData);
        
        // Check if user is admin
        try {
          const emailKey = authUser.email?.replace(/\./g, ',');
          const response = await fetch(`/api/user-profile/${emailKey}`);
          if (response.ok) {
            const profile = await response.json();
            setIsAdmin(profile.userRole === 1);
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Home />;
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have administrator privileges to access this interface. Please contact your system administrator if you believe this is an error.</p>
          <div className="space-y-3">
            <button 
              onClick={handleSignOut}
              className="block w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
            <a href="/" className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors">
              Back to Interface Selection
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-white">
          <div className="flex items-center flex-shrink-0 px-4 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">NAHS Admin</h2>
                <p className="text-sm text-gray-600">Administrator Panel</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-1">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                currentPage === 'dashboard' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              <span>Dashboard</span>
            </button>
            
            <button
              onClick={() => setCurrentPage('students')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                currentPage === 'students' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <span>Students</span>
            </button>
            
            <button
              onClick={() => setCurrentPage('admin-management')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                currentPage === 'admin-management' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Admin Management</span>
            </button>
          </nav>
          
          <div className="flex-shrink-0 p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Sign Out
            </button>
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Made by <a href="mailto:your.email@example.com" className="text-blue-600 hover:text-blue-700">Abhiram</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-0">
        {currentPage === 'dashboard' && <AdminDashboard user={user} />}
        {currentPage === 'students' && <AdminStudents user={user} />}
        {currentPage === 'admin-management' && <AdminManagement user={user} />}
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
