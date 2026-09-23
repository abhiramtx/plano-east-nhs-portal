import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MapGlComponent, { NavigationControl, MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Clock, MapPin, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Club,
  getClubSubmissions,
  getMemberships,
  getVolunteerTerritories,
  HoursSubmission,
  Membership,
} from "@/lib/firebase";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
type VolunteerCircle = { volunteerName: string; latitude: number; longitude: number; radiusKm: number; hours: number };

function circlePolygon(longitude: number, latitude: number, radiusKm: number): number[][] {
  return Array.from({ length: 65 }, (_, index) => {
    const angle = (index / 64) * Math.PI * 2;
    const latRadius = radiusKm / 111.32;
    const lngRadius = radiusKm / (111.32 * Math.cos((latitude * Math.PI) / 180));
    return [longitude + Math.sin(angle) * lngRadius, latitude + Math.cos(angle) * latRadius];
  });
}

export default function VolunteerMap({ club }: { club: Club }) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { data: circles = [], isLoading } = useQuery<VolunteerCircle[]>({
    queryKey: ["single-club-volunteer-territories"],
    queryFn: getVolunteerTerritories,
    staleTime: 60_000,
  });
  const { data: members = [] } = useQuery<Membership[]>({
    queryKey: ["single-club-members"],
    queryFn: () => getMemberships(club.id),
    staleTime: 60_000,
  });
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<HoursSubmission[]>({
    queryKey: ["single-club-submissions"],
    queryFn: () => getClubSubmissions(club.id),
    staleTime: 30_000,
  });
  const names = useMemo(() => {
    const result = new Map<string, string>();
    members.forEach(member => result.set(member.userEmail.toLowerCase(), member.userName || member.userEmail));
    return result;
  }, [members]);
  const leaderboardRows = useMemo(() => {
    const totals = new Map<string, number>();
    submissions.forEach((submission) => {
      if (submission.status === "approved") {
        const email = submission.userEmail.toLowerCase();
        totals.set(email, (totals.get(email) || 0) + Number(submission.hours || 0));
      }
    });

    return members
      .map((member) => ({
        ...member,
        hours: totals.get(member.userEmail.toLowerCase()) || 0,
      }))
      .sort((a, b) => b.hours - a.hours || a.userName.localeCompare(b.userName));
  }, [members, submissions]);
  const geoJson = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: circles.map((circle, index) => ({
      type: "Feature" as const,
      properties: {
        color: ["#63a89a", "#d7a85a", "#d4785f", "#6d8fb0"][index % 4],
        name: names.get(circle.volunteerName.toLowerCase()) || circle.volunteerName,
        hours: circle.hours,
      },
      geometry: { type: "Polygon" as const, coordinates: [circlePolygon(circle.longitude, circle.latitude, circle.radiusKm)] },
    })),
  }), [circles, names]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const source = mapRef.current.getSource("volunteer-locations") as any;
    source?.setData(geoJson);
  }, [geoJson, mapLoaded]);

  return (
    <div className="flex h-[calc(100dvh-0px)] flex-col overflow-hidden bg-background">
      <div className="shrink-0 border-b border-border p-4 paper-grid sm:p-6">
        <ClubPageHeader club={club} title="Volunteer Map" description="See where Plano East NHS volunteers are serving." icon={MapPin} />
      </div>
      <div className="relative min-h-0 flex-1">
        {isLoading && <div className="absolute left-4 top-4 z-10 rounded-lg bg-background/90 px-3 py-2 text-sm shadow">Loading volunteer locations…</div>}
        <MapGlComponent
          ref={mapRef}
          initialViewState={{ longitude: -96.7, latitude: 33.0, zoom: 9 }}
          mapStyle={MAP_STYLE}
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
          onLoad={(event) => {
            const map = event.target;
            setMapLoaded(true);
            map.addSource("volunteer-locations", { type: "geojson", data: geoJson });
            map.addLayer({ id: "volunteer-fill", type: "fill", source: "volunteer-locations", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.3 } });
            map.addLayer({ id: "volunteer-outline", type: "line", source: "volunteer-locations", paint: { "line-color": ["get", "color"], "line-width": 2 } });
          }}
        >
          <NavigationControl position="bottom-right" showCompass={false} />
        </MapGlComponent>
      </div>
    </div>
  );
}