import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Club } from '@shared/schema';

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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const selectedMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance.current);

    if (interactive && onLocationSelect) {
      mapInstance.current.on('click', (e: L.LeafletMouseEvent) => {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [interactive, onLocationSelect]);

  useEffect(() => {
    if (!mapInstance.current) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    clubs.forEach(club => {
      if (club.latitude && club.longitude) {
        const lat = parseFloat(club.latitude);
        const lng = parseFloat(club.longitude);
        const totalHours = parseFloat(club.totalApprovedHours) + parseFloat(club.bonusHours) - parseFloat(club.decayedHours);
        const radius = Math.max(20, Math.sqrt(totalHours) * 5);
        
        const circle = L.circleMarker([lat, lng], {
          radius: radius,
          fillColor: club.color,
          color: club.color,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.4,
        }).addTo(mapInstance.current!);

        circle.bindPopup(`
          <div style="text-align: center;">
            <strong style="font-size: 14px;">${club.name}</strong><br/>
            <span style="color: #666;">${totalHours.toFixed(1)} hours</span>
          </div>
        `);

        markersRef.current.push(circle);
      }
    });
  }, [clubs]);

  useEffect(() => {
    if (!mapInstance.current) return;

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }

    if (selectedLocation) {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="width: 24px; height: 24px; background: black; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      selectedMarkerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], { icon })
        .addTo(mapInstance.current);
    }
  }, [selectedLocation]);

  return (
    <div 
      ref={mapRef} 
      style={{ height, width: '100%', borderRadius: '8px', zIndex: 1 }}
    />
  );
}

interface LocationPickerProps {
  value?: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number) => void;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [showMap, setShowMap] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
        >
          {showMap ? 'Hide Map' : 'Select Location on Map'}
        </button>
        {value && (
          <span className="text-sm text-gray-600">
            {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
          </span>
        )}
      </div>
      {showMap && (
        <WorldMap
          selectedLocation={value}
          onLocationSelect={onChange}
          height="250px"
          interactive={true}
        />
      )}
    </div>
  );
}
