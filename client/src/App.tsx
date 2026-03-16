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
  ensureClubCreatorIsAdmin,
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
import MyRequests from "@/pages/my-requests";
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
import { AdminHistory } from "@/pages/admin-history";
import { AdminCustomFields } from "@/pages/admin-custom-fields";
import { AdminSettings } from "@/pages/admin-settings";
import { AdminEvents } from "@/pages/admin-events";
import { AdminPartnerships } from "@/pages/admin-partnerships";
import { PartnershipsPage } from "@/pages/partnerships";

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
    <div className="flex h-screen bg-gray-950">
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
            <Dashboard club={club} />
          </Route>
          <Route path="/volunteer/hours">
            <Hours club={club} />
          </Route>
          <Route path="/volunteer/map">
            <TerritoryMap currentClubId={club.id} />
          </Route>
          <Route path="/volunteer/service-requests">
            <ServiceRequests />
          </Route>
          <Route path="/volunteer/my-requests">
            <MyRequests />
          </Route>
          <Route path="/volunteer/club">
            <ClubDashboard 
              user={user} 
              club={club} 
              membership={membership}
              onLeaveClub={handleLeaveClubClick}
            />
          </Route>
          <Route path="/volunteer/profile">
            <Profile />
          </Route>
          <Route path="/volunteer/history">
            <AdminHistory club={club} isVolunteerView={true} />
          </Route>
          <Route path="/volunteer/partners">
            <PartnershipsPage club={club} />
          </Route>
          <Route path="/volunteer">
            <Dashboard club={club} />
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </div>
    </div>
  );
}

function AdminInterface({ user, club }: { user: User; club?: Club }) {
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname;
    if (path.includes('/admin/dashboard')) return 'dashboard';
    if (path.includes('/admin/students')) return 'students';
    if (path.includes('/admin/management')) return 'admin-management';
    if (path.includes('/admin/database')) return 'database';
    if (path.includes('/admin/history')) return 'history';
    if (path.includes('/admin/settings')) return 'settings';
    if (path.includes('/admin/events')) return 'events';
    if (path.includes('/admin/partnerships')) return 'partnerships';
    return 'approval';
  });

  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/admin/dashboard')) setCurrentPage('dashboard');
    else if (path.includes('/admin/students')) setCurrentPage('students');
    else if (path.includes('/admin/management')) setCurrentPage('admin-management');
    else if (path.includes('/admin/database')) setCurrentPage('database');
    else if (path.includes('/admin/history')) setCurrentPage('history');
    else if (path.includes('/admin/settings')) setCurrentPage('settings');
    else if (path.includes('/admin/approval')) setCurrentPage('approval');
    else if (path.includes('/admin/events')) setCurrentPage('events');
    else if (path.includes('/admin/partnerships')) setCurrentPage('partnerships');
  }, []);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!club) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Panel</h2>
          <p className="text-gray-600">No club selected. Please select a club to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <div className="w-64 bg-white border-r border-gray-200 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-white">
          <div className="flex items-center flex-shrink-0 px-4 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div 
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{ backgroundColor: club.color }}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
                <p className="text-sm text-gray-600">{club.name}</p>
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
            
            <button
              onClick={() => { setCurrentPage('history'); window.history.pushState({}, '', '/admin/history'); }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'history' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>History</span>
            </button>

            <button
              onClick={() => { setCurrentPage('events'); window.history.pushState({}, '', '/admin/events'); }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'events' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span>Events</span>
            </button>

            <button
              onClick={() => { setCurrentPage('settings'); window.history.pushState({}, '', '/admin/settings'); }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'settings' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span>Settings</span>
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
        {currentPage === 'approval' && <AdminApproval user={user} club={club} />}
        {currentPage === 'dashboard' && <AdminDashboard user={user} club={club} />}
        {currentPage === 'students' && <AdminStudents user={user} club={club} />}
        {currentPage === 'admin-management' && <AdminManagement user={user} club={club} />}
        {currentPage === 'database' && <AdminDatabase user={user} club={club} />}
        {currentPage === 'history' && <AdminHistory user={user} club={club} />}
        {currentPage === 'settings' && <AdminSettings user={user} club={club} />}
        {currentPage === 'events' && <AdminEvents user={user} club={club} />}
        {currentPage === 'partnerships' && <AdminPartnerships user={user} club={club} />}
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
        setSelectedClub(null);
        setMembership(null);
        setClubChecked(true);
      } else {
        setClubChecked(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user?.email && !clubChecked) {
      getUserMembership(user.email)
        .then(async (data) => {
          if (data && data.club && data.membership) {
            setSelectedClub(data.club);
            setMembership(data.membership);
            // Ensure club creator has admin role
            if (data.club.creatorEmail === user.email) {
              await ensureClubCreatorIsAdmin(data.club.id, user.email);
            }
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
            { (initializing || !clubChecked) ? (
              <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading your club...</p>
                </div>
              </div>
            ) : user && selectedClub ? (
              <AdminInterface user={user} club={selectedClub} />
            ) : (
              <Landing onSignIn={() => {}} />
            )}
          </Route>
          <Route path="/admin">
            {(initializing || !clubChecked) ? (
              <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading your club...</p>
                </div>
              </div>
            ) : user && selectedClub ? (
              <AdminInterface user={user} club={selectedClub} />
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
