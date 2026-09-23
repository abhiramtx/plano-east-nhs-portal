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
    <div className="flex min-h-[calc(100dvh-0px)] flex-col overflow-hidden bg-background">
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_350px]">
        <section className="relative flex min-h-[58dvh] min-w-0 flex-col overflow-hidden border-b border-border lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 bg-gradient-to-b from-[#121212] via-[#121212]/90 to-transparent p-4 pb-12 sm:p-6 sm:pb-16">
            <div className="pointer-events-auto min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-[#63a89a]" />
                Community
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Volunteer Map</h1>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">See where {club.name} volunteers are serving.</p>
            </div>
            <div className="hidden shrink-0 rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur sm:block">
              {circles.length} active {circles.length === 1 ? "area" : "areas"}
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            {isLoading && <div className="absolute left-4 top-4 z-10 rounded-lg border border-border bg-background/90 px-3 py-2 text-sm shadow">Loading volunteer locations…</div>}
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
        </section>

        <aside className="min-h-0 overflow-y-auto bg-background p-4 sm:p-6">
          <div className="border-b border-border pb-5">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 text-[#d7a85a]" />
              Community
            </div>
            <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground">Leaderboard</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ranked by approved service hours.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-border py-4">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-[#63a89a]" />
                <span className="text-[11px]">Approved hours</span>
              </div>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {leaderboardRows.reduce((sum, row) => sum + row.hours, 0).toFixed(1)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-[#d4785f]" />
                <span className="text-[11px]">Volunteers</span>
              </div>
              <p className="mt-1 text-lg font-semibold text-foreground">{members.length}</p>
            </div>
          </div>

          <div className="py-4">
            {members.length > 0 && (
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {club.name} volunteers
              </p>
            )}
            {submissionsLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading leaderboard…</p>
            ) : leaderboardRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
                <Trophy className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No volunteer hours have been approved yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboardRows.map((row, index) => (
                  <div key={row.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${index === 0 ? "bg-[#d7a85a] text-[#121212]" : index === 1 ? "bg-[#d9cdbd] text-[#17324d]" : index === 2 ? "bg-[#d4785f] text-white" : "bg-muted text-muted-foreground"}`}>
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{row.userName || row.userEmail}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.personalEmailAddress || row.userEmail}</p>
                    </div>
                    {index === 0 && <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">Top</Badge>}
                    <p className="shrink-0 text-right text-sm font-semibold text-foreground">
                      {row.hours.toFixed(1)} <span className="text-[10px] font-normal text-muted-foreground">hrs</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}