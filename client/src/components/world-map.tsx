import { useRef, useState, useCallback } from 'react';
import Map, { Marker, NavigationControl, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Club, ServiceRequest } from '@/lib/firebase';
import { MapPin, Clock, Building, Plus, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

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
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedRequestPopup, setSelectedRequestPopup] = useState<ServiceRequest | null>(null);
  const [hoveredClubId, setHoveredClubId] = useState<string | null>(null);
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 1.5
  });

  const calculateTerritoryRadius = (club: Club) => {
    const approved = parseFloat(String(club.totalApprovedHours || "0"));
    const bonus = parseFloat(String(club.bonusHours || "0"));
    const decayed = parseFloat(String(club.decayedHours || "0"));
    const totalHours = Math.max(0, approved + bonus - decayed);
    return Math.max(20, Math.sqrt(totalHours) * 8);
  };

  const handleMapClick = useCallback((e: any) => {
    if (!interactive || !onLocationSelect) return;
    const { lngLat } = e;
    onLocationSelect(lngLat.lat, lngLat.lng);
  }, [interactive, onLocationSelect]);

  const handleMarkerClick = (request: ServiceRequest, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRequestPopup(selectedRequestPopup?.id === request.id ? null : request);
  };

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden bg-black rounded-xl"
      style={{ height }}
    >
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        cursor={interactive && onLocationSelect ? 'crosshair' : 'grab'}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        
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
          const isHovered = hoveredClubId === club.id;
          
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
              >
                <div 
                  className="absolute rounded-full animate-pulse"
                  style={{ 
                    width: radius * 3, 
                    height: radius * 3,
                    background: `radial-gradient(circle, ${club.color}60 0%, ${club.color}20 70%, transparent 100%)`,
                    animationDuration: '3s'
                  }}
                />
                <div 
                  className="absolute rounded-full"
                  style={{ 
                    width: radius, 
                    height: radius,
                    backgroundColor: `${club.color}66`,
                    border: `2px solid ${club.color}`,
                    boxShadow: `0 0 20px ${club.color}80`
                  }}
                />
                <div 
                  className="relative flex items-center justify-center rounded-full"
                  style={{ 
                    width: 28, 
                    height: 28,
                    backgroundColor: club.color,
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                  }}
                >
                  <Users className="w-3.5 h-3.5 text-white" />
                </div>
                
                {isHovered && (
                  <div 
                    className="absolute left-10 top-1/2 -translate-y-1/2 bg-black/95 rounded-lg px-3 py-2 whitespace-nowrap z-50 border border-white/20"
                    style={{ minWidth: 120 }}
                  >
                    <p className="text-white text-sm font-semibold truncate max-w-32">
                      {club.name}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {totalHours.toFixed(1)} hours
                    </p>
                  </div>
                )}
              </div>
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
              longitude={lng} 
              latitude={lat}
              anchor="bottom"
            >
              <div 
                className="cursor-pointer transform hover:scale-110 transition-transform"
                onClick={(e) => handleMarkerClick(request, e)}
              >
                <MapPin 
                  className="w-8 h-8 drop-shadow-lg" 
                  fill={isJoined ? '#22c55e' : '#ffffff'} 
                  color={isJoined ? '#16a34a' : '#000000'}
                  strokeWidth={1.5}
                />
              </div>
            </Marker>
          );
        })}
        
        {selectedLocation && (
          <Marker 
            longitude={selectedLocation.lng} 
            latitude={selectedLocation.lat}
            anchor="center"
          >
            <div className="relative">
              <div className="absolute inset-0 w-8 h-8 -translate-x-1/2 -translate-y-1/2 bg-white/30 rounded-full animate-ping" />
              <div className="w-5 h-5 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full border-2 border-white shadow-lg" />
            </div>
          </Marker>
        )}
      </Map>

      {selectedRequestPopup && (() => {
        const isJoined = joinedRequestIds.includes(selectedRequestPopup.id);
        
        return (
          <Card 
            className="absolute top-4 left-4 w-80 shadow-2xl z-50 bg-black/95 border-white/20 text-white backdrop-blur-xl"
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
      
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <div className="flex items-center space-x-2 bg-black/70 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
          <span className="text-xs text-white">Club Territories</span>
        </div>
        <div className="flex items-center space-x-2 bg-black/70 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10">
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
  const [viewState, setViewState] = useState({
    longitude: value?.lng || 0,
    latitude: value?.lat || 20,
    zoom: 1
  });

  const handleMapClick = useCallback((e: any) => {
    const { lngLat } = e;
    onChange(lngLat.lat, lngLat.lng);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <div 
        className="relative overflow-hidden bg-black rounded-xl" 
        style={{ height: '180px' }}
      >
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          onClick={handleMapClick}
          mapStyle={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
          attributionControl={false}
          cursor="crosshair"
        >
          {value && (
            <Marker 
              longitude={value.lng} 
              latitude={value.lat}
              anchor="center"
            >
              <div className="relative">
                <div className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 bg-white/40 rounded-full animate-ping" />
                <div className="w-4 h-4 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full border-2 border-white shadow-lg" />
              </div>
            </Marker>
          )}
        </Map>
      </div>
      {value && (
        <p className="text-sm text-gray-500">
          Selected: {value.lat.toFixed(2)}, {value.lng.toFixed(2)}
        </p>
      )}
    </div>
  );
}
