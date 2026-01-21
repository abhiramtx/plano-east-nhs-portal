import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe, ZoomIn, ZoomOut, Home, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Club, HighNeedArea, ServiceRequest } from "@shared/schema";

interface Territory {
  id: number;
  name: string;
  color: string;
  x: number;
  y: number;
  radius: number;
  totalHours: number;
  rawHours: number;
  bonusHours: number;
  decayedHours: number;
}

interface TerritoryMapProps {
  currentClubId?: number;
}

export default function TerritoryMap({ currentClubId }: TerritoryMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredTerritory, setHoveredTerritory] = useState<Territory | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("all");

  const { data: territories = [] } = useQuery<Territory[]>({
    queryKey: ['/api/territories'],
    refetchInterval: 30000,
  });

  const { data: highNeedAreas = [] } = useQuery<HighNeedArea[]>({
    queryKey: ['/api/high-need-areas'],
  });

  const { data: serviceRequests = [] } = useQuery<ServiceRequest[]>({
    queryKey: ['/api/service-requests'],
  });

  const { data: leaderboardClubs = [] } = useQuery<Club[]>({
    queryKey: ['/api/leaderboard/clubs', leaderboardPeriod],
  });

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    const gridSize = 50 * zoom;
    const offsetX = pan.x % gridSize;
    const offsetY = pan.y % gridSize;
    
    for (let x = offsetX; x < rect.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    for (let y = offsetY; y < rect.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    highNeedAreas.forEach(area => {
      const x = (parseFloat(area.locationLat) * 5 + 400) * zoom + pan.x;
      const y = (parseFloat(area.locationLng) * 5 + 300) * zoom + pan.y;
      const radius = 30 * zoom;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ef4444';
      ctx.font = `${10 * zoom}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(area.category, x, y + 4);
    });

    serviceRequests.filter(r => r.status === 'open').forEach(request => {
      const x = (parseFloat(request.locationLat) * 5 + 400) * zoom + pan.x;
      const y = (parseFloat(request.locationLng) * 5 + 300) * zoom + pan.y;
      
      ctx.beginPath();
      ctx.arc(x, y, 8 * zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#1e40af';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, y - 20 * zoom);
      ctx.lineTo(x - 6 * zoom, y - 8 * zoom);
      ctx.lineTo(x + 6 * zoom, y - 8 * zoom);
      ctx.closePath();
      ctx.fill();
    });

    const sortedTerritories = [...territories].sort((a, b) => b.radius - a.radius);
    
    sortedTerritories.forEach(territory => {
      const x = territory.x * zoom + pan.x;
      const y = territory.y * zoom + pan.y;
      const radius = Math.max(20, territory.radius) * zoom;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, territory.color + 'cc');
      gradient.addColorStop(0.7, territory.color + '66');
      gradient.addColorStop(1, territory.color + '00');

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, radius * 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = territory.color;
      ctx.lineWidth = territory.id === currentClubId ? 4 : 2;
      ctx.stroke();

      ctx.fillStyle = '#111827';
      ctx.font = `bold ${Math.max(10, 12 * zoom)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const maxWidth = radius * 1.5;
      const name = territory.name.length > 15 ? territory.name.slice(0, 12) + '...' : territory.name;
      ctx.fillText(name, x, y - 8 * zoom);
      
      ctx.font = `${Math.max(9, 10 * zoom)}px sans-serif`;
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`${territory.totalHours.toFixed(1)} hrs`, x, y + 10 * zoom);
    });
  }, [territories, highNeedAreas, serviceRequests, zoom, pan, currentClubId]);

  useEffect(() => {
    drawMap();
  }, [drawMap]);

  useEffect(() => {
    const handleResize = () => drawMap();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawMap]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else {
      let found: Territory | null = null;
      territories.forEach(territory => {
        const tx = territory.x * zoom + pan.x;
        const ty = territory.y * zoom + pan.y;
        const radius = Math.max(20, territory.radius) * zoom;
        const distance = Math.sqrt((x - tx) ** 2 + (y - ty) ** 2);
        if (distance < radius) {
          found = territory;
        }
      });
      setHoveredTerritory(found);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 3));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="flex h-full bg-gray-50">
      <div className="flex-1 flex flex-col">
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Globe className="w-6 h-6 text-gray-600" />
            <h1 className="text-xl font-semibold text-gray-900">Territory Map</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(z * 1.2, 3))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(z * 0.8, 0.5))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={resetView}>
              <Home className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden cursor-grab"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />

          {hoveredTerritory && (
            <div 
              className="absolute bg-white rounded-lg shadow-lg border border-gray-200 p-4 pointer-events-none z-10"
              style={{
                left: mousePos.x + 20,
                top: mousePos.y + 20,
                minWidth: 200,
              }}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: hoveredTerritory.color }}
                />
                <h3 className="font-semibold text-gray-900">{hoveredTerritory.name}</h3>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Hours:</span>
                  <span className="font-medium">{hoveredTerritory.totalHours.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Raw Hours:</span>
                  <span>{hoveredTerritory.rawHours.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bonus Hours:</span>
                  <span className="text-green-600">+{hoveredTerritory.bonusHours.toFixed(1)}</span>
                </div>
                {hoveredTerritory.decayedHours > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Decayed:</span>
                    <span className="text-red-600">-{hoveredTerritory.decayedHours.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md border border-gray-200 p-3">
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-blue-300"></div>
                <span>Club Territory</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full border-2 border-red-500 border-dashed bg-red-100"></div>
                <span>High Need Area</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
                <span>Service Request</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Club Leaderboard</h2>
        </div>
        
        <Tabs value={leaderboardPeriod} onValueChange={setLeaderboardPeriod} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="daily" className="text-xs">Daily</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All Time</TabsTrigger>
          </TabsList>
          
          <TabsContent value={leaderboardPeriod} className="flex-1 overflow-auto p-4">
            <div className="space-y-2">
              {leaderboardClubs.map((club, index) => (
                <div 
                  key={club.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg ${
                    club.id === currentClubId ? 'bg-gray-100 border-2 border-gray-300' : 'bg-gray-50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-yellow-400 text-yellow-900' :
                    index === 1 ? 'bg-gray-300 text-gray-700' :
                    index === 2 ? 'bg-orange-400 text-orange-900' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: club.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{club.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {parseFloat(club.totalApprovedHours).toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500">hours</p>
                  </div>
                </div>
              ))}
              {leaderboardClubs.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Info className="w-8 h-8 mx-auto mb-2" />
                  <p>No clubs yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
