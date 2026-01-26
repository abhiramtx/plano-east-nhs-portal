import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trophy, MapPin, Clock, TrendingUp, Users, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Map, { Marker, NavigationControl, MapRef, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  getClubs, 
  getLeaderboard, 
  Club, 
  ServiceRequest,
  getOpenServiceRequests,
  getUserParticipations,
  joinServiceRequest,
  ServiceRequestParticipant,
  getCurrentUser,
  getAllSubmissions,
  HoursSubmission,
} from "@/lib/firebase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json';

const MIN_ZOOM = 3;
const MAX_ZOOM = 12;

interface TerritoryMapProps {
  currentClubId?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [100, 100, 255];
}

function createCirclePolygon(lng: number, lat: number, radiusKm: number, segments: number = 64): number[][] {
  const coords: number[][] = [];
  const earthRadiusKm = 6371;
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    const latOffset = (radiusKm / earthRadiusKm) * (180 / Math.PI) * Math.cos(angle);
    const lngOffset = (radiusKm / earthRadiusKm) * (180 / Math.PI) * Math.sin(angle) / Math.cos(lat * Math.PI / 180);
    coords.push([lng + lngOffset, lat + latOffset]);
  }
  
  return coords;
}

function calculateTerritoryRadiusKm(hours: number): number {
  const baseMiles = 4;
  const maxMiles = 20;
  const baseKm = baseMiles * 1.60934;
  const maxKm = maxMiles * 1.60934;
  
  if (hours <= 0) return baseKm;
  
  const logScale = Math.log10(hours + 1) / Math.log10(1000);
  const radiusKm = baseKm + (maxKm - baseKm) * Math.min(1, logScale);
  
  return radiusKm;
}

interface TerritoryCircle {
  id: string;
  clubId: string;
  clubName: string;
  clubColor: string;
  latitude: number;
  longitude: number;
  hours: number;
  location: string;
  lastActivity: Date;
}

function aggregateSubmissionsByLocation(
  submissions: HoursSubmission[],
  clubs: Club[]
): TerritoryCircle[] {
  const clubMap = new Map(clubs.map(c => [c.id, c]));
  const locationMap = new Map<string, TerritoryCircle>();
  
  const approvedSubmissions = submissions.filter(
    s => s.status === 'approved' && s.latitude && s.longitude
  );
  
  for (const submission of approvedSubmissions) {
    const club = clubMap.get(submission.clubId);
    if (!club) continue;
    
    const lat = submission.latitude!;
    const lng = submission.longitude!;
    const locationKey = `${submission.clubId}_${lat.toFixed(3)}_${lng.toFixed(3)}`;
    
    const existing = locationMap.get(locationKey);
    if (existing) {
      existing.hours += submission.hours;
      const submissionDate = new Date(submission.date);
      if (submissionDate > existing.lastActivity) {
        existing.lastActivity = submissionDate;
      }
    } else {
      locationMap.set(locationKey, {
        id: locationKey,
        clubId: submission.clubId,
        clubName: club.name,
        clubColor: club.color,
        latitude: lat,
        longitude: lng,
        hours: submission.hours,
        location: submission.location || 'Unknown location',
        lastActivity: new Date(submission.date),
      });
    }
  }
  
  return Array.from(locationMap.values());
}

export default function TerritoryMap({ currentClubId }: TerritoryMapProps) {
  const { toast } = useToast();
  const mapRef = useRef<MapRef>(null);
  const [hoveredClubId, setHoveredClubId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const user = getCurrentUser();
  const userEmail = user?.email || '';

  const [viewState, setViewState] = useState({
    longitude: -98,
    latitude: 39,
    zoom: 4
  });

  const { data: clubs = [] } = useQuery<Club[]>({
    queryKey: ['firebase-clubs'],
    queryFn: getClubs,
    refetchInterval: 30000,
  });

  const { data: leaderboardClubs = [] } = useQuery<Club[]>({
    queryKey: ['firebase-leaderboard'],
    queryFn: getLeaderboard,
  });

  const { data: serviceRequests = [] } = useQuery<ServiceRequest[]>({
    queryKey: ['firebase-open-service-requests'],
    queryFn: getOpenServiceRequests,
    refetchInterval: 30000,
  });

  const { data: allSubmissions = [] } = useQuery<HoursSubmission[]>({
    queryKey: ['firebase-all-submissions'],
    queryFn: getAllSubmissions,
    refetchInterval: 30000,
  });

  const territoryCircles = aggregateSubmissionsByLocation(allSubmissions, clubs);

  const { data: myParticipations = [] } = useQuery<ServiceRequestParticipant[]>({
    queryKey: ['firebase-my-participations', userEmail],
    queryFn: () => getUserParticipations(userEmail),
    enabled: !!userEmail,
  });

  const joinedRequestIds = myParticipations.map(p => p.requestId);

  const joinMutation = useMutation({
    mutationFn: async (request: ServiceRequest) => {
      return await joinServiceRequest(request.id, userEmail, user?.name || userEmail.split('@')[0]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-my-participations'] });
      toast({ title: "Joined!", description: "You've successfully joined this service request." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    }
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSelect = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: 12,
      duration: 1500
    });
    setSearchResults([]);
    setSearchQuery(result.display_name.split(',')[0]);
  };

  const flyToClub = useCallback((club: Club) => {
    if (!club.latitude || !club.longitude) return;
    const lat = parseFloat(String(club.latitude));
    const lng = parseFloat(String(club.longitude));
    if (isNaN(lat) || isNaN(lng)) return;
    
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: 10,
      duration: 1500
    });
  }, []);

  const requestsWithLocation = serviceRequests.filter(r => r.latitude && r.longitude);

  const calculateTotalHours = (club: Club) => {
    return club.totalApprovedHours + club.bonusHours - club.decayedHours;
  };

  const currentClub = clubs.find(c => c.id === currentClubId);
  const currentClubRank = leaderboardClubs.findIndex(c => c.id === currentClubId) + 1;

  const territoriesGeoJson = {
    type: 'FeatureCollection' as const,
    features: territoryCircles.map(circle => {
      const radiusKm = calculateTerritoryRadiusKm(circle.hours);
      
      return {
        type: 'Feature' as const,
        properties: {
          id: circle.id,
          name: circle.clubName,
          color: circle.clubColor,
          hours: circle.hours,
          location: circle.location,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [createCirclePolygon(circle.longitude, circle.latitude, radiusKm)]
        }
      };
    })
  };

  return (
    <div className="h-screen w-full flex bg-white overflow-hidden">
      <div className="flex-1 relative">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapStyle={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
          attributionControl={false}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
        >
          <NavigationControl position="bottom-right" showCompass={false} />
          
          {territoriesGeoJson.features.length > 0 && (
            <Source id="territories" type="geojson" data={territoriesGeoJson}>
              <Layer
                id="territory-fill"
                type="fill"
                paint={{
                  'fill-color': ['get', 'color'],
                  'fill-opacity': 0.35
                }}
              />
              <Layer
                id="territory-outline"
                type="line"
                paint={{
                  'line-color': ['get', 'color'],
                  'line-width': 3,
                  'line-opacity': 0.9
                }}
              />
            </Source>
          )}
          
          {clubs.map(club => {
            if (!club.latitude || !club.longitude) return null;
            const lat = parseFloat(String(club.latitude));
            const lng = parseFloat(String(club.longitude));
            if (isNaN(lat) || isNaN(lng)) return null;
            
            const totalHours = calculateTotalHours(club);
            const isHovered = hoveredClubId === club.id;
            const isCurrentClub = club.id === currentClubId;
            
            return (
              <Marker 
                key={club.id} 
                longitude={lng} 
                latitude={lat}
                anchor="center"
              >
                <div 
                  className="relative flex items-center justify-center cursor-pointer"
                  onMouseEnter={() => setHoveredClubId(club.id)}
                  onMouseLeave={() => setHoveredClubId(null)}
                  onClick={() => flyToClub(club)}
                >
                  <div 
                    className={`relative flex items-center justify-center rounded-full transition-all hover:scale-110 ${isCurrentClub ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
                    style={{ 
                      width: 32, 
                      height: 32,
                      backgroundColor: club.color,
                      border: '3px solid white',
                      boxShadow: `0 0 20px ${club.color}80, 0 2px 8px rgba(0,0,0,0.5)`
                    }}
                  >
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  
                  {isHovered && (
                    <div 
                      className="absolute left-12 top-1/2 -translate-y-1/2 bg-white rounded-lg px-4 py-3 whitespace-nowrap z-50 border border-gray-200 shadow-xl"
                      style={{ minWidth: 140 }}
                    >
                      <p className="text-gray-900 text-sm font-semibold truncate max-w-40">
                        {club.name}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {totalHours.toFixed(1)} volunteer hours
                      </p>
                      <div 
                        className="w-full h-1 rounded-full mt-2"
                        style={{ backgroundColor: club.color }}
                      />
                    </div>
                  )}
                </div>
              </Marker>
            );
          })}
          
          {requestsWithLocation.map(request => {
            const lat = parseFloat(String(request.latitude));
            const lng = parseFloat(String(request.longitude));
            if (isNaN(lat) || isNaN(lng)) return null;
            
            const isJoined = joinedRequestIds.includes(request.id);
            
            return (
              <Marker 
                key={request.id} 
                longitude={lng} 
                latitude={lat}
                anchor="bottom"
              >
                <div className="cursor-pointer transform hover:scale-110 transition-transform">
                  <MapPin 
                    className="w-6 h-6 drop-shadow-lg" 
                    fill={isJoined ? '#22c55e' : '#ffffff'} 
                    color={isJoined ? '#16a34a' : '#000000'}
                    strokeWidth={1.5}
                  />
                </div>
              </Marker>
            );
          })}
        </Map>

        <div className="absolute top-4 left-4 right-80 z-10">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 pr-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 shadow-lg"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
            
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchSelect(result)}
                    className="w-full px-4 py-3 text-left text-sm text-gray-900 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-4 left-4 flex flex-col space-y-2">
          <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-md rounded-lg px-3 py-1.5 border border-gray-200 shadow">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
            <span className="text-xs text-gray-700">Volunteer Territory ({territoryCircles.length} locations)</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-md rounded-lg px-3 py-1.5 border border-gray-200 shadow">
            <Users className="w-3 h-3 text-gray-700" />
            <span className="text-xs text-gray-700">Club HQ</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-md rounded-lg px-3 py-1.5 border border-gray-200 shadow">
            <MapPin className="w-3 h-3 text-gray-700" fill="#374151" />
            <span className="text-xs text-gray-700">Service Requests</span>
          </div>
        </div>
      </div>

      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Leaderboard
          </h2>
          {currentClub && currentClubRank > 0 && (
            <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500">Your Club Rank</p>
              <p className="text-2xl font-bold text-gray-900">#{currentClubRank}</p>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {leaderboardClubs.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No clubs yet</p>
            ) : (
              leaderboardClubs.slice(0, 50).map((club, index) => {
                const totalHours = calculateTotalHours(club);
                const isCurrentClub = club.id === currentClubId;
                return (
                  <button 
                    key={club.id}
                    onClick={() => flyToClub(club)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all hover:bg-gray-50 ${
                      isCurrentClub 
                        ? 'bg-gray-100 ring-1 ring-gray-200' 
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-amber-600 text-amber-100' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {index + 1}
                      </span>
                      <div 
                        className="w-4 h-4 rounded-full ring-1 ring-gray-200"
                        style={{ backgroundColor: club.color }}
                      />
                      <span className="font-medium text-gray-900 text-sm truncate max-w-[100px]">{club.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-sm font-medium">{totalHours.toFixed(0)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Active Clubs</span>
            <span className="text-gray-900 font-medium">{clubs.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Service Requests</span>
            <span className="text-gray-900 font-medium">{requestsWithLocation.length}</span>
          </div>
          {currentClub && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Your Hours</span>
              <span className="text-gray-900 font-medium">{calculateTotalHours(currentClub).toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
