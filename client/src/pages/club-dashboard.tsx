import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  User, 
  Club, 
  Membership, 
  HoursSubmission,
  getMemberships,
  getClubSubmissions,
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
import { Users, Trophy, Clock, Settings, UserMinus, Crown, LogOut, Globe, Link2, Copy, Map as MapIcon } from "lucide-react";
import MapGlComponent, { NavigationControl, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

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

  const { data: clubSubmissions = [] } = useQuery<HoursSubmission[]>({
    queryKey: ['firebase-club-submissions', club.id],
    queryFn: () => getClubSubmissions(club.id),
  });

  const { data: memberCircles = [] } = useQuery<MemberCircle[]>({
    queryKey: ['member-territories', club.id],
    queryFn: () => fetch(`/api/clubs/${club.id}/member-territories`).then(r => r.json()),
    refetchInterval: 60000,
  });

  // Build a stable color map: sorted unique names → palette index
  const memberColorMap = useMemo(() => {
    const names = [...new Set(memberCircles.map(c => c.volunteerName))].sort();
    const m = new Map<string, string>();
    names.forEach((n, i) => m.set(n, MEMBER_COLORS[i % MEMBER_COLORS.length]));
    return m;
  }, [memberCircles]);

  const memberGeoJson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: memberCircles.map(c => ({
      type: 'Feature' as const,
      properties: { color: memberColorMap.get(c.volunteerName) || '#3b82f6', name: c.volunteerName, hours: c.hours },
      geometry: { type: 'Polygon' as const, coordinates: [createCirclePolygon(c.longitude, c.latitude, c.radiusKm)] },
    })),
  }), [memberCircles, memberColorMap]);

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
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex items-center justify-between pt-10 lg:pt-0">
        <div className="flex items-center space-x-4">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: club.color }}
          >
            <Globe className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{club.name}</h1>
            <p className="text-gray-500">{club.description || "No description"}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isAdmin && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
              <Crown className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          )}
          <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-100" onClick={() => setLeaveDialogOpen(true)}>
            <LogOut className="w-4 h-4 mr-2" />
            Leave Club
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Approved Hours</p>
                <p className="text-2xl font-bold text-gray-900">{approvedHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Hours</p>
                <p className="text-2xl font-bold text-gray-900">{pendingHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Members</p>
                <p className="text-2xl font-bold text-gray-900">{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Territory Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.max(20, Math.sqrt(club.totalApprovedHours) * 10).toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {club.inviteCode && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <Link2 className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Invite Link</p>
                <p className="text-xs text-gray-500 font-mono truncate">{`https://volunteerio.replit.app/join/${club.inviteCode}`}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0 border-gray-200 bg-white"
                onClick={() => {
                  navigator.clipboard.writeText(`https://volunteerio.replit.app/join/${club.inviteCode}`);
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
        <TabsList className="bg-gray-100 border-gray-200">
          <TabsTrigger value="members" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600">
            <Trophy className="w-4 h-4 mr-2" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="map" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600">
            <MapIcon className="w-4 h-4 mr-2" />
            Map
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Club Members</CardTitle>
              <CardDescription className="text-gray-500">Manage your club's membership</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">
                            {member.userEmail}
                          </p>
                          {member.role === 'admin' && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
                              Admin
                            </Badge>
                          )}
                          {member.userEmail === userEmail && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
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
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Member Leaderboard</CardTitle>
              <CardDescription className="text-gray-500">Top contributors in your club</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...members]
                  .sort((a, b) => getMemberApprovedHours(b.userEmail) - getMemberApprovedHours(a.userEmail))
                  .map((member, index) => (
                    <div 
                      key={member.id}
                      className={`flex items-center space-x-4 p-4 rounded-lg ${
                        member.userEmail === userEmail ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500 text-yellow-900' :
                        index === 1 ? 'bg-gray-400 text-gray-900' :
                        index === 2 ? 'bg-orange-500 text-orange-900' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {member.userEmail}
                          {member.userEmail === userEmail && " (You)"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {getMemberApprovedHours(member.userEmail).toFixed(1)}
                        </p>
                        <p className="text-xs text-gray-500">hours</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map">
          <Card className="bg-white border-gray-200 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-900">Volunteer Territory Map</CardTitle>
              <CardDescription className="text-gray-500">
                Each circle shows where a volunteer has logged hours. Bigger circle = more hours at that location.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative overflow-hidden rounded-b-lg" style={{ height: 480 }}>
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
                    className="absolute z-10 bg-white rounded-lg px-3 py-1.5 shadow-lg border border-gray-200 text-sm font-semibold text-gray-900 whitespace-nowrap"
                  >
                    {memberTooltip.name}
                  </div>
                )}

                {memberCircles.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                    <p className="text-gray-500 text-sm">No location-tagged hours logged yet.</p>
                  </div>
                )}
              </div>

              {/* Legend */}
              {memberCircles.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-3">
                  {[...memberColorMap.entries()].map(([name, color]) => (
                    <div key={name} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-gray-600 truncate max-w-[160px]">{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="settings">
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Club Settings</CardTitle>
                <CardDescription className="text-gray-500">Manage your club's configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Club Privacy</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {club.isPrivate ? "This club is private and requires a password to join." : "This club is public and anyone can join."}
                    </p>
                    <Badge variant={club.isPrivate ? "secondary" : "outline"} className={club.isPrivate ? "bg-gray-200 text-gray-700" : "border-gray-300 text-gray-700"}>
                      {club.isPrivate ? "Private" : "Public"}
                    </Badge>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Club Color</h3>
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-lg"
                        style={{ backgroundColor: club.color }}
                      />
                      <span className="text-sm text-gray-500">{club.color}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Leave Club?</DialogTitle>
            <DialogDescription className="text-gray-500">
              Are you sure you want to leave {club.name}? All your submissions will be saved to your History tab under "{club.name}" and your hours will reset to zero. You can rejoin at any time, but you'll start fresh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-100" onClick={() => setLeaveDialogOpen(false)}>
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
        <DialogContent className="bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Remove Member?</DialogTitle>
            <DialogDescription className="text-gray-500">
              Are you sure you want to remove {memberToKick?.userEmail} from the club?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-100" onClick={() => setKickDialogOpen(false)}>
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
