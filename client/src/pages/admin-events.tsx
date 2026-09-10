import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Club, ClubEvent, EventAttendance, EventConditional, Affiliation,
  getClubEvents, createEvent, updateEvent, deleteEvent,
  getEventAttendance, removeEventAttendance, checkInUser, checkOutUser, grantEventHours,
  approveEventSubmissionsForAttendees,
  getApprovedSuperClubs, recalculateClubHours, getUserProfile, getProfileDisplayName,
  UserProfile
} from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Trash2, Save, Calendar, Users, Clock, QrCode, Award, ChevronRight,
  Camera, ScanLine, RefreshCw, CheckCircle2, XCircle, AlertCircle, Edit2, X, Printer,
  Download, Mail, Phone, GraduationCap, Hash
} from "lucide-react";
import QRCode from "react-qr-code";
import { Html5Qrcode } from "html5-qrcode";
import type { HoursLog } from "@shared/schema";
import { AdminStudentProfileDialog } from "@/components/admin-student-profile-dialog";

interface AdminEventsProps {
  user: User;
  club: Club;
}

type EventTab = 'information' | 'qrcode' | 'grant';
type QRSubTab = 'checkin' | 'checkout';

const EVENT_TYPE_LABELS: Record<string, string> = {
  none: 'Open',
  password: 'Password Protected',
  scan_qr: 'Scan QR Code',
  show_qr: 'Show QR Code',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  none: 'bg-chart-3/15 text-chart-3 border-chart-3/30',
  password: 'bg-chart-1/15 text-chart-1 border-chart-1/30',
  scan_qr: 'bg-primary/15 text-primary border-primary/30',
  show_qr: 'bg-chart-5/15 text-chart-5 border-chart-5/30',
};

const formatTime = (date?: Date) => {
  if (!date) return '—';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const formatMinutes = (minutes?: number) => {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

const normalizeEmail = (email: string) => email.replace(/,/g, '.').trim().toLowerCase();

const escapeCsvValue = (value: unknown) => {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

function QRScanner({ onScan, onError }: { onScan: (text: string) => void; onError?: (err: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current && started) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [started]);

  const startScanner = async () => {
    if (!containerRef.current) return;
    const id = `qr-scanner-${Math.random().toString(36).slice(2)}`;
    containerRef.current.id = id;
    try {
      const scanner = new Html5Qrcode(id);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          onScan(text);
        },
        () => {}
      );
      setStarted(true);
      setError(null);
    } catch (err: any) {
      const msg = err?.message || "Camera access failed";
      setError(msg);
      onError?.(msg);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setStarted(false);
  };

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden border border-border bg-card min-h-[380px] flex items-center justify-center"
      >
        {!started && (
          <div className="text-center p-4">
            <Camera className="w-10 h-10 text-muted-foreground/60 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Camera not started</p>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
      <div className="flex gap-2 justify-center">
        {!started ? (
          <Button onClick={startScanner} className="bg-primary hover:bg-primary/85 text-primary-foreground">
            <Camera className="w-4 h-4 mr-2" />
            Start Camera
          </Button>
        ) : (
          <Button variant="outline" onClick={stopScanner}>
            <X className="w-4 h-4 mr-2" />
            Stop Camera
          </Button>
        )}
      </div>
    </div>
  );
}

export function AdminEvents({ user, club }: AdminEventsProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EventTab>('information');
  const [qrSubTab, setQrSubTab] = useState<QRSubTab>('checkin');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  // Create event form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<ClubEvent['type']>('none');
  const [newPassword, setNewPassword] = useState('');

  // Edit event form
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editType, setEditType] = useState<ClubEvent['type']>('none');
  const [editPassword, setEditPassword] = useState('');
  const [editLogId, setEditLogId] = useState('');
  const [editConditionals, setEditConditionals] = useState<EventConditional[]>([]);
  const [editIsOpen, setEditIsOpen] = useState(true);

  // Grant hours
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [defaultHours, setDefaultHours] = useState('');
  const [overrideHours, setOverrideHours] = useState<Record<string, string>>({});
  const [alsoGrantToSuper, setAlsoGrantToSuper] = useState(false);
  const [attendeeToRemove, setAttendeeToRemove] = useState<EventAttendance | null>(null);
  const [selectedAttendee, setSelectedAttendee] = useState<EventAttendance | null>(null);

  const { data: events = [], isLoading } = useQuery<ClubEvent[]>({
    queryKey: ['firebase-club-events', club.id],
    queryFn: () => getClubEvents(club.id),
  });

  // Derive selectedEvent from live events list so QR tab always reflects latest saved data
  const selectedEvent = events.find(e => e.id === selectedEventId) ?? null;

  const { data: hoursLogs = [] } = useQuery<HoursLog[]>({
    queryKey: ['/api/hours-logs', club.id],
    enabled: !!club.id,
  });

  // Super-club affiliation for forwarding event hours
  const { data: approvedSupers = [] } = useQuery<Affiliation[]>({
    queryKey: ['affiliations-super-approved', club.id],
    queryFn: () => getApprovedSuperClubs(club.id),
    enabled: !!club.id,
  });
  const superClub = approvedSupers[0];

  const { data: superHoursLogs = [] } = useQuery<HoursLog[]>({
    queryKey: ['/api/hours-logs', superClub?.superClubId],
    enabled: !!superClub,
  });
  const subClubHoursLog = superHoursLogs.find((l: any) => l.isSystem || l.name === 'Sub-Club Hours');

  // Exclude system logs from event log assignment — they receive hours only via federation
  const selectableLogs = hoursLogs.filter(l => !(l as any).isSystem);

  const { data: attendance = [], refetch: refetchAttendance } = useQuery<EventAttendance[]>({
    queryKey: ['firebase-event-attendance', selectedEvent?.id],
    queryFn: () => getEventAttendance(selectedEvent!.id),
    enabled: !!selectedEvent?.id,
    refetchInterval: activeTab === 'qrcode' ? 3000 : false,
  });

  const attendeeEmailKey = attendance
    .map(attendee => normalizeEmail(attendee.userEmail))
    .filter(Boolean)
    .sort()
    .join('|');

  const { data: attendeeProfiles = {} } = useQuery<Record<string, UserProfile | null>>({
    queryKey: ['event-attendee-profiles', selectedEvent?.id, attendeeEmailKey],
    queryFn: async () => {
      const emails = Array.from(new Set(
        attendance.map(attendee => attendee.userEmail).filter(Boolean).map(normalizeEmail)
      ));
      const profiles = await Promise.all(
        emails.map(async email => [email, await getUserProfile(email)] as const)
      );
      return Object.fromEntries(profiles);
    },
    enabled: !!selectedEvent?.id && attendance.length > 0,
    staleTime: 60000,
  });

  const getAttendeeProfile = (attendee: EventAttendance) =>
    attendeeProfiles[normalizeEmail(attendee.userEmail)] || null;

  const getAttendeeDisplayName = (attendee: EventAttendance) => {
    const profile = getAttendeeProfile(attendee);
    return getProfileDisplayName(profile, attendee.userName || attendee.userEmail);
  };

  const downloadAttendanceCsv = () => {
    if (!selectedEvent || attendance.length === 0) return;

    const headers = [
      'Name',
      'Google Email',
      'Personal Email',
      'Phone Number',
      'Student ID',
      'Grade Level',
      'Event',
      'Check-in',
      'Check-out',
      'Minutes Attended',
      'Hours Granted',
      'Grant Status',
    ];
    const rows = attendance.map(attendee => {
      const profile = getAttendeeProfile(attendee);
      return [
        getAttendeeDisplayName(attendee),
        attendee.userEmail,
        profile?.personalEmailAddress || '',
        profile?.cellPhoneNumber || profile?.phoneNumber || '',
        profile?.studentId || '',
        profile?.gradeLevel || '',
        selectedEvent.name,
        attendee.checkInTime?.toISOString() || '',
        attendee.checkOutTime?.toISOString() || '',
        attendee.minutesAttended ?? '',
        attendee.hoursGranted ?? '',
        attendee.grantStatus,
      ];
    });

    const csv = [headers, ...rows]
      .map(row => row.map(escapeCsvValue).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedEvent.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'event'}-attendance.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast({ title: "Attendance CSV downloaded", description: `${attendance.length} participant${attendance.length === 1 ? '' : 's'} exported.` });
  };

  useEffect(() => {
    if (selectedEvent) {
      setEditName(selectedEvent.name);
      setEditDesc(selectedEvent.description || '');
      setEditType(selectedEvent.type);
      setEditPassword(selectedEvent.password || '');
      setEditLogId(selectedEvent.logId || '');
      setEditConditionals(selectedEvent.conditionals || []);
      setEditIsOpen(selectedEvent.isOpen !== false);
      setOverrideHours({});
    }
  }, [selectedEvent?.id]);

  // Pre-fill override hours from submitted hours for password events
  useEffect(() => {
    if (selectedEvent?.type !== 'password') return;
    if (attendance.length === 0) return;
    setOverrideHours(prev => {
      const fills: Record<string, string> = {};
      for (const a of attendance) {
        if (a.minutesAttended != null && !prev[a.id]) {
          fills[a.id] = String(a.minutesAttended / 60);
        }
      }
      return Object.keys(fills).length > 0 ? { ...fills, ...prev } : prev;
    });
  }, [attendance, selectedEvent?.type]);

  const createMutation = useMutation({
    mutationFn: () => createEvent({
      clubId: club.id,
      name: newName.trim(),
      description: newDesc.trim() || undefined,
      type: newType,
      password: newType === 'password' ? newPassword : undefined,
      conditionals: [],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-club-events', club.id] });
      setShowCreateDialog(false);
      setNewName(''); setNewDesc(''); setNewType('none'); setNewPassword('');
      toast({ title: "Event created" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create event", description: error?.message || "An error occurred. Check your permissions.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateEvent(selectedEvent!.id, {
      name: editName,
      description: editDesc,
      type: editType,
      password: editType === 'password' ? editPassword : undefined,
      logId: (editLogId && editLogId !== '_none') ? editLogId : undefined,
      logName: hoursLogs.find(l => String(l.id) === editLogId)?.name,
      conditionals: editConditionals,
      isOpen: editIsOpen,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-club-events', club.id] });
      toast({ title: "Event updated" });
    },
  });

  const toggleOpenMutation = useMutation({
    mutationFn: (open: boolean) => updateEvent(selectedEvent!.id, { isOpen: open }),
    onSuccess: (_, open) => {
      setEditIsOpen(open);
      qc.invalidateQueries({ queryKey: ['firebase-club-events', club.id] });
      toast({ title: open ? "Event opened" : "Event closed", description: open ? "Volunteers can now check in." : "No new check-ins will be accepted." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-club-events', club.id] });
      setSelectedEventId(null);
      toast({ title: "Event deleted" });
    },
  });

  const removeAttendeeMutation = useMutation({
    mutationFn: (attendanceId: string) => removeEventAttendance(attendanceId),
    onSuccess: (_, attendanceId) => {
      qc.invalidateQueries({ queryKey: ['firebase-event-attendance', selectedEvent?.id] });
      setSelectedAttendees(prev => prev.filter(id => id !== attendanceId));
      setOverrideHours(prev => {
        const next = { ...prev };
        delete next[attendanceId];
        return next;
      });
      setAttendeeToRemove(null);
      toast({ title: "Attendee removed", description: "They can check in again if the event is still open." });
    },
    onError: (error: any) => {
      toast({
        title: "Could not remove attendee",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const grantMutation = useMutation({
    mutationFn: async () => {
      const targetRecords = selectedAttendees.length > 0
        ? attendance.filter(a => selectedAttendees.includes(a.id))
        : attendance;

      const isQR = selectedEvent && ['scan_qr', 'show_qr'].includes(selectedEvent.type);

      if (!isQR) {
        // For password/none events: approve each attendee's own pending submission
        // in whichever log they originally submitted to — no log selection needed.
        await approveEventSubmissionsForAttendees(
          selectedEvent!.id,
          targetRecords,
          user.email,
          club.id,
        );
        return;
      }

      // QR events: create new approved submissions with the admin-selected log.
      const useConditionals = editConditionals.length > 0 && ['scan_qr', 'show_qr'].includes(editType);
      const defHours = defaultHours ? parseFloat(defaultHours) : null;
      const logIdParam = (editLogId && editLogId !== '_none') ? editLogId : undefined;
      const logNameParam = hoursLogs.find(l => String(l.id) === editLogId)?.name;

      // Superclub forwarding params (only if enabled and a superclub exists with an open Sub-Club Hours log)
      const forwardToSuper = alsoGrantToSuper && !!superClub && !!subClubHoursLog && subClubHoursLog.isOpen !== false;
      const superClubIdParam = forwardToSuper ? superClub!.superClubId : undefined;
      const superClubNameParam = forwardToSuper ? superClub!.superClubName : undefined;
      const superClubLogIdParam = forwardToSuper ? String(subClubHoursLog!.id) : undefined;
      const superClubLogNameParam = forwardToSuper ? subClubHoursLog!.name : undefined;
      const independentApprovalParam = forwardToSuper ? superClub!.independentApproval : undefined;
      const subClubNameParam = forwardToSuper ? club.name : undefined;

      // Grant hours for attendees with individual overrides (creates submission + updates attendance)
      for (const record of targetRecords) {
        if (overrideHours[record.id]) {
          await grantEventHours(
            selectedEvent!.id,
            selectedEvent!.name,
            [record],
            parseFloat(overrideHours[record.id]),
            [],
            club.id,
            logIdParam,
            logNameParam,
            superClubIdParam,
            superClubNameParam,
            superClubLogIdParam,
            superClubLogNameParam,
            independentApprovalParam,
            subClubNameParam,
          );
        }
      }

      // Grant hours for remaining attendees using default/conditional logic
      await grantEventHours(
        selectedEvent!.id,
        selectedEvent!.name,
        targetRecords.filter(r => !overrideHours[r.id]),
        defHours,
        useConditionals ? editConditionals : [],
        club.id,
        logIdParam,
        logNameParam,
        superClubIdParam,
        superClubNameParam,
        superClubLogIdParam,
        superClubLogNameParam,
        independentApprovalParam,
        subClubNameParam,
      );
    },
    onSuccess: () => {
      // Recalculate so totalApprovedHours reflects the newly granted event hours
      recalculateClubHours(club.id).catch(() => {});
      qc.invalidateQueries({ queryKey: ['firebase-event-attendance', selectedEvent?.id] });
      qc.invalidateQueries({ queryKey: ['firebase-club-submissions', club.id] });
      setSelectedAttendees([]);
      setDefaultHours('');
      setOverrideHours({});
      setAlsoGrantToSuper(false);
      toast({ title: "Hours granted successfully!" });
    },
    onError: (e: any) => toast({ title: "Failed to grant hours", description: e.message, variant: "destructive" }),
  });

  const handleCheckInScan = async (text: string) => {
    try {
      const email = text.trim();
      if (!email.includes('@')) { setScanResult({ success: false, message: `Invalid QR: ${text}` }); return; }
      const existing = attendance.find(a => a.userEmail === email);
      if (existing && !existing.checkOutTime) {
        setScanResult({ success: false, message: `${email} already checked in` });
        return;
      }
      await checkInUser(selectedEvent!.id, selectedEvent!.name, email, email.split('@')[0], club.id);
      refetchAttendance();
      setScanResult({ success: true, message: `✓ Checked in: ${email}` });
    } catch (e: any) {
      setScanResult({ success: false, message: e.message });
    }
    setTimeout(() => setScanResult(null), 3000);
  };

  const handleCheckOutScan = async (text: string) => {
    try {
      const email = text.trim();
      const rec = attendance.find(a => a.userEmail === email && !a.checkOutTime);
      if (!rec) { setScanResult({ success: false, message: `${email} not checked in` }); return; }
      await checkOutUser(rec.id);
      refetchAttendance();
      setScanResult({ success: true, message: `✓ Checked out: ${email}` });
    } catch (e: any) {
      setScanResult({ success: false, message: e.message });
    }
    setTimeout(() => setScanResult(null), 3000);
  };

  const addConditional = () => {
    setEditConditionals(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      type: 'more',
      thresholdHours: 1,
      grantHours: 1,
    }]);
  };

  const updateConditional = (id: string, field: keyof EventConditional, value: any) => {
    setEditConditionals(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeConditional = (id: string) => {
    setEditConditionals(prev => prev.filter(c => c.id !== id));
  };

  const computeConditionalHours = (minutesAttended?: number): number | null => {
    if (minutesAttended == null || editConditionals.length === 0) return null;
    const h = minutesAttended / 60;
    for (const c of editConditionals) {
      if (c.type === 'less' && h < c.thresholdHours) return c.grantHours;
      if (c.type === 'exact' && Math.abs(h - c.thresholdHours) < 0.1) return c.grantHours;
      if (c.type === 'more' && h >= c.thresholdHours) return c.grantHours;
    }
    return null;
  };

  const isQRType = selectedEvent && ['scan_qr', 'show_qr'].includes(selectedEvent.type);
  const checkedInCount = attendance.filter(a => a.checkInTime && !a.checkOutTime).length;
  const completedCount = attendance.filter(a => a.checkOutTime).length;
  const grantedCount = attendance.filter(a => a.grantStatus === 'granted').length;

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-background min-h-0 overflow-hidden">
      {/* Left Panel: Event List */}
      <div className="w-full lg:w-80 max-h-[38vh] lg:max-h-none border-b lg:border-b-0 lg:border-r border-border flex flex-col flex-shrink-0">
        <div className="bg-card px-4 py-3 sm:py-4 border-b border-border flex items-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-chart-3">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground">Events</h3>
              <p className="text-xs text-muted-foreground truncate max-w-[58vw] lg:max-w-[13rem]">QR or password check-in · grant hours</p>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="mt-2 bg-primary hover:bg-primary/85 text-primary-foreground">
                    New <Plus className="w-4 h-4 ml-1" />
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Event</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                  Events let you track attendance and grant hours. QR Code events use time-tracking to automatically calculate hours based on how long each person stayed.
                </p>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Event Name</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Beach Cleanup, Food Drive..." />
                </div>
                <div className="space-y-1">
                  <Label>Description <span className="text-muted-foreground/80">(optional)</span></Label>
                  <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief description..." rows={2} />
                </div>
                <div className="space-y-1">
                  <Label>Check-in Method</Label>
                  <Select value={newType} onValueChange={(v) => setNewType(v as ClubEvent['type'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[200]">
                      <SelectItem value="none">Open — No check-in required</SelectItem>
                      <SelectItem value="password">Password — Volunteers enter a password</SelectItem>
                      <SelectItem value="scan_qr">Scan QR — You scan volunteers' QR codes (time-tracked)</SelectItem>
                      <SelectItem value="show_qr">Show QR — Volunteers scan your QR codes (time-tracked)</SelectItem>
                    </SelectContent>
                  </Select>
                  {(newType === 'scan_qr' || newType === 'show_qr') && (
                      <p className="text-xs text-primary bg-primary/10 p-2 rounded">
                      ⏱ QR events track check-in and check-out times. You can set conditionals to grant different hours based on time stayed.
                    </p>
                  )}
                </div>
                {newType === 'password' && (
                  <div className="space-y-1">
                    <Label>Password</Label>
                    <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="text" placeholder="Volunteers will enter this" />
                  </div>
                )}
                <Button
                  className="w-full bg-primary hover:bg-primary/85 text-primary-foreground"
                  onClick={() => createMutation.mutate()}
                  disabled={!newName.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-2">
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground/80 text-sm">Loading events...</div>
          )}
          {!isLoading && events.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No events yet</p>
              <p className="text-xs text-muted-foreground/80 mt-1">Create your first event above</p>
            </div>
          )}
          {events.map(event => {
            const isSelected = selectedEvent?.id === event.id;
            return (
              <button
                key={event.id}
                onClick={() => { setSelectedEventId(event.id); setActiveTab('information'); }}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${isSelected ? 'bg-secondary border-border' : 'bg-card border-border hover:bg-background'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${event.isOpen !== false ? 'bg-chart-3' : 'bg-muted-foreground/40'}`} />
                      <p className="font-medium text-foreground text-sm truncate">{event.name}</p>
                    </div>
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 pl-3.5">{event.description}</p>
                    )}
                  </div>
                  <Badge className={`text-xs flex-shrink-0 ${EVENT_TYPE_COLORS[event.type]}`}>
                    {EVENT_TYPE_LABELS[event.type]}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Panel: Event Workspace */}
      {!selectedEvent ? (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center">
            <Calendar className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">Select an Event</h3>
            <p className="text-sm text-muted-foreground/80 mt-1">Click an event on the left to manage it</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
          {/* Event Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-border bg-card flex-shrink-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground break-words">{selectedEvent.name}</h2>
                  <Badge className={EVENT_TYPE_COLORS[selectedEvent.type]}>{EVENT_TYPE_LABELS[selectedEvent.type]}</Badge>
                </div>
                {selectedEvent.description && <p className="text-sm text-muted-foreground mt-0.5 break-words">{selectedEvent.description}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground sm:mr-2">
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" />{attendance.length} attended</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{checkedInCount} checked in</span>
                  <span className="flex items-center gap-1"><Award className="w-4 h-4" />{grantedCount} granted</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => deleteMutation.mutate(selectedEvent.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Tab Nav */}
            <div className="flex gap-1 mt-3 -mx-1 px-1 border-b border-border -mb-4 pb-0 overflow-x-auto">
              {(['information', 'qrcode', 'grant'] as EventTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'information' && 'Information'}
                  {tab === 'qrcode' && (
                    <span className="flex items-center gap-1">
                      <QrCode className="w-4 h-4" /> QR Code
                    </span>
                  )}
                  {tab === 'grant' && (
                    <span className="flex items-center gap-1">
                      <Award className="w-4 h-4" /> Grant Hours
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-4 sm:p-6">

            {/* ============ INFORMATION TAB ============ */}
            {activeTab === 'information' && (
              <div className="space-y-5">
                {/* Open / Closed toggle */}
                <div className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${editIsOpen ? 'bg-chart-3/10 border-chart-3/30' : 'bg-card border-border'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${editIsOpen ? 'bg-chart-3' : 'bg-muted-foreground/50'}`} />
                      <p className="font-semibold text-sm text-foreground">{editIsOpen ? 'Event is Open' : 'Event is Closed'}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 pl-4.5">
                      {editIsOpen ? 'Volunteers can currently check in.' : 'Check-in is paused. No new attendance will be recorded.'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={editIsOpen ? 'outline' : 'default'}
                    className={editIsOpen ? 'border-border text-foreground hover:bg-secondary' : 'bg-chart-3 hover:bg-chart-3/85 text-primary-foreground'}
                    onClick={() => toggleOpenMutation.mutate(!editIsOpen)}
                    disabled={toggleOpenMutation.isPending}
                  >
                    {toggleOpenMutation.isPending ? '...' : editIsOpen ? 'Close Event' : 'Open Event'}
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Event Settings</CardTitle>
                    <CardDescription>Update the event name, description, and check-in method.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <Label>Event Name</Label>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Description</Label>
                      <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} />
                    </div>
                    <div className="space-y-1">
                      <Label>Check-in Method</Label>
                      <Select value={editType} onValueChange={(v) => setEditType(v as ClubEvent['type'])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Open — No check-in required</SelectItem>
                          <SelectItem value="password">Password Protected</SelectItem>
                          <SelectItem value="scan_qr">Scan QR — You scan volunteers' QR codes</SelectItem>
                          <SelectItem value="show_qr">Show QR — Volunteers scan your QR codes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {editType === 'password' && (
                      <div className="space-y-1">
                        <Label>Password</Label>
                        <Input value={editPassword} onChange={e => setEditPassword(e.target.value)} />
                      </div>
                    )}
                    <Button
                      onClick={() => updateMutation.mutate()}
                      disabled={updateMutation.isPending}
                      className="w-full bg-primary hover:bg-primary/85 text-primary-foreground"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ============ QR CODE TAB ============ */}
            {activeTab === 'qrcode' && (
              <div className="space-y-6">
                {selectedEvent.type === 'none' && (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <AlertCircle className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                      <p className="text-muted-foreground font-medium">This event has no QR code</p>
                      <p className="text-sm text-muted-foreground/80 mt-1">Change the check-in method to "Scan QR" or "Show QR" in the Information tab.</p>
                    </CardContent>
                  </Card>
                )}

                {selectedEvent.type === 'password' && (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-muted-foreground font-medium">Password-protected event</p>
                      <p className="text-sm text-muted-foreground/80 mt-1">Volunteers enter a password when submitting hours. No QR scanning needed.</p>
                    </CardContent>
                  </Card>
                )}

                {selectedEvent.type === 'show_qr' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <QrCode className="w-4 h-4" /> Event QR Codes
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Display on a screen or print. Volunteers scan to check in and out — time is recorded automatically.</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border text-muted-foreground flex-shrink-0"
                        onClick={() => window.print()}
                      >
                        <Printer className="w-3.5 h-3.5 mr-1.5" />
                        Print
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Check-in */}
                      <div className="rounded-2xl border border-[#333333] bg-chart-3/10 overflow-hidden">
                        <div className="bg-chart-3 px-4 py-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                          <span className="text-sm font-semibold text-primary-foreground">Check-in</span>
                        </div>
                        <div className="p-6 flex flex-col items-center gap-3">
                          <div className="bg-card rounded-xl p-4 border border-chart-3/30">
                            <QRCode
                              value={`${window.location.origin}/event-checkin?eventId=${selectedEvent.id}&action=checkin`}
                              size={180}
                            />
                          </div>
                          <p className="text-xs font-medium text-chart-3">Volunteers scan when they <strong>arrive</strong></p>
                        </div>
                      </div>

                      {/* Check-out */}
                      <div className="rounded-2xl border border-[#333333] bg-destructive/10 overflow-hidden">
                        <div className="bg-destructive px-4 py-3 flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-destructive-foreground" />
                          <span className="text-sm font-semibold text-destructive-foreground">Check-out</span>
                        </div>
                        <div className="p-6 flex flex-col items-center gap-3">
                          <div className="bg-card rounded-xl p-4 border border-destructive/30">
                            <QRCode
                              value={`${window.location.origin}/event-checkin?eventId=${selectedEvent.id}&action=checkout`}
                              size={180}
                            />
                          </div>
                          <p className="text-xs font-medium text-destructive">Volunteers scan when they <strong>leave</strong></p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedEvent.type === 'scan_qr' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ScanLine className="w-5 h-5" />
                        QR Code Scanner
                      </CardTitle>
                      <CardDescription>
                        Leave this device at the event table. Volunteers line up and show their personal QR codes (found in their profile). Scan to check them in or out.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Sub-tabs */}
                      <div className="flex gap-2 border-b border-border">
                        {(['checkin', 'checkout'] as QRSubTab[]).map(sub => (
                          <button
                            key={sub}
                            onClick={() => setQrSubTab(sub)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                               qrSubTab === sub ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
                            }`}
                          >
                            {sub === 'checkin' ? '✓ Check-in Scanner' : '✗ Check-out Scanner'}
                          </button>
                        ))}
                      </div>

                      {scanResult && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${scanResult.success ? 'bg-chart-3/10 text-chart-3' : 'bg-destructive/10 text-destructive'}`}>
                          {scanResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {scanResult.message}
                        </div>
                      )}

                      {qrSubTab === 'checkin' && (
                        <QRScanner onScan={handleCheckInScan} />
                      )}
                      {qrSubTab === 'checkout' && (
                        <QRScanner onScan={handleCheckOutScan} />
                      )}

                      {/* Live attendance list */}
                      {attendance.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-foreground mb-2">Current Attendance ({attendance.length})</p>
                          <div className="space-y-1 max-h-48 overflow-auto">
                            {attendance.map(a => (
                              <div key={a.id} className="flex items-center justify-between gap-2 text-xs py-1 px-2 bg-card rounded">
                                <button
                                  type="button"
                                  className="min-w-0 text-left hover:underline"
                                  onClick={() => setSelectedAttendee(a)}
                                  title="View participant profile"
                                >
                                  <span className="block font-medium text-foreground truncate">{getAttendeeDisplayName(a)}</span>
                                  {getAttendeeDisplayName(a).toLowerCase() !== a.userEmail.toLowerCase() && (
                                    <span className="block text-muted-foreground truncate">{a.userEmail}</span>
                                  )}
                                </button>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <span>In: {formatTime(a.checkInTime)}</span>
                                  {a.checkOutTime && <span>Out: {formatTime(a.checkOutTime)}</span>}
                                  {a.minutesAttended != null && <span className="text-primary">{formatMinutes(a.minutesAttended)}</span>}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Remove ${a.userName || a.userEmail} from this event`}
                                    title="Remove attendee"
                                    className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => setAttendeeToRemove(a)}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Conditionals (QR types only) */}
                {isQRType && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Hour Conditionals</CardTitle>
                      <CardDescription>
                        Automatically grant different hours based on how long volunteers stayed. Conditionals are checked in order — the first match wins.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {editConditionals.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No conditionals yet. Add one below, or leave empty to manually set hours in Grant Hours tab.</p>
                      )}
                      {editConditionals.map((cond, idx) => (
                        <div key={cond.id} className="flex items-center gap-2 p-3 bg-card rounded-lg">
                          <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                          <span className="text-sm text-foreground">If stayed</span>
                          <Select value={cond.type} onValueChange={(v) => updateConditional(cond.id, 'type', v)}>
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="less">less than</SelectItem>
                              <SelectItem value="exact">exactly</SelectItem>
                              <SelectItem value="more">at least</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number" step="0.5" min="0"
                            value={cond.thresholdHours}
                            onChange={e => updateConditional(cond.id, 'thresholdHours', parseFloat(e.target.value) || 0)}
                            className="w-20 h-8 text-xs"
                          />
                          <span className="text-sm text-foreground">hours → grant</span>
                          <Input
                            type="number" step="0.5" min="0"
                            value={cond.grantHours}
                            onChange={e => updateConditional(cond.id, 'grantHours', parseFloat(e.target.value) || 0)}
                            className="w-20 h-8 text-xs"
                          />
                          <span className="text-sm text-foreground">hrs</span>
                          <button onClick={() => removeConditional(cond.id)} className="ml-auto text-destructive/70 hover:text-destructive">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addConditional} className="w-full">
                        <Plus className="w-4 h-4 mr-1" /> Add Conditional
                      </Button>

                      {/* Log selector */}
                      <div className="pt-2 border-t border-border space-y-1">
                        <Label className="text-sm">Append hours to Log <span className="text-muted-foreground/80">(optional)</span></Label>
                        <Select value={editLogId} onValueChange={setEditLogId}>
                          <SelectTrigger>
                            <SelectValue placeholder="No log selected" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">No log</SelectItem>
                            {selectableLogs.map(l => (
                              <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground/80">Hours granted from this event will count toward the selected log's requirement.</p>
                      </div>

                      <Button
                        onClick={() => updateMutation.mutate()}
                        disabled={updateMutation.isPending}
                        className="w-full bg-primary hover:bg-primary/85 text-primary-foreground"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Conditionals
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ============ GRANT HOURS TAB ============ */}
            {activeTab === 'grant' && (
              <div className="space-y-5">
                {/* Required log selector — QR events only */}
                {isQRType && (
                  <Card className={!editLogId || editLogId === '_none' ? 'border-chart-1/30 bg-chart-1/10' : 'border-chart-3/30 bg-chart-3/10'}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 space-y-1">
                          <Label className="text-sm font-semibold">
                            Append hours to Log <span className="text-destructive">*</span>
                          </Label>
                          <Select value={editLogId} onValueChange={setEditLogId}>
                            <SelectTrigger className="bg-card">
                              <SelectValue placeholder="Select a log (required)" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectableLogs.length === 0
                                ? <SelectItem value="_none" disabled>No logs created yet</SelectItem>
                                : selectableLogs.map(l => (
                                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                                  ))
                              }
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {(!editLogId || editLogId === '_none') && (
                        <p className="text-xs text-chart-1 mt-2">You must select a log before granting hours. Create logs in Settings → Logs.</p>
                      )}
                    </CardContent>
                  </Card>
                )}
                {!isQRType && (
                  <Card className="border-primary/30 bg-primary/10">
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-foreground">
                        Hours will be approved into each volunteer's original submission log.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Conditionals card — password events only (in Grant Hours tab) */}
                {selectedEvent.type === 'password' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Hour Conditionals</CardTitle>
                      <CardDescription>
                        Grant different hours based on what the volunteer submitted. Checked in order — first match wins.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {editConditionals.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No conditionals. Add one below, or leave empty to set hours manually.</p>
                      )}
                      {editConditionals.map((cond, idx) => (
                        <div key={cond.id} className="flex items-center gap-2 p-3 bg-card rounded-lg">
                          <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                          <span className="text-sm text-foreground">If submitted</span>
                          <Select value={cond.type} onValueChange={(v) => updateConditional(cond.id, 'type', v)}>
                            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="less">less than</SelectItem>
                              <SelectItem value="exact">exactly</SelectItem>
                              <SelectItem value="more">at least</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input type="number" step="0.5" min="0" value={cond.thresholdHours} onChange={e => updateConditional(cond.id, 'thresholdHours', parseFloat(e.target.value) || 0)} className="w-20 h-8 text-xs" />
                          <span className="text-sm text-foreground">hours → grant</span>
                          <Input type="number" step="0.5" min="0" value={cond.grantHours} onChange={e => updateConditional(cond.id, 'grantHours', parseFloat(e.target.value) || 0)} className="w-20 h-8 text-xs" />
                          <span className="text-sm text-foreground">hrs</span>
                          <button onClick={() => removeConditional(cond.id)} className="ml-auto text-destructive/70 hover:text-destructive"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addConditional} className="w-full">
                        <Plus className="w-4 h-4 mr-1" /> Add Conditional
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Grant Hours to Attendees</CardTitle>
                    <CardDescription>
                      {(isQRType || selectedEvent.type === 'password') && editConditionals.length > 0
                        ? "Conditionals are active. Hours will be auto-calculated. You can override individual amounts below."
                        : "Set a default hours amount for all selected attendees, or set custom amounts per person."
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {attendance.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-10 h-10 text-muted-foreground/60 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No attendees yet</p>
                        <p className="text-xs text-muted-foreground/80 mt-1">
                          {selectedEvent.type === 'none' ? "Attendees are added when volunteers submit hours for this event." : "Attendees will appear here after checking in."}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedAttendees.length === attendance.length}
                              onCheckedChange={(checked) => {
                                setSelectedAttendees(checked ? attendance.map(a => a.id) : []);
                              }}
                            />
                            <span className="text-sm text-muted-foreground">
                              {selectedAttendees.length > 0 ? `${selectedAttendees.length} selected` : 'Select all'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={downloadAttendanceCsv}
                              disabled={attendance.length === 0}
                            >
                              <Download className="w-4 h-4 mr-1" /> Download CSV
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => refetchAttendance()}>
                              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                            </Button>
                          </div>
                        </div>

                        {/* Default hours — hidden when conditionals active */}
                        {!(((isQRType || selectedEvent.type === 'password') && editConditionals.length > 0)) && (
                          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                            <Label className="text-sm whitespace-nowrap">Default hours for all:</Label>
                            <Input
                              type="number" step="0.5" min="0"
                              value={defaultHours}
                              onChange={e => setDefaultHours(e.target.value)}
                              placeholder="e.g. 2.5"
                              className="w-28 h-8"
                            />
                            <p className="text-xs text-muted-foreground">Applied to everyone without a custom amount</p>
                          </div>
                        )}

                        {/* Also forward to superclub */}
                        {superClub && (
                          <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                            <label className="flex items-start gap-2 cursor-pointer">
                              <Checkbox
                                checked={alsoGrantToSuper}
                                onCheckedChange={(v) => setAlsoGrantToSuper(!!v)}
                                disabled={!subClubHoursLog || subClubHoursLog.isOpen === false}
                              />
                              <span className="text-sm text-foreground">
                                <strong>ALSO ADD TO {superClub.superClubName.toUpperCase()}</strong>
                                <span className="block text-xs text-muted-foreground mt-0.5 font-normal">
                                  {!subClubHoursLog
                                    ? `${superClub.superClubName}'s Sub-Club Hours log isn't set up yet.`
                                    : subClubHoursLog.isOpen === false
                                    ? `${superClub.superClubName}'s Sub-Club Hours log is closed — ask their admin to open it.`
                                    : superClub.independentApproval === false
                                    ? `Forward these hours to ${superClub.superClubName}'s Sub-Club Hours log. Pre-approved (shared mode).`
                                    : `Forward these hours to ${superClub.superClubName}'s Sub-Club Hours log for independent approval.`}
                                </span>
                              </span>
                            </label>
                          </div>
                        )}

                        {/* Attendee list */}
                        <div className="space-y-2 max-h-96 overflow-auto">
                          {attendance.map(a => {
                            const conditionalHours = computeConditionalHours(a.minutesAttended);
                            const isSelected = selectedAttendees.includes(a.id);
                            const isPasswordEvent = selectedEvent.type === 'password';
                            return (
                              <div
                                key={a.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isSelected ? 'bg-secondary border-border' : 'bg-card border-border'}`}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    setSelectedAttendees(prev =>
                                      checked ? [...prev, a.id] : prev.filter(id => id !== a.id)
                                    );
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <button
                                    type="button"
                                    className="text-left hover:underline"
                                    onClick={() => setSelectedAttendee(a)}
                                    title="View participant profile"
                                  >
                                    <p className="text-sm font-medium text-foreground truncate">{getAttendeeDisplayName(a)}</p>
                                    {getAttendeeDisplayName(a).toLowerCase() !== a.userEmail.toLowerCase() && (
                                      <p className="text-xs text-muted-foreground truncate">{a.userEmail}</p>
                                    )}
                                  </button>
                                </div>
                                <div className="text-xs text-muted-foreground space-y-0.5 text-right flex-shrink-0">
                                  {isPasswordEvent && a.minutesAttended != null && (
                                    <div className="text-foreground font-medium">Submitted: {a.minutesAttended / 60}h</div>
                                  )}
                                  {!isPasswordEvent && a.checkInTime && <div>In: {formatTime(a.checkInTime)}</div>}
                                  {!isPasswordEvent && a.checkOutTime && <div>Out: {formatTime(a.checkOutTime)}</div>}
                                  {!isPasswordEvent && a.minutesAttended != null && <div className="text-primary font-medium">{formatMinutes(a.minutesAttended)}</div>}
                                </div>
                                {conditionalHours != null && (
                                  <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">{conditionalHours}h (auto)</Badge>
                                )}
                                {a.grantStatus === 'granted' && (
                                  <Badge className="bg-chart-3/15 text-chart-3 border-chart-3/30 text-xs">✓ {a.hoursGranted}h granted</Badge>
                                )}
                                <Input
                                  type="number" step="0.5" min="0"
                                  placeholder="Override"
                                  value={overrideHours[a.id] || ''}
                                  onChange={e => setOverrideHours(prev => ({ ...prev, [a.id]: e.target.value }))}
                                  className="w-24 h-7 text-xs"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Remove ${a.userName || a.userEmail} from this event`}
                                  title="Remove attendee"
                                  className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => setAttendeeToRemove(a)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>

                        <Button
                          onClick={() => grantMutation.mutate()}
                          disabled={grantMutation.isPending || (isQRType
                            ? (!editLogId || editLogId === '_none') || (selectedAttendees.length === 0 && !defaultHours && editConditionals.length === 0 && !Object.values(overrideHours).some(Boolean))
                            : attendance.length === 0)}
                          className="w-full bg-primary hover:bg-primary/85 text-primary-foreground"
                        >
                          <Award className="w-4 h-4 mr-2" />
                          {grantMutation.isPending ? "Granting..." : `Grant Hours to ${selectedAttendees.length > 0 ? `${selectedAttendees.length} selected` : 'all attendees'}`}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

      <AdminStudentProfileDialog
        student={selectedAttendee ? {
          email: selectedAttendee.userEmail,
          studentName: getAttendeeDisplayName(selectedAttendee),
        } : null}
        club={club}
        adminEmail={user.email || ""}
        open={!!selectedAttendee}
        onOpenChange={open => !open && setSelectedAttendee(null)}
        onGrantHours={() => {
          if (!selectedAttendee) return;
          setSelectedAttendees([selectedAttendee.id]);
          setActiveTab("grant");
          setSelectedAttendee(null);
        }}
      />

      {false && (
      <Dialog open={false}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="flex items-center justify-center w-11 h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                {selectedAttendee
                  ? getAttendeeDisplayName(selectedAttendee)
                    .split(/\s+/)
                    .map(part => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                  : '??'}
              </span>
              <span>
                <span className="block">{selectedAttendee ? getAttendeeDisplayName(selectedAttendee) : 'Participant profile'}</span>
                <span className="block text-sm font-normal text-muted-foreground">Participant Profile</span>
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              View contact, academic, and attendance details for this event participant.
            </DialogDescription>
          </DialogHeader>

          {selectedAttendee && (() => {
            const profile = getAttendeeProfile(selectedAttendee);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold text-foreground mb-3">Contact Information</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                          <Mail className="w-3 h-3" /> Google Account
                        </div>
                        <p className="text-sm font-medium text-foreground break-all">{selectedAttendee.userEmail}</p>
                      </div>
                      {profile?.personalEmailAddress && (
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                            <Mail className="w-3 h-3" /> Personal Email
                          </div>
                          <p className="text-sm font-medium text-foreground break-all">{profile.personalEmailAddress}</p>
                        </div>
                      )}
                      {(profile?.cellPhoneNumber || profile?.phoneNumber) && (
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                            <Phone className="w-3 h-3" /> Phone Number
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {profile.cellPhoneNumber || profile.phoneNumber}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold text-foreground mb-3">Academic Information</h3>
                    <div className="space-y-3">
                      {profile?.gradeLevel && (
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                            <GraduationCap className="w-3 h-3" /> Grade Level
                          </div>
                          <p className="text-sm font-medium text-foreground">Grade {profile.gradeLevel}</p>
                        </div>
                      )}
                      {profile?.studentId && (
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                            <Hash className="w-3 h-3" /> Student ID
                          </div>
                          <p className="text-sm font-medium text-foreground">{profile.studentId}</p>
                        </div>
                      )}
                      {!profile?.gradeLevel && !profile?.studentId && (
                        <p className="text-sm text-muted-foreground italic">No academic details available</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <h3 className="font-semibold text-foreground mb-3">Event Attendance</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Check-in</p>
                      <p className="font-medium text-foreground">{formatTime(selectedAttendee.checkInTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Check-out</p>
                      <p className="font-medium text-foreground">{formatTime(selectedAttendee.checkOutTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time attended</p>
                      <p className="font-medium text-foreground">{formatMinutes(selectedAttendee.minutesAttended)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Hours granted</p>
                      <p className="font-medium text-foreground">
                        {selectedAttendee.hoursGranted != null ? `${selectedAttendee.hoursGranted}h` : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {!profile && (
                  <p className="text-xs text-muted-foreground">
                    Additional profile fields are not available for this participant.
                  </p>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      )}

      <Dialog open={!!attendeeToRemove} onOpenChange={open => !open && setAttendeeToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove attendee?</DialogTitle>
            <DialogDescription>
              Remove {attendeeToRemove?.userName || attendeeToRemove?.userEmail} from this event? Any hours already granted will remain in their history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAttendeeToRemove(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => attendeeToRemove && removeAttendeeMutation.mutate(attendeeToRemove.id)}
              disabled={removeAttendeeMutation.isPending}
            >
              {removeAttendeeMutation.isPending ? "Removing..." : "Remove attendee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
