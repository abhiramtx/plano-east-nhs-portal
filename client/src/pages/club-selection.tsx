import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  User, 
  getClubs, 
  getUserMemberships,
  switchActiveClub,
  createClub, 
  createMembership,
  ensureClubCreatorIsAdmin,
  recalculateClubHours,
  deleteClub,
  leaveClubWithArchive,
  Club as FirebaseClub,
  Membership as FirebaseMembership,
} from "@/lib/firebase";

import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Globe, Plus, Users, ArrowRight, Lock, Search, LogOut, Trophy, Upload, Image, ChevronRight, UserCircle, MapPin, X } from "lucide-react";
import logoImg from "@assets/image_1772414281666.png";
import { LocationPicker } from "@/components/world-map";

interface ClubSelectionProps {
  user: User;
  onClubSelected: (club: FirebaseClub, membership: FirebaseMembership) => void;
  onSignOut: () => void;
}

const CLUB_COLORS = [
  "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", 
  "#EC4899", "#6366F1", "#14B8A6", "#F97316", "#84CC16"
];

const SUPERADMIN_EMAIL = 'abhiram.tx@gmail.com';

export default function ClubSelection({ user, onClubSelected, onSignOut }: ClubSelectionProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<FirebaseClub | null>(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const logoFileRef = useRef<HTMLInputElement>(null);

  const [newClub, setNewClub] = useState({
    name: "",
    description: "",
    isPrivate: false,
    password: "",
    color: CLUB_COLORS[Math.floor(Math.random() * CLUB_COLORS.length)],
    latitude: null as number | null,
    longitude: null as number | null,
    logoUrl: "" as string,
  });

  const userEmail = user.email || '';
  const isSuperAdmin = userEmail === SUPERADMIN_EMAIL;

  const { data: userMemberships = [], isLoading: userClubLoading } = useQuery({
    queryKey: ['firebase-user-memberships', userEmail],
    queryFn: () => getUserMemberships(userEmail),
    enabled: !!userEmail,
  });
  // The active club is the first entry whose membership.role might be 'admin'
  // — we just track it by sorting: active first if marked, otherwise first item.
  const activeMembership = userMemberships[0];
  const activeClub = activeMembership?.club;
  const joinedClubIds = new Set(userMemberships.map(m => m.club.id));

  const { data: clubs = [], isLoading: clubsLoading } = useQuery({
    queryKey: ['firebase-clubs'],
    queryFn: getClubs,
  });

  const createDefaultLog = async (clubId: string) => {
    try {
      await fetch('/api/hours-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: 'General Service', hoursRequired: 0, clubId }),
      });
    } catch {
      // Non-critical, ignore
    }
  };

  const createClubMutation = useMutation({
    mutationFn: async (clubData: typeof newClub) => {
      const club = await createClub({
        name: clubData.name,
        description: clubData.description,
        isPrivate: clubData.isPrivate,
        password: clubData.password,
        color: clubData.color,
        logoUrl: clubData.logoUrl || undefined,
        latitude: clubData.latitude || undefined,
        longitude: clubData.longitude || undefined,
        creatorEmail: userEmail,
      });
      const membership = await createMembership({
        clubId: club.id,
        userEmail: userEmail,
        userName: user.name || userEmail.split('@')[0],
        role: 'admin',
      });
      await ensureClubCreatorIsAdmin(club.id, userEmail);
      await createDefaultLog(club.id);
      return { club, membership };
    },
    onSuccess: async ({ club, membership }) => {
      queryClient.invalidateQueries({ queryKey: ['firebase-clubs'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-user-memberships', userEmail] });
      setCreateDialogOpen(false);
      toast({ title: "Club created!", description: `${club.name} is ready to grow.` });
      onClubSelected(club, membership);
    },
    onError: (error: any) => {
      toast({ title: "Failed to create club", description: error.message, variant: "destructive" });
    }
  });

  const goSoloMutation = useMutation({
    mutationFn: async () => {
      const randomPassword = Math.random().toString(36).substring(2, 10);
      const userName = user.name || userEmail.split('@')[0];
      const club = await createClub({
        name: `${userName}'s Hub`,
        description: 'My personal volunteer hub',
        isPrivate: true,
        password: randomPassword,
        color: CLUB_COLORS[Math.floor(Math.random() * CLUB_COLORS.length)],
        creatorEmail: userEmail,
      });
      const membership = await createMembership({
        clubId: club.id,
        userEmail: userEmail,
        userName: userName,
        role: 'admin',
      });
      await ensureClubCreatorIsAdmin(club.id, userEmail);
      await createDefaultLog(club.id);
      return { club, membership };
    },
    onSuccess: ({ club, membership }) => {
      queryClient.invalidateQueries({ queryKey: ['firebase-clubs'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-user-memberships', userEmail] });
      toast({ title: "Welcome!", description: "Your personal hub is ready." });
      onClubSelected(club, membership);
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
  });

  const joinClubMutation = useMutation({
    mutationFn: async ({ club, password }: { club: FirebaseClub; password?: string }) => {
      if (club.isPrivate && club.password !== password) {
        throw new Error("Incorrect password");
      }
      const membership = await createMembership({
        clubId: club.id,
        userEmail: userEmail,
        userName: user.name || userEmail.split('@')[0],
        role: 'member',
      });
      return { club, membership };
    },
    onSuccess: async ({ club, membership }) => {
      queryClient.invalidateQueries({ queryKey: ['firebase-clubs'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-user-memberships', userEmail] });
      setJoinDialogOpen(false);
      toast({ title: "Joined club!", description: "Welcome to the team!" });
      onClubSelected(club, membership);
    },
    onError: (error: any) => {
      toast({ title: "Failed to join club", description: error.message, variant: "destructive" });
    }
  });

  const deleteClubMutation = useMutation({
    mutationFn: (clubId: string) => deleteClub(clubId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-clubs'] });
      toast({ title: "Club deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete club", description: error.message, variant: "destructive" });
    }
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNewClub(prev => ({ ...prev, logoUrl: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateClub = () => {
    if (!newClub.name.trim()) {
      toast({ title: "Name required", description: "Please enter a club name.", variant: "destructive" });
      return;
    }
    createClubMutation.mutate(newClub);
  };

  const handleJoinClub = (club: FirebaseClub) => {
    setSelectedClub(club);
    if (club.isPrivate) {
      setJoinDialogOpen(true);
    } else {
      joinClubMutation.mutate({ club });
    }
  };

  const confirmJoin = () => {
    if (selectedClub) {
      joinClubMutation.mutate({ club: selectedClub, password: joinPassword });
    }
  };

  const currentClub = activeClub;
  const currentMembership = activeMembership?.membership;

  const switchClubMutation = useMutation({
    mutationFn: async (club: FirebaseClub) => {
      await switchActiveClub(userEmail, club.id);
      const membership: FirebaseMembership = {
        id: userEmail,
        clubId: club.id,
        userEmail,
        userName: user.name || userEmail.split('@')[0],
        role: 'member',
        joinedAt: new Date(),
      };
      return { club, membership };
    },
    onSuccess: ({ club, membership }) => {
      queryClient.invalidateQueries({ queryKey: ['firebase-user-memberships', userEmail] });
      onClubSelected(club, membership);
    },
  });

  const leaveSpecificMutation = useMutation({
    mutationFn: ({ clubId, clubName }: { clubId: string; clubName: string }) =>
      leaveClubWithArchive(userEmail, clubId, clubName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-user-memberships', userEmail] });
      queryClient.invalidateQueries({ queryKey: ['firebase-clubs'] });
      toast({ title: 'Left club', description: 'Your submissions in that club were archived.' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to leave club', description: err.message, variant: 'destructive' });
    },
  });

  // Keep active club's totalApprovedHours in sync whenever this page loads
  useEffect(() => {
    if (currentClub?.id) {
      recalculateClubHours(currentClub.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ['firebase-clubs'] }))
        .catch(err => console.error('recalculateClubHours failed:', err));
    }
  }, [currentClub?.id]);

  return (
    <div className="min-h-screen bg-[#f7f2e9] text-[#17324d] paper-grid">
      <nav className="bg-[#f7f2e9]/95 backdrop-blur-xl border-b border-[#d9cdbd] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => setLocation('/landing')}
            >
              <img src={logoImg} alt="VolunteerClub" className="w-10 h-10 rounded-xl" />
              <span className="text-xl font-bold text-[#17324d]">VolunteerClub</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#506477] hidden sm:block">{user.email}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreateDialogOpen(true)}
                className="border-[#d9cdbd] text-[#17324d] hover:bg-[#eee5d7]"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New Club
              </Button>
              <Button variant="outline" size="sm" onClick={onSignOut} className="border-[#d9cdbd] text-[#506477] hover:bg-[#eee5d7]">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Your Clubs */}
        {userClubLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#17324d]"></div>
          </div>
        ) : userMemberships.length > 0 ? (
          <div className="mb-10">
            <p className="text-xs text-[#506477] uppercase tracking-wide font-medium mb-3">
              Your Clubs ({userMemberships.length})
            </p>
            <div className="space-y-2">
              {userMemberships.map(({ club, membership }) => {
                const isActive = club.id === activeClub?.id;
                return (
                  <div
                    key={club.id}
                    className="flex items-center space-x-4 p-4 border rounded-2xl bg-[#eee5d7] border-[#d9cdbd]"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
                      style={{ backgroundColor: club.logoUrl ? undefined : club.color }}
                    >
                      {club.logoUrl
                        ? <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
                        : <Trophy className="w-5 h-5 text-white" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-semibold text-[#17324d] truncate">{club.name}</h2>
                      <p className="text-xs text-[#506477]">
                        {club.totalApprovedHours.toFixed(1)} hrs · {membership.role === 'admin' ? 'Admin' : 'Member'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => isActive ? onClubSelected(club, membership) : switchClubMutation.mutate(club)}
                        disabled={switchClubMutation.isPending}
                        className="bg-[#17324d] text-[#f7f2e9] hover:bg-[#1e3f61]"
                      >
                        Open
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`Leave "${club.name}"? Your submissions will be archived.`)) {
                            leaveSpecificMutation.mutate({ clubId: club.id, clubName: club.name });
                          }
                        }}
                        disabled={leaveSpecificMutation.isPending}
                        className="border-[#d9cdbd] text-[#506477] hover:bg-[#eee5d7]"
                      >
                        Leave
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-10">
            <div className="flex items-center space-x-4 p-5 bg-[#eee5d7] border border-[#d9cdbd] rounded-2xl">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#d9cdbd]">
                <UserCircle className="w-6 h-6 text-[#506477]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#506477] uppercase tracking-wide font-medium mb-0.5">No Club Yet</p>
                <h2 className="text-sm font-semibold text-[#17324d]">Go Solo</h2>
                <p className="text-xs text-[#506477]">Start your own personal volunteer hub — just for you</p>
              </div>
              <Button
                size="sm"
                onClick={() => goSoloMutation.mutate()}
                disabled={goSoloMutation.isPending}
                className="bg-[#17324d] text-[#f7f2e9] hover:bg-[#1e3f61]"
              >
                {goSoloMutation.isPending ? "Setting up..." : "Go Solo"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Join + Leaderboard — side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Join a Club — wider column */}
          <div className="lg:col-span-3 app-box p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-[#2d827d]" />
              <h2 className="text-xl font-semibold text-[#17324d]">Join a Club</h2>
              <span className="text-sm text-[#506477] ml-1">· {clubs.length} clubs</span>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#506477]" />
              <Input
                placeholder="Search clubs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#f7f2e9] border-[#d9cdbd] text-[#17324d] placeholder:text-[#506477]/60 h-11 rounded-xl"
              />
            </div>

            <div className="border border-[#d9cdbd] rounded-xl overflow-hidden">
              {clubsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#17324d]"></div>
                </div>
              ) : filteredClubs.length === 0 ? (
                <div className="text-center py-12 text-[#506477]">
                  {searchQuery ? "No clubs match your search" : "No clubs yet. Be the first!"}
                </div>
              ) : (
                <div className="divide-y divide-[#d9cdbd]">
                  {filteredClubs.map((club) => (
                    <div
                      key={club.id}
                      className="flex items-center justify-between px-5 py-4 hover:bg-[#f7f2e9] transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
                          style={{ backgroundColor: club.logoUrl ? undefined : club.color }}
                        >
                          {club.logoUrl
                            ? <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
                            : <Trophy className="w-5 h-5 text-white" />
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold text-[#17324d] text-sm">{club.name}</h3>
                            {club.isPrivate && <Lock className="w-3.5 h-3.5 text-[#506477]" />}
                          </div>
                          <p className="text-xs text-[#506477] line-clamp-1">{club.description || "No description"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSuperAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${club.name}" and all of its hours, events, logs, affiliations, and club data? This cannot be undone.`)) {
                                deleteClubMutation.mutate(club.id);
                              }
                            }}
                            className="p-1 rounded-lg text-[#d9cdbd] hover:text-[#d85c45] hover:bg-[#f7f2e9] transition-colors"
                            title="Delete club"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleJoinClub(club)}
                          disabled={joinClubMutation.isPending || joinedClubIds.has(club.id)}
                          className={joinedClubIds.has(club.id)
                            ? "bg-[#eee5d7] text-[#506477] cursor-default pointer-events-none"
                            : "bg-[#17324d] text-[#f7f2e9] hover:bg-[#1e3f61]"}
                        >
                          {joinedClubIds.has(club.id) ? 'Joined' : 'Join'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard — side column */}
          {!clubsLoading && clubs.length > 0 && (
            <div className="lg:col-span-2 app-box p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-[#e5a72c]" />
                <h2 className="text-xl font-semibold text-[#17324d]">Leaderboard</h2>
              </div>
              <div className="border border-[#d9cdbd] rounded-xl overflow-hidden">
                {[...clubs]
                  .sort((a, b) => b.totalApprovedHours - a.totalApprovedHours)
                  .map((club, index) => (
                    <div
                      key={club.id}
                      className={`flex items-center gap-3 px-4 py-3.5 ${
                        index !== clubs.length - 1 ? 'border-b border-[#d9cdbd]' : ''
                      } ${club.id === currentClub?.id ? 'bg-[#f7f2e9]' : ''}`}
                    >
                      <div className="w-7 text-center flex-shrink-0">
                        {index === 0 ? (
                          <span className="text-lg">🥇</span>
                        ) : index === 1 ? (
                          <span className="text-lg">🥈</span>
                        ) : index === 2 ? (
                          <span className="text-lg">🥉</span>
                        ) : (
                          <span className="text-xs font-semibold text-[#506477]">#{index + 1}</span>
                        )}
                      </div>
                      <div
                        className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden"
                        style={{ backgroundColor: club.logoUrl ? undefined : club.color }}
                      >
                        {club.logoUrl
                          ? <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
                          : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-[#17324d] text-sm truncate">{club.name}</p>
                          {club.id === currentClub?.id && (
                            <span className="text-[10px] bg-[#eee5d7] text-[#506477] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-[#17324d] text-sm">{club.totalApprovedHours.toFixed(0)}</p>
                          <p className="text-[10px] text-[#506477]">hrs</p>
                        </div>
                        {isSuperAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${club.name}" and all of its hours, events, logs, affiliations, and club data? This cannot be undone.`)) {
                                deleteClubMutation.mutate(club.id);
                              }
                            }}
                            className="p-1 rounded-lg text-[#d9cdbd] hover:text-[#d85c45] hover:bg-[#f7f2e9] transition-colors flex-shrink-0"
                            title="Delete club"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Club Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] bg-[#f7f2e9] border-[#d9cdbd] text-[#17324d] p-0 overflow-hidden !block">
          <div className="flex" style={{ height: '90vh' }}>
            <div className="w-[340px] min-w-[300px] p-6 overflow-y-auto border-r border-[#d9cdbd] flex-shrink-0 min-h-0">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl text-[#17324d]">Create Your Club</DialogTitle>
                <DialogDescription className="text-[#506477]">
                  Start a new volunteer club and invite your friends
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[#17324d]">Club Logo</Label>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-dashed border-[#d9cdbd] cursor-pointer hover:border-[#506477] transition-colors"
                      style={{ backgroundColor: newClub.logoUrl ? undefined : newClub.color }}
                      onClick={() => logoFileRef.current?.click()}
                    >
                      {newClub.logoUrl
                        ? <img src={newClub.logoUrl} alt="Logo preview" className="w-full h-full object-cover" />
                        : <Image className="w-6 h-6 text-white/70" />
                      }
                    </div>
                    <div className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-[#d9cdbd] text-[#506477] hover:bg-[#eee5d7] w-full"
                        onClick={() => logoFileRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {newClub.logoUrl ? "Change Logo" : "Upload Logo"}
                      </Button>
                      {newClub.logoUrl && (
                        <button
                          type="button"
                          className="text-xs text-[#d85c45] hover:text-[#c0513c] mt-1 w-full text-center"
                          onClick={() => setNewClub(prev => ({ ...prev, logoUrl: "" }))}
                        >
                          Remove logo
                        </button>
                      )}
                      <p className="text-xs text-[#506477] mt-1">PNG, JPG up to 2MB</p>
                    </div>
                  </div>
                  <input
                    ref={logoFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#17324d]">Club Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter club name"
                    value={newClub.name}
                    onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                    className="bg-[#faf8f4] border-[#d9cdbd] text-[#17324d]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-[#17324d]">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What's your club about?"
                    value={newClub.description}
                    onChange={(e) => setNewClub({ ...newClub, description: e.target.value })}
                    className="bg-[#faf8f4] border-[#d9cdbd] text-[#17324d]"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#17324d]">Club Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {CLUB_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-9 h-9 rounded-xl transition-all cursor-pointer ${newClub.color === color ? 'ring-2 ring-[#17324d] scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setNewClub({ ...newClub, color });
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[#506477]">Used as the territory color on the map</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-[#17324d]">Private Club</Label>
                    <p className="text-sm text-[#506477]">Require a password to join</p>
                  </div>
                  <Switch
                    checked={newClub.isPrivate}
                    onCheckedChange={(checked) => setNewClub({ ...newClub, isPrivate: checked })}
                  />
                </div>
                {newClub.isPrivate && (
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[#17324d]">Club Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Set a password"
                      value={newClub.password}
                      onChange={(e) => setNewClub({ ...newClub, password: e.target.value })}
                      className="bg-[#faf8f4] border-[#d9cdbd] text-[#17324d]"
                    />
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="flex-1 border-[#d9cdbd] text-[#506477] hover:bg-[#eee5d7]">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateClub}
                    disabled={createClubMutation.isPending}
                    className="flex-1 bg-[#17324d] text-[#f7f2e9] hover:bg-[#1e3f61]"
                  >
                    {createClubMutation.isPending ? "Creating..." : "Create Club"}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-4 border-b border-[#d9cdbd]">
                <Label className="flex items-center gap-2 text-[#17324d]">
                  <MapPin className="w-4 h-4" />
                  Club Location
                </Label>
                <p className="text-sm text-[#506477] mt-1">Click on the map to set your club's headquarters</p>
              </div>
              <div className="flex-1 relative">
                <LocationPicker
                  value={newClub.latitude && newClub.longitude ? { lat: newClub.latitude, lng: newClub.longitude } : null}
                  onChange={(lat, lng) => setNewClub({ ...newClub, latitude: lat, longitude: lng })}
                  color={newClub.color}
                />
              </div>
              {newClub.latitude && newClub.longitude && (
                <div className="p-4 border-t border-[#d9cdbd] bg-[#eee5d7]">
                  <p className="text-sm text-[#506477]">
                    Location: {newClub.latitude.toFixed(4)}, {newClub.longitude.toFixed(4)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Club Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#f7f2e9] border-[#d9cdbd] text-[#17324d]">
          <DialogHeader>
            <DialogTitle className="text-[#17324d]">Join {selectedClub?.name}</DialogTitle>
            <DialogDescription className="text-[#506477]">
              This club is private. Enter the password to join.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="joinPassword" className="text-[#17324d]">Password</Label>
              <Input
                id="joinPassword"
                type="password"
                placeholder="Enter club password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                className="bg-[#faf8f4] border-[#d9cdbd] text-[#17324d]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)} className="border-[#d9cdbd] text-[#506477]">
              Cancel
            </Button>
            <Button
              onClick={confirmJoin}
              disabled={joinClubMutation.isPending}
              className="bg-[#17324d] text-[#f7f2e9] hover:bg-[#1e3f61]"
            >
              {joinClubMutation.isPending ? "Joining..." : "Join Club"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
