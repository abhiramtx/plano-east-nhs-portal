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
        aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
        className="fixed left-4 top-4 z-50 rounded-xl bg-[#151715]/95 p-2.5 text-[#f3efe6] shadow-lg shadow-black/20 backdrop-blur lg:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className={`
        volunteer-sidebar-shell fixed inset-y-0 left-0 z-50 w-64 transform bg-[#111311] text-[#f3efe6] shadow-2xl shadow-black/25 transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div
            className="flex cursor-pointer items-center justify-between px-5 py-5 transition-colors hover:bg-white/[0.025]"
            onClick={() => { setLocation('/volunteer/dashboard'); setMobileMenuOpen(false); }}
          >
            <div className="flex items-center gap-3.5">
              <img src={logoImg} alt="Plano East NHS" className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/10" />
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-[#f3efe6]">Plano East NHS</h2>
                <p className="mt-1 text-[11px] text-[#a8aa9f]">National Honor Society</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {navGroups.map((group, gi) => (
              <div key={group.label} className={gi > 0 ? 'mt-7' : ''}>
                <p className="px-3 pb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f948b] select-none">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const isActive = location === item.path || location.startsWith(item.path + '/');
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`
                        group mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                        ${isActive
                          ? 'bg-[#d7a85a]/[0.13] text-[#f3efe6] shadow-[inset_3px_0_0_#d7a85a]'
                          : 'text-[#a8aa9f] hover:bg-white/[0.05] hover:text-[#f3efe6]'
                        }
                      `}
                    >
                      <item.icon className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                        isActive ? 'text-[#d7a85a]' : 'text-[#7f867d] group-hover:text-[#c8c6b8]'
                      }`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="space-y-3 p-3">
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-3">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#d7a85a]/15">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <UserIcon className="h-4 w-4 text-[#d7a85a]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-[#f3efe6]">{displayName}</p>
                <p className="mt-0.5 truncate text-[10px] text-[#7f867d]">{user.email}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-white/[0.08] bg-transparent text-[11px] text-[#a8aa9f] hover:bg-white/[0.05] hover:text-[#f3efe6]"
                onClick={onSignOut}
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
