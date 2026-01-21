import { useState } from "react";
import { useLocation } from "wouter";
import { User } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Globe, LayoutDashboard, Clock, Map, Trophy, HandHeart, User as UserIcon, Settings, LogOut, Menu, X, ChevronLeft } from "lucide-react";
import type { Club, ClubMembership } from "@shared/schema";

interface VolunteerSidebarProps {
  user: User;
  club: Club;
  membership: ClubMembership;
  onSignOut: () => void;
  onLeaveClub: () => void;
}

export function VolunteerSidebar({ user, club, membership, onSignOut, onLeaveClub }: VolunteerSidebarProps) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = membership.role === 'admin';

  const navItems = [
    { path: "/volunteer/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/volunteer/hours", icon: Clock, label: "Log Hours" },
    { path: "/volunteer/map", icon: Map, label: "Territory Map" },
    { path: "/volunteer/leaderboard", icon: Trophy, label: "Leaderboard" },
    { path: "/volunteer/club", icon: Globe, label: "My Club" },
    { path: "/volunteer/profile", icon: UserIcon, label: "Profile" },
  ];

  if (isAdmin) {
    navItems.push({ path: "/admin", icon: Settings, label: "Admin Panel" });
  }

  const handleNavigation = (path: string) => {
    setLocation(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">VolunteerClub</h2>
                <p className="text-xs text-gray-500">Volunteer Interface</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: club.color }}
              >
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{club.name}</p>
                <p className="text-xs text-gray-500">
                  {parseFloat(club.totalApprovedHours).toFixed(1)} total hours
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
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
          </nav>

          <div className="p-4 border-t border-gray-200 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <UserIcon className="w-4 h-4 text-gray-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs"
                onClick={onLeaveClub}
              >
                <ChevronLeft className="w-3 h-3 mr-1" />
                Leave Club
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={onSignOut}
              >
                <LogOut className="w-3 h-3 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
