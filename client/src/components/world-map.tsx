import { useRef, useEffect, useState, type WheelEvent, type MouseEvent, type SyntheticEvent } from 'react';
import worldMapImage from '@assets/stock_images/simple_gray_world_ma_ce22fbf4.jpg';
import { Club } from '@/lib/firebase';

interface WorldMapProps {
  clubs?: Club[];
  selectedLocation?: { lat: number; lng: number } | null;
  onLocationSelect?: (lat: number, lng: number) => void;
  height?: string;
  interactive?: boolean;
}

export function WorldMap({ 
  clubs = [], 
  selectedLocation, 
  onLocationSelect, 
  height = '400px',
  interactive = true 
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

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
