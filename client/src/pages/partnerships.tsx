import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Club, PartnershipAffiliation, Partnership, ClubEvent,
  getClubAffiliations, getPartnershipEvents, getAllPartnerships
} from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2, Calendar, ChevronDown, ChevronRight, Clock, Handshake,
  Globe, MapPin, Users, Lock, QrCode, ScanLine
} from "lucide-react";

interface PartnershipsPageProps {
  club: Club;
}

const ORG_TYPE_LABELS: Record<string, string> = {
  business: 'Business', nonprofit: 'Nonprofit', school: 'School',
  government: 'Government', other: 'Other',
};
const ORG_TYPE_COLORS: Record<string, string> = {
  business: 'bg-blue-100 text-blue-700', nonprofit: 'bg-green-100 text-green-700',
  school: 'bg-yellow-100 text-yellow-700', government: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-600',
};
const EVENT_TYPE_LABELS: Record<string, string> = {
  none: 'Open', password: 'Password', scan_qr: 'Scan QR', show_qr: 'Show QR',
};
const EVENT_TYPE_COLORS: Record<string, string> = {
  none: 'bg-green-100 text-green-700', password: 'bg-yellow-100 text-yellow-700',
  scan_qr: 'bg-blue-100 text-blue-700', show_qr: 'bg-purple-100 text-purple-700',
};
const EVENT_TYPE_ICONS: Record<string, any> = {
  none: Globe, password: Lock, scan_qr: ScanLine, show_qr: QrCode,
};

function PartnershipCard({ partnership, affiliation }: { partnership: Partnership; affiliation: PartnershipAffiliation }) {
  const [expanded, setExpanded] = useState(false);

  const { data: events = [], isLoading: eventsLoading } = useQuery<ClubEvent[]>({
    queryKey: ['firebase-partnership-events', partnership.id],
    queryFn: () => getPartnershipEvents(partnership.id),
    enabled: expanded,
    staleTime: 60000,
  });

  const openEvents = events.filter(e => e.type === 'none');
  const qrEvents = events.filter(e => e.type === 'scan_qr' || e.type === 'show_qr');
  const passwordEvents = events.filter(e => e.type === 'password');

  return (
    <Card className="border border-gray-200 overflow-hidden">
      <button
        className="w-full text-left"
        onClick={() => setExpanded(prev => !prev)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden border border-gray-100"
              style={{ backgroundColor: partnership.logoUrl ? undefined : (partnership.color || '#3B82F6') }}
            >
              {partnership.logoUrl
                ? <img src={partnership.logoUrl} alt={partnership.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white opacity-70" />
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{partnership.name}</CardTitle>
                {partnership.orgType && (
                  <Badge className={`text-xs ${ORG_TYPE_COLORS[partnership.orgType] || 'bg-gray-100 text-gray-600'}`}>
                    {ORG_TYPE_LABELS[partnership.orgType] || partnership.orgType}
                  </Badge>
                )}
              </div>
              {partnership.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{partnership.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                {partnership.address && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{partnership.address}</span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {events.length > 0 ? `${events.length} event${events.length !== 1 ? 's' : ''}` : 'No events yet'}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 ml-2">
              {expanded
                ? <ChevronDown className="w-5 h-5 text-gray-400" />
                : <ChevronRight className="w-5 h-5 text-gray-400" />
              }
            </div>
          </div>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="pt-0 border-t border-gray-100">
          {eventsLoading ? (
            <p className="text-sm text-gray-400 text-center py-6">Loading events...</p>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No events yet</p>
              <p className="text-xs text-gray-400 mt-1">This organization hasn't posted any events. You can still submit hours directly.</p>
            </div>
          ) : (
            <div className="pt-4 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Events</p>
              <div className="space-y-2">
                {events.map(event => {
                  const Icon = EVENT_TYPE_ICONS[event.type] || Globe;
                  return (
                    <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900">{event.name}</p>
                          <Badge className={`text-xs ${EVENT_TYPE_COLORS[event.type] || 'bg-gray-100 text-gray-600'}`}>
                            {EVENT_TYPE_LABELS[event.type] || event.type}
                          </Badge>
                        </div>
                        {event.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1.5">
                          {event.type === 'none' && 'Open event — submit hours freely.'}
                          {event.type === 'password' && 'Password required — ask the organizer for the check-in code.'}
                          {event.type === 'scan_qr' && 'Scan-in event — show your Profile QR code to the organizer.'}
                          {event.type === 'show_qr' && 'QR sign-in — scan the code displayed at the event.'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                <p className="font-medium mb-0.5">How to log hours with {partnership.name}</p>
                <p className="text-blue-600">Go to <strong>Log Hours</strong>, select <strong>A Partnership</strong>, choose <strong>{partnership.name}</strong>, then pick the event you attended. Your submission will be reviewed by their team.</p>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function PartnershipsPage({ club }: PartnershipsPageProps) {
  const { data: affiliations = [], isLoading: affiliationsLoading } = useQuery<PartnershipAffiliation[]>({
    queryKey: ['firebase-club-affiliations', club.id],
    queryFn: () => getClubAffiliations(club.id),
  });

  const { data: allPartnerships = [], isLoading: partnershipsLoading } = useQuery<Partnership[]>({
    queryKey: ['firebase-all-partnerships'],
    queryFn: getAllPartnerships,
  });

  const approvedAffiliations = affiliations.filter(a => a.status === 'approved');

  const affiliatedPartnerships = approvedAffiliations
    .map(aff => {
      const p = allPartnerships.find(p => p.id === aff.partnershipId);
      return p ? { partnership: p, affiliation: aff } : null;
    })
    .filter(Boolean) as { partnership: Partnership; affiliation: PartnershipAffiliation }[];

  const isLoading = affiliationsLoading || partnershipsLoading;

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
              <Handshake className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Affiliated Partners</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Organizations affiliated with {club.name}. You can volunteer and log hours with any of these.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-20 text-gray-400">Loading partners...</div>
          ) : affiliatedPartnerships.length === 0 ? (
            <div className="text-center py-20 max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Handshake className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700">No affiliated partners yet</h3>
              <p className="text-sm text-gray-500 mt-2">
                Your club hasn't affiliated with any external organizations yet. When affiliations are approved, they'll appear here with their events and opportunities.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl">
              <p className="text-sm text-gray-500">
                <strong className="text-gray-700">{affiliatedPartnerships.length}</strong> organization{affiliatedPartnerships.length !== 1 ? 's' : ''} affiliated with your club. Click any card to see their events.
              </p>
              {affiliatedPartnerships.map(({ partnership, affiliation }) => (
                <PartnershipCard
                  key={partnership.id}
                  partnership={partnership}
                  affiliation={affiliation}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
