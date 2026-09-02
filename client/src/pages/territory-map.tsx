import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Clock, TrendingUp, Users, Search, X } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MapGlComponent, { Marker, NavigationControl, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  getClubs, 
  getLeaderboard, 
  Club, 
  getCurrentUser,
  getAllSubmissions,
  HoursSubmission,
  getAllTerritoryCircles,
  TerritoryCircle,
  getAllOpenEvents,
  ClubEvent,
  getAllApprovedAffiliations,
  Affiliation,
} from "@/lib/firebase";

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const MIN_ZOOM = 3;
const MAX_ZOOM = 20;

interface TerritoryMapProps {
  currentClubId?: string;
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


export default function TerritoryMap({ currentClubId }: TerritoryMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [hoveredClubId, setHoveredClubId] = useState<string | null>(null);
  const [territoryTooltip, setTerritoryTooltip] = useState<{ x: number; y: number; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [leaderboardYear, setLeaderboardYear] = useState<number | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
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

  const { data: allOpenEvents = [] } = useQuery<ClubEvent[]>({
    queryKey: ['firebase-all-open-events'],
    queryFn: getAllOpenEvents,
    refetchInterval: 60000,
  });

  const { data: allSubmissions = [] } = useQuery<HoursSubmission[]>({
    queryKey: ['firebase-all-submissions'],
    queryFn: getAllSubmissions,
    refetchInterval: 30000,
  });

  // Load territory circles from server for ALL clubs
  const { data: rawServerCircles = [], refetch: refetchCircles } = useQuery<(TerritoryCircle & { clubName: string; clubColor: string })[]>({
    queryKey: ['firebase-all-territory-circles', clubs],
    queryFn: () => clubs.length > 0 ? getAllTerritoryCircles(clubs) : Promise.resolve([]),
    enabled: clubs.length > 0,
    refetchInterval: 60000,
  });

  // Approved affiliations let us re-attribute sub-club circles to their super-club
  const { data: approvedAffiliations = [] } = useQuery<Affiliation[]>({
    queryKey: ['affiliations-all-approved'],
    queryFn: getAllApprovedAffiliations,
    refetchInterval: 60000,
  });

  // Map: sub-club id -> super-club affiliation (use first approved super-club)
  const subToSuper = useMemo(() => {
    const m = new Map<string, Affiliation>();
    approvedAffiliations.forEach(a => { if (!m.has(a.subClubId)) m.set(a.subClubId, a); });
    return m;
  }, [approvedAffiliations]);

  // Map: super-club id -> list of sub-club affiliations (for tooltip display)
  const superToSubs = useMemo(() => {
    const m = new Map<string, Affiliation[]>();
    approvedAffiliations.forEach(a => {
      if (!m.has(a.superClubId)) m.set(a.superClubId, []);
      m.get(a.superClubId)!.push(a);
    });
    return m;
  }, [approvedAffiliations]);

  // Re-attribute: if a circle belongs to a sub-club, swap its identity to the super-club
  const serverCircles = useMemo(() => {
    if (subToSuper.size === 0) return rawServerCircles;
    const clubById = new Map(clubs.map(c => [c.id, c]));
    return rawServerCircles.map(circle => {
      const aff = subToSuper.get(circle.clubId);
      if (!aff) return circle;
      const superClub = clubById.get(aff.superClubId);
      return {
        ...circle,
        clubId: aff.superClubId,
        clubName: aff.superClubName,
        clubColor: superClub?.color || circle.clubColor,
      };
    });
  }, [rawServerCircles, subToSuper, clubs]);

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

  const calculateTotalHours = (club: Club) => {
    return club.totalApprovedHours + club.bonusHours - club.decayedHours;
  };

  const currentClub = clubs.find(c => c.id === currentClubId);

  // Derive available years from all submissions
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allSubmissions.forEach(s => {
      const d = new Date(s.date);
      if (!isNaN(d.getTime())) years.add(d.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allSubmissions]);

  // Compute per-club approved hours for a selected year
  const clubHoursByYear = useMemo(() => {
    if (!leaderboardYear) return null;
    const map = new Map<string, number>();
    allSubmissions.forEach(s => {
      if (s.status !== 'approved') return;
      const d = new Date(s.date);
      if (isNaN(d.getTime()) || d.getFullYear() !== leaderboardYear) return;
      map.set(s.clubId, (map.get(s.clubId) || 0) + s.hours);
    });
    return map;
  }, [allSubmissions, leaderboardYear]);

  const sortedLeaderboard = useMemo(() => {
    if (clubHoursByYear) {
      return [...leaderboardClubs].sort((a, b) =>
        (clubHoursByYear.get(b.id) || 0) - (clubHoursByYear.get(a.id) || 0)
      );
    }
    return leaderboardClubs;
  }, [leaderboardClubs, clubHoursByYear]);

  // Monthly cumulative progress for the chart year
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const chartYear = leaderboardYear ?? new Date().getFullYear();
  const nowMonth = new Date().getMonth(); // 0-indexed

  const monthlyProgress = useMemo(() => {
    const monthly = new Array(12).fill(0);
    allSubmissions.forEach(s => {
      if (s.status !== 'approved') return;
      const d = new Date(s.date);
      if (isNaN(d.getTime()) || d.getFullYear() !== chartYear) return;
      monthly[d.getMonth()] += s.hours;
    });
    // Only show up to current month for the current year; full year for past years
    const limit = chartYear === new Date().getFullYear() ? nowMonth + 1 : 12;
    let cumulative = 0;
    return MONTHS.slice(0, limit).map((m, i) => {
      cumulative += monthly[i];
      return { month: m, hours: Math.round(cumulative * 10) / 10 };
    });
  }, [allSubmissions, chartYear]);

  const currentClubRank = sortedLeaderboard.findIndex(c => c.id === currentClubId) + 1;

  const territoriesGeoJson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: serverCircles.map(circle => {
      const radiusKm = circle.radiusKm || 8.05;
      
      return {
        type: 'Feature' as const,
        properties: {
          id: circle.id,
          name: circle.locationName || 'Volunteer Territory',
          color: circle.clubColor || '#3B82F6',
          hours: circle.hoursContributed,
          people: circle.peopleCount,
          radius: radiusKm,
          clubName: circle.clubName,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [createCirclePolygon(circle.longitude, circle.latitude, radiusKm)]
        }
      };
    })
  }), [serverCircles]);

  // Native MapLibre territory rendering (bypasses react-map-gl Source/Layer quirks)
  const applyTerritoryLayers = useCallback((map: any) => {
    const data = territoriesGeoJson;
    if (map.getSource('territories')) {
      (map.getSource('territories') as any).setData(data);
    } else {
      map.addSource('territories', { type: 'geojson', data });
      map.addLayer({
        id: 'territory-fill',
        type: 'fill',
        source: 'territories',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.3,
        },
      });
      map.addLayer({
        id: 'territory-outline',
        type: 'line',
        source: 'territories',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2.5,
          'line-opacity': 0.9,
        },
      });
    }
  }, [territoriesGeoJson]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current.getMap();
    applyTerritoryLayers(map);
  }, [mapLoaded, applyTerritoryLayers]);

  return (
    <div className="h-full w-full flex bg-[#faf8f4] overflow-hidden">
      <div className="flex-1 relative">
        <MapGlComponent
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapStyle={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
          attributionControl={false}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onLoad={evt => {
            setMapLoaded(true);
            const map = evt.target;
            applyTerritoryLayers(map);
            // Re-apply whenever style reloads (e.g. theme change)
            map.on('styledata', () => {
              if (!map.getSource('territories')) {
                applyTerritoryLayers(map);
              }
            });
            // Territory hover tooltip
            map.on('mousemove', 'territory-fill', (e: any) => {
              if (e.features?.length > 0) {
                const name = e.features[0].properties?.clubName || '';
                setTerritoryTooltip({ x: e.point.x, y: e.point.y, name });
                map.getCanvas().style.cursor = 'pointer';
              }
            });
            map.on('mouseleave', 'territory-fill', () => {
              setTerritoryTooltip(null);
              map.getCanvas().style.cursor = '';
            });
          }}
        >
          <NavigationControl position="bottom-right" showCompass={false} />
          
          {/* Club HQ markers */}
          {clubs.map(club => {
            if (!club.latitude || !club.longitude) return null;
            const lat = parseFloat(String(club.latitude));
            const lng = parseFloat(String(club.longitude));
            if (isNaN(lat) || isNaN(lng)) return null;
            
            const totalHours = calculateTotalHours(club);
            const isHovered = hoveredClubId === club.id;
            const isCurrentClub = club.id === currentClubId;
            const clubEvents = allOpenEvents.filter(e => e.clubId === club.id);
            const subClubs = superToSubs.get(club.id) || [];
            
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
                      className="absolute left-12 top-1/2 -translate-y-1/2 bg-[#faf8f4] rounded-xl px-5 py-4 z-50 border border-[#d9cdbd] shadow-2xl"
                      style={{ minWidth: 320, maxWidth: 400 }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: club.color }} />
                        <p className="text-gray-900 text-base font-bold truncate">
                          {club.name}
                        </p>
                      </div>
                      <p className="text-gray-500 text-sm">
                        {totalHours.toFixed(1)} volunteer hours
                      </p>

                      {subClubs.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#d9cdbd]">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Sub-Clubs</p>
                          <div className="space-y-1.5">
                            {subClubs.map(sc => {
                              const scClub = clubs.find(c => c.id === sc.subClubId);
                              return (
                                <div key={sc.subClubId} className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: scClub?.color || '#6b7280' }}
                                  />
                                  <span className="text-sm text-gray-700 truncate">{sc.subClubName}</span>
                                  {scClub && (
                                    <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                                      {calculateTotalHours(scClub).toFixed(1)}h
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {clubEvents.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#d9cdbd] space-y-1.5">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active Events</p>
                          {clubEvents.map(ev => (
                            <div key={ev.id}>
                              <p className="text-sm font-medium text-gray-800 truncate">• {ev.name}</p>
                              {ev.description && (
                                <p className="text-xs text-gray-500 pl-3 line-clamp-2">{ev.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div 
                        className="w-full h-1 rounded-full mt-3"
                        style={{ backgroundColor: club.color }}
                      />
                    </div>
                  )}
                </div>
              </Marker>
            );
          })}

        </MapGlComponent>

        {/* Territory hover tooltip */}
        {territoryTooltip && (
          <div
            style={{ left: territoryTooltip.x + 12, top: territoryTooltip.y - 36, pointerEvents: 'none' }}
            className="absolute z-20 bg-[#faf8f4] rounded-lg px-3 py-1.5 shadow-lg border border-[#d9cdbd] text-sm font-semibold text-gray-900 whitespace-nowrap"
          >
            {territoryTooltip.name}
          </div>
        )}

        <div className="absolute top-4 left-4 right-80 z-10">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 pr-10 bg-[#faf8f4] border-[#d9cdbd] text-gray-900 placeholder:text-gray-400 shadow-lg"
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
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#faf8f4] border border-[#d9cdbd] rounded-lg overflow-hidden shadow-lg">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchSelect(result)}
                    className="w-full px-4 py-3 text-left text-sm text-gray-900 hover:bg-[#faf8f4] border-b border-[#d9cdbd] last:border-0"
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-4 left-4 flex flex-col space-y-2">
          <div className="flex items-center space-x-2 bg-[#121212]/90 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
            <span className="text-xs text-gray-200">Volunteer Territory ({serverCircles.length} locations)</span>
          </div>
          <div className="flex items-center space-x-2 bg-[#121212]/90 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10">
            <Users className="w-3 h-3 text-gray-200" />
            <span className="text-xs text-gray-200">Club HQ</span>
          </div>
        </div>
      </div>

      <div className="w-80 bg-[#faf8f4] border-l border-[#d9cdbd] flex flex-col">
        <div className="p-4 border-b border-[#d9cdbd] space-y-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Leaderboard
          </h2>

          {/* Year dropdown */}
          <select
            value={leaderboardYear ?? ''}
            onChange={e => setLeaderboardYear(e.target.value ? Number(e.target.value) : null)}
            className="w-full text-sm border border-[#d9cdbd] rounded-lg px-3 py-1.5 bg-[#faf8f4] text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300"
          >
            <option value="">All Time</option>
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Monthly cumulative progress chart */}
          {monthlyProgress.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500">
                  {chartYear} Progress
                </p>
                <p className="text-xs font-semibold text-gray-900">
                  {monthlyProgress[monthlyProgress.length - 1].hours.toFixed(0)} hrs
                </p>
              </div>
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyProgress} margin={{ top: 2, right: 2, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d7a85a" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#d7a85a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" axisLine={false} tickLine={false}
                      tick={{ fontSize: 9, fill: '#9CA3AF' }} />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fontSize: 9, fill: '#9CA3AF' }} />
                    <Tooltip
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="bg-[#faf8f4] border border-[#d9cdbd] rounded-lg px-2.5 py-1.5 shadow text-xs">
                            <p className="font-semibold text-gray-900">{label}</p>
                            <p className="text-gray-600">{payload[0].value} hrs total</p>
                          </div>
                        ) : null
                      }
                    />
                    <Area type="monotone" dataKey="hours" stroke="#d7a85a" strokeWidth={2}
                      fill="url(#progressGrad)" dot={false} activeDot={{ r: 3, fill: '#d7a85a' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {currentClub && currentClubRank > 0 && (
            <div className="bg-[#faf8f4] rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500">Your Club Rank</p>
              <p className="text-2xl font-bold text-gray-900">#{currentClubRank}</p>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {sortedLeaderboard.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No clubs yet</p>
            ) : (
              sortedLeaderboard.slice(0, 50).map((club, index) => {
                const displayHours = clubHoursByYear
                  ? (clubHoursByYear.get(club.id) || 0)
                  : calculateTotalHours(club);
                const isCurrentClub = club.id === currentClubId;
                return (
                  <button 
                    key={club.id}
                    onClick={() => flyToClub(club)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all hover:bg-[#faf8f4] ${
                      isCurrentClub ? 'bg-gray-100 ring-1 ring-gray-200' : ''
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
                      <div className="w-4 h-4 rounded-full ring-1 ring-gray-200" style={{ backgroundColor: club.color }} />
                      <span className="font-medium text-gray-900 text-sm truncate max-w-[100px]">{club.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-sm font-medium">{displayHours.toFixed(0)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="p-4 border-t border-[#d9cdbd] space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Active Clubs</span>
            <span className="text-gray-900 font-medium">{clubs.length}</span>
          </div>
          {currentClub && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Your Hours</span>
              <span className="text-gray-900 font-medium">
                {clubHoursByYear
                  ? (clubHoursByYear.get(currentClub.id) || 0).toFixed(1)
                  : calculateTotalHours(currentClub).toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
