import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  User, 
  getClubs, 
  getUserMembership, 
  createClub, 
  createMembership,
  ensureClubCreatorIsAdmin,
  recalculateClubHours,
  deleteClub,
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

  const { data: userClubData, isLoading: userClubLoading } = useQuery({
    queryKey: ['firebase-user-club', userEmail],
    queryFn: () => getUserMembership(userEmail),
    enabled: !!userEmail,
  });

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
      queryClient.invalidateQueries({ queryKey: ['firebase-user-club', userEmail] });
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
      queryClient.invalidateQueries({ queryKey: ['firebase-user-club', userEmail] });
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
      queryClient.invalidateQueries({ queryKey: ['firebase-user-club', userEmail] });
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

  const currentClub = userClubData?.club;
  const currentMembership = userClubData?.membership;

  // Keep club's totalApprovedHours in sync whenever this page loads
  useEffect(() => {
    if (currentClub?.id) {
      recalculateClubHours(currentClub.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ['firebase-clubs'] }))
        .catch(err => console.error('recalculateClubHours failed:', err));
    }
  }, [currentClub?.id]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="bg-white/90 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => setLocation('/landing')}
            >
              <img src={logoImg} alt="VolunteerClub" className="w-10 h-10 rounded-xl" />
              <span className="text-xl font-bold">VolunteerClub</span>
            </div>
            <div className="flex items-center space-x-4">
              {currentClub && currentMembership && (
                <Button
                  size="sm"
                  className="bg-black text-white hover:bg-gray-800"
                  onClick={() => onClubSelected(currentClub, currentMembership)}
                >
                  Back to {currentClub.name}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
              <Button variant="outline" size="sm" onClick={onSignOut} className="border-gray-200 text-gray-600 hover:bg-gray-100">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {userClubLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : currentClub ? (
          <div className="mb-10">
            <div className="flex items-center space-x-4 p-5 bg-gray-50 border border-gray-200 rounded-2xl">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ backgroundColor: currentClub.logoUrl ? undefined : currentClub.color }}
              >
                {currentClub.logoUrl
                  ? <img src={currentClub.logoUrl} alt={currentClub.name} className="w-full h-full object-cover" />
                  : <Trophy className="w-7 h-7 text-white" />
                }
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">Your Current Club</p>
                <h2 className="text-lg font-semibold text-gray-900">{currentClub.name}</h2>
                <p className="text-sm text-gray-500">{currentClub.totalApprovedHours.toFixed(1)} total approved hours · {currentMembership?.role === 'admin' ? 'Admin' : 'Member'}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onClubSelected(currentClub, currentMembership!)}
                className="border-gray-200 text-gray-700 hover:bg-gray-100"
              >
                Go to Dashboard
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-10">
            <div className="flex items-center space-x-4 p-5 bg-gray-50 border border-gray-200 rounded-2xl">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-200">
                <UserCircle className="w-7 h-7 text-gray-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">No Club Yet</p>
                <h2 className="text-lg font-semibold text-gray-900">Go Solo</h2>
                <p className="text-sm text-gray-500">Start your own personal volunteer hub — just for you</p>
              </div>
              <Button
                size="sm"
                onClick={() => goSoloMutation.mutate()}
                disabled={goSoloMutation.isPending}
                className="bg-black text-white hover:bg-gray-800"
              >
                {goSoloMutation.isPending ? "Setting up..." : "Go Solo"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        <div className="relative mb-8">
            <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 h-12 rounded-xl"
            />
          </div>

        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card 
                className={`bg-gradient-to-br from-blue-50 to-purple-50 border-gray-200 transition-all ${!currentClub ? 'cursor-pointer hover:border-gray-300 hover:scale-[1.02]' : 'opacity-50 cursor-not-allowed'}`}
                onClick={() => !currentClub && setCreateDialogOpen(true)}
              >
                <CardHeader className="text-center py-8">
                  <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-900">Create a Club</CardTitle>
                  <CardDescription className="text-gray-500">
                    {currentClub ? 'Leave your current club first' : 'Start your own volunteer club and invite friends'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center pb-8">
                  <Button className="bg-black text-white hover:bg-gray-800" disabled={!!currentClub}>
                    Create <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Join a Club
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    {clubs.length} clubs available
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {clubsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  ) : filteredClubs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {searchQuery ? "No clubs match your search" : "No clubs yet. Be the first!"}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                      {filteredClubs.map((club) => (
                        <div 
                          key={club.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div 
                              className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
                              style={{ backgroundColor: club.logoUrl ? undefined : club.color }}
                            >
                              {club.logoUrl
                                ? <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
                                : <Trophy className="w-6 h-6 text-white" />
                              }
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">{club.name}</h3>
                                {club.isPrivate && <Lock className="w-4 h-4 text-gray-400" />}
                              </div>
                              <p className="text-sm text-gray-500 line-clamp-1">{club.description || "No description"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSuperAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Delete "${club.name}"? This cannot be undone.`)) {
                                    deleteClubMutation.mutate(club.id);
                                  }
                                }}
                                className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Delete club"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            <Button 
                              size="sm"
                              onClick={() => handleJoinClub(club)}
                              disabled={joinClubMutation.isPending || !!currentClub}
                              className="bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {club.id === currentClub?.id ? 'Current' : 'Join'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Club Leaderboard */}
            {!clubsLoading && clubs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-gray-700" />
                  <h2 className="text-lg font-semibold text-gray-900">Club Leaderboard</h2>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  {[...clubs]
                    .sort((a, b) => b.totalApprovedHours - a.totalApprovedHours)
                    .map((club, index) => (
                      <div
                        key={club.id}
                        className={`flex items-center gap-4 px-5 py-4 ${
                          index !== clubs.length - 1 ? 'border-b border-gray-100' : ''
                        } ${club.id === currentClub?.id ? 'bg-gray-50' : ''}`}
                      >
                        <div className="w-8 text-center flex-shrink-0">
                          {index === 0 ? (
                            <span className="text-xl">🥇</span>
                          ) : index === 1 ? (
                            <span className="text-xl">🥈</span>
                          ) : index === 2 ? (
                            <span className="text-xl">🥉</span>
                          ) : (
                            <span className="text-sm font-semibold text-gray-400">#{index + 1}</span>
                          )}
                        </div>
                        <div
                          className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden"
                          style={{ backgroundColor: club.logoUrl ? undefined : club.color }}
                        >
                          {club.logoUrl
                            ? <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
                            : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 text-sm">{club.name}</p>
                            {club.id === currentClub?.id && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">You</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{club.description || ''}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-gray-900 text-sm">{club.totalApprovedHours.toFixed(0)}</p>
                            <p className="text-xs text-gray-400">hours</p>
                          </div>
                          {isSuperAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${club.name}"? This cannot be undone.`)) {
                                  deleteClubMutation.mutate(club.id);
                                }
                              }}
                              className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
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
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] bg-white border-gray-200 text-gray-900 p-0 overflow-hidden">
          <div className="flex h-full">
            <div className="w-[340px] min-w-[300px] p-6 overflow-y-auto border-r border-gray-200 flex-shrink-0 min-h-0">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl text-gray-900">Create Your Club</DialogTitle>
                <DialogDescription className="text-gray-500">
                  Start a new volunteer club and invite your friends
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label className="text-gray-700">Club Logo</Label>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-dashed border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
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
                        className="border-gray-200 text-gray-600 hover:bg-gray-100 w-full"
                        onClick={() => logoFileRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {newClub.logoUrl ? "Change Logo" : "Upload Logo"}
                      </Button>
                      {newClub.logoUrl && (
                        <button
                          type="button"
                          className="text-xs text-red-500 hover:text-red-700 mt-1 w-full text-center"
                          onClick={() => setNewClub(prev => ({ ...prev, logoUrl: "" }))}
                        >
                          Remove logo
                        </button>
                      )}
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 2MB</p>
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
                  <Label htmlFor="name" className="text-gray-700">Club Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter club name"
                    value={newClub.name}
                    onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                    className="bg-white border-gray-200 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-700">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What's your club about?"
                    value={newClub.description}
                    onChange={(e) => setNewClub({ ...newClub, description: e.target.value })}
                    className="bg-white border-gray-200 text-gray-900"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Club Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {CLUB_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-9 h-9 rounded-xl transition-all cursor-pointer ${newClub.color === color ? 'ring-2 ring-gray-900 scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setNewClub({ ...newClub, color });
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">Used as the territory color on the map</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-gray-700">Private Club</Label>
                    <p className="text-sm text-gray-500">Require a password to join</p>
                  </div>
                  <Switch
                    checked={newClub.isPrivate}
                    onCheckedChange={(checked) => setNewClub({ ...newClub, isPrivate: checked })}
                  />
                </div>
                {newClub.isPrivate && (
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700">Club Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Set a password"
                      value={newClub.password}
                      onChange={(e) => setNewClub({ ...newClub, password: e.target.value })}
                      className="bg-white border-gray-200 text-gray-900"
                    />
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-100">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateClub}
                    disabled={createClubMutation.isPending}
                    className="flex-1 bg-black text-white hover:bg-gray-800"
                  >
                    {createClubMutation.isPending ? "Creating..." : "Create Club"}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-4 border-b border-gray-200">
                <Label className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4" />
                  Club Location
                </Label>
                <p className="text-sm text-gray-500 mt-1">Click on the map to set your club's headquarters</p>
              </div>
              <div className="flex-1 relative">
                <LocationPicker
                  value={newClub.latitude && newClub.longitude ? { lat: newClub.latitude, lng: newClub.longitude } : null}
                  onChange={(lat, lng) => setNewClub({ ...newClub, latitude: lat, longitude: lng })}
                  color={newClub.color}
                />
              </div>
              {newClub.latitude && newClub.longitude && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <p className="text-sm text-gray-500">
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
        <DialogContent className="sm:max-w-md bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Join {selectedClub?.name}</DialogTitle>
            <DialogDescription className="text-gray-500">
              This club is private. Enter the password to join.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="joinPassword" className="text-gray-700">Password</Label>
              <Input
                id="joinPassword"
                type="password"
                placeholder="Enter club password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                className="bg-white border-gray-200 text-gray-900"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)} className="border-gray-200 text-gray-600">
              Cancel
            </Button>
            <Button 
              onClick={confirmJoin}
              disabled={joinClubMutation.isPending}
              className="bg-black text-white hover:bg-gray-800"
            >
              {joinClubMutation.isPending ? "Joining..." : "Join Club"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
