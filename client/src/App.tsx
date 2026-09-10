import { lazy, Suspense, useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Menu, X } from "lucide-react";
import {
  User,
  onAuthStateChanged,
  initializeAuth,
  handleSignOut,
  auth,
  getUserMembershipSummary,
  getClubSummaries,
  clubSummaryToShell,
  ensureClubCreatorIsAdmin,
  leaveClubWithArchive,
  clubSlug,
  Club,
  Membership,
} from "@/lib/firebase";
import { VolunteerSidebar } from "@/components/volunteer-sidebar";
import Landing from "@/pages/landing";
import ClubSelection from "@/pages/club-selection";
import NotFound from "@/pages/not-found";
import ClubJoin from "@/pages/club-join";
import EventCheckin from "@/pages/event-checkin";
import LoginPage from "@/pages/login";

// Keep heavy page code and its queries out of the initial authenticated shell.
// These modules load only when their route is opened.
const ClubDashboard = lazy(() => import("@/pages/club-dashboard"));
const TerritoryMap = lazy(() => import("@/pages/territory-map"));
const Affiliates = lazy(() => import("@/pages/affiliates"));
const ServiceRequests = lazy(() => import("@/pages/service-requests"));
const MyRequests = lazy(() => import("@/pages/my-requests"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Hours = lazy(() => import("@/pages/hours"));
const Profile = lazy(() => import("@/pages/profile"));
const AdminHistoryPage = lazy(() =>
  import("@/pages/admin-history").then(module => ({ default: module.AdminHistory })),
);
const AdminDashboard = lazy(() =>
  import("@/pages/admin-dashboard").then(module => ({ default: module.AdminDashboard })),
);
const AdminStudents = lazy(() =>
  import("@/pages/admin-students").then(module => ({ default: module.AdminStudents })),
);
const AdminManagement = lazy(() =>
  import("@/pages/admin-management").then(module => ({ default: module.AdminManagement })),
);
const AdminApproval = lazy(() =>
  import("@/pages/admin-approval").then(module => ({ default: module.AdminApproval })),
);
const AdminDatabase = lazy(() =>
  import("@/pages/admin-database").then(module => ({ default: module.AdminDatabase })),
);
const AdminSettings = lazy(() =>
  import("@/pages/admin-settings").then(module => ({ default: module.AdminSettings })),
);
const AdminEvents = lazy(() =>
  import("@/pages/admin-events").then(module => ({ default: module.AdminEvents })),
);
const AdminQueryHistory = lazy(() =>
  import("@/pages/admin-query-history").then(module => ({ default: module.AdminQueryHistory })),
);

function PageLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">
      Loading page…
    </div>
  );
}

function VolunteerInterface({
  user,
  club,
  membership,
  onSignOut,
  onLeaveClub,
}: {
  user: User;
  club: Club;
  membership: Membership;
  onSignOut: () => void;
  onLeaveClub: () => void;
}) {
  const [location, setLocation] = useLocation();

  const handleLeaveClubClick = async () => {
    try {
      await leaveClubWithArchive(user.email || '', club.id, club.name);
      onLeaveClub();
    } catch (error) {
      console.error('Failed to leave club:', error);
    }
  };

  useEffect(() => {
    if (!location.startsWith('/volunteer') && !location.startsWith('/admin')) {
      setLocation('/volunteer/dashboard');
    }
  }, [location, setLocation]);

  return (
    <div className="min-h-screen bg-background">
      <VolunteerSidebar
        user={user}
        club={club}
        membership={membership}
        onSignOut={onSignOut}
        onLeaveClub={handleLeaveClubClick}
      />
      <div className="min-h-screen min-w-0 lg:ml-64 paper-grid bg-background">
        <Suspense fallback={<PageLoading />}>
          <Switch>
            <Route path="/volunteer/dashboard"><Dashboard club={club} /></Route>
            <Route path="/volunteer/hours"><Hours club={club} /></Route>
            <Route path="/volunteer/map"><TerritoryMap currentClubId={club.id} club={club} /></Route>
            <Route path="/volunteer/service-requests"><ServiceRequests club={club} /></Route>
            <Route path="/volunteer/my-requests"><MyRequests club={club} /></Route>
            <Route path="/volunteer/club">
              <ClubDashboard
                user={user}
                club={club}
                membership={membership}
                onLeaveClub={handleLeaveClubClick}
              />
            </Route>
            <Route path="/volunteer/profile"><Profile club={club} /></Route>
            <Route path="/volunteer/history"><AdminHistoryPage club={club} isVolunteerView={true} /></Route>
            <Route path="/volunteer/affiliates"><Affiliates user={user} club={club} /></Route>
            <Route path="/volunteer"><Dashboard club={club} /></Route>
            <Route><NotFound /></Route>
          </Switch>
        </Suspense>
      </div>
    </div>
  );
}

function AdminInterface({ user, club }: { user: User; club: Club }) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pageFromPath = (loc: string): string => {
    if (loc.includes('/admin/dashboard')) return 'dashboard';
    if (loc.includes('/admin/students')) return 'students';
    if (loc.includes('/admin/management')) return 'admin-management';
    if (loc.includes('/admin/database')) return 'database';
    if (loc.includes('/admin/query-history')) return 'query-history';
    if (loc.includes('/admin/history')) return 'history';
    if (loc.includes('/admin/settings')) return 'settings';
    if (loc.includes('/admin/events')) return 'events';
    return 'approval';
  };
  const [currentPage, setCurrentPage] = useState(() => pageFromPath(location));

  useEffect(() => {
    setCurrentPage(pageFromPath(location));
  }, [location]);

  const navTo = (page: string, path: string) => {
    setCurrentPage(page);
    setLocation(path);
    setMobileMenuOpen(false);
  };

  const handleSignOutLocal = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="admin-shell relative flex h-screen bg-background">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close admin navigation"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <button
        type="button"
        aria-label={mobileMenuOpen ? "Close admin navigation" : "Open admin navigation"}
        className="fixed left-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground lg:hidden"
        onClick={() => setMobileMenuOpen(open => !open)}
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <div className={`admin-sidebar-shell fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border transform transition-transform duration-200 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col flex-1 min-h-0 bg-background">
          <div className="flex items-center flex-shrink-0 px-4 py-4 border-b border-[#d9cdbd]">
            <div className="flex items-center space-x-3">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl"
                style={{ backgroundColor: club.color }}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548-.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#17324d]">Admin Panel</h2>
                <p className="text-xs text-[#506477]">{club.name}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-3 overflow-y-auto">
            <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#8fa5b4] select-none">Overview</p>
            <button onClick={() => navTo('dashboard', '/admin/dashboard')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'dashboard' ? 'bg-[#eee5d7] text-[#17324d]' : 'text-[#506477] hover:bg-[#eee5d7] hover:text-[#17324d]'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" /></svg>
              <span>Dashboard</span>
            </button>
            <button onClick={() => navTo('approval', '/admin/approval')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'approval' ? 'bg-[#eee5d7] text-[#17324d]' : 'text-[#506477] hover:bg-[#eee5d7] hover:text-[#17324d]'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span>Hours Approval</span>
            </button>
            <button onClick={() => navTo('students', '/admin/students')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'students' ? 'bg-[#eee5d7] text-[#17324d]' : 'text-[#506477] hover:bg-[#eee5d7] hover:text-[#17324d]'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span>Volunteers</span>
            </button>

            <p className="px-2 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#8fa5b4] select-none">Data</p>
            <button onClick={() => navTo('database', '/admin/database')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'database' ? 'bg-[#eee5d7] text-[#17324d]' : 'text-[#506477] hover:bg-[#eee5d7] hover:text-[#17324d]'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
              <span>Database</span>
            </button>
            <button onClick={() => navTo('history', '/admin/history')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'history' ? 'bg-[#eee5d7] text-[#17324d]' : 'text-[#506477] hover:bg-[#eee5d7] hover:text-[#17324d]'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>History</span>
            </button>
            <button onClick={() => navTo('query-history', '/admin/query-history')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'query-history' ? 'bg-[#eee5d7] text-[#17324d]' : 'text-[#506477] hover:bg-[#eee5d7] hover:text-[#17324d]'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <span>Query History</span>
            </button>

            <p className="px-2 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#8fa5b4] select-none">Events</p>
            <button onClick={() => navTo('events', '/admin/events')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'events' ? 'bg-[#eee5d7] text-[#17324d]' : 'text-[#506477] hover:bg-[#eee5d7] hover:text-[#17324d]'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span>Events</span>
            </button>

            <p className="px-2 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#8fa5b4] select-none">Admin</p>
            <button onClick={() => navTo('admin-management', '/admin/management')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'admin-management' ? 'bg-[#eee5d7] text-[#17324d]' : 'text-[#506477] hover:bg-[#eee5d7] hover:text-[#17324d]'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span>Admin Management</span>
            </button>
            <button onClick={() => navTo('settings', '/admin/settings')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${currentPage === 'settings' ? 'bg-[#eee5d7] text-[#17324d]' : 'text-[#506477] hover:bg-[#eee5d7] hover:text-[#17324d]'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span>Settings</span>
            </button>

            <div className="pt-4">
              <button
                onClick={() => setLocation('/volunteer/dashboard')}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-[#8fa5b4] hover:bg-[#eee5d7] hover:text-[#506477] text-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                <span>Back to Volunteer</span>
              </button>
            </div>
          </nav>

          <div className="flex-shrink-0 p-4 border-t border-[#d9cdbd]">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 bg-[#eee5d7] rounded-full">
                <svg className="w-4 h-4 text-[#506477]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[#17324d]">{user.name}</p>
                <p className="text-xs text-[#506477]">{user.email}</p>
              </div>
            </div>
            <button onClick={handleSignOutLocal} className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col min-h-0 pt-14 lg:ml-64 lg:pt-0">
        <Suspense fallback={<PageLoading />}>
          {currentPage === 'approval' && <AdminApproval user={user} club={club} />}
          {currentPage === 'dashboard' && <AdminDashboard user={user} club={club} />}
          {currentPage === 'students' && <AdminStudents user={user} club={club} />}
          {currentPage === 'admin-management' && <AdminManagement user={user} club={club} />}
          {currentPage === 'database' && <AdminDatabase user={user} club={club} />}
          {currentPage === 'history' && <AdminHistoryPage user={user} club={club} />}
          {currentPage === 'query-history' && <AdminQueryHistory user={user} club={club} />}
          {currentPage === 'settings' && <AdminSettings user={user} club={club} />}
          {currentPage === 'events' && <AdminEvents user={user} club={club} />}
        </Suspense>
      </div>
    </div>
  );
}

// Renders the appropriate (volunteer / admin) interface for a resolved club.
// Used inside a `<Route path="/:clubSlug" nest>` so wouter strips the slug
// prefix from useLocation/Link inside, and all inner Switch routes can stay
// as `/volunteer/...` and `/admin/...` unchanged.
function ClubScope({
  slug,
  user,
  onSignOutClick,
  onLeaveClub,
}: {
  slug: string;
  user: User | null;
  onSignOutClick: () => void;
  onLeaveClub: () => void;
}) {
  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['firebase-user-membership-summaries', user?.email],
    queryFn: () => getUserMembershipSummary(user!.email || ''),
    enabled: !!user?.email,
  });

  const { data: directory = [], isLoading: directoryLoading } = useQuery({
    queryKey: ['firebase-club-directory'],
    queryFn: getClubSummaries,
    enabled: !!user && !membershipsLoading,
    staleTime: 60000,
  });
  const directoryMatch = directory.find(club => memberships.some(m => m.clubId === club.id && clubSlug(club.name) === slug));
  const matchingMembership = memberships.find(m => m.clubId === directoryMatch?.id);
  const matchedClub = directoryMatch ? clubSummaryToShell(directoryMatch) : null;
  const match = matchingMembership && matchedClub
    ? {
        membership: {
          ...matchingMembership,
          role: matchedClub.creatorEmail?.toLowerCase() === matchingMembership.userEmail.toLowerCase()
            ? 'admin'
            : matchingMembership.role,
        },
        club: matchedClub,
      }
    : null;

  // If the user isn't a member (or isn't signed in), look up the club by slug
  // so we can bounce them through the join workflow.
  const needsJoinLookup = !matchingMembership && (!user || (!membershipsLoading && !directoryLoading));
  const { data: allClubs = [], isLoading: clubsLoading } = useQuery({
    queryKey: ['firebase-clubs-for-slug', slug],
    queryFn: getClubSummaries,
    enabled: needsJoinLookup,
  });

  useEffect(() => {
    if (match) return;
    if (user && (membershipsLoading || directoryLoading)) return;
    if (needsJoinLookup && clubsLoading) return;
    const targetClub = allClubs.find(c => clubSlug(c.name) === slug);
    if (targetClub?.inviteCode) {
      window.location.href = `/join/${targetClub.inviteCode}`;
    } else if (user) {
      window.location.href = '/clubs';
    } else {
      window.location.href = '/landing';
    }
  }, [match, user, membershipsLoading, needsJoinLookup, clubsLoading, allClubs, slug]);

  useEffect(() => {
    if (match && user && match.club.creatorEmail === user.email) {
      ensureClubCreatorIsAdmin(match.club.id, user.email).catch(() => {});
    }
  }, [match?.club.id, user?.email]);

  if (!user || membershipsLoading || directoryLoading || !match) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading club…</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/admin/:rest*">
        <AdminInterface user={user} club={match.club} />
      </Route>
      <Route>
        <VolunteerInterface
          user={user}
          club={match.club}
          membership={match.membership}
          onSignOut={onSignOutClick}
          onLeaveClub={onLeaveClub}
        />
      </Route>
    </Switch>
  );
}

function RootRedirect({ user, selectedClub }: { user: User | null; selectedClub: Club | null }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!user) {
      setLocation('/landing');
    } else if (selectedClub) {
      setLocation(`/${clubSlug(selectedClub.name)}/volunteer/dashboard`);
    } else {
      setLocation('/clubs');
    }
  }, [user, selectedClub, setLocation]);
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
    </div>
  );
}

// Backward-compat: handle old un-prefixed /volunteer/* and /admin/* URLs.
function LegacyRedirect({
  user,
  selectedClub,
  prefix,
  rest,
}: {
  user: User | null;
  selectedClub: Club | null;
  prefix: 'volunteer' | 'admin';
  rest: string;
}) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!user) {
      setLocation('/landing');
    } else if (selectedClub) {
      const tail = rest ? `/${rest}` : '';
      setLocation(`/${clubSlug(selectedClub.name)}/${prefix}${tail}`);
    } else {
      setLocation('/clubs');
    }
  }, [user, selectedClub, prefix, rest, setLocation]);
  return null;
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
      Promise.all([
        getUserMembershipSummary(user.email),
        getClubSummaries(),
      ])
        .then(([memberships, directory]) => {
          const selectedMembership = memberships[0];
          const selectedSummary = selectedMembership
            ? directory.find(club => club.id === selectedMembership.clubId)
            : undefined;
          if (!selectedMembership || !selectedSummary) return;
          setSelectedClub(clubSummaryToShell(selectedSummary));
          setMembership({
            ...selectedMembership,
            role: selectedSummary.creatorEmail?.toLowerCase() === selectedMembership.userEmail.toLowerCase()
              ? 'admin'
              : selectedMembership.role,
          });
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
    setLocation('/landing');
  };

  const handleClubSelected = (club: Club, clubMembership: Membership) => {
    setSelectedClub(club);
    setMembership(clubMembership);
    setLocation(`/${clubSlug(club.name)}/volunteer/dashboard`);
  };

  const handleLeaveClub = () => {
    setSelectedClub(null);
    setMembership(null);
    setLocation('/clubs');
  };

  const isEventCheckinPath = window.location.pathname.replace(/\/+$/, '') === '/event-checkin';
  if (isEventCheckinPath) {
    return (
      <QueryClientProvider client={queryClient}>
        <EventCheckin />
      </QueryClientProvider>
    );
  }

  if (window.location.pathname.startsWith('/join/')) {
    return (
      <QueryClientProvider client={queryClient}>
        <Switch>
          <Route path="/join/:code"><ClubJoin /></Route>
        </Switch>
      </QueryClientProvider>
    );
  }

  const isLoginPath = window.location.pathname.replace(/\/+$/, '') === '/login';
  // Do not block the whole app on the optional active-club lookup. On mobile,
  // one slow Firestore read should not leave the user staring at a spinner;
  // /clubs can render its own loading state and recover when the query settles.
  if (!isLoginPath && initializing) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{user ? 'Loading your club...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/event-checkin"><EventCheckin /></Route>
          <Route path="/join/:code">{() => <ClubJoin />}</Route>
          <Route path="/landing">
            {user ? <RootRedirect user={user} selectedClub={selectedClub} /> : <Landing onSignIn={() => {}} />}
          </Route>
          <Route path="/login"><LoginPage /></Route>
          <Route path="/clubs">
            {user ? (
              <ClubSelection user={user} onClubSelected={handleClubSelected} onSignOut={handleSignOutClick} />
            ) : (
              <Landing onSignIn={() => {}} />
            )}
          </Route>
          <Route path="/"><RootRedirect user={user} selectedClub={selectedClub} /></Route>

          {/* Backward-compat for old un-prefixed paths */}
          <Route path="/volunteer/:rest*">
            {(p: any) => (
              <LegacyRedirect user={user} selectedClub={selectedClub} prefix="volunteer" rest={p.rest || ''} />
            )}
          </Route>
          <Route path="/admin/:rest*">
            {(p: any) => (
              <LegacyRedirect user={user} selectedClub={selectedClub} prefix="admin" rest={p.rest || ''} />
            )}
          </Route>

          {/* /:clubSlug/... -> resolve and render. `nest` strips the matched
              prefix from useLocation/Link inside, so inner routes stay as
              /volunteer/... and /admin/... unchanged. */}
          <Route path="/:clubSlug" nest>
            {(params: any) => (
              <ClubScope
                slug={params.clubSlug}
                user={user}
                onSignOutClick={handleSignOutClick}
                onLeaveClub={handleLeaveClub}
              />
            )}
          </Route>

          <Route><NotFound /></Route>
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
