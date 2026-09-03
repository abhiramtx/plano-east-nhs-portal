import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  User, 
  Club, 
  Membership, 
  HoursSubmission,
  UserProfile,
  getMemberships,
  getClubSubmissions,
  getAllUserProfiles,
  getProfileDisplayName,
  leaveClubWithArchive,
  deleteMembership
} from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClubPageHeader } from "@/components/club-page-header";
import { Users, Trophy, Clock, Settings, UserMinus, Crown, LogOut, Globe, Link2, Copy, ShieldCheck, Palette, Map as MapIcon } from "lucide-react";
import MapGlComponent, { NavigationControl, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const MEMBER_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#14b8a6',
  '#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16',
  '#a855f7','#fb923c','#34d399','#f43f5e','#60a5fa',
];

function createCirclePolygon(lng: number, lat: number, radiusKm: number, steps = 64): number[][] {
  const coords: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dx = radiusKm / 111.32;
    const dy = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
    coords.push([lng + dy * Math.sin(angle), lat + dx * Math.cos(angle)]);
  }
  return coords;
}

type MemberCircle = { volunteerName: string; latitude: number; longitude: number; radiusKm: number; hours: number };

interface ClubDashboardProps {
  user: User;
  club: Club;
  membership: Membership;
  onLeaveClub: () => void;
}

export default function ClubDashboard({ user, club, membership, onLeaveClub }: ClubDashboardProps) {
  const { toast } = useToast();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [kickDialogOpen, setKickDialogOpen] = useState(false);
  const [memberToKick, setMemberToKick] = useState<Membership | null>(null);
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [memberTooltip, setMemberTooltip] = useState<{ x: number; y: number; name: string } | null>(null);
  
  const userEmail = user.email || '';
  const isAdmin = membership.role === 'admin';

  const { data: members = [] } = useQuery<Membership[]>({
    queryKey: ['firebase-club-members', club.id],
    queryFn: () => getMemberships(club.id),
  });

  const { data: profiles = [] } = useQuery<UserProfile[]>({
    queryKey: ['firebase-user-profiles'],
    queryFn: getAllUserProfiles,
    staleTime: 60000,
  });

  const profilesByEmail = useMemo(() => {
    const byEmail = new Map<string, UserProfile>();
    profiles.forEach(profile => {
      if (profile.email) byEmail.set(profile.email.toLowerCase(), profile);
    });
    return byEmail;
  }, [profiles]);

  const { data: clubSubmissions = [] } = useQuery<HoursSubmission[]>({
    queryKey: ['firebase-club-submissions', club.id],
    queryFn: () => getClubSubmissions(club.id),
  });

  const { data: memberCircles = [] } = useQuery<MemberCircle[]>({
    queryKey: ['member-territories', club.id],
    queryFn: () => fetch(`/api/clubs/${club.id}/member-territories`).then(r => r.json()),
    refetchInterval: 60000,
  });

  const namedMemberCircles = useMemo(
    () => memberCircles.map(circle => ({
      ...circle,
      volunteerName: getProfileDisplayName(
        profilesByEmail.get(circle.volunteerName.toLowerCase()),
        circle.volunteerName,
      ),
    })),
    [memberCircles, profilesByEmail],
  );

  // Build a stable color map: sorted unique names → palette index
  const memberColorMap = useMemo(() => {
    const names = [...new Set(namedMemberCircles.map(c => c.volunteerName))].sort();
    const m = new Map<string, string>();
    names.forEach((n, i) => m.set(n, MEMBER_COLORS[i % MEMBER_COLORS.length]));
    return m;
  }, [namedMemberCircles]);

  const memberGeoJson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: namedMemberCircles.map(c => ({
      type: 'Feature' as const,
      properties: { color: memberColorMap.get(c.volunteerName) || '#3b82f6', name: c.volunteerName, hours: c.hours },
      geometry: { type: 'Polygon' as const, coordinates: [createCirclePolygon(c.longitude, c.latitude, c.radiusKm)] },
    })),
  }), [namedMemberCircles, memberColorMap]);

  const applyMemberLayers = useCallback((map: any, geoJson: any) => {
    if (map.getSource('member-territories')) {
      (map.getSource('member-territories') as any).setData(geoJson);
    } else {
      map.addSource('member-territories', { type: 'geojson', data: geoJson });
      map.addLayer({ id: 'member-fill', type: 'fill', source: 'member-territories', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.35 } });
      map.addLayer({ id: 'member-outline', type: 'line', source: 'member-territories', paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 0.9 } });
    }
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    applyMemberLayers(mapRef.current.getMap(), memberGeoJson);
  }, [mapLoaded, memberGeoJson, applyMemberLayers]);

  const leaveClubMutation = useMutation({
    mutationFn: async () => {
      await leaveClubWithArchive(userEmail, club.id, club.name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-user-club', userEmail] });
      toast({ title: "Left club", description: "You have left the club." });
      onLeaveClub();
    },
    onError: (error: any) => {
      toast({ title: "Failed to leave", description: error.message, variant: "destructive" });
    }
  });

  const kickMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await deleteMembership(memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-club-members', club.id] });
      setKickDialogOpen(false);
      toast({ title: "Member removed", description: "The member has been removed from the club." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
    }
  });

  const approvedHours = clubSubmissions.filter(s => s.status === 'approved').reduce((sum, s) => sum + s.hours, 0);
  const pendingHours = clubSubmissions.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.hours, 0);

  const getMemberApprovedHours = (memberEmail: string) => {
    return clubSubmissions
      .filter(s => s.userEmail === memberEmail && s.status === 'approved')
      .reduce((sum, s) => sum + s.hours, 0);
  };

  return (
    <div className="p-6 space-y-6 min-h-full">
      <ClubPageHeader
        club={club}
        title={club.name}
        description={club.description || "No description"}
        icon={Globe}
        actions={
          <>
            {isAdmin && (
              <Badge variant="secondary" className="border-primary/30 bg-primary/15 text-primary">
                <Crown className="mr-1 h-3 w-3" />
                Admin
              </Badge>
            )}
            <Button variant="outline" className="border-border text-muted-foreground hover:bg-background hover:text-foreground" onClick={() => setLeaveDialogOpen(true)}>
              <LogOut className="mr-2 h-4 w-4" />
              Leave Club
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[var(--teal)]/15 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-[var(--teal)]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved Hours</p>
                <p className="text-2xl font-bold text-foreground">{approvedHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[var(--marigold)]/15 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-[var(--marigold)]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Hours</p>
                <p className="text-2xl font-bold text-foreground">{pendingHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[var(--ink-soft)]/15 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-[var(--ink-soft)]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Members</p>
                <p className="text-2xl font-bold text-foreground">{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[var(--coral)]/15 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-[var(--coral)]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Territory Size</p>
                <p className="text-2xl font-bold text-foreground">
                  {Math.max(20, Math.sqrt(club.totalApprovedHours) * 10).toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {club.inviteCode && (
        <Card className="bg-card border-border">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-card border border-border rounded-xl flex items-center justify-center flex-shrink-0">
                <Link2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Invite Link</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{`${window.location.origin}/join/${club.inviteCode}`}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0 border-border bg-card text-muted-foreground hover:bg-background hover:text-foreground"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/join/${club.inviteCode}`);
                }}
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="border border-border bg-muted">
          <TabsTrigger value="members" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground">
            <Users className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground">
            <Trophy className="w-4 h-4 mr-2" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="map" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground">
            <MapIcon className="w-4 h-4 mr-2" />
            Map
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="settings" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Club Members</CardTitle>
              <CardDescription className="text-muted-foreground">Manage your club's membership</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-background/60 rounded-lg border border-border/50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-foreground">
                            {member.userName || member.userEmail}
                          </p>
                          {member.role === 'admin' && (
                            <Badge variant="secondary" className="border-primary/30 bg-primary/15 text-primary text-xs">
                              Admin
                            </Badge>
                          )}
                          {member.userEmail === userEmail && (
                            <Badge variant="secondary" className="border-[var(--teal)]/30 bg-[var(--teal)]/15 text-[var(--teal)] text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {member.personalEmailAddress || member.userEmail}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getMemberApprovedHours(member.userEmail).toFixed(1)} approved hours
                        </p>
                      </div>
                    </div>
                    {isAdmin && member.userEmail !== userEmail && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setMemberToKick(member);
                          setKickDialogOpen(true);
                        }}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Member Leaderboard</CardTitle>
              <CardDescription className="text-muted-foreground">Top contributors in your club</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...members]
                  .sort((a, b) => getMemberApprovedHours(b.userEmail) - getMemberApprovedHours(a.userEmail))
                  .map((member, index) => (
                    <div 
                      key={member.id}
                      className={`flex items-center space-x-4 p-4 rounded-lg border ${
                        member.userEmail === userEmail
                          ? 'bg-background border-border'
                          : 'bg-background/60 border-border/50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-[var(--marigold)] text-primary-foreground' :
                        index === 1 ? 'bg-[var(--teal)] text-primary-foreground' :
                        index === 2 ? 'bg-[var(--coral)] text-primary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {member.userName || member.userEmail}
                          {member.userEmail === userEmail && " (You)"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.personalEmailAddress || member.userEmail}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">
                          {getMemberApprovedHours(member.userEmail).toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">hours</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map">
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground">Volunteer Territory Map</CardTitle>
              <CardDescription className="text-muted-foreground">
                Each circle shows where a volunteer has logged hours. Bigger circle = more hours at that location.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative overflow-hidden rounded-b-lg" style={{ height: 360 }}>
                <MapGlComponent
                  ref={mapRef}
                  initialViewState={{ longitude: 0, latitude: 20, zoom: 1.5 }}
                  mapStyle={MAP_STYLE}
                  style={{ width: '100%', height: '100%' }}
                  attributionControl={false}
                  onLoad={evt => {
                    setMapLoaded(true);
                    const map = evt.target;
                    applyMemberLayers(map, memberGeoJson);
                    map.on('styledata', () => { if (!map.getSource('member-territories')) applyMemberLayers(map, memberGeoJson); });
                    map.on('mousemove', 'member-fill', (e: any) => {
                      if (e.features?.length > 0) {
                        setMemberTooltip({ x: e.point.x, y: e.point.y, name: e.features[0].properties?.name || '' });
                        map.getCanvas().style.cursor = 'pointer';
                      }
                    });
                    map.on('mouseleave', 'member-fill', () => { setMemberTooltip(null); map.getCanvas().style.cursor = ''; });
                  }}
                >
                  <NavigationControl position="bottom-right" showCompass={false} />
                </MapGlComponent>

                {memberTooltip && (
                  <div
                    style={{ left: memberTooltip.x + 12, top: memberTooltip.y - 36, pointerEvents: 'none' }}
                    className="absolute z-10 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground whitespace-nowrap"
                  >
                    {memberTooltip.name}
                  </div>
                )}

                {memberCircles.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-card/70">
                    <p className="text-muted-foreground text-sm">No location-tagged hours logged yet.</p>
                  </div>
                )}
              </div>

              {/* Legend */}
              {memberCircles.length > 0 && (
                <div className="px-4 py-3 border-t border-border flex flex-wrap gap-3">
                  {[...memberColorMap.entries()].map(([name, color]) => (
                    <div key={name} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-muted-foreground truncate max-w-[160px]">{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="settings">
            <Card className="border-border bg-card shadow-none">
              <CardHeader className="border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-foreground">Club Settings</CardTitle>
                    <CardDescription className="mt-1 text-xs">Manage privacy and appearance</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-background/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-foreground">Club privacy</h3>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {club.isPrivate ? "A password is required to join this club." : "Anyone can join this club."}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={club.isPrivate
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}
                      >
                        {club.isPrivate ? "Private" : "Public"}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-background/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Palette className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-foreground">Club color</h3>
                        <p className="mt-1 text-xs text-muted-foreground">Accent color used for this club.</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div
                        className="h-10 w-10 shrink-0 rounded-lg border border-white/10"
                        style={{ backgroundColor: club.color }}
                      />
                      <div>
                        <p className="font-mono text-sm font-medium uppercase text-foreground">{club.color}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Current accent</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="bg-[#faf8f4] border-[#d9cdbd]">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Leave Club?</DialogTitle>
            <DialogDescription className="text-gray-500">
              Are you sure you want to leave {club.name}? All your submissions will be saved to your History tab under "{club.name}" and your hours will reset to zero. You can rejoin at any time, but you'll start fresh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-[#d9cdbd] text-gray-600 hover:bg-gray-100" onClick={() => setLeaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => leaveClubMutation.mutate()}
              disabled={leaveClubMutation.isPending}
            >
              {leaveClubMutation.isPending ? "Leaving..." : "Leave Club"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={kickDialogOpen} onOpenChange={setKickDialogOpen}>
        <DialogContent className="bg-[#faf8f4] border-[#d9cdbd]">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Remove Member?</DialogTitle>
            <DialogDescription className="text-gray-500">
              Are you sure you want to remove {memberToKick?.userEmail} from the club?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-[#d9cdbd] text-gray-600 hover:bg-gray-100" onClick={() => setKickDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => memberToKick && kickMemberMutation.mutate(memberToKick.id)}
              disabled={kickMemberMutation.isPending}
            >
              {kickMemberMutation.isPending ? "Removing..." : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
