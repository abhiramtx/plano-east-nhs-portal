import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Club, PartnershipAffiliation, Partnership, ClubEvent,
  getClubAffiliations, getPartnershipEvents, getAllPartnerships
} from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Building2, Calendar, ChevronDown, ChevronRight, Handshake,
  Globe, MapPin, Lock, QrCode, ScanLine, ArrowRight
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

function howToLog(eventType: string, partnershipName: string, eventName: string): { steps: string[] } {
  switch (eventType) {
    case 'none':
      return {
        steps: [
          'Go to Log Hours',
          'Select "A Partnership" as your source',
          `Choose "${partnershipName}"`,
          `Pick "${eventName}"`,
          'Fill in your hours and submit — the organization will review your submission',
        ],
      };
    case 'password':
      return {
        steps: [
          'Get the event password from the organizer',
          'Go to Log Hours and select "A Partnership"',
          `Choose "${partnershipName}" and pick "${eventName}"`,
          'Enter the event password when prompted',
          'Submit — your hours will be reviewed',
        ],
      };
    case 'scan_qr':
      return {
        steps: [
          'Open your Profile page and find your personal QR code',
          'Show it to the organizer when you arrive (check-in) and when you leave (check-out)',
          'Your time is recorded automatically — the organizer will grant hours to you directly',
          'No manual Log Hours submission needed for QR events',
        ],
      };
    case 'show_qr':
      return {
        steps: [
          'Find the QR code displayed at the event location',
          'Scan the check-in QR on arrival and the check-out QR when you leave',
          'Your attendance time is recorded automatically — the organizer grants hours',
          'No manual Log Hours submission needed for QR events',
        ],
      };
    default:
      return {
        steps: [
          'Go to Log Hours, select "A Partnership", choose the organization and event, then submit',
        ],
      };
  }
}

function EventCard({ event, partnershipName }: { event: ClubEvent; partnershipName: string }) {
  const [showHow, setShowHow] = useState(false);
  const Icon = EVENT_TYPE_ICONS[event.type] || Globe;
  const { steps } = howToLog(event.type, partnershipName, event.name);
  const isQR = event.type === 'scan_qr' || event.type === 'show_qr';

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            event.type === 'none' ? 'bg-green-50' :
            event.type === 'password' ? 'bg-yellow-50' :
            event.type === 'scan_qr' ? 'bg-blue-50' : 'bg-purple-50'
          }`}>
            <Icon className={`w-5 h-5 ${
              event.type === 'none' ? 'text-green-600' :
              event.type === 'password' ? 'text-yellow-600' :
              event.type === 'scan_qr' ? 'text-blue-600' : 'text-purple-600'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-semibold text-gray-900">{event.name}</h3>
              <Badge className={`text-xs font-medium ${EVENT_TYPE_COLORS[event.type] || 'bg-gray-100 text-gray-600'}`}>
                {EVENT_TYPE_LABELS[event.type] || event.type}
              </Badge>
            </div>
            {event.description && (
              <p className="text-sm text-gray-500 leading-relaxed">{event.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              {event.type === 'none' && 'Open event — no check-in required. Submit hours manually.'}
              {event.type === 'password' && 'Password required — the organizer will give you a code.'}
              {event.type === 'scan_qr' && 'QR check-in — show your Profile QR code at the event.'}
              {event.type === 'show_qr' && 'QR check-in — scan the code displayed at the event location.'}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100">
        <button
          onClick={() => setShowHow(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5" />
            How to log hours for this event
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHow ? 'rotate-180' : ''}`} />
        </button>
        {showHow && (
          <div className="px-5 pb-4 bg-blue-50 border-t border-blue-100">
            <ol className="mt-3 space-y-1.5">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-blue-800">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            {isQR && (
              <p className="mt-3 text-xs text-blue-600 italic">
                Your Profile QR code is under the Profile tab in the sidebar.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PartnershipCard({ partnership }: { partnership: Partnership }) {
  const [expanded, setExpanded] = useState(false);

  const { data: events = [], isLoading: eventsLoading } = useQuery<ClubEvent[]>({
    queryKey: ['firebase-partnership-events', partnership.id],
    queryFn: () => getPartnershipEvents(partnership.id),
    enabled: expanded,
    staleTime: 60000,
  });

  return (
    <Card className="border border-gray-200 overflow-hidden w-full">
      <button className="w-full text-left" onClick={() => setExpanded(prev => !prev)}>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-5">
            <div
              className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden border border-gray-100"
              style={{ backgroundColor: partnership.logoUrl ? undefined : (partnership.color || '#3B82F6') }}
            >
              {partnership.logoUrl
                ? <img src={partnership.logoUrl} alt={partnership.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-white opacity-70" />
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-lg font-semibold text-gray-900">{partnership.name}</h2>
                {partnership.orgType && (
                  <Badge className={`text-xs ${ORG_TYPE_COLORS[partnership.orgType] || 'bg-gray-100 text-gray-600'}`}>
                    {ORG_TYPE_LABELS[partnership.orgType] || partnership.orgType}
                  </Badge>
                )}
              </div>
              {partnership.description && (
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{partnership.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                {partnership.address && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{partnership.address}</span>
                )}
                {expanded && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {eventsLoading ? 'Loading...' : events.length > 0 ? `${events.length} event${events.length !== 1 ? 's' : ''}` : 'No events yet'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
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
            <p className="text-sm text-gray-400 text-center py-8">Loading events...</p>
          ) : events.length === 0 ? (
            <div className="text-center py-10">
              <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-600 font-medium">No events yet</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                This organization hasn't posted any events. You can still submit general hours to them via Log Hours → A Partnership.
              </p>
            </div>
          ) : (
            <div className="pt-5 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {events.length} Event{events.length !== 1 ? 's' : ''}
              </p>
              {events.map(event => (
                <EventCard key={event.id} event={event} partnershipName={partnership.name} />
              ))}
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
            <div className="space-y-4 w-full">
              <p className="text-sm text-gray-500">
                <strong className="text-gray-700">{affiliatedPartnerships.length}</strong> organization{affiliatedPartnerships.length !== 1 ? 's' : ''} affiliated with your club. Click any card to see their events.
              </p>
              {affiliatedPartnerships.map(({ partnership, affiliation }) => (
                <PartnershipCard
                  key={partnership.id}
                  partnership={partnership}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
