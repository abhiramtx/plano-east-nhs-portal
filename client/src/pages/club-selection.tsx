import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Globe, Plus, Users, ArrowRight, Lock, Search, LogOut, HandHeart, MapPin, Trophy, Home } from "lucide-react";
import { LocationPicker } from "@/components/world-map";
import type { Club, ClubMembership } from "@shared/schema";

interface ClubSelectionProps {
  user: User;
  onClubSelected: (club: Club, membership: ClubMembership) => void;
  onSignOut: () => void;
}

const CLUB_COLORS = [
  "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", 
  "#EC4899", "#6366F1", "#14B8A6", "#F97316", "#84CC16"
];

export default function ClubSelection({ user, onClubSelected, onSignOut }: ClubSelectionProps) {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [newClub, setNewClub] = useState({
    name: "",
    description: "",
    isPrivate: false,
    password: "",
    color: CLUB_COLORS[Math.floor(Math.random() * CLUB_COLORS.length)],
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [showServiceRequests, setShowServiceRequests] = useState(false);

  const userEmail = user.email?.replace(/\./g, ',') || '';

  const { data: userClubData, isLoading: userClubLoading } = useQuery<{ membership: ClubMembership; club: Club } | null>({
    queryKey: ['/api/user-club', userEmail],
  });

  const { data: clubs = [], isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ['/api/clubs'],
  });

  const createClubMutation = useMutation({
    mutationFn: async (clubData: typeof newClub) => {
      const res = await apiRequest('POST', '/api/clubs', {
        name: clubData.name,
        description: clubData.description,
        isPrivate: clubData.isPrivate,
        password: clubData.password,
        color: clubData.color,
        latitude: clubData.latitude?.toString() || null,
        longitude: clubData.longitude?.toString() || null,
        creatorEmail: userEmail,
      });
      return await res.json() as Club;
    },
    onSuccess: async (club: Club) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clubs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-club', userEmail] });
      setCreateDialogOpen(false);
      toast({ title: "Club created!", description: `${club.name} is ready to grow.` });
      const res = await fetch(`/api/clubs/${club.id}/members`);
      const membership = await res.json() as ClubMembership[];
      const userMembership = membership.find(m => m.userEmail === userEmail);
      if (userMembership) {
        onClubSelected(club, userMembership);
      }
    },
    onError: (error: any) => {
      toast({ title: "Failed to create club", description: error.message, variant: "destructive" });
    }
  });

  const joinClubMutation = useMutation({
    mutationFn: async ({ clubId, password }: { clubId: number; password?: string }) => {
      const res = await apiRequest('POST', `/api/clubs/${clubId}/join`, { userEmail, password });
      return await res.json() as ClubMembership;
    },
    onSuccess: async (membership: ClubMembership) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clubs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-club', userEmail] });
      setJoinDialogOpen(false);
      toast({ title: "Joined club!", description: "Welcome to the team!" });
      if (selectedClub) {
        onClubSelected(selectedClub, membership);
      }
    },
    onError: (error: any) => {
      toast({ title: "Failed to join club", description: error.message, variant: "destructive" });
    }
  });

  useEffect(() => {
    if (userClubData?.club && userClubData?.membership) {
      onClubSelected(userClubData.club, userClubData.membership);
    }
  }, [userClubData, onClubSelected]);

  if (userClubLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (userClubData?.club && userClubData?.membership) {
    return null;
  }

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

  const handleJoinClub = (club: Club) => {
    setSelectedClub(club);
    if (club.isPrivate) {
      setJoinDialogOpen(true);
    } else {
      joinClubMutation.mutate({ clubId: club.id });
    }
  };

  const confirmJoin = () => {
    if (selectedClub) {
      joinClubMutation.mutate({ clubId: selectedClub.id, password: joinPassword });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">VolunteerClub</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <Button variant="outline" size="sm" onClick={onSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Path</h1>
          <p className="text-xl text-gray-600">Join an existing club or create your own to start competing</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-black"
            onClick={() => setCreateDialogOpen(true)}
          >
            <CardHeader className="text-center">
              <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Plus className="w-7 h-7 text-white" />
              </div>
              <CardTitle className="text-lg">Create a Club</CardTitle>
              <CardDescription className="text-sm">Start your own volunteer club</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="bg-black text-white hover:bg-gray-800 w-full">
                Create <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-black"
            onClick={() => setShowServiceRequests(true)}
          >
            <CardHeader className="text-center">
              <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-3">
                <HandHeart className="w-7 h-7 text-white" />
              </div>
              <CardTitle className="text-lg">Service Requests</CardTitle>
              <CardDescription className="text-sm">Find volunteer opportunities</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="bg-black text-white hover:bg-gray-800 w-full">
                Browse <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Join a Club
                  </CardTitle>
                  <CardDescription>Find and join an existing club</CardDescription>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search clubs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {clubsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
              ) : filteredClubs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? "No clubs match your search" : "No clubs yet. Be the first to create one!"}
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredClubs.map((club) => (
                    <div 
                      key={club.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: club.color }}
                        >
                          <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{club.name}</h3>
                            {club.isPrivate && <Lock className="w-4 h-4 text-gray-400" />}
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-1">{club.description || "No description"}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {parseFloat(club.totalApprovedHours).toFixed(1)} hrs
                          </p>
                          <p className="text-xs text-gray-500">total hours</p>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => handleJoinClub(club)}
                          disabled={joinClubMutation.isPending}
                        >
                          {club.isPrivate ? <Lock className="w-4 h-4 mr-1" /> : null}
                          Join
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Your Club</DialogTitle>
            <DialogDescription>
              Start a new volunteer club and invite your friends
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Club Name</Label>
              <Input
                id="name"
                placeholder="Enter club name"
                value={newClub.name}
                onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What's your club about?"
                value={newClub.description}
                onChange={(e) => setNewClub({ ...newClub, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Club Color</Label>
              <div className="flex flex-wrap gap-2">
                {CLUB_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-lg transition-transform ${newClub.color === color ? 'ring-2 ring-black ring-offset-2 scale-110' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewClub({ ...newClub, color })}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Private Club</Label>
                <p className="text-sm text-gray-500">Require a password to join</p>
              </div>
              <Switch
                checked={newClub.isPrivate}
                onCheckedChange={(checked) => setNewClub({ ...newClub, isPrivate: checked })}
              />
            </div>
            {newClub.isPrivate && (
              <div className="space-y-2">
                <Label htmlFor="password">Club Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Set a password"
                  value={newClub.password}
                  onChange={(e) => setNewClub({ ...newClub, password: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Club Location
              </Label>
              <p className="text-sm text-gray-500">Click on the map to set your club's location</p>
              <LocationPicker
                value={newClub.latitude && newClub.longitude ? { lat: newClub.latitude, lng: newClub.longitude } : null}
                onChange={(lat, lng) => setNewClub({ ...newClub, latitude: lat, longitude: lng })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateClub}
              disabled={createClubMutation.isPending}
              className="bg-black text-white hover:bg-gray-800"
            >
              {createClubMutation.isPending ? "Creating..." : "Create Club"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join {selectedClub?.name}</DialogTitle>
            <DialogDescription>
              This club is private. Enter the password to join.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="joinPassword">Password</Label>
              <Input
                id="joinPassword"
                type="password"
                placeholder="Enter club password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
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

      {showServiceRequests && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto">
          <nav className="bg-white border-b border-gray-200 sticky top-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                    <HandHeart className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">Service Requests</span>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowServiceRequests(false)}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Back to Clubs
                </Button>
              </div>
            </div>
          </nav>
          <div className="max-w-7xl mx-auto px-4 py-8">
            <ServiceRequestsView userEmail={userEmail} />
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceRequestsView({ userEmail }: { userEmail: string }) {
  const actualEmail = userEmail.replace(/,/g, '.');
  
  const { data: requests = [] } = useQuery<any[]>({
    queryKey: ['/api/service-requests'],
  });

  const joinMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest('POST', `/api/service-requests/${requestId}/join`, { userEmail: actualEmail });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
    }
  });

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Available Volunteer Opportunities</h2>
        <p className="text-gray-600">Browse and join service requests from organizations</p>
      </div>
      
      {requests.length === 0 ? (
        <Card className="p-12 text-center">
          <HandHeart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No service requests yet</h3>
          <p className="text-gray-500">Check back later for volunteer opportunities</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((request: any) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{request.title}</CardTitle>
                <CardDescription>{request.organizationName}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{request.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{request.hoursOffered} hours offered</span>
                  <span>{request.volunteersNeeded} volunteers needed</span>
                </div>
                <Button 
                  className="w-full bg-black text-white hover:bg-gray-800"
                  onClick={() => joinMutation.mutate(request.id)}
                  disabled={joinMutation.isPending}
                >
                  Sign Up to Volunteer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
