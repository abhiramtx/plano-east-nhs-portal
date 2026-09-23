import { useState } from "react";
import { useLocation } from "wouter";
import { User, Club, Membership } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Clock, Map, User as UserIcon, Settings, LogOut, Menu, X, ClipboardList } from "lucide-react";
import logoImg from "@assets/image_1790127682492.png";

interface VolunteerSidebarProps {
  user: User;
  club: Club;
  membership: Membership;
  onSignOut: () => void;
}

export function VolunteerSidebar({ user, club, membership, onSignOut }: VolunteerSidebarProps) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = membership.role === 'admin';
  const displayName = user.name || user.email;

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
        { path: "/volunteer/map", icon: Map, label: "Volunteer Map" },
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

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#f7f2e9] rounded-lg shadow-md border border-[#d9cdbd]"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="w-5 h-5 text-[#DDA435]" /> : <Menu className="w-5 h-5 text-[#DDA435]" />}
      </button>

      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-[#17324d]/40 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className={`
        volunteer-sidebar-shell fixed inset-y-0 left-0 z-50 w-64 bg-[#f7f2e9] border-r border-[#d9cdbd] transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div
            className="flex items-center justify-between px-4 py-4 border-b border-[#d9cdbd] cursor-pointer hover:bg-[#eee5d7]"
            onClick={() => { setLocation('/volunteer/dashboard'); setMobileMenuOpen(false); }}
          >
            <div className="flex items-center space-x-3">
              <img src={logoImg} alt="Plano East NHS" className="w-10 h-10 rounded-xl" />
              <div>
                <h2 className="font-semibold text-[#17324d]">Plano East NHS</h2>
                <p className="text-xs text-[#506477]">National Honor Society</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-3 overflow-y-auto">
            {navGroups.map((group, gi) => (
              <div key={group.label} className={gi > 0 ? 'pt-3' : ''}>
                <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#506477]/60 select-none">
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
                          ? 'bg-[#eee5d7] text-[#17324d]'
                          : 'text-[#506477] hover:bg-[#eee5d7] hover:text-[#17324d]'
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5 text-[#DDA435]" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-[#d9cdbd] space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[#eee5d7] rounded-full flex items-center justify-center overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <UserIcon className="w-4 h-4 text-[#DDA435]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#17324d] truncate">{displayName}</p>
                <p className="text-xs text-[#506477] truncate">{user.email}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-[#d9cdbd] text-[#506477] hover:bg-[#eee5d7] hover:text-[#17324d]"
                onClick={onSignOut}
              >
                <LogOut className="w-3 h-3 mr-1 text-[#DDA435]" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
