import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { User, Club, Membership, getUserProfile, logClubLeave, getApprovedSubClubs, getApprovedSuperClubs } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Globe, LayoutDashboard, Clock, Map, HandHeart, User as UserIcon, Settings, LogOut, Menu, X, ChevronLeft, ClipboardList, Trophy, Network } from "lucide-react";
import logoImg from "@assets/image_1772414281666.png";

interface VolunteerSidebarProps {
  user: User;
  club: Club;
  membership: Membership;
  onSignOut: () => void;
  onLeaveClub: () => void;
}

export function VolunteerSidebar({ user, club, membership, onSignOut, onLeaveClub }: VolunteerSidebarProps) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const isAdmin = membership.role === 'admin';

  const { data: profile } = useQuery({
    queryKey: ['firebase-user-profile-sidebar', user.email],
    queryFn: () => getUserProfile(user.email),
    enabled: !!user.email,
    staleTime: 60000,
  });

  const { data: subAffs = [] } = useQuery({
    queryKey: ['affiliations-sub-approved', club.id],
    queryFn: () => getApprovedSubClubs(club.id),
    staleTime: 60000,
  });
  const { data: superAffs = [] } = useQuery({
    queryKey: ['affiliations-super-approved', club.id],
    queryFn: () => getApprovedSuperClubs(club.id),
    staleTime: 60000,
  });
  const hasAffiliates = subAffs.length > 0 || superAffs.length > 0;

  const profileName = profile
    ? [profile.goByFirstName, profile.lastName].filter(Boolean).join(' ')
    : '';
  const displayName = profileName || user.name;

  const navGroups: { label: string; items: { path: string; icon: any; label: string }[] }[] = [
    {
      label: "Home",
      items: [
        { path: "/volunteer/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { path: "/volunteer/hours", icon: Clock, label: "Log Hours" },
      ],
    },
    {
      label: "Community",
      items: [
        { path: "/volunteer/map", icon: Map, label: "Territory Map" },
        { path: "/volunteer/club", icon: Globe, label: "My Club" },
        ...(hasAffiliates ? [{ path: "/volunteer/affiliates", icon: Network, label: "Affiliates" }] : []),
      ],
    },
    {
      label: "History",
      items: [
        { path: "/volunteer/history", icon: ClipboardList, label: "History" },
      ],
    },
    {
      label: "Profile",
      items: [
        { path: "/volunteer/profile", icon: UserIcon, label: "Profile" },
        ...(isAdmin ? [{ path: "/admin/dashboard", icon: Settings, label: "Admin Panel" }] : []),
      ],
    },
  ];

  const handleNavigation = (path: string) => {
    setLocation(path);
    setMobileMenuOpen(false);
  };

  const handleLeaveConfirm = async () => {
    setLeaving(true);
    try {
      await logClubLeave(user.email || '', club.id, club.name);
    } catch {}
    setLeaving(false);
    setLeaveDialogOpen(false);
    onLeaveClub();
  };

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="w-5 h-5 text-gray-900" /> : <Menu className="w-5 h-5 text-gray-900" />}
      </button>

      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div
            className="flex items-center justify-between px-4 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
            onClick={() => { setLocation('/clubs'); setMobileMenuOpen(false); }}
          >
            <div className="flex items-center space-x-3">
              <img src={logoImg} alt="VolunteerClub" className="w-10 h-10 rounded-xl" />
              <div>
                <h2 className="font-semibold text-gray-900">VolunteerClub</h2>
                <p className="text-xs text-gray-500">Volunteer Interface</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ backgroundColor: club.logoUrl ? undefined : club.color }}
              >
                {club.logoUrl
                  ? <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
                  : <Trophy className="w-4 h-4 text-white" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{club.name}</p>
                <p className="text-xs text-gray-500">
                  {club.totalApprovedHours.toFixed(1)} total hours
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-3 overflow-y-auto">
            {navGroups.map((group, gi) => (
              <div key={group.label} className={gi > 0 ? 'pt-3' : ''}>
                <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const isActive = location === item.path || location.startsWith(item.path + '/');
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={`
                        w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                        ${isActive
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <UserIcon className="w-4 h-4 text-gray-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                onClick={() => setLeaveDialogOpen(true)}
              >
                <ChevronLeft className="w-3 h-3 mr-1" />
                Leave Club
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                onClick={onSignOut}
              >
                <LogOut className="w-3 h-3 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {club.name}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">You are about to leave <strong>{club.name}</strong>.</span>
              <span className="block mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                ⚠️ All your submissions will be <strong>archived to your History tab</strong> and your hours will reset to zero. If you rejoin, you start fresh.
              </span>
              <span className="block text-sm text-gray-500 mt-1">You can view your past contributions anytime under History.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveConfirm}
              disabled={leaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {leaving ? "Leaving..." : "Leave Club"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
