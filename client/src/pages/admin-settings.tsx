import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Club, Partnership, PartnershipAffiliation, ClubEvent, EventAttendance, Membership,
  AdminSettings as AdminSettingsType,
  getAdminSettings, updateAdminSettings, updateClub, recalculateClubHours,
  getClubAffiliations, respondToAffiliation, removeAffiliation,
  getPartnershipEvents, getEventAttendance, getMemberships, grantPartnershipHoursAsPending,
} from "@/lib/firebase";
import type { HoursLog } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { AdminCustomFields } from "./admin-custom-fields";
import { AdminLogs } from "./admin-logs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Save, Settings, Eye, Clock, MapPin, Palette, Lock, FileText, BookOpen,
  CheckCircle, Upload, Image, Check, X, Handshake, Calendar, ChevronDown,
  ChevronRight, Users, Award, Globe, ScanLine, QrCode
} from "lucide-react";

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

const fmtTime = (d?: Date) => d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDuration = (m?: number) => {
  if (m == null) return '—';
  const h = Math.floor(m / 60); const mins = m % 60;
  return h > 0 ? `${h}h ${mins}m` : `${mins}m`;
};

function EventGrantCard({
  event, club, memberEmails, hoursLogs, partnershipName,
}: {
  event: ClubEvent; club: Club; memberEmails: Set<string>; hoursLogs: HoursLog[]; partnershipName: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [rowHours, setRowHours] = useState<Record<string, string>>({});
  const [globalHours, setGlobalHours] = useState('');
  const [selectedLogId, setSelectedLogId] = useState('');

  const isQR = event.type === 'scan_qr' || event.type === 'show_qr';
  const Icon = EVENT_TYPE_ICONS[event.type] || Globe;

  const { data: attendance = [], isLoading } = useQuery<EventAttendance[]>({
    queryKey: ['firebase-event-attendance', event.id],
    queryFn: () => getEventAttendance(event.id),
    enabled: expanded,
    refetchInterval: expanded ? 20000 : false,
  });

  const memberAttendance = attendance.filter(a => memberEmails.has(a.userEmail));

  const getHoursForRecord = (record: EventAttendance): number | null => {
    const override = rowHours[record.id];
    if (override) return parseFloat(override) || null;
    if (globalHours) return parseFloat(globalHours) || null;
    if (isQR && record.minutesAttended != null) return Math.round((record.minutesAttended / 60) * 100) / 100;
    return null;
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const grantMutation = useMutation({
    mutationFn: async () => {
      const targets = selectedRows.length > 0
        ? memberAttendance.filter(a => selectedRows.includes(a.id))
        : memberAttendance;
      if (targets.length === 0) throw new Error('No attendees selected');
      const logName = hoursLogs.find(l => String(l.id) === selectedLogId)?.name;
      for (const record of targets) {
        const hours = getHoursForRecord(record);
        if (!hours || hours <= 0) continue;
        await grantPartnershipHoursAsPending(
          event.id, event.name, [record], hours, [],
          club.id, selectedLogId || undefined, logName,
          event.partnershipId, partnershipName,
        );
      }
    },
    onSuccess: () => {
      toast({ title: "Hours submitted for review!", description: "They appear as Pending in your Volunteers tab." });
      qc.invalidateQueries({ queryKey: ['firebase-event-attendance', event.id] });
      setSelectedRows([]); setRowHours({}); setGlobalHours('');
    },
    onError: (e: any) => toast({ title: "Failed to submit", description: e.message, variant: "destructive" }),
  });

  const activeTargets = selectedRows.length > 0 ? selectedRows.length : memberAttendance.length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            event.type === 'none' ? 'bg-green-50' : event.type === 'password' ? 'bg-yellow-50' :
            event.type === 'scan_qr' ? 'bg-blue-50' : 'bg-purple-50'
          }`}>
            <Icon className={`w-4 h-4 ${
              event.type === 'none' ? 'text-green-600' : event.type === 'password' ? 'text-yellow-600' :
              event.type === 'scan_qr' ? 'text-blue-600' : 'text-purple-600'
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 text-sm">{event.name}</span>
              <Badge className={`text-xs ${EVENT_TYPE_COLORS[event.type] || 'bg-gray-100 text-gray-600'}`}>
                {EVENT_TYPE_LABELS[event.type] || event.type}
              </Badge>
            </div>
            {event.description && <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>}
          </div>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 p-4 space-y-4 bg-gray-50">
          {isLoading ? (
            <p className="text-sm text-gray-400 py-4 text-center">Loading attendance...</p>
          ) : memberAttendance.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No club members have checked in to this event yet.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 w-8">
                        <Checkbox
                          checked={selectedRows.length === memberAttendance.length && memberAttendance.length > 0}
                          onCheckedChange={(checked) => {
                            setSelectedRows(checked ? memberAttendance.map(a => a.id) : []);
                          }}
                        />
                      </th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Name</th>
                      {isQR && <>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Check-in</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Check-out</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Duration</th>
                      </>}
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberAttendance.map(record => {
                      const autoHours = isQR && record.minutesAttended != null
                        ? (Math.round((record.minutesAttended / 60) * 100) / 100).toString()
                        : '';
                      const alreadyGranted = record.grantStatus === 'granted';
                      return (
                        <tr key={record.id} className={`border-b border-gray-100 ${alreadyGranted ? 'opacity-50' : ''}`}>
                          <td className="py-2 px-2">
                            <Checkbox
                              checked={selectedRows.includes(record.id)}
                              onCheckedChange={() => toggleRow(record.id)}
                              disabled={alreadyGranted}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <div className="font-medium text-gray-900">{record.userName}</div>
                            <div className="text-xs text-gray-400">{record.userEmail}</div>
                            {alreadyGranted && <Badge className="text-xs bg-gray-100 text-gray-500 mt-0.5">Already granted</Badge>}
                          </td>
                          {isQR && <>
                            <td className="py-2 px-2 text-xs text-gray-600">{fmtTime(record.checkInTime)}</td>
                            <td className="py-2 px-2 text-xs text-gray-600">{fmtTime(record.checkOutTime)}</td>
                            <td className="py-2 px-2 text-xs text-gray-600">{fmtDuration(record.minutesAttended)}</td>
                          </>}
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder={autoHours || globalHours || '—'}
                              value={rowHours[record.id] || ''}
                              onChange={e => setRowHours(prev => ({ ...prev, [record.id]: e.target.value }))}
                              className="w-20 h-7 text-xs"
                              disabled={alreadyGranted}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Default hours (all rows)</Label>
                  <Input
                    type="number" min="0" step="0.5"
                    placeholder={isQR ? 'Auto from check-in/out' : 'e.g. 2'}
                    value={globalHours}
                    onChange={e => setGlobalHours(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <p className="text-xs text-gray-400">Per-row values override this.</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Log period (optional)</Label>
                  <Select value={selectedLogId} onValueChange={setSelectedLogId}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="No log" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">No log</SelectItem>
                      {hoursLogs.filter((l: any) => l.isOpen !== false).map((l: any) => (
                        <SelectItem key={String(l.id)} value={String(l.id)}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-gray-500">
                  {activeTargets} attendee{activeTargets !== 1 ? 's' : ''} will receive a <strong>pending submission</strong> in your Volunteers tab.
                </p>
                <Button
                  size="sm"
                  className="bg-black hover:bg-gray-800 text-white"
                  onClick={() => grantMutation.mutate()}
                  disabled={grantMutation.isPending}
                >
                  <Award className="w-3.5 h-3.5 mr-1.5" />
                  {grantMutation.isPending ? 'Submitting...' : `Submit ${activeTargets > 1 ? `${activeTargets} ` : ''}for Review`}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AffiliationGrantPanel({
  affiliation, club, memberEmails, hoursLogs, user, onRemove, removeDisabled,
}: {
  affiliation: PartnershipAffiliation; club: Club; memberEmails: Set<string>;
  hoursLogs: HoursLog[]; user: User; onRemove: () => void; removeDisabled: boolean;
}) {
  const [showGrant, setShowGrant] = useState(false);

  const { data: events = [], isLoading } = useQuery<ClubEvent[]>({
    queryKey: ['firebase-partnership-events', affiliation.partnershipId],
    queryFn: () => getPartnershipEvents(affiliation.partnershipId),
    enabled: showGrant,
    staleTime: 60000,
  });

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-green-50 border-b border-green-100">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm">{affiliation.partnershipName}</span>
          <Badge className="bg-green-100 text-green-700 text-xs">Affiliated</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-gray-300"
            onClick={() => setShowGrant(v => !v)}
          >
            <Calendar className="w-3 h-3 mr-1" />
            {showGrant ? 'Hide' : 'Grant Hours'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs"
            onClick={onRemove}
            disabled={removeDisabled}
          >
            Remove
          </Button>
        </div>
      </div>

      {showGrant && (
        <div className="p-4 space-y-3 bg-white">
          <div className="pb-1">
            <p className="text-sm font-medium text-gray-700">Grant Hours for Partnership Events</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Hours you grant here will appear as <strong>Pending Partnership</strong> submissions in your Volunteers tab, where they go through your normal approval process.
            </p>
          </div>
          {isLoading ? (
            <p className="text-sm text-gray-400 py-4 text-center">Loading events...</p>
          ) : events.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">This partnership hasn't created any events yet.</p>
            </div>
          ) : (
            events.map(event => (
              <EventGrantCard
                key={event.id}
                event={event}
                club={club}
                memberEmails={memberEmails}
                hoursLogs={hoursLogs}
                partnershipName={affiliation.partnershipName}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface AdminSettingsProps {
  user: User;
  club: Club;
}

export function AdminSettings({ user, club }: AdminSettingsProps) {
  const { toast } = useToast();
  const [innerPage, setInnerPage] = useState<'club' | 'members' | 'logs' | 'approvals' | 'territory' | 'partnerships'>('club');

  const [clubName, setClubName] = useState(club.name || '');
  const [clubDescription, setClubDescription] = useState(club.description || '');
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [clubPassword, setClubPassword] = useState('');
  const [clubColor, setClubColor] = useState(club.color || '#000000');
  const [clubLogoUrl, setClubLogoUrl] = useState(club.logoUrl || '');
  const [clubLatitude, setClubLatitude] = useState(club.latitude?.toString() || '');
  const [clubLongitude, setClubLongitude] = useState(club.longitude?.toString() || '');
  const clubLogoRef = useRef<HTMLInputElement>(null);

  const [showStudentId, setShowStudentId] = useState(true);
  const [showGradeLevel, setShowGradeLevel] = useState(true);
  const [showGpa, setShowGpa] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [requireProofImage, setRequireProofImage] = useState(false);
  const [approvalsRequired, setApprovalsRequired] = useState('1');
  const [rejectionsRequired, setRejectionsRequired] = useState('1');
  const [decayRate, setDecayRate] = useState('1');
  const [maxDecay, setMaxDecay] = useState('10');
  const [bonusMultiplier, setBonusMultiplier] = useState('1.5');

  const { data: settings, isLoading } = useQuery<AdminSettingsType | null>({
    queryKey: ['firebase-admin-settings'],
    queryFn: getAdminSettings,
  });

  useEffect(() => {
    if (settings) {
      setShowStudentId(settings.showStudentId ?? true);
      setShowGradeLevel(settings.showGradeLevel ?? true);
      setShowGpa(settings.showGpa ?? true);
      setShowPhone(settings.showPhone ?? true);
      setRequireProofImage(settings.requireProofImage ?? false);
      setApprovalsRequired(settings.approvalsRequired?.toString() ?? '1');
      setRejectionsRequired(settings.rejectionsRequired?.toString() ?? '1');
      setDecayRate(settings.decayRate?.toString() ?? '1');
      setMaxDecay(settings.maxDecay?.toString() ?? '10');
      setBonusMultiplier(settings.bonusMultiplier?.toString() ?? '1.5');
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<AdminSettingsType>) => {
      await updateAdminSettings(updates, user.email || '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-admin-settings'] });
      toast({ title: "Settings updated", description: "Your changes have been saved." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    }
  });

  const updateClubMutation = useMutation({
    mutationFn: (updates: Partial<Club>) => updateClub(club.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-club', club.id] });
      queryClient.invalidateQueries({ queryKey: ['firebase-clubs'] });
      toast({ title: "Club updated", description: "Changes saved successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update club", description: error.message, variant: "destructive" });
    }
  });

  const syncHoursMutation = useMutation({
    mutationFn: () => recalculateClubHours(club.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-clubs'] });
      toast({ title: "Hours synced", description: "Club total approved hours recalculated from submissions." });
    },
    onError: (error: any) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    }
  });

  const { data: clubAffiliations = [] } = useQuery<PartnershipAffiliation[]>({
    queryKey: ['firebase-club-affiliations', club.id],
    queryFn: () => getClubAffiliations(club.id),
    enabled: innerPage === 'partnerships',
  });

  const { data: memberships = [] } = useQuery<Membership[]>({
    queryKey: ['firebase-memberships', club.id],
    queryFn: () => getMemberships(club.id),
    enabled: innerPage === 'partnerships',
  });

  const { data: hoursLogs = [] } = useQuery<HoursLog[]>({
    queryKey: ['/api/hours-logs', club.id],
    enabled: innerPage === 'partnerships',
  });

  const memberEmails = new Set(memberships.map(m => m.userEmail));

  const respondMutation = useMutation({
    mutationFn: ({ id, partnershipId, status }: { id: string; partnershipId: string; status: 'approved' | 'rejected' }) =>
      respondToAffiliation(id, partnershipId, club.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-club-affiliations', club.id] });
      toast({ title: "Response saved" });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
  });

  const removeAffiliationMutation = useMutation({
    mutationFn: ({ id, partnershipId }: { id: string; partnershipId: string }) =>
      removeAffiliation(id, partnershipId, club.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-club-affiliations', club.id] });
      toast({ title: "Affiliation removed" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
    }
  });

  const handleClubLogoUpload = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setClubLogoUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveVisibility = () => {
    updateSettingsMutation.mutate({
      showStudentId,
      showGradeLevel,
      showGpa,
      showPhone,
      requireProofImage,
    });
  };

  const handleSaveDecay = () => {
    updateSettingsMutation.mutate({
      decayRate: parseFloat(decayRate) || 1,
      maxDecay: parseFloat(maxDecay) || 10,
      bonusMultiplier: parseFloat(bonusMultiplier) || 1.5,
    });
  };

  return (
    <div className="flex-1 flex bg-white min-h-0">
      <div className="w-56 border-r border-gray-200 flex-shrink-0 bg-white flex flex-col">
        <div className="flex-shrink-0 px-4 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </h3>
          <p className="text-xs text-gray-500 mt-1">Configure your club</p>
        </div>
        <div className="flex-1 p-3 space-y-1 overflow-auto">
          {([
            { id: 'club', icon: Palette, label: 'Club', desc: 'Name, color, location' },
            { id: 'members', icon: Eye, label: 'Members', desc: 'Profile fields, custom forms' },
            { id: 'logs', icon: BookOpen, label: 'Logs', desc: 'Hours tracking periods' },
            { id: 'approvals', icon: CheckCircle, label: 'Approvals', desc: 'Hours approval workflow' },
            { id: 'territory', icon: MapPin, label: 'Territory', desc: 'Map decay & bonuses' },
            { id: 'partnerships', icon: FileText, label: 'Partnerships', desc: 'External org settings' },
          ] as const).map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              onClick={() => setInnerPage(id)}
              className={`w-full px-3 py-2.5 rounded-lg text-left transition-colors ${innerPage === id ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium leading-tight">{label}</div>
                  <div className="text-xs text-gray-500 leading-tight">{desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white">
        <div className="p-6 lg:p-8">
        {innerPage === 'logs' && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-900">Hours Logs</h2>
              <p className="text-sm text-gray-500 mt-1">Logs are named time periods (e.g., "Fall Semester", "Spring 2026") with an hours requirement. Volunteers see open logs in their Hours tab and submit entries to specific logs. You can view per-log progress in the Volunteers tab.</p>
            </div>
            <AdminLogs user={user} club={club} />
          </div>
        )}

        {innerPage === 'approvals' && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-900">Approvals</h2>
              <p className="text-sm text-gray-500 mt-1">Configure how the hours approval workflow works. You can require multiple admins to approve or reject before a submission is finalized — great for clubs with multiple admins who want checks and balances.</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Multi-Admin Approval
                </CardTitle>
                <CardDescription>
                  How many unique admins must approve (or reject) a submission before it's finalized. Set to 1 for immediate single-admin decisions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Approvals Required</Label>
                  <Input
                    type="number"
                    min="1"
                    value={approvalsRequired}
                    onChange={(e) => setApprovalsRequired(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Number of unique admins that must approve before hours are finalized</p>
                </div>
                <div className="space-y-2">
                  <Label>Rejections Required</Label>
                  <Input
                    type="number"
                    min="1"
                    value={rejectionsRequired}
                    onChange={(e) => setRejectionsRequired(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Number of unique admins that must reject before hours are rejected</p>
                </div>
                <Button
                  onClick={() => {
                    updateSettingsMutation.mutate({
                      approvalsRequired: Math.max(1, parseInt(approvalsRequired) || 1),
                      rejectionsRequired: Math.max(1, parseInt(rejectionsRequired) || 1),
                    });
                  }}
                  disabled={updateSettingsMutation.isPending}
                  className="w-full bg-black hover:bg-gray-800 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Approval Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {innerPage === 'club' && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-900">Club</h2>
              <p className="text-sm text-gray-500 mt-1">Your club's public identity on the platform — name, color, and home base location for territory calculations.</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>Name, description, and color shown to all users on the map and leaderboard.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Club Logo</Label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={clubLogoRef}
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleClubLogoUpload(e.target.files[0])}
                  />
                  <div className="flex items-center gap-3">
                    <div
                      className="w-16 h-16 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: clubLogoUrl ? undefined : clubColor }}
                      onClick={() => clubLogoRef.current?.click()}
                    >
                      {clubLogoUrl
                        ? <img src={clubLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                        : <Image className="w-7 h-7 text-white opacity-60" />
                      }
                    </div>
                    <div className="flex-1">
                      <Button type="button" variant="outline" size="sm" onClick={() => clubLogoRef.current?.click()}>
                        <Upload className="w-3 h-3 mr-1" /> {clubLogoUrl ? 'Change Logo' : 'Upload Logo'}
                      </Button>
                      {clubLogoUrl && (
                        <Button type="button" variant="ghost" size="sm" className="ml-2 text-red-500 h-8" onClick={() => setClubLogoUrl('')}>
                          Remove
                        </Button>
                      )}
                      <p className="text-xs text-gray-400 mt-1">Optional. Max 2MB. Square images work best.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clubName">Club Name</Label>
                  <Input id="clubName" value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="Club name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clubDescription">Description</Label>
                  <Input id="clubDescription" value={clubDescription} onChange={(e) => setClubDescription(e.target.value)} placeholder="Short description of your club" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clubColor">Club Color</Label>
                  <div className="flex items-center gap-2">
                    <Input id="clubColor" type="color" value={clubColor} onChange={(e) => setClubColor(e.target.value)} className="w-12 h-10" />
                    <Input type="text" value={clubColor} onChange={(e) => setClubColor(e.target.value)} placeholder="#000000" className="flex-1" />
                  </div>
                  <p className="text-xs text-gray-500">Used for your territory circles on the world map</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateClubMutation.mutate({ name: clubName, description: clubDescription, color: clubColor, logoUrl: clubLogoUrl || undefined })}
                    disabled={updateClubMutation.isPending}
                    className="flex-1 bg-black hover:bg-gray-800 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />Save Club Info
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => syncHoursMutation.mutate()}
                    disabled={syncHoursMutation.isPending}
                    title="Recalculate total approved hours from all submissions"
                    className="border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    {syncHoursMutation.isPending ? "Syncing..." : "Sync Hours"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Home Base Location
                </CardTitle>
                <CardDescription>The default coordinates used for territory circles when a volunteer doesn't specify a location for their hours.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clubLatitude">Latitude</Label>
                    <Input id="clubLatitude" value={clubLatitude} onChange={(e) => setClubLatitude(e.target.value)} placeholder="e.g. 30.2672" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clubLongitude">Longitude</Label>
                    <Input id="clubLongitude" value={clubLongitude} onChange={(e) => setClubLongitude(e.target.value)} placeholder="e.g. -97.7431" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">Tip: Find coordinates by right-clicking any location on Google Maps.</p>
                <Button
                  onClick={() => updateClubMutation.mutate({
                    latitude: parseFloat(clubLatitude) || undefined,
                    longitude: parseFloat(clubLongitude) || undefined
                  })}
                  disabled={updateClubMutation.isPending}
                  className="w-full bg-black hover:bg-gray-800 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />Save Location
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Club Password
                </CardTitle>
                <CardDescription>Optional password that volunteers must enter to join your club. Leave blank to allow open joining.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Password-protect joining</p>
                    <p className="text-xs text-gray-500">Only volunteers who know the password can join</p>
                  </div>
                  <Switch checked={showPasswordField} onCheckedChange={setShowPasswordField} />
                </div>
                {showPasswordField && (
                  <div className="space-y-2">
                    <Label htmlFor="clubPassword">New Password</Label>
                    <Input id="clubPassword" type="password" value={clubPassword} onChange={(e) => setClubPassword(e.target.value)} placeholder="Leave empty to keep current password" />
                    <Button onClick={() => toast({ title: "Info", description: "Password update coming soon" })} className="w-full bg-black hover:bg-gray-800 text-white">
                      <Save className="w-4 h-4 mr-2" />Save Password
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {innerPage === 'members' && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-900">Members</h2>
              <p className="text-sm text-gray-500 mt-1">Control what information volunteers provide in their profiles, which fields are visible on reports, and add custom fields for your club's specific needs.</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Profile Field Visibility
                </CardTitle>
                <CardDescription>Toggle which standard profile fields are shown to admins in volunteer records and exported reports.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Student ID', desc: 'Show student ID numbers on profiles', checked: showStudentId, set: setShowStudentId },
                  { label: 'Grade Level', desc: 'Display grade level information', checked: showGradeLevel, set: setShowGradeLevel },
                  { label: 'GPA', desc: 'Show GPA on volunteer profiles', checked: showGpa, set: setShowGpa },
                  { label: 'Phone Number', desc: 'Display phone numbers', checked: showPhone, set: setShowPhone },
                ].map(({ label, desc, checked, set }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{label}</Label>
                      <p className="text-sm text-gray-500">{desc}</p>
                    </div>
                    <Switch checked={checked} onCheckedChange={set} />
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="space-y-0.5">
                    <Label>Require Proof Image</Label>
                    <p className="text-sm text-gray-500">Volunteers must attach a photo when submitting hours</p>
                  </div>
                  <Switch checked={requireProofImage} onCheckedChange={setRequireProofImage} />
                </div>
                <Button onClick={handleSaveVisibility} disabled={updateSettingsMutation.isPending} className="w-full bg-black hover:bg-gray-800 text-white">
                  <Save className="w-4 h-4 mr-2" />Save Visibility Settings
                </Button>
              </CardContent>
            </Card>
            <AdminCustomFields user={user} club={club} />
          </div>
        )}

        {innerPage === 'territory' && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-900">Territory</h2>
              <p className="text-sm text-gray-500 mt-1">Territory circles on the world map grow as your club logs hours at a location. Configure how quickly inactive territories shrink (decay) and whether high-need areas earn bonus credit.</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Decay Settings
                </CardTitle>
                <CardDescription>Territories gradually shrink when no hours are logged at that location. This keeps the map competitive — clubs must stay active to maintain their territory.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Decay Rate (miles per week)</Label>
                  <Input type="number" step="0.5" value={decayRate} onChange={(e) => setDecayRate(e.target.value)} />
                  <p className="text-xs text-gray-500">How many miles a circle's radius shrinks each week of inactivity. Default: 0.25</p>
                </div>
                <div className="space-y-2">
                  <Label>Maximum Decay Floor</Label>
                  <Input type="number" value={maxDecay} onChange={(e) => setMaxDecay(e.target.value)} />
                  <p className="text-xs text-gray-500">A circle cannot decay below this % of its peak radius (e.g., 10 = 10% minimum). Prevents circles from disappearing entirely.</p>
                </div>
                <div className="space-y-2">
                  <Label>High-Need Area Bonus Multiplier</Label>
                  <Input type="number" step="0.1" value={bonusMultiplier} onChange={(e) => setBonusMultiplier(e.target.value)} />
                  <p className="text-xs text-gray-500">Hours logged in tagged high-need areas count as this multiple (e.g., 1.5 = 50% bonus). Encourages service where it matters most.</p>
                </div>
                <Button onClick={handleSaveDecay} disabled={updateSettingsMutation.isPending} className="w-full bg-black hover:bg-gray-800 text-white">
                  <Save className="w-4 h-4 mr-2" />Save Territory Settings
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Territory Formula</CardTitle>
                <CardDescription>How circle size is calculated</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-700">
                  <p><span className="font-mono text-xs bg-gray-200 px-1 rounded">radius = 4 + 16 × min(1, log₁₀(hours+1) / log₁₀(1000))</span></p>
                  <p className="text-xs text-gray-500 mt-2">Circles range from 4 miles (new) to 20 miles (1,000+ hours) at each unique location. When two circles from the same club overlap, they blend together like a metaball effect.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {innerPage === 'partnerships' && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-900">Partnerships</h2>
              <p className="text-sm text-gray-500 mt-1">External organizations can request to affiliate with your club. When affiliated, your club members can log volunteer hours with those organizations. Review and respond to incoming requests here.</p>
            </div>

            {/* Pending requests */}
            {clubAffiliations.filter(a => a.status === 'pending').length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <Handshake className="w-5 h-5" />
                    Pending Requests ({clubAffiliations.filter(a => a.status === 'pending').length})
                  </CardTitle>
                  <CardDescription>These partnerships have requested to affiliate with your club.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {clubAffiliations.filter(a => a.status === 'pending').map(aff => (
                    <div key={aff.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{aff.partnershipName}</p>
                        <p className="text-xs text-gray-500">Requested by {aff.requestedBy}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                          onClick={() => respondMutation.mutate({ id: aff.id, partnershipId: aff.partnershipId, status: 'approved' })}
                          disabled={respondMutation.isPending}
                        >
                          <Check className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 h-8 text-xs"
                          onClick={() => respondMutation.mutate({ id: aff.id, partnershipId: aff.partnershipId, status: 'rejected' })}
                          disabled={respondMutation.isPending}
                        >
                          <X className="w-3 h-3 mr-1" /> Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Approved affiliations + grant UI */}
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Handshake className="w-4 h-4" />
                  Affiliated Partnerships ({clubAffiliations.filter(a => a.status === 'approved').length})
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Organizations your club is affiliated with. Use <strong>Grant Hours</strong> to submit pending hours on behalf of your members for any partnership event.
                </p>
              </div>
              {clubAffiliations.filter(a => a.status === 'approved').length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center border border-gray-200">
                  No approved affiliations yet. Partnerships can request to affiliate with your club.
                </div>
              ) : (
                clubAffiliations.filter(a => a.status === 'approved').map(aff => (
                  <AffiliationGrantPanel
                    key={aff.id}
                    affiliation={aff}
                    club={club}
                    memberEmails={memberEmails}
                    hoursLogs={hoursLogs}
                    user={user}
                    onRemove={() => removeAffiliationMutation.mutate({ id: aff.id, partnershipId: aff.partnershipId })}
                    removeDisabled={removeAffiliationMutation.isPending}
                  />
                ))
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
