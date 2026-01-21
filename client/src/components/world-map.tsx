import { useRef, useEffect, useState, type WheelEvent, type MouseEvent, type SyntheticEvent } from 'react';
import worldMapImage from '@assets/world_map_gray.png';
import { Club, ServiceRequest } from '@/lib/firebase';
import { MapPin, Clock, Building, Plus, X } from 'lucide-react';
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
}

export function WorldMap({ 
  clubs = [], 
  serviceRequests = [],
  selectedLocation, 
  onLocationSelect, 
  onJoinRequest,
  joinedRequestIds = [],
  height = '400px',
  interactive = true 
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [selectedRequestPopup, setSelectedRequestPopup] = useState<ServiceRequest | null>(null);

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
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!interactive || !onLocationSelect || isDragging || !containerRef.current) return;
    
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

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden bg-gray-100 rounded-lg cursor-grab active:cursor-grabbing"
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
          style={{ filter: 'grayscale(100%)' }}
          draggable={false}
          onLoad={handleImageLoad}
        />
        
        {imageSize.width > 0 && clubs.map(club => {
          if (!club.latitude || !club.longitude) return null;
          const lat = parseFloat(String(club.latitude));
          const lng = parseFloat(String(club.longitude));
          if (isNaN(lat) || isNaN(lng)) return null;
          
          const { x, y } = latLngToPixel(lat, lng);
          const approved = parseFloat(String(club.totalApprovedHours || "0"));
          const bonus = parseFloat(String(club.bonusHours || "0"));
          const decayed = parseFloat(String(club.decayedHours || "0"));
          const totalHours = Math.max(0, approved + bonus - decayed);
          const radius = Math.max(15, Math.sqrt(totalHours) * 3);
          
          return (
            <div
              key={club.id}
              className="absolute rounded-full border-2 border-black"
              style={{
                left: x - radius,
                top: y - radius,
                width: radius * 2,
                height: radius * 2,
                backgroundColor: club.color || '#000',
                opacity: 0.6,
              }}
              title={`${club.name}: ${totalHours.toFixed(1)} hours`}
            />
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
              className="absolute cursor-pointer group"
              style={{ left: x - 12, top: y - 24 }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRequestPopup(selectedRequestPopup?.id === request.id ? null : request);
              }}
            >
              <MapPin 
                className={`w-6 h-6 ${isJoined ? 'text-green-600' : 'text-gray-800'} drop-shadow-md hover:scale-110 transition-transform`}
                fill={isJoined ? '#22c55e' : '#374151'}
              />
            </div>
          );
        })}
        
        {selectedLocation && imageSize.width > 0 && (() => {
          const { x, y } = latLngToPixel(selectedLocation.lat, selectedLocation.lng);
          return (
            <div
              className="absolute w-6 h-6 -ml-3 -mt-3 bg-black rounded-full border-2 border-white shadow-lg"
              style={{ left: x, top: y }}
            />
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
            className="absolute w-72 shadow-xl z-50 bg-white"
            style={{ 
              left: Math.min(Math.max(popupX + 20, 10), containerRef.current ? containerRef.current.offsetWidth - 300 : 200),
              top: Math.min(Math.max(popupY - 60, 10), containerRef.current ? containerRef.current.offsetHeight - 200 : 100),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="pb-2 relative">
              <button
                className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded"
                onClick={() => setSelectedRequestPopup(null)}
              >
                <X className="w-4 h-4" />
              </button>
              <CardTitle className="text-base pr-6">{selectedRequestPopup.title}</CardTitle>
              {selectedRequestPopup.organizationName && (
                <p className="text-xs text-gray-500 flex items-center">
                  <Building className="w-3 h-3 mr-1" />
                  {selectedRequestPopup.organizationName}
                </p>
              )}
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <p className="text-sm text-gray-600 line-clamp-2">{selectedRequestPopup.description}</p>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Clock className="w-3 h-3 mr-1" />
                  {selectedRequestPopup.hoursOffered} hours
                </Badge>
                <span className="text-xs text-gray-500 flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {selectedRequestPopup.location}
                </span>
              </div>
              {onJoinRequest && !isJoined && (
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    onJoinRequest(selectedRequestPopup);
                    setSelectedRequestPopup(null);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" /> Join This Request
                </Button>
              )}
              {isJoined && (
                <Badge className="w-full justify-center py-2" variant="secondary">
                  Already Joined
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })()}
      
      <div className="absolute bottom-2 right-2 flex space-x-1">
        <button
          className="w-8 h-8 bg-white rounded shadow flex items-center justify-center text-lg font-bold hover:bg-gray-100"
          onClick={(e) => {
            e.stopPropagation();
            setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 5) }));
          }}
        >
          +
        </button>
        <button
          className="w-8 h-8 bg-white rounded shadow flex items-center justify-center text-lg font-bold hover:bg-gray-100"
          onClick={(e) => {
            e.stopPropagation();
            setTransform(prev => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.5) }));
          }}
        >
          −
        </button>
        <button
          className="w-8 h-8 bg-white rounded shadow flex items-center justify-center text-xs hover:bg-gray-100"
          onClick={(e) => {
            e.stopPropagation();
            setTransform({ x: 0, y: 0, scale: 1 });
          }}
        >
          Reset
        </button>
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
      <p className="text-sm text-gray-500">Click on the map to select a location</p>
      <WorldMap
        selectedLocation={value}
        onLocationSelect={onChange}
        height="250px"
        interactive={true}
      />
      {value && (
        <p className="text-sm text-gray-600">
          Selected: {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
        </p>
      )}
    </div>
  );
}
