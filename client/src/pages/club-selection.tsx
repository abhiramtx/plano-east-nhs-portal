import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  User, 
  getClubs, 
  getUserMembership, 
  createClub, 
  createMembership,
  Club as FirebaseClub,
  Membership as FirebaseMembership,
  getOpenServiceRequests,
  ServiceRequest,
  joinServiceRequest,
  getUserParticipations,
  ServiceRequestParticipant,
  getCurrentUser,
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
import { Badge } from "@/components/ui/badge";
import { Globe, Plus, Users, ArrowRight, Lock, Search, LogOut, HandHeart, MapPin, Trophy, Clock, Building, Phone, Mail, ExternalLink } from "lucide-react";
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

export default function ClubSelection({ user, onClubSelected, onSignOut }: ClubSelectionProps) {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<FirebaseClub | null>(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<'clubs' | 'services'>('clubs');
  
  const [newClub, setNewClub] = useState({
    name: "",
    description: "",
    isPrivate: false,
    password: "",
    color: CLUB_COLORS[Math.floor(Math.random() * CLUB_COLORS.length)],
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const userEmail = user.email || '';

  const { data: userClubData, isLoading: userClubLoading } = useQuery({
    queryKey: ['firebase-user-club', userEmail],
    queryFn: () => getUserMembership(userEmail),
    enabled: !!userEmail,
  });

  const { data: clubs = [], isLoading: clubsLoading } = useQuery({
    queryKey: ['firebase-clubs'],
    queryFn: getClubs,
  });

  const { data: serviceRequests = [], isLoading: requestsLoading } = useQuery<ServiceRequest[]>({
    queryKey: ['firebase-open-service-requests'],
    queryFn: getOpenServiceRequests,
  });

  const { data: myParticipations = [] } = useQuery<ServiceRequestParticipant[]>({
    queryKey: ['firebase-my-participations', userEmail],
    queryFn: () => getUserParticipations(userEmail),
    enabled: !!userEmail,
  });

  const joinedRequestIds = myParticipations.map(p => p.requestId);

  const createClubMutation = useMutation({
    mutationFn: async (clubData: typeof newClub) => {
      const club = await createClub({
        name: clubData.name,
        description: clubData.description,
        isPrivate: clubData.isPrivate,
        password: clubData.password,
        color: clubData.color,
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

  const joinRequestMutation = useMutation({
    mutationFn: async (request: ServiceRequest) => {
      return await joinServiceRequest(request.id, userEmail, user.name || userEmail.split('@')[0]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-my-participations'] });
      toast({ title: "Joined!", description: "You've successfully joined this service request." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    }
  });

  useEffect(() => {
    if (userClubData?.club && userClubData?.membership) {
      onClubSelected(userClubData.club, userClubData.membership);
    }
  }, [userClubData, onClubSelected]);

  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequests = serviceRequests.filter(req =>
    req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.organizationName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (userClubLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (userClubData?.club && userClubData?.membership) {
    return null;
  }

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

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="bg-black/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-black" />
              </div>
              <span className="text-xl font-bold">VolunteerClub</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400 hidden sm:block">{user.email}</span>
              <Button variant="outline" size="sm" onClick={onSignOut} className="border-white/20 text-white hover:bg-white/10">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Choose Your Path</h1>
          <p className="text-xl text-gray-400">Join a club to compete, or find service opportunities</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white/5 rounded-2xl p-1 border border-white/10">
            <button
              onClick={() => setActiveSection('clubs')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeSection === 'clubs' 
                  ? 'bg-white text-black' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-5 h-5 inline-block mr-2" />
              Clubs
            </button>
            <button
              onClick={() => setActiveSection('services')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeSection === 'services' 
                  ? 'bg-white text-black' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <HandHeart className="w-5 h-5 inline-block mr-2" />
              Service Requests
            </button>
          </div>
        </div>

        <div className="relative mb-8">
          <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <Input
            placeholder={activeSection === 'clubs' ? "Search clubs..." : "Search service requests..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-12 rounded-xl"
          />
        </div>

        {activeSection === 'clubs' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card 
                className="cursor-pointer bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-white/10 hover:border-white/30 transition-all hover:scale-[1.02]"
                onClick={() => setCreateDialogOpen(true)}
              >
                <CardHeader className="text-center py-8">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-black" />
                  </div>
                  <CardTitle className="text-xl text-white">Create a Club</CardTitle>
                  <CardDescription className="text-gray-400">Start your own volunteer club and invite friends</CardDescription>
                </CardHeader>
                <CardContent className="text-center pb-8">
                  <Button className="bg-white text-black hover:bg-gray-200">
                    Create <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Join a Club
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {clubs.length} clubs available
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {clubsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
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
                          className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
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
                                <h3 className="font-semibold text-white">{club.name}</h3>
                                {club.isPrivate && <Lock className="w-4 h-4 text-gray-400" />}
                              </div>
                              <p className="text-sm text-gray-500 line-clamp-1">{club.description || "No description"}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => handleJoinClub(club)}
                            disabled={joinClubMutation.isPending}
                            className="bg-white text-black hover:bg-gray-200"
                          >
                            Join
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeSection === 'services' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <p className="text-gray-400">
                Browse volunteer opportunities from organizations. You don't need to join a club to help!
              </p>
            </div>
            
            {requestsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <Card className="bg-white/5 border-white/10 p-12 text-center">
                <HandHeart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No service requests yet</h3>
                <p className="text-gray-500">Check back later for volunteer opportunities</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRequests.map((request) => {
                  const isJoined = joinedRequestIds.includes(request.id);
                  return (
                    <Card key={request.id} className="bg-white/5 border-white/10 hover:border-white/20 transition-all">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg text-white">{request.title}</CardTitle>
                            {request.organizationName && (
                              <p className="text-sm text-gray-500 flex items-center mt-1">
                                <Building className="w-4 h-4 mr-1" />
                                {request.organizationName}
                              </p>
                            )}
                          </div>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <Clock className="w-3 h-3 mr-1" />
                            {request.hoursOffered}h
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-gray-400 line-clamp-2">{request.description}</p>
                        
                        {request.location && (
                          <p className="text-sm text-gray-500 flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {request.location}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between pt-2">
                          {request.contactEmail && (
                            <a 
                              href={`mailto:${request.contactEmail}`}
                              className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
                            >
                              <Mail className="w-4 h-4 mr-1" />
                              Contact
                            </a>
                          )}
                          
                          {isJoined ? (
                            <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                              Joined
                            </Badge>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => joinRequestMutation.mutate(request)}
                              disabled={joinRequestMutation.isPending}
                              className="bg-white text-black hover:bg-gray-200"
                            >
                              Join Request
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md bg-black border-white/10 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Create Your Club</DialogTitle>
            <DialogDescription className="text-gray-400">
              Start a new volunteer club and invite your friends
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">Club Name</Label>
              <Input
                id="name"
                placeholder="Enter club name"
                value={newClub.name}
                onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-300">Description</Label>
              <Textarea
                id="description"
                placeholder="What's your club about?"
                value={newClub.description}
                onChange={(e) => setNewClub({ ...newClub, description: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Club Color</Label>
              <div className="flex flex-wrap gap-2">
                {CLUB_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-9 h-9 rounded-xl transition-all cursor-pointer ${newClub.color === color ? 'ring-2 ring-white scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: color }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setNewClub({ ...newClub, color });
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-gray-300">Private Club</Label>
                <p className="text-sm text-gray-500">Require a password to join</p>
              </div>
              <Switch
                checked={newClub.isPrivate}
                onCheckedChange={(checked) => setNewClub({ ...newClub, isPrivate: checked })}
              />
            </div>
            {newClub.isPrivate && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Club Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Set a password"
                  value={newClub.password}
                  onChange={(e) => setNewClub({ ...newClub, password: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-300">
                <MapPin className="w-4 h-4" />
                Club Location (Optional)
              </Label>
              <p className="text-sm text-gray-500">Click on the map to set your club's location</p>
              <div className="rounded-xl overflow-hidden border border-white/10">
                <LocationPicker
                  value={newClub.latitude && newClub.longitude ? { lat: newClub.latitude, lng: newClub.longitude } : null}
                  onChange={(lat, lng) => setNewClub({ ...newClub, latitude: lat, longitude: lng })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-white/10 text-gray-300 hover:bg-white/5">
              Cancel
            </Button>
            <Button 
              onClick={handleCreateClub}
              disabled={createClubMutation.isPending}
              className="bg-white text-black hover:bg-gray-200"
            >
              {createClubMutation.isPending ? "Creating..." : "Create Club"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Join {selectedClub?.name}</DialogTitle>
            <DialogDescription className="text-gray-400">
              This club is private. Enter the password to join.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="joinPassword" className="text-gray-300">Password</Label>
              <Input
                id="joinPassword"
                type="password"
                placeholder="Enter club password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)} className="border-white/10 text-gray-300">
              Cancel
            </Button>
            <Button 
              onClick={confirmJoin}
              disabled={joinClubMutation.isPending}
              className="bg-white text-black hover:bg-gray-200"
            >
              {joinClubMutation.isPending ? "Joining..." : "Join Club"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
