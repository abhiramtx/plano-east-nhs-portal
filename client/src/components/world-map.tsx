import { useRef, useEffect, useState, type WheelEvent, type MouseEvent, type SyntheticEvent } from 'react';
import worldMapImage from '@assets/world_map_gray.png';
import { Club, ServiceRequest } from '@/lib/firebase';
import { MapPin, Clock, Building, Plus, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [selectedRequestPopup, setSelectedRequestPopup] = useState<ServiceRequest | null>(null);
  const [justDragged, setJustDragged] = useState(false);
  const [hoveredClub, setHoveredClub] = useState<Club | null>(null);

  const latLngToPixel = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * imageSize.width;
    const y = ((90 - lat) / 180) * imageSize.height;
    return { x, y };
  };

  const pixelToLatLng = (x: number, y: number) => {
    const lng = (x / imageSize.width) * 360 - 180;
    const lat = 90 - (y / imageSize.height) * 180;
    return { lat, lng };
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(transform.scale * delta, 0.5), 5);
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setJustDragged(true);
      setTimeout(() => setJustDragged(false), 100);
    }
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!interactive || !onLocationSelect || justDragged || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - transform.x) / transform.scale;
    const clickY = (e.clientY - rect.top - transform.y) / transform.scale;
    
    const { lat, lng } = pixelToLatLng(clickX, clickY);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      onLocationSelect(lat, lng);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight });
  };

  const calculateTerritoryRadius = (club: Club) => {
    const approved = parseFloat(String(club.totalApprovedHours || "0"));
    const bonus = parseFloat(String(club.bonusHours || "0"));
    const decayed = parseFloat(String(club.decayedHours || "0"));
    const totalHours = Math.max(0, approved + bonus - decayed);
    return Math.max(20, Math.sqrt(totalHours) * 4);
  };

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden bg-gray-900 rounded-xl cursor-grab active:cursor-grabbing"
      style={{ height }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      <div
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
        className="relative"
      >
        <img 
          src={worldMapImage} 
          alt="World Map" 
          className="max-w-none select-none"
          style={{ filter: 'grayscale(100%) brightness(0.3)' }}
          draggable={false}
          onLoad={handleImageLoad}
        />
        
        {showTerritories && imageSize.width > 0 && clubs.map(club => {
          if (!club.latitude || !club.longitude) return null;
          const lat = parseFloat(String(club.latitude));
          const lng = parseFloat(String(club.longitude));
          if (isNaN(lat) || isNaN(lng)) return null;
          
          const { x, y } = latLngToPixel(lat, lng);
          const radius = calculateTerritoryRadius(club);
          const approved = parseFloat(String(club.totalApprovedHours || "0"));
          const bonus = parseFloat(String(club.bonusHours || "0"));
          const decayed = parseFloat(String(club.decayedHours || "0"));
          const totalHours = Math.max(0, approved + bonus - decayed);
          
          return (
            <div key={club.id}>
              <div
                className="absolute rounded-full animate-pulse"
                style={{
                  left: x - radius * 1.5,
                  top: y - radius * 1.5,
                  width: radius * 3,
                  height: radius * 3,
                  background: `radial-gradient(circle, ${club.color}40 0%, ${club.color}00 70%)`,
                  animationDuration: '3s',
                }}
              />
              
              <div
                className="absolute rounded-full"
                style={{
                  left: x - radius,
                  top: y - radius,
                  width: radius * 2,
                  height: radius * 2,
                  background: `radial-gradient(circle, ${club.color}60 0%, ${club.color}20 70%)`,
                  boxShadow: `0 0 ${radius}px ${club.color}80, 0 0 ${radius * 2}px ${club.color}40`,
                }}
              />
              
              <div
                className="absolute cursor-pointer transition-all duration-300 hover:scale-125 z-10"
                style={{
                  left: x - 12,
                  top: y - 12,
                  width: 24,
                  height: 24,
                }}
                onMouseEnter={() => setHoveredClub(club)}
                onMouseLeave={() => setHoveredClub(null)}
              >
                <div 
                  className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                  style={{ backgroundColor: club.color }}
                >
                  <Users className="w-3 h-3 text-white" />
                </div>
              </div>
              
              {hoveredClub?.id === club.id && (
                <div
                  className="absolute bg-black/90 text-white px-3 py-2 rounded-lg text-sm z-20 whitespace-nowrap pointer-events-none"
                  style={{
                    left: x + 15,
                    top: y - 15,
                  }}
                >
                  <p className="font-semibold">{club.name}</p>
                  <p className="text-gray-400 text-xs">{totalHours.toFixed(1)} hours</p>
                </div>
              )}
            </div>
          );
        })}
        
        {imageSize.width > 0 && serviceRequests.map(request => {
          if (!request.latitude || !request.longitude) return null;
          const lat = parseFloat(String(request.latitude));
          const lng = parseFloat(String(request.longitude));
          if (isNaN(lat) || isNaN(lng)) return null;
          
          const { x, y } = latLngToPixel(lat, lng);
          const isJoined = joinedRequestIds.includes(request.id);
          
          return (
            <div
              key={request.id}
              className="absolute cursor-pointer group z-20"
              style={{ left: x - 12, top: y - 28 }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRequestPopup(selectedRequestPopup?.id === request.id ? null : request);
              }}
            >
              <div className="relative">
                <div className="absolute -inset-2 bg-white/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                <MapPin 
                  className={`w-7 h-7 drop-shadow-lg transition-all duration-200 group-hover:scale-125 ${
                    isJoined ? 'text-green-400' : 'text-white'
                  }`}
                  fill={isJoined ? '#22c55e' : '#ffffff'}
                  strokeWidth={1.5}
                />
              </div>
            </div>
          );
        })}
        
        {selectedLocation && imageSize.width > 0 && (() => {
          const { x, y } = latLngToPixel(selectedLocation.lat, selectedLocation.lng);
          return (
            <div
              className="absolute w-8 h-8 -ml-4 -mt-4"
              style={{ left: x, top: y }}
            >
              <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-50" />
              <div className="absolute inset-2 bg-white rounded-full shadow-lg" />
            </div>
          );
        })()}
      </div>

      {selectedRequestPopup && imageSize.width > 0 && (() => {
        const lat = parseFloat(String(selectedRequestPopup.latitude));
        const lng = parseFloat(String(selectedRequestPopup.longitude));
        if (isNaN(lat) || isNaN(lng)) return null;
        
        const { x, y } = latLngToPixel(lat, lng);
        const popupX = x * transform.scale + transform.x;
        const popupY = y * transform.scale + transform.y;
        const isJoined = joinedRequestIds.includes(selectedRequestPopup.id);
        
        return (
          <Card 
            className="absolute w-80 shadow-2xl z-50 bg-gray-900/95 border-white/20 text-white backdrop-blur-xl"
            style={{ 
              left: Math.min(Math.max(popupX + 20, 10), containerRef.current ? containerRef.current.offsetWidth - 340 : 200),
              top: Math.min(Math.max(popupY - 80, 10), containerRef.current ? containerRef.current.offsetHeight - 220 : 100),
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
            setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 5) }));
          }}
        >
          +
        </button>
        <button
          className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white font-bold hover:bg-white/20 transition-colors border border-white/10"
          onClick={(e) => {
            e.stopPropagation();
            setTransform(prev => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.5) }));
          }}
        >
          −
        </button>
        <button
          className="px-4 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white text-sm hover:bg-white/20 transition-colors border border-white/10"
          onClick={(e) => {
            e.stopPropagation();
            setTransform({ x: 0, y: 0, scale: 1 });
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
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-400">Click on the map to select a location</p>
      <WorldMap
        selectedLocation={value}
        onLocationSelect={onChange}
        height="250px"
        interactive={true}
        showTerritories={false}
      />
      {value && (
        <p className="text-sm text-gray-500">
          Selected: {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
        </p>
      )}
    </div>
  );
}
