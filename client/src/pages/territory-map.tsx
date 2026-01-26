import { useState, useRef, useCallback, useMemo } from "react";
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

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function createMetaballPolygon(
  circles: { lng: number; lat: number; radius: number }[],
  resolution: number = 100
): number[][] | null {
  if (circles.length === 0) return null;
  if (circles.length === 1) {
    return createCirclePolygon(circles[0].lng, circles[0].lat, circles[0].radius);
  }
  
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  const earthRadiusKm = 6371;
  
  for (const c of circles) {
    const latOffset = (c.radius / earthRadiusKm) * (180 / Math.PI);
    const lngOffset = (c.radius / earthRadiusKm) * (180 / Math.PI) / Math.cos(c.lat * Math.PI / 180);
    minLng = Math.min(minLng, c.lng - lngOffset * 1.2);
    maxLng = Math.max(maxLng, c.lng + lngOffset * 1.2);
    minLat = Math.min(minLat, c.lat - latOffset * 1.2);
    maxLat = Math.max(maxLat, c.lat + latOffset * 1.2);
  }
  
  const threshold = 1.0;
  const contourPoints: number[][] = [];
  
  for (let angle = 0; angle < 360; angle += 3) {
    const rad = angle * Math.PI / 180;
    let bestPoint: number[] | null = null;
    let maxDist = 0;
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    for (let dist = 0; dist < 100; dist += 0.5) {
      const testLatOffset = (dist / earthRadiusKm) * (180 / Math.PI) * Math.cos(rad);
      const testLngOffset = (dist / earthRadiusKm) * (180 / Math.PI) * Math.sin(rad) / Math.cos(centerLat * Math.PI / 180);
      const testLat = centerLat + testLatOffset;
      const testLng = centerLng + testLngOffset;
      
      let fieldValue = 0;
      for (const c of circles) {
        const d = getDistanceKm(testLat, testLng, c.lat, c.lng);
        if (d < 0.001) {
          fieldValue = 999;
        } else {
          fieldValue += (c.radius * c.radius) / (d * d);
        }
      }
      
      if (fieldValue >= threshold && dist > maxDist) {
        maxDist = dist;
        bestPoint = [testLng, testLat];
      }
    }
    
    if (bestPoint) {
      contourPoints.push(bestPoint);
    }
  }
  
  if (contourPoints.length < 3) return null;
  contourPoints.push(contourPoints[0]);
  return contourPoints;
}

function groupCirclesByProximity(
  circles: TerritoryCircle[],
  mergeThresholdMultiplier: number = 1.5
): TerritoryCircle[][] {
  if (circles.length === 0) return [];
  
  const circlesByClub = new Map<string, TerritoryCircle[]>();
  for (const circle of circles) {
    const list = circlesByClub.get(circle.clubId) || [];
    list.push(circle);
    circlesByClub.set(circle.clubId, list);
  }
  
  const allGroups: TerritoryCircle[][] = [];
  
  for (const clubCircles of circlesByClub.values()) {
    const parent = new Map<string, string>();
    for (const c of clubCircles) {
      parent.set(c.id, c.id);
    }
    
    const find = (id: string): string => {
      if (parent.get(id) !== id) {
        parent.set(id, find(parent.get(id)!));
      }
      return parent.get(id)!;
    };
    
    const union = (a: string, b: string) => {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA !== rootB) {
        parent.set(rootA, rootB);
      }
    };
    
    for (let i = 0; i < clubCircles.length; i++) {
      for (let j = i + 1; j < clubCircles.length; j++) {
        const c1 = clubCircles[i];
        const c2 = clubCircles[j];
        const r1 = calculateTerritoryRadiusKm(c1.hours, c1.lastActivity);
        const r2 = calculateTerritoryRadiusKm(c2.hours, c2.lastActivity);
        const distance = getDistanceKm(c1.latitude, c1.longitude, c2.latitude, c2.longitude);
        
        if (distance < (r1 + r2) * mergeThresholdMultiplier) {
          union(c1.id, c2.id);
        }
      }
    }
    
    const groupMap = new Map<string, TerritoryCircle[]>();
    for (const c of clubCircles) {
      const root = find(c.id);
      const list = groupMap.get(root) || [];
      list.push(c);
      groupMap.set(root, list);
    }
    
    allGroups.push(...groupMap.values());
  }
  
  return allGroups;
}

function calculateTerritoryRadiusKm(hours: number, lastActivityDate?: Date): number {
  const baseMiles = 4;
  const maxMiles = 20;
  const baseKm = baseMiles * 1.60934;
  const maxKm = maxMiles * 1.60934;
  
  if (hours <= 0) return baseKm;
  
  const logScale = Math.log10(hours + 1) / Math.log10(1000);
  let radiusKm = baseKm + (maxKm - baseKm) * Math.min(1, logScale);
  
  if (lastActivityDate) {
    const now = new Date();
    const weeksInactive = Math.floor((now.getTime() - lastActivityDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    if (weeksInactive > 0) {
      const decayPerWeekMiles = 0.25;
      const decayPerWeekKm = decayPerWeekMiles * 1.60934;
      const maxDecayKm = radiusKm * 0.10;
      const totalDecayKm = Math.min(weeksInactive * decayPerWeekKm, maxDecayKm);
      radiusKm = Math.max(baseKm, radiusKm - totalDecayKm);
    }
  }
  
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

function encodeGeohash(lat: number, lng: number, precision: number = 7): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let minLat = -90, maxLat = 90, minLng = -180, maxLng = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let isLng = true;
  
  while (hash.length < precision) {
    if (isLng) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        ch |= (1 << (4 - bit));
        minLng = mid;
      } else {
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        ch |= (1 << (4 - bit));
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }
    isLng = !isLng;
    bit++;
    if (bit === 5) {
      hash += base32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

function aggregateSubmissionsByLocation(
  submissions: HoursSubmission[],
  clubs: Club[]
): TerritoryCircle[] {
  const clubMap = new Map(clubs.map(c => [c.id, c]));
  const locationMap = new Map<string, TerritoryCircle>();
  
  const approvedSubmissions = submissions.filter(
    s => s.status === 'approved' && s.latitude && s.longitude && 
    !isNaN(s.latitude) && !isNaN(s.longitude)
  );
  
  for (const submission of approvedSubmissions) {
    const club = clubMap.get(submission.clubId);
    if (!club) continue;
    
    const lat = submission.latitude!;
    const lng = submission.longitude!;
    const geohash = encodeGeohash(lat, lng, 7);
    const locationKey = `${submission.clubId}_${geohash}`;
    
    const existing = locationMap.get(locationKey);
    const submissionDate = new Date(submission.date);
    const isValidDate = !isNaN(submissionDate.getTime());
    
    const oldestDate = new Date(0);
    
    if (existing) {
      existing.hours += submission.hours;
      if (isValidDate && submissionDate > existing.lastActivity) {
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
        lastActivity: isValidDate ? submissionDate : oldestDate,
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

  const circleGroups = useMemo(() => groupCirclesByProximity(territoryCircles), [territoryCircles]);
  
  const territoriesGeoJson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: circleGroups.flatMap(group => {
      if (group.length === 1) {
        const circle = group[0];
        const radiusKm = calculateTerritoryRadiusKm(circle.hours, circle.lastActivity);
        return [{
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
        }];
      }
      
      if (group.length > 8) {
        const avgLat = group.reduce((sum, c) => sum + c.latitude, 0) / group.length;
        const avgLng = group.reduce((sum, c) => sum + c.longitude, 0) / group.length;
        const totalHrs = group.reduce((sum, c) => sum + c.hours, 0);
        const largestRadius = Math.max(...group.map(c => calculateTerritoryRadiusKm(c.hours, c.lastActivity)));
        const extraRadius = Math.max(...group.map(c => 
          getDistanceKm(avgLat, avgLng, c.latitude, c.longitude)
        ));
        const combinedRadius = largestRadius + extraRadius * 0.5;
        
        return [{
          type: 'Feature' as const,
          properties: {
            id: `merged_large_${group[0].clubId}`,
            name: group[0].clubName,
            color: group[0].clubColor,
            hours: totalHrs,
            location: `${group.length} merged locations`,
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [createCirclePolygon(avgLng, avgLat, combinedRadius)]
          }
        }];
      }
      
      const metaballCircles = group.map(c => ({
        lng: c.longitude,
        lat: c.latitude,
        radius: calculateTerritoryRadiusKm(c.hours, c.lastActivity)
      }));
      
      const metaballCoords = createMetaballPolygon(metaballCircles);
      if (!metaballCoords) {
        return group.map(circle => ({
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
            coordinates: [createCirclePolygon(circle.longitude, circle.latitude, calculateTerritoryRadiusKm(circle.hours, circle.lastActivity))]
          }
        }));
      }
      
      const totalHours = group.reduce((sum, c) => sum + c.hours, 0);
      const firstCircle = group[0];
      
      return [{
        type: 'Feature' as const,
        properties: {
          id: `merged_${firstCircle.clubId}`,
          name: firstCircle.clubName,
          color: firstCircle.clubColor,
          hours: totalHours,
          location: `${group.length} merged locations`,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [metaballCoords]
        }
      }];
    })
  }), [circleGroups]);

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
