import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { 
  User, 
  onAuthStateChanged, 
  initializeAuth, 
  handleSignOut, 
  auth,
  getUserMembership,
  deleteMembershipByUserAndClub,
  Club,
  Membership
} from "@/lib/firebase";
import { VolunteerSidebar } from "@/components/volunteer-sidebar";
import Landing from "@/pages/landing";
import ClubSelection from "@/pages/club-selection";
import ClubDashboard from "@/pages/club-dashboard";
import TerritoryMap from "@/pages/territory-map";
import ServiceRequests from "@/pages/service-requests";
import Dashboard from "@/pages/dashboard";
import Hours from "@/pages/hours";
import Profile from "@/pages/profile";
import StudentHistory from "@/pages/student-history";
import NotFound from "@/pages/not-found";
import { AdminDashboard } from "@/pages/admin-dashboard";
import { AdminStudents } from "@/pages/admin-students";
import { AdminManagement } from "@/pages/admin-management";
import { AdminApproval } from "@/pages/admin-approval";
import { AdminDatabase } from "@/pages/admin-database";

function VolunteerInterface({ 
  user, 
  club, 
  membership, 
  onSignOut,
  onLeaveClub 
}: { 
  user: User; 
  club: Club; 
  membership: Membership;
  onSignOut: () => void;
  onLeaveClub: () => void;
}) {
  const [, setLocation] = useLocation();

  const handleLeaveClubClick = async () => {
    try {
      await deleteMembershipByUserAndClub(user.email || '', club.id);
      onLeaveClub();
    } catch (error) {
      console.error('Failed to leave club:', error);
    }
  };

  useEffect(() => {
    const path = window.location.pathname;
    if (!path.startsWith('/volunteer') && !path.startsWith('/admin')) {
      setLocation('/volunteer/dashboard');
    }
  }, [setLocation]);

  return (
    <div className="flex h-screen bg-gray-50">
      <VolunteerSidebar 
        user={user} 
        club={club} 
        membership={membership}
        onSignOut={onSignOut}
        onLeaveClub={handleLeaveClubClick}
      />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-0 overflow-auto">
        <Switch>
          <Route path="/volunteer/dashboard">
            <Dashboard />
          </Route>
          <Route path="/volunteer/hours">
            <Hours />
          </Route>
          <Route path="/volunteer/map">
            <TerritoryMap currentClubId={club.id} />
          </Route>
          <Route path="/volunteer/leaderboard">
            <TerritoryMap currentClubId={club.id} />
          </Route>
          <Route path="/volunteer/services">
            <ServiceRequests user={user} />
          </Route>
          <Route path="/volunteer/club">
            <ClubDashboard 
              user={user} 
              club={club} 
              membership={membership}
              onLeaveClub={onLeaveClub}
            />
          </Route>
          <Route path="/volunteer/profile">
            <Profile />
          </Route>
          <Route path="/volunteer/history">
            <StudentHistory />
          </Route>
          <Route path="/volunteer">
            <Dashboard />
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </div>
    </div>
  );
}

function AdminInterface({ user }: { user: User }) {
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname;
    if (path.includes('/admin/dashboard')) return 'dashboard';
    if (path.includes('/admin/students')) return 'students';
    if (path.includes('/admin/management')) return 'admin-management';
    if (path.includes('/admin/database')) return 'database';
    return 'approval';
  });

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex h-screen bg-white">
      <div className="w-64 bg-white border-r border-gray-200 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-white">
          <div className="flex items-center flex-shrink-0 px-4 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-black rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
                <p className="text-sm text-gray-600">Club Management</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-1">
            <button
              onClick={() => { setCurrentPage('approval'); window.history.pushState({}, '', '/admin/approval'); }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'approval' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span>Hours Approval</span>
            </button>
            
            <button
              onClick={() => { setCurrentPage('dashboard'); window.history.pushState({}, '', '/admin/dashboard'); }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" /></svg>
              <span>Dashboard</span>
            </button>
            
            <button
              onClick={() => { setCurrentPage('students'); window.history.pushState({}, '', '/admin/students'); }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'students' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span>Volunteers</span>
            </button>
            
            <button
              onClick={() => { setCurrentPage('admin-management'); window.history.pushState({}, '', '/admin/management'); }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'admin-management' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span>Admin Management</span>
            </button>
            
            <button
              onClick={() => { setCurrentPage('database'); window.history.pushState({}, '', '/admin/database'); }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'database' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
              <span>Database</span>
            </button>
            
            <a
              href="/volunteer/dashboard"
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
              <span>Back to Volunteer</span>
            </a>
          </nav>
          
          <div className="flex-shrink-0 p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
            <button onClick={handleSignOut} className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-0">
        {currentPage === 'approval' && <AdminApproval user={user} />}
        {currentPage === 'dashboard' && <AdminDashboard user={user} />}
        {currentPage === 'students' && <AdminStudents user={user} />}
        {currentPage === 'admin-management' && <AdminManagement user={user} />}
        {currentPage === 'database' && <AdminDatabase user={user} />}
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [clubChecked, setClubChecked] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    initializeAuth();
    const unsubscribe = onAuthStateChanged((authUser) => {
      setUser(authUser);
      setInitializing(false);
      if (!authUser) {
        setClubChecked(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user?.email && !clubChecked) {
      getUserMembership(user.email)
        .then(data => {
          if (data && data.club && data.membership) {
            setSelectedClub(data.club);
            setMembership(data.membership);
          }
        })
        .catch(() => {})
        .finally(() => setClubChecked(true));
    }
  }, [user?.email, clubChecked]);

  const handleSignOutClick = async () => {
    await handleSignOut();
    setUser(null);
    setSelectedClub(null);
    setMembership(null);
    setClubChecked(false);
    setLocation('/');
  };

  const handleClubSelected = (club: Club, clubMembership: Membership) => {
    setSelectedClub(club);
    setMembership(clubMembership);
    setLocation('/volunteer/dashboard');
  };

  const handleLeaveClub = () => {
    setSelectedClub(null);
    setMembership(null);
    setLocation('/clubs');
  };

  if (initializing || (user && !clubChecked)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-500">{user ? 'Loading your club...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/">
            {user ? (
              selectedClub && membership ? (
                <VolunteerInterface 
                  user={user} 
                  club={selectedClub} 
                  membership={membership}
                  onSignOut={handleSignOutClick}
                  onLeaveClub={handleLeaveClub}
                />
              ) : (
                <ClubSelection 
                  user={user} 
                  onClubSelected={handleClubSelected}
                  onSignOut={handleSignOutClick}
                />
              )
            ) : (
              <Landing onSignIn={() => {}} />
            )}
          </Route>
          <Route path="/clubs">
            {user ? (
              <ClubSelection 
                user={user} 
                onClubSelected={handleClubSelected}
                onSignOut={handleSignOutClick}
              />
            ) : (
              <Landing onSignIn={() => {}} />
            )}
          </Route>
          <Route path="/volunteer/:rest*">
            {user && selectedClub && membership ? (
              <VolunteerInterface 
                user={user} 
                club={selectedClub} 
                membership={membership}
                onSignOut={handleSignOutClick}
                onLeaveClub={handleLeaveClub}
              />
            ) : user ? (
              <ClubSelection 
                user={user} 
                onClubSelected={handleClubSelected}
                onSignOut={handleSignOutClick}
              />
            ) : (
              <Landing onSignIn={() => {}} />
            )}
          </Route>
          <Route path="/admin/:rest*">
            {user ? (
              <AdminInterface user={user} />
            ) : (
              <Landing onSignIn={() => {}} />
            )}
          </Route>
          <Route path="/admin">
            {user ? (
              <AdminInterface user={user} />
            ) : (
              <Landing onSignIn={() => {}} />
            )}
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
