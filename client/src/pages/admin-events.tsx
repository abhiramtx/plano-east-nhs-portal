import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Club, ClubEvent, EventAttendance, EventConditional,
  getClubEvents, createEvent, updateEvent, deleteEvent,
  getEventAttendance, checkInUser, checkOutUser, updateAttendanceHours, grantEventHours, recalculateClubHours
} from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Trash2, Save, Calendar, Users, Clock, QrCode, Award, ChevronRight,
  Camera, ScanLine, RefreshCw, CheckCircle2, XCircle, AlertCircle, Edit2, X, Printer
} from "lucide-react";
import QRCode from "react-qr-code";
import { Html5Qrcode } from "html5-qrcode";
import type { HoursLog } from "@shared/schema";

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
  none: 'bg-green-100 text-green-700',
  password: 'bg-yellow-100 text-yellow-700',
  scan_qr: 'bg-blue-100 text-blue-700',
  show_qr: 'bg-purple-100 text-purple-700',
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
        className="w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50 min-h-[380px] flex items-center justify-center"
      >
        {!started && (
          <div className="text-center p-4">
            <Camera className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Camera not started</p>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
      <div className="flex gap-2 justify-center">
        {!started ? (
          <Button onClick={startScanner} className="bg-black hover:bg-gray-800 text-white">
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

  const { data: attendance = [], refetch: refetchAttendance } = useQuery<EventAttendance[]>({
    queryKey: ['firebase-event-attendance', selectedEvent?.id],
    queryFn: () => getEventAttendance(selectedEvent!.id),
    enabled: !!selectedEvent?.id,
    refetchInterval: activeTab === 'qrcode' ? 3000 : false,
  });

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

  const grantMutation = useMutation({
    mutationFn: async () => {
      const targetRecords = selectedAttendees.length > 0
        ? attendance.filter(a => selectedAttendees.includes(a.id))
        : attendance;

      // Apply individual overrides first
      for (const record of targetRecords) {
        if (overrideHours[record.id]) {
          await updateAttendanceHours(record.id, parseFloat(overrideHours[record.id]));
        }
      }

      const useConditionals = editConditionals.length > 0 && ['scan_qr', 'show_qr', 'password'].includes(editType);
      const defHours = defaultHours ? parseFloat(defaultHours) : null;

      await grantEventHours(
        selectedEvent!.id,
        selectedEvent!.name,
        targetRecords.filter(r => !overrideHours[r.id]),
        defHours,
        useConditionals ? editConditionals : [],
        club.id,
        (editLogId && editLogId !== '_none') ? editLogId : undefined,
        hoursLogs.find(l => String(l.id) === editLogId)?.name,
      );
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['firebase-event-attendance', selectedEvent?.id] });
      setSelectedAttendees([]);
      setDefaultHours('');
      setOverrideHours({});
      toast({ title: "Hours granted successfully!" });
      if (club?.id) {
        try {
          await recalculateClubHours(club.id);
          qc.invalidateQueries({ queryKey: ['firebase-clubs'] });
        } catch {
          toast({ title: "Hours granted, but total update failed", description: "Club totals may be stale. Try refreshing.", variant: "destructive" });
        }
      }
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
    <div className="flex-1 flex bg-white min-h-0 overflow-hidden">
      {/* Left Panel: Event List */}
      <div className="w-80 border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Events</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Track attendance via QR code or password. Grant hours to participants.
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-black hover:bg-gray-800 text-white flex-shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Event</DialogTitle>
                <p className="text-sm text-gray-500">
                  Events let you track attendance and grant hours. QR Code events use time-tracking to automatically calculate hours based on how long each person stayed.
                </p>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Event Name</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Beach Cleanup, Food Drive..." />
                </div>
                <div className="space-y-1">
                  <Label>Description <span className="text-gray-400">(optional)</span></Label>
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
                    <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
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
                  className="w-full bg-black hover:bg-gray-800 text-white"
                  onClick={() => createMutation.mutate()}
                  disabled={!newName.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-2">
          {isLoading && (
            <div className="text-center py-8 text-gray-400 text-sm">Loading events...</div>
          )}
          {!isLoading && events.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">No events yet</p>
              <p className="text-xs text-gray-400 mt-1">Create your first event above</p>
            </div>
          )}
          {events.map(event => {
            const isSelected = selectedEvent?.id === event.id;
            return (
              <button
                key={event.id}
                onClick={() => { setSelectedEventId(event.id); setActiveTab('information'); }}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${isSelected ? 'bg-gray-100 border-gray-400' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${event.isOpen !== false ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <p className="font-medium text-gray-900 text-sm truncate">{event.name}</p>
                    </div>
                    {event.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 pl-3.5">{event.description}</p>
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
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">Select an Event</h3>
            <p className="text-sm text-gray-400 mt-1">Click an event on the left to manage it</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Event Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">{selectedEvent.name}</h2>
                  <Badge className={EVENT_TYPE_COLORS[selectedEvent.type]}>{EVENT_TYPE_LABELS[selectedEvent.type]}</Badge>
                </div>
                {selectedEvent.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{selectedEvent.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-4 text-sm text-gray-500 mr-4">
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" />{attendance.length} attended</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{checkedInCount} checked in</span>
                  <span className="flex items-center gap-1"><Award className="w-4 h-4" />{grantedCount} granted</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate(selectedEvent.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Tab Nav */}
            <div className="flex gap-1 mt-3 border-b border-gray-200 -mb-4 pb-0">
              {(['information', 'qrcode', 'grant'] as EventTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
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
          <div className="flex-1 overflow-auto p-6">

            {/* ============ INFORMATION TAB ============ */}
            {activeTab === 'information' && (
              <div className="space-y-5">
                {/* Open / Closed toggle */}
                <div className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${editIsOpen ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${editIsOpen ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <p className="font-semibold text-sm text-gray-900">{editIsOpen ? 'Event is Open' : 'Event is Closed'}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 pl-4.5">
                      {editIsOpen ? 'Volunteers can currently check in.' : 'Check-in is paused. No new attendance will be recorded.'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={editIsOpen ? 'outline' : 'default'}
                    className={editIsOpen ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : 'bg-green-600 hover:bg-green-700 text-white'}
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
                      className="w-full bg-black hover:bg-gray-800 text-white"
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
                      <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 font-medium">This event has no QR code</p>
                      <p className="text-sm text-gray-400 mt-1">Change the check-in method to "Scan QR" or "Show QR" in the Information tab.</p>
                    </CardContent>
                  </Card>
                )}

                {selectedEvent.type === 'password' && (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-gray-600 font-medium">Password-protected event</p>
                      <p className="text-sm text-gray-400 mt-1">Volunteers enter a password when submitting hours. No QR scanning needed.</p>
                    </CardContent>
                  </Card>
                )}

                {selectedEvent.type === 'show_qr' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <QrCode className="w-4 h-4" /> Event QR Codes
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">Display on a screen or print. Volunteers scan to check in and out — time is recorded automatically.</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-200 text-gray-600 flex-shrink-0"
                        onClick={() => window.print()}
                      >
                        <Printer className="w-3.5 h-3.5 mr-1.5" />
                        Print
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Check-in */}
                      <div className="rounded-2xl border border-green-200 bg-green-50 overflow-hidden">
                        <div className="bg-green-500 px-4 py-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span className="text-sm font-semibold text-white">Check-in</span>
                        </div>
                        <div className="p-6 flex flex-col items-center gap-3">
                          <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
                            <QRCode
                              value={`${window.location.origin}/event-checkin?eventId=${selectedEvent.id}&action=checkin`}
                              size={180}
                            />
                          </div>
                          <p className="text-xs font-medium text-green-700">Volunteers scan when they <strong>arrive</strong></p>
                        </div>
                      </div>

                      {/* Check-out */}
                      <div className="rounded-2xl border border-red-200 bg-red-50 overflow-hidden">
                        <div className="bg-red-500 px-4 py-3 flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-white" />
                          <span className="text-sm font-semibold text-white">Check-out</span>
                        </div>
                        <div className="p-6 flex flex-col items-center gap-3">
                          <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
                            <QRCode
                              value={`${window.location.origin}/event-checkin?eventId=${selectedEvent.id}&action=checkout`}
                              size={180}
                            />
                          </div>
                          <p className="text-xs font-medium text-red-700">Volunteers scan when they <strong>leave</strong></p>
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
                      <div className="flex gap-2 border-b border-gray-200">
                        {(['checkin', 'checkout'] as QRSubTab[]).map(sub => (
                          <button
                            key={sub}
                            onClick={() => setQrSubTab(sub)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                              qrSubTab === sub ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500'
                            }`}
                          >
                            {sub === 'checkin' ? '✓ Check-in Scanner' : '✗ Check-out Scanner'}
                          </button>
                        ))}
                      </div>

                      {scanResult && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${scanResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
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
                          <p className="text-sm font-medium text-gray-700 mb-2">Current Attendance ({attendance.length})</p>
                          <div className="space-y-1 max-h-48 overflow-auto">
                            {attendance.map(a => (
                              <div key={a.id} className="flex items-center justify-between text-xs py-1 px-2 bg-gray-50 rounded">
                                <span className="font-medium text-gray-900">{a.userEmail}</span>
                                <div className="flex items-center gap-2 text-gray-500">
                                  <span>In: {formatTime(a.checkInTime)}</span>
                                  {a.checkOutTime && <span>Out: {formatTime(a.checkOutTime)}</span>}
                                  {a.minutesAttended != null && <span className="text-blue-600">{formatMinutes(a.minutesAttended)}</span>}
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
                        <p className="text-sm text-gray-500 italic">No conditionals yet. Add one below, or leave empty to manually set hours in Grant Hours tab.</p>
                      )}
                      {editConditionals.map((cond, idx) => (
                        <div key={cond.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <span className="text-xs text-gray-500 w-4">{idx + 1}.</span>
                          <span className="text-sm text-gray-700">If stayed</span>
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
                          <span className="text-sm text-gray-700">hours → grant</span>
                          <Input
                            type="number" step="0.5" min="0"
                            value={cond.grantHours}
                            onChange={e => updateConditional(cond.id, 'grantHours', parseFloat(e.target.value) || 0)}
                            className="w-20 h-8 text-xs"
                          />
                          <span className="text-sm text-gray-700">hrs</span>
                          <button onClick={() => removeConditional(cond.id)} className="ml-auto text-red-400 hover:text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addConditional} className="w-full">
                        <Plus className="w-4 h-4 mr-1" /> Add Conditional
                      </Button>

                      {/* Log selector */}
                      <div className="pt-2 border-t border-gray-100 space-y-1">
                        <Label className="text-sm">Append hours to Log <span className="text-gray-400">(optional)</span></Label>
                        <Select value={editLogId} onValueChange={setEditLogId}>
                          <SelectTrigger>
                            <SelectValue placeholder="No log selected" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">No log</SelectItem>
                            {hoursLogs.map(l => (
                              <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400">Hours granted from this event will count toward the selected log's requirement.</p>
                      </div>

                      <Button
                        onClick={() => updateMutation.mutate()}
                        disabled={updateMutation.isPending}
                        className="w-full bg-black hover:bg-gray-800 text-white"
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
                {/* Required log selector */}
                <Card className={!editLogId || editLogId === '_none' ? 'border-amber-300 bg-amber-50' : 'border-green-200 bg-green-50'}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-y-1">
                        <Label className="text-sm font-semibold">
                          Append hours to Log <span className="text-red-500">*</span>
                        </Label>
                        <Select value={editLogId} onValueChange={setEditLogId}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select a log (required)" />
                          </SelectTrigger>
                          <SelectContent>
                            {hoursLogs.length === 0
                              ? <SelectItem value="_none" disabled>No logs created yet</SelectItem>
                              : hoursLogs.map(l => (
                                  <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                                ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {(!editLogId || editLogId === '_none') && (
                      <p className="text-xs text-amber-700 mt-2">You must select a log before granting hours. Create logs in Settings → Logs.</p>
                    )}
                  </CardContent>
                </Card>

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
                        <p className="text-sm text-gray-500 italic">No conditionals. Add one below, or leave empty to set hours manually.</p>
                      )}
                      {editConditionals.map((cond, idx) => (
                        <div key={cond.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <span className="text-xs text-gray-500 w-4">{idx + 1}.</span>
                          <span className="text-sm text-gray-700">If submitted</span>
                          <Select value={cond.type} onValueChange={(v) => updateConditional(cond.id, 'type', v)}>
                            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="less">less than</SelectItem>
                              <SelectItem value="exact">exactly</SelectItem>
                              <SelectItem value="more">at least</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input type="number" step="0.5" min="0" value={cond.thresholdHours} onChange={e => updateConditional(cond.id, 'thresholdHours', parseFloat(e.target.value) || 0)} className="w-20 h-8 text-xs" />
                          <span className="text-sm text-gray-700">hours → grant</span>
                          <Input type="number" step="0.5" min="0" value={cond.grantHours} onChange={e => updateConditional(cond.id, 'grantHours', parseFloat(e.target.value) || 0)} className="w-20 h-8 text-xs" />
                          <span className="text-sm text-gray-700">hrs</span>
                          <button onClick={() => removeConditional(cond.id)} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
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
                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No attendees yet</p>
                        <p className="text-xs text-gray-400 mt-1">
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
                            <span className="text-sm text-gray-600">
                              {selectedAttendees.length > 0 ? `${selectedAttendees.length} selected` : 'Select all'}
                            </span>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => refetchAttendance()}>
                            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                          </Button>
                        </div>

                        {/* Default hours — hidden when conditionals active */}
                        {!(((isQRType || selectedEvent.type === 'password') && editConditionals.length > 0)) && (
                          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                            <Label className="text-sm whitespace-nowrap">Default hours for all:</Label>
                            <Input
                              type="number" step="0.5" min="0"
                              value={defaultHours}
                              onChange={e => setDefaultHours(e.target.value)}
                              placeholder="e.g. 2.5"
                              className="w-28 h-8"
                            />
                            <p className="text-xs text-gray-500">Applied to everyone without a custom amount</p>
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
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isSelected ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'}`}
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
                                  <p className="text-sm font-medium text-gray-900 truncate">{a.userName || a.userEmail}</p>
                                  <p className="text-xs text-gray-500 truncate">{a.userEmail}</p>
                                </div>
                                <div className="text-xs text-gray-500 space-y-0.5 text-right flex-shrink-0">
                                  {isPasswordEvent && a.minutesAttended != null && (
                                    <div className="text-gray-700 font-medium">Submitted: {a.minutesAttended / 60}h</div>
                                  )}
                                  {!isPasswordEvent && a.checkInTime && <div>In: {formatTime(a.checkInTime)}</div>}
                                  {!isPasswordEvent && a.checkOutTime && <div>Out: {formatTime(a.checkOutTime)}</div>}
                                  {!isPasswordEvent && a.minutesAttended != null && <div className="text-blue-600 font-medium">{formatMinutes(a.minutesAttended)}</div>}
                                </div>
                                {conditionalHours != null && (
                                  <Badge className="bg-blue-100 text-blue-700 text-xs">{conditionalHours}h (auto)</Badge>
                                )}
                                {a.grantStatus === 'granted' && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">✓ {a.hoursGranted}h granted</Badge>
                                )}
                                <Input
                                  type="number" step="0.5" min="0"
                                  placeholder="Override"
                                  value={overrideHours[a.id] || ''}
                                  onChange={e => setOverrideHours(prev => ({ ...prev, [a.id]: e.target.value }))}
                                  className="w-24 h-7 text-xs"
                                />
                              </div>
                            );
                          })}
                        </div>

                        <Button
                          onClick={() => grantMutation.mutate()}
                          disabled={grantMutation.isPending || !editLogId || editLogId === '_none' || (selectedAttendees.length === 0 && !defaultHours && editConditionals.length === 0)}
                          className="w-full bg-black hover:bg-gray-800 text-white"
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
    </div>
  );
}
