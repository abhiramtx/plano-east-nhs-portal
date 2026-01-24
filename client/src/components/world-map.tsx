import { useRef, useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import { Club, ServiceRequest } from '@/lib/firebase';
import { MapPin, Clock, Building, Plus, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface WorldMapProps {
  clubs?: Club[];
  serviceRequests?: ServiceRequest[];
  selectedLocation?: { lat: number; lng: number } | null;
  onLocationSelect?: (lat: number, lng: number) => void;
  onJoinRequest?: (request: ServiceRequest) => void;
  joinedRequestIds?: string[];
  height?: string;
  interactive?: boolean;
  showTerritories?: boolean;
}

export function WorldMap({ 
  clubs = [], 
  serviceRequests = [],
  selectedLocation, 
  onLocationSelect, 
  onJoinRequest,
  joinedRequestIds = [],
  height = '400px',
  interactive = true,
  showTerritories = true,
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 });
  const [selectedRequestPopup, setSelectedRequestPopup] = useState<ServiceRequest | null>(null);
  const [hoveredClub, setHoveredClub] = useState<Club | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  const handleMoveEnd = (position: { coordinates: [number, number]; zoom: number }) => {
    setPosition(position);
  };

  const handleMapClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || !onLocationSelect || !containerRef.current) return;
    
    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    
    const rect = svg.getBoundingClientRect();
    const relX = event.clientX - rect.left;
    const relY = event.clientY - rect.top;
    
    const lng = ((relX / rect.width) * 360 - 180) / position.zoom + position.coordinates[0];
    const lat = (90 - (relY / rect.height) * 180) / position.zoom + position.coordinates[1] - 90;
    
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      onLocationSelect(lat, lng);
    }
  };

  const calculateTerritoryRadius = (club: Club) => {
    const approved = parseFloat(String(club.totalApprovedHours || "0"));
    const bonus = parseFloat(String(club.bonusHours || "0"));
    const decayed = parseFloat(String(club.decayedHours || "0"));
    const totalHours = Math.max(0, approved + bonus - decayed);
    return Math.max(5, Math.sqrt(totalHours) * 2);
  };

  const handleMarkerClick = (request: ServiceRequest, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setPopupPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    }
    setSelectedRequestPopup(selectedRequestPopup?.id === request.id ? null : request);
  };

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden bg-gray-900 rounded-xl"
      style={{ height }}
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 140,
          center: [0, 30]
        }}
        style={{ width: '100%', height: '100%' }}
        onClick={handleMapClick}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={handleMoveEnd}
          minZoom={1}
          maxZoom={8}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { fill: '#334155', outline: 'none' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>
          
          {showTerritories && clubs.map(club => {
            if (!club.latitude || !club.longitude) return null;
            const lat = parseFloat(String(club.latitude));
            const lng = parseFloat(String(club.longitude));
            if (isNaN(lat) || isNaN(lng)) return null;
            
            const radius = calculateTerritoryRadius(club);
            const approved = parseFloat(String(club.totalApprovedHours || "0"));
            const bonus = parseFloat(String(club.bonusHours || "0"));
            const decayed = parseFloat(String(club.decayedHours || "0"));
            const totalHours = Math.max(0, approved + bonus - decayed);
            
            return (
              <Marker 
                key={club.id} 
                coordinates={[lng, lat]}
                onMouseEnter={() => setHoveredClub(club)}
                onMouseLeave={() => setHoveredClub(null)}
              >
                <defs>
                  <radialGradient id={`gradient-${club.id}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={club.color} stopOpacity="0.6" />
                    <stop offset="70%" stopColor={club.color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={club.color} stopOpacity="0" />
                  </radialGradient>
                  <filter id={`glow-${club.id}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <circle
                  r={radius * 3}
                  fill={`url(#gradient-${club.id})`}
                  className="animate-pulse"
                  style={{ animationDuration: '3s' }}
                />
                <circle
                  r={radius}
                  fill={club.color}
                  fillOpacity={0.4}
                  stroke={club.color}
                  strokeWidth={1}
                  filter={`url(#glow-${club.id})`}
                />
                <circle
                  r={8}
                  fill={club.color}
                  stroke="white"
                  strokeWidth={2}
                  style={{ cursor: 'pointer' }}
                />
                <Users 
                  x={-4} 
                  y={-4} 
                  width={8} 
                  height={8} 
                  color="white"
                />
                {hoveredClub?.id === club.id && (
                  <g>
                    <rect
                      x={15}
                      y={-20}
                      width={120}
                      height={40}
                      rx={6}
                      fill="rgba(0,0,0,0.9)"
                    />
                    <text x={25} y={-2} fill="white" fontSize={10} fontWeight="600">
                      {club.name.length > 15 ? club.name.slice(0, 15) + '...' : club.name}
                    </text>
                    <text x={25} y={12} fill="#9ca3af" fontSize={8}>
                      {totalHours.toFixed(1)} hours
                    </text>
                  </g>
                )}
              </Marker>
            );
          })}
          
          {serviceRequests.map(request => {
            if (!request.latitude || !request.longitude) return null;
            const lat = parseFloat(String(request.latitude));
            const lng = parseFloat(String(request.longitude));
            if (isNaN(lat) || isNaN(lng)) return null;
            
            const isJoined = joinedRequestIds.includes(request.id);
            
            return (
              <Marker 
                key={request.id} 
                coordinates={[lng, lat]}
                onClick={(e) => handleMarkerClick(request, e as unknown as React.MouseEvent)}
              >
                <g style={{ cursor: 'pointer' }} className="group">
                  <circle r={12} fill="transparent" />
                  <path
                    d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 14 8 14s8-8.5 8-14c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"
                    transform="translate(-12, -22) scale(1)"
                    fill={isJoined ? '#22c55e' : '#ffffff'}
                    stroke={isJoined ? '#16a34a' : '#e5e5e5'}
                    strokeWidth={1}
                  />
                </g>
              </Marker>
            );
          })}
          
          {selectedLocation && (
            <Marker coordinates={[selectedLocation.lng, selectedLocation.lat]}>
              <circle r={12} fill="white" fillOpacity={0.3} className="animate-ping" />
              <circle r={8} fill="white" stroke="white" strokeWidth={2} />
            </Marker>
          )}
        </ZoomableGroup>
      </ComposableMap>

      {selectedRequestPopup && (() => {
        const isJoined = joinedRequestIds.includes(selectedRequestPopup.id);
        
        return (
          <Card 
            className="absolute w-80 shadow-2xl z-50 bg-gray-900/95 border-white/20 text-white backdrop-blur-xl"
            style={{ 
              left: Math.min(Math.max(popupPosition.x + 20, 10), containerRef.current ? containerRef.current.offsetWidth - 340 : 200),
              top: Math.min(Math.max(popupPosition.y - 80, 10), containerRef.current ? containerRef.current.offsetHeight - 220 : 100),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="pb-2 relative">
              <button
                className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-full transition-colors"
                onClick={() => setSelectedRequestPopup(null)}
              >
                <X className="w-4 h-4" />
              </button>
              <CardTitle className="text-lg pr-8">{selectedRequestPopup.title}</CardTitle>
              {selectedRequestPopup.organizationName && (
                <p className="text-sm text-gray-400 flex items-center">
                  <Building className="w-3 h-3 mr-1" />
                  {selectedRequestPopup.organizationName}
                </p>
              )}
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <p className="text-sm text-gray-300 line-clamp-2">{selectedRequestPopup.description}</p>
              <div className="flex items-center justify-between">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <Clock className="w-3 h-3 mr-1" />
                  {selectedRequestPopup.hoursOffered} hours
                </Badge>
                {selectedRequestPopup.location && (
                  <span className="text-xs text-gray-500 flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {selectedRequestPopup.location}
                  </span>
                )}
              </div>
              {onJoinRequest && !isJoined && (
                <Button 
                  size="sm" 
                  className="w-full bg-white text-black hover:bg-gray-200"
                  onClick={() => {
                    onJoinRequest(selectedRequestPopup);
                    setSelectedRequestPopup(null);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" /> Join This Request
                </Button>
              )}
              {isJoined && (
                <Badge className="w-full justify-center py-2 bg-green-500/20 text-green-400">
                  Already Joined
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })()}
      
      <div className="absolute bottom-4 right-4 flex space-x-2">
        <button
          className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white font-bold hover:bg-white/20 transition-colors border border-white/10"
          onClick={(e) => {
            e.stopPropagation();
            setPosition(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.5, 8) }));
          }}
        >
          +
        </button>
        <button
          className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white font-bold hover:bg-white/20 transition-colors border border-white/10"
          onClick={(e) => {
            e.stopPropagation();
            setPosition(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.5, 1) }));
          }}
        >
          −
        </button>
        <button
          className="px-4 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white text-sm hover:bg-white/20 transition-colors border border-white/10"
          onClick={(e) => {
            e.stopPropagation();
            setPosition({ coordinates: [0, 20], zoom: 1 });
          }}
        >
          Reset
        </button>
      </div>
      
      <div className="absolute top-4 left-4 flex flex-col space-y-2">
        <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
          <span className="text-xs text-white">Club Territories</span>
        </div>
        <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10">
          <MapPin className="w-3 h-3 text-white" fill="white" />
          <span className="text-xs text-white">Service Requests</span>
        </div>
      </div>
    </div>
  );
}

export function LocationPicker({ 
  value, 
  onChange 
}: { 
  value?: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relX = event.clientX - rect.left;
    const relY = event.clientY - rect.top;
    
    const lng = ((relX / rect.width) * 360 - 180 - position.coordinates[0]) / position.zoom + position.coordinates[0];
    const lat = 90 - ((relY / rect.height) * 180) - (position.coordinates[1] - 20);
    
    const clampedLat = Math.max(-85, Math.min(85, lat));
    const clampedLng = Math.max(-180, Math.min(180, lng));
    
    onChange(clampedLat, clampedLng);
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <p className="text-sm text-gray-400">Click on the map to select a location</p>
      <div className="relative overflow-hidden bg-gray-900 rounded-xl" style={{ height: '250px' }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 100,
            center: [0, 30]
          }}
          style={{ width: '100%', height: '100%' }}
          onClick={handleClick}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={(pos) => setPosition(pos)}
            minZoom={1}
            maxZoom={8}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none', cursor: 'crosshair' },
                      hover: { fill: '#334155', outline: 'none', cursor: 'crosshair' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>
            
            {value && (
              <Marker coordinates={[value.lng, value.lat]}>
                <circle r={10} fill="white" fillOpacity={0.3} className="animate-ping" />
                <circle r={6} fill="white" stroke="white" strokeWidth={2} />
              </Marker>
            )}
          </ZoomableGroup>
        </ComposableMap>
      </div>
      {value && (
        <p className="text-sm text-gray-500">
          Selected: {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
        </p>
      )}
    </div>
  );
}
