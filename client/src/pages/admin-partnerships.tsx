import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Club, Partnership, PartnershipAffiliation, ClubEvent, EventAttendance, EventConditional,
  getAllPartnerships, getPartnershipsByOwner, createPartnership, updatePartnership, deletePartnership,
  getPartnershipAffiliations, getClubAffiliations, requestAffiliation, respondToAffiliation, removeAffiliation,
  getPartnershipEvents, createEvent, updateEvent, deleteEvent, getPartnershipSubmissions, getClubs,
  getEventAttendance, checkInUser, checkOutUser, grantEventHours, updateAttendanceHours
} from "@/lib/firebase";
import type { HoursLog } from "@shared/schema";
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
  Plus, Trash2, Save, Building2, Users, Clock, Award, ChevronRight,
  BarChart3, Calendar, Handshake, Settings, Globe, Check, X, AlertCircle,
  Upload, Image, LayoutDashboard, Search, QrCode, ScanLine, CheckCircle2, XCircle, RefreshCw
} from "lucide-react";
import QRCode from "react-qr-code";
import { Html5Qrcode } from "html5-qrcode";

interface AdminPartnershipsProps {
  user: User;
  club?: Club;
  hideHeader?: boolean;
}

type PartnershipView = 'list' | 'manage' | 'browse-detail';
type ManageTab = 'overview' | 'events' | 'volunteers' | 'affiliations' | 'settings';
type PartnershipEventTab = 'information' | 'qrcode' | 'grant';
type QRSubTab = 'checkin' | 'checkout';

const EVENT_TYPE_LABELS: Record<string, string> = {
  none: 'Open', password: 'Password Protected', scan_qr: 'Scan QR Code', show_qr: 'Show QR Code',
};
const EVENT_TYPE_COLORS: Record<string, string> = {
  none: 'bg-green-100 text-green-700', password: 'bg-yellow-100 text-yellow-700',
  scan_qr: 'bg-blue-100 text-blue-700', show_qr: 'bg-purple-100 text-purple-700',
};

const formatTime = (date?: Date) => {
  if (!date) return '—';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};
const formatMinutes = (minutes?: number) => {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60); const m = minutes % 60;
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
};

function QRScanner({ onScan }: { onScan: (text: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    return () => { if (scannerRef.current) scannerRef.current.stop().catch(() => {}); };
  }, []);
  const startScanner = async () => {
    if (!containerRef.current) return;
    const id = `qr-ps-${Math.random().toString(36).slice(2)}`;
    containerRef.current.id = id;
    try {
      const scanner = new Html5Qrcode(id);
      scannerRef.current = scanner;
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (text) => { onScan(text); }, () => {});
      setStarted(true); setError(null);
    } catch (err: any) { setError(err?.message || "Camera access failed"); }
  };
  const stopScanner = async () => {
    if (scannerRef.current) { await scannerRef.current.stop().catch(() => {}); scannerRef.current = null; }
    setStarted(false);
  };
  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 min-h-[300px] flex items-center justify-center overflow-hidden"
      >
        {!started && (
          <div className="text-center p-6">
            <ScanLine className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Camera not started</p>
            <p className="text-xs text-gray-400 mt-1">Click below to start the QR scanner</p>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!started ? (
        <Button onClick={startScanner} className="w-full bg-black hover:bg-gray-800 text-white">
          <ScanLine className="w-4 h-4 mr-2" /> Start Camera
        </Button>
      ) : (
        <Button onClick={stopScanner} variant="outline" className="w-full">Stop Camera</Button>
      )}
    </div>
  );
}

const ORG_TYPE_LABELS: Record<string, string> = {
  business: 'Business',
  nonprofit: 'Nonprofit',
  school: 'School',
  government: 'Government',
  other: 'Other',
};

const ORG_TYPE_COLORS: Record<string, string> = {
  business: 'bg-blue-100 text-blue-700',
  nonprofit: 'bg-green-100 text-green-700',
  school: 'bg-yellow-100 text-yellow-700',
  government: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-600',
};

export function AdminPartnerships({ user, club, hideHeader }: AdminPartnershipsProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [view, setView] = useState<PartnershipView>('list');
  const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null);
  const [browsePartnership, setBrowsePartnership] = useState<Partnership | null>(null);
  const [activeTab, setActiveTab] = useState<ManageTab>('overview');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [affiliateClubSearch, setAffiliateClubSearch] = useState('');
  const [partnershipSearch, setPartnershipSearch] = useState('');

  const createLogoRef = useRef<HTMLInputElement>(null);
  const editLogoRef = useRef<HTMLInputElement>(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newOrgType, setNewOrgType] = useState<Partnership['orgType']>('nonprofit');
  const [newAddress, setNewAddress] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');

  // Edit settings
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editColor, setEditColor] = useState('#3B82F6');
  const [editLogoUrl, setEditLogoUrl] = useState('');

  // Create event form
  const [newEventName, setNewEventName] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventType, setNewEventType] = useState<ClubEvent['type']>('none');
  const [newEventPassword, setNewEventPassword] = useState('');

  // Selected partnership event management
  const [selectedPartnershipEvent, setSelectedPartnershipEvent] = useState<ClubEvent | null>(null);
  const [showCreateEventDialog, setShowCreateEventDialog] = useState(false);
  const [editEventName, setEditEventName] = useState('');
  const [editEventDesc, setEditEventDesc] = useState('');
  const [editEventType, setEditEventType] = useState<ClubEvent['type']>('none');
  const [editEventPassword, setEditEventPassword] = useState('');
  const [editConditionals, setEditConditionals] = useState<EventConditional[]>([]);
  const [editLogId, setEditLogId] = useState('');
  const [selectedTargetClubId, setSelectedTargetClubId] = useState('');
  const [editEventLat, setEditEventLat] = useState<number | null>(null);
  const [editEventLng, setEditEventLng] = useState<number | null>(null);
  const [editEventLocationQuery, setEditEventLocationQuery] = useState('');
  const [editEventLocationSuggestions, setEditEventLocationSuggestions] = useState<any[]>([]);
  const [editEventLocationSearching, setEditEventLocationSearching] = useState(false);
  const [activePartnershipEventTab, setActivePartnershipEventTab] = useState<PartnershipEventTab>('information');
  const [qrSubTab, setQrSubTab] = useState<QRSubTab>('checkin');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [overrideHours, setOverrideHours] = useState<Record<string, string>>({});
  const [defaultHours, setDefaultHours] = useState('');

  // Settings - location search for partnership HQ
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [editAddressQuery, setEditAddressQuery] = useState('');
  const [editAddressSuggestions, setEditAddressSuggestions] = useState<any[]>([]);
  const [editAddressSearching, setEditAddressSearching] = useState(false);

  // Volunteer search
  const [volunteerSearch, setVolunteerSearch] = useState('');

  const { data: myPartnerships = [], isLoading: myLoading } = useQuery<Partnership[]>({
    queryKey: ['firebase-partnerships-owned', user.email],
    queryFn: () => getPartnershipsByOwner(user.email),
    enabled: !!user.email,
  });

  const { data: allPartnerships = [], isLoading: allLoading } = useQuery<Partnership[]>({
    queryKey: ['firebase-all-partnerships'],
    queryFn: getAllPartnerships,
  });

  const { data: allClubs = [] } = useQuery({
    queryKey: ['firebase-clubs'],
    queryFn: getClubs,
  });

  const { data: partnershipEvents = [] } = useQuery<ClubEvent[]>({
    queryKey: ['firebase-partnership-events', selectedPartnership?.id],
    queryFn: () => getPartnershipEvents(selectedPartnership!.id),
    enabled: !!selectedPartnership?.id,
  });

  const { data: browseEvents = [] } = useQuery<ClubEvent[]>({
    queryKey: ['firebase-partnership-events', browsePartnership?.id],
    queryFn: () => getPartnershipEvents(browsePartnership!.id),
    enabled: !!browsePartnership?.id,
  });

  const { data: affiliations = [] } = useQuery<PartnershipAffiliation[]>({
    queryKey: ['firebase-partnership-affiliations', selectedPartnership?.id],
    queryFn: () => getPartnershipAffiliations(selectedPartnership!.id),
    enabled: !!selectedPartnership?.id,
  });

  const { data: partnershipSubmissions = [] } = useQuery({
    queryKey: ['firebase-partnership-submissions', selectedPartnership?.id],
    queryFn: () => getPartnershipSubmissions(selectedPartnership!.id),
    enabled: !!selectedPartnership?.id,
  });

  const { data: hoursLogs = [] } = useQuery<HoursLog[]>({
    queryKey: ['/api/hours-logs', club?.id],
    enabled: !!club?.id,
  });

  const { data: targetClubLogs = [] } = useQuery<HoursLog[]>({
    queryKey: ['/api/hours-logs', selectedTargetClubId],
    enabled: !!selectedTargetClubId,
  });

  useEffect(() => {
    if (selectedPartnership) {
      setEditName(selectedPartnership.name);
      setEditDesc(selectedPartnership.description || '');
      setEditAddress(selectedPartnership.address || '');
      setEditColor(selectedPartnership.color || '#3B82F6');
      setEditLogoUrl(selectedPartnership.logoUrl || '');
      setEditLat(selectedPartnership.latitude ?? null);
      setEditLng(selectedPartnership.longitude ?? null);
      setEditAddressQuery(selectedPartnership.address || '');
      setEditAddressSuggestions([]);
    }
  }, [selectedPartnership]);

  useEffect(() => {
    if (selectedPartnershipEvent) {
      setEditEventName(selectedPartnershipEvent.name);
      setEditEventDesc(selectedPartnershipEvent.description || '');
      setEditEventType(selectedPartnershipEvent.type);
      setEditEventPassword(selectedPartnershipEvent.password || '');
      setEditConditionals(selectedPartnershipEvent.conditionals || []);
      setEditLogId(selectedPartnershipEvent.logId || '');
      setSelectedTargetClubId(selectedPartnershipEvent.targetClubId || '');
      setEditEventLat(selectedPartnershipEvent.latitude ?? null);
      setEditEventLng(selectedPartnershipEvent.longitude ?? null);
      setEditEventLocationQuery(
        selectedPartnershipEvent.latitude != null ? '(location saved)' : ''
      );
      setEditEventLocationSuggestions([]);
      setActivePartnershipEventTab('information');
      setScanResult(null);
      setSelectedAttendees([]);
      setOverrideHours({});
      setDefaultHours('');
    }
  }, [selectedPartnershipEvent?.id]);

  // Nominatim search: partnership HQ address
  useEffect(() => {
    const run = async () => {
      if (editAddressQuery.length < 3) { setEditAddressSuggestions([]); return; }
      setEditAddressSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(editAddressQuery)}&limit=5`);
        setEditAddressSuggestions(await res.json());
      } catch {} finally { setEditAddressSearching(false); }
    };
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [editAddressQuery]);

  // Nominatim search: event location
  useEffect(() => {
    const run = async () => {
      if (editEventLocationQuery.length < 3 || editEventLat) { setEditEventLocationSuggestions([]); return; }
      setEditEventLocationSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(editEventLocationQuery)}&limit=5`);
        setEditEventLocationSuggestions(await res.json());
      } catch {} finally { setEditEventLocationSearching(false); }
    };
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [editEventLocationQuery]);

  const addConditional = () => {
    setEditConditionals(prev => [...prev, { id: Math.random().toString(36).slice(2), type: 'more', thresholdHours: 1, grantHours: 1 }]);
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

  const handleLogoUpload = (file: File, setUrl: (url: string) => void) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const createMutation = useMutation({
    mutationFn: () => createPartnership({
      name: newName,
      description: newDesc,
      ownerEmail: user.email,
      ownerName: user.name,
      orgType: newOrgType,
      requireApproval: true,
      address: newAddress,
      color: '#3B82F6',
      logoUrl: newLogoUrl || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-partnerships-owned', user.email] });
      qc.invalidateQueries({ queryKey: ['firebase-all-partnerships'] });
      setShowCreateDialog(false);
      setNewName(''); setNewDesc(''); setNewAddress(''); setNewLogoUrl('');
      toast({ title: "Partnership created!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updatePartnership(selectedPartnership!.id, {
      name: editName,
      description: editDesc,
      address: editAddressQuery || editAddress,
      latitude: editLat ?? undefined,
      longitude: editLng ?? undefined,
      color: editColor,
      logoUrl: editLogoUrl || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-partnerships-owned', user.email] });
      qc.invalidateQueries({ queryKey: ['firebase-all-partnerships'] });
      toast({ title: "Partnership updated" });
    },
    onError: (e: any) => toast({ title: "Failed to save", description: e?.message || "Check Firestore permissions.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePartnership(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-partnerships-owned', user.email] });
      qc.invalidateQueries({ queryKey: ['firebase-all-partnerships'] });
      setSelectedPartnership(null);
      setView('list');
      toast({ title: "Partnership deleted" });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: () => createEvent({
      partnershipId: selectedPartnership!.id,
      name: newEventName.trim(),
      description: newEventDesc.trim() || undefined,
      type: newEventType,
      password: newEventType === 'password' ? newEventPassword : undefined,
      conditionals: [],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-partnership-events', selectedPartnership?.id] });
      setNewEventName(''); setNewEventDesc(''); setNewEventType('none'); setNewEventPassword('');
      setShowCreateEventDialog(false);
      toast({ title: "Event created" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create event", description: error?.message || "An error occurred.", variant: "destructive" });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: () => updateEvent(selectedPartnershipEvent!.id, {
      name: editEventName,
      description: editEventDesc,
      type: editEventType,
      password: editEventType === 'password' ? editEventPassword : undefined,
      conditionals: editConditionals,
      logId: (editLogId && editLogId !== '_none') ? editLogId : undefined,
      logName: targetClubLogs.find(l => String(l.id) === editLogId)?.name,
      targetClubId: selectedTargetClubId || undefined,
      latitude: editEventLat ?? undefined,
      longitude: editEventLng ?? undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-partnership-events', selectedPartnership?.id] });
      setSelectedPartnershipEvent(prev => prev ? {
        ...prev,
        name: editEventName,
        description: editEventDesc,
        type: editEventType as any,
        password: editEventType === 'password' ? editEventPassword : undefined,
        conditionals: editConditionals,
        logId: (editLogId && editLogId !== '_none') ? editLogId : undefined,
        targetClubId: selectedTargetClubId || undefined,
      } : prev);
      toast({ title: "Event updated" });
    },
    onError: (e: any) => toast({ title: "Failed to update event", description: e?.message || "Check Firestore permissions.", variant: "destructive" }),
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-partnership-events', selectedPartnership?.id] });
      setSelectedPartnershipEvent(null);
      toast({ title: "Event deleted" });
    },
  });

  const toggleEventMutation = useMutation({
    mutationFn: ({ id, isOpen }: { id: string; isOpen: boolean }) => updateEvent(id, { isOpen }),
    onSuccess: (_, { id, isOpen }) => {
      qc.invalidateQueries({ queryKey: ['firebase-partnership-events', selectedPartnership?.id] });
      qc.invalidateQueries({ queryKey: ['firebase-all-open-events'] });
      setSelectedPartnershipEvent(prev => prev?.id === id ? { ...prev, isOpen } : prev);
      toast({ title: isOpen ? "Event opened" : "Event closed" });
    },
  });

  const { data: attendance = [], refetch: refetchAttendance } = useQuery<EventAttendance[]>({
    queryKey: ['firebase-event-attendance', selectedPartnershipEvent?.id],
    queryFn: () => getEventAttendance(selectedPartnershipEvent!.id),
    enabled: !!selectedPartnershipEvent?.id,
    refetchInterval: 5000,
  });

  // Pre-fill override hours from submitted hours for password events
  useEffect(() => {
    if (selectedPartnershipEvent?.type !== 'password') return;
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
  }, [attendance, selectedPartnershipEvent?.type]);

  const handleCheckInScan = async (text: string) => {
    try {
      const email = text.trim();
      const existing = attendance.find(a => a.userEmail === email && !a.checkOutTime);
      if (existing) { setScanResult({ success: false, message: `${email} is already checked in` }); return; }
      await checkInUser(selectedPartnershipEvent!.id, selectedPartnershipEvent!.name, email, email, undefined, selectedPartnership?.id);
      setScanResult({ success: true, message: `✓ ${email} checked in` });
      refetchAttendance();
    } catch (e: any) { setScanResult({ success: false, message: e.message || 'Check-in failed' }); }
  };

  const handleCheckOutScan = async (text: string) => {
    try {
      const email = text.trim();
      const record = attendance.find(a => a.userEmail === email && !a.checkOutTime);
      if (!record) { setScanResult({ success: false, message: `${email} is not checked in` }); return; }
      await checkOutUser(record.id);
      setScanResult({ success: true, message: `✓ ${email} checked out` });
      refetchAttendance();
    } catch (e: any) { setScanResult({ success: false, message: e.message || 'Check-out failed' }); }
  };

  const grantMutation = useMutation({
    mutationFn: async () => {
      const isQRType = selectedPartnershipEvent && ['scan_qr', 'show_qr'].includes(selectedPartnershipEvent.type);
      const targetRecords = selectedAttendees.length > 0
        ? attendance.filter(a => selectedAttendees.includes(a.id))
        : attendance;

      for (const record of targetRecords) {
        if (overrideHours[record.id]) {
          await updateAttendanceHours(record.id, parseFloat(overrideHours[record.id]));
        }
      }

      const isPasswordType = selectedPartnershipEvent?.type === 'password';
      const useConditionals = (isQRType || isPasswordType) && editConditionals.length > 0;
      const defHours = defaultHours ? parseFloat(defaultHours) : null;

      await grantEventHours(
        selectedPartnershipEvent!.id,
        selectedPartnershipEvent!.name,
        targetRecords.filter(r => !overrideHours[r.id]),
        defHours,
        useConditionals ? editConditionals : [],
        undefined,
        (editLogId && editLogId !== '_none') ? editLogId : undefined,
        targetClubLogs.find(l => String(l.id) === editLogId)?.name,
        selectedPartnership?.id,
      );
    },
    onSuccess: () => {
      refetchAttendance();
      setSelectedAttendees([]);
      setOverrideHours({});
      setDefaultHours('');
      toast({ title: "Hours granted!" });
    },
    onError: (e: any) => toast({ title: "Failed to grant hours", description: e?.message, variant: "destructive" }),
  });

  const sendAffiliationMutation = useMutation({
    mutationFn: (targetClub: { id: string; name: string }) =>
      requestAffiliation(selectedPartnership!.id, selectedPartnership!.name, targetClub.id, targetClub.name, user.email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-partnership-affiliations', selectedPartnership?.id] });
      setAffiliateClubSearch('');
      toast({ title: "Affiliation requested!", description: "The club admin will review your request." });
    },
    onError: (e: any) => {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    },
  });

  const removeAffiliationMutation = useMutation({
    mutationFn: ({ id, clubId }: { id: string; clubId: string }) =>
      removeAffiliation(id, selectedPartnership!.id, clubId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-partnership-affiliations', selectedPartnership?.id] });
      toast({ title: "Affiliation removed" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to remove", description: e.message, variant: "destructive" });
    },
  });

  const totalHours = (partnershipSubmissions as any[])
    .filter(s => s.status === 'approved')
    .reduce((sum, s) => sum + (s.hours || 0), 0);
  const uniqueVolunteers = new Set((partnershipSubmissions as any[]).map(s => s.userEmail)).size;
  const pendingCount = (partnershipSubmissions as any[]).filter(s => s.status === 'pending').length;
  const pendingAffiliations = affiliations.filter(a => a.status === 'pending');
  const approvedAffiliations = affiliations.filter(a => a.status === 'approved');

  const filteredClubsForAffiliation = allClubs.filter(c =>
    c.name.toLowerCase().includes(affiliateClubSearch.toLowerCase()) &&
    !affiliations.find(a => a.clubId === c.id && a.status !== 'rejected')
  );

  const isOwner = (p: Partnership) => p.ownerEmail === user.email;

  // Restore manage view from URL hash on load
  useEffect(() => {
    if (allPartnerships.length === 0) return;
    const hash = window.location.hash.replace('#', '');
    const params = new URLSearchParams(hash);
    const pId = params.get('p');
    if (pId) {
      const found = allPartnerships.find(p => p.id === pId);
      if (found && found.ownerEmail === user.email) {
        setSelectedPartnership(found);
        setActiveTab('overview');
        setView('manage');
      }
    }
  }, [allPartnerships]);

  const filteredAll = allPartnerships.filter(p =>
    p.name.toLowerCase().includes(partnershipSearch.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(partnershipSearch.toLowerCase())
  );

  // ─── MANAGE VIEW (full-screen overlay with black sidebar) ─────────────────
  if (view === 'manage' && selectedPartnership) {
    const sidebarItems: { id: ManageTab; label: string; icon: any; badge?: number }[] = [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'events', label: 'Events', icon: Calendar },
      { id: 'volunteers', label: 'Volunteers', icon: Users },
      { id: 'affiliations', label: 'Affiliations', icon: Handshake, badge: pendingAffiliations.length || undefined },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];

    // compute richer stats
    const approvedSubs = (partnershipSubmissions as any[]).filter(s => s.status === 'approved');
    const rejectedSubs = (partnershipSubmissions as any[]).filter(s => s.status === 'rejected');
    const totalSubmissions = (partnershipSubmissions as any[]).length;
    const approvalRate = totalSubmissions > 0 ? Math.round((approvedSubs.length / totalSubmissions) * 100) : 0;

    const volunteerLeaderboard = Object.entries(
      approvedSubs.reduce((acc: Record<string, { name: string; hours: number; submissions: number }>, s: any) => {
        if (!acc[s.userEmail]) acc[s.userEmail] = { name: s.userName || s.userEmail, hours: 0, submissions: 0 };
        acc[s.userEmail].hours += s.hours;
        acc[s.userEmail].submissions += 1;
        return acc;
      }, {})
    ).sort(([, a], [, b]) => (b as any).hours - (a as any).hours);

    const clubHoursBreakdown = Object.entries(
      approvedSubs.reduce((acc: Record<string, { name: string; hours: number }>, s: any) => {
        const key = s.clubId || 'unknown';
        const name = s.clubName || s.clubId || 'Unknown Club';
        if (!acc[key]) acc[key] = { name, hours: 0 };
        acc[key].hours += s.hours;
        return acc;
      }, {})
    ).sort(([, a], [, b]) => (b as any).hours - (a as any).hours);

    return (
      <div className="fixed inset-0 z-[100] flex bg-white overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
          {/* Back + branding */}
          <div className="px-4 pt-5 pb-4 border-b border-gray-200">
            <button
              onClick={() => { setView('list'); setSelectedPartnership(null); window.location.hash = ''; }}
              className="text-xs text-gray-500 hover:text-gray-900 mb-4 flex items-center gap-1.5 transition-colors"
            >
              ← Back
            </button>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden border border-gray-200"
                style={{ backgroundColor: selectedPartnership.logoUrl ? undefined : (selectedPartnership.color || '#3B82F6') }}
              >
                {selectedPartnership.logoUrl
                  ? <img src={selectedPartnership.logoUrl} alt={selectedPartnership.name} className="w-full h-full object-cover" />
                  : <Building2 className="w-5 h-5 text-white opacity-60 mx-auto mt-2.5" />
                }
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate leading-tight">{selectedPartnership.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{ORG_TYPE_LABELS[selectedPartnership.orgType]}</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-0.5">
            {sidebarItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Footer info */}
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">Partnership Admin</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 bg-white overflow-hidden flex flex-col">
          {activeTab === 'events' ? (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left: event list */}
              <div className="w-72 border-r border-gray-200 flex flex-col flex-shrink-0">
                <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Events</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Track attendance via QR code or password. Grant hours to participants.</p>
                  </div>
                  <Dialog open={showCreateEventDialog} onOpenChange={setShowCreateEventDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-black hover:bg-gray-800 text-white flex-shrink-0">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create Event</DialogTitle>
                        <p className="text-sm text-gray-500">Create an event volunteers can join and submit hours for.</p>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-1">
                          <Label>Event Name</Label>
                          <Input value={newEventName} onChange={e => setNewEventName(e.target.value)} placeholder="Volunteer Day, Community Fair..." />
                        </div>
                        <div className="space-y-1">
                          <Label>Description <span className="text-gray-400">(optional)</span></Label>
                          <Textarea value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)} rows={2} />
                        </div>
                        <div className="space-y-1">
                          <Label>Check-in Method</Label>
                          <Select value={newEventType} onValueChange={(v) => setNewEventType(v as ClubEvent['type'])}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent className="z-[200]">
                              <SelectItem value="none">Open — No check-in required</SelectItem>
                              <SelectItem value="password">Password — Volunteers enter a password</SelectItem>
                              <SelectItem value="scan_qr">Scan QR — You scan volunteers' QR codes</SelectItem>
                              <SelectItem value="show_qr">Show QR — Volunteers scan your QR codes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {newEventType === 'password' && (
                          <div className="space-y-1">
                            <Label>Password</Label>
                            <Input value={newEventPassword} onChange={e => setNewEventPassword(e.target.value)} />
                          </div>
                        )}
                        <Button
                          className="w-full bg-black hover:bg-gray-800 text-white"
                          onClick={() => createEventMutation.mutate()}
                          disabled={!newEventName.trim() || createEventMutation.isPending}
                        >
                          {createEventMutation.isPending ? "Creating..." : "Create Event"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex-1 overflow-auto p-3 space-y-2">
                  {partnershipEvents.length === 0 && (
                    <div className="text-center py-12">
                      <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-600">No events yet</p>
                    </div>
                  )}
                  {partnershipEvents.map(event => {
                    const isSelected = selectedPartnershipEvent?.id === event.id;
                    const isOpen = event.isOpen !== false;
                    return (
                      <div
                        key={event.id}
                        className={`rounded-lg border transition-colors ${isSelected ? 'bg-gray-100 border-gray-400' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                      >
                        <button
                          onClick={() => setSelectedPartnershipEvent(event)}
                          className="w-full text-left p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${isOpen ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">{event.name}</p>
                                {event.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{event.description}</p>}
                              </div>
                            </div>
                            <Badge className={`text-xs flex-shrink-0 ${EVENT_TYPE_COLORS[event.type] || 'bg-gray-100 text-gray-600'}`}>
                              {EVENT_TYPE_LABELS[event.type] || event.type}
                            </Badge>
                          </div>
                        </button>
                        <div className="px-3 pb-2 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEventMutation.mutate({ id: event.id, isOpen: !isOpen });
                            }}
                            disabled={toggleEventMutation.isPending}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${isOpen ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100' : 'border-gray-200 text-gray-500 bg-gray-50 hover:bg-gray-100'}`}
                          >
                            {isOpen ? 'Close event' : 'Open event'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: event workspace */}
              {!selectedPartnershipEvent ? (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600">Select an Event</h3>
                    <p className="text-sm text-gray-400 mt-1">Click an event on the left to manage it</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-gray-900">{selectedPartnershipEvent.name}</h2>
                          <Badge className={EVENT_TYPE_COLORS[selectedPartnershipEvent.type] || 'bg-gray-100 text-gray-600'}>
                            {EVENT_TYPE_LABELS[selectedPartnershipEvent.type] || selectedPartnershipEvent.type}
                          </Badge>
                        </div>
                        {selectedPartnershipEvent.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{selectedPartnershipEvent.description}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => deleteEventMutation.mutate(selectedPartnershipEvent.id)}
                        disabled={deleteEventMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex gap-1 mt-3 border-b border-gray-200 -mb-4 pb-0">
                      {(['information', 'qrcode', 'grant'] as PartnershipEventTab[]).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActivePartnershipEventTab(tab)}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activePartnershipEventTab === tab ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                          {tab === 'information' && 'Information'}
                          {tab === 'qrcode' && <span className="flex items-center gap-1"><QrCode className="w-4 h-4" /> QR Code</span>}
                          {tab === 'grant' && <span className="flex items-center gap-1"><Award className="w-4 h-4" /> Grant Hours</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-6">

                    {/* INFORMATION TAB */}
                    {activePartnershipEventTab === 'information' && (
                      <div className="space-y-4">
                        {['scan_qr', 'show_qr'].includes(editEventType) && (
                          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-amber-800">QR check-in has important limitations for partnerships</p>
                              <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                                Only use a QR event if <strong>all participants will be from a single affiliated club</strong> and you currently have <strong>exactly one affiliated club</strong>.
                                QR events tie attendance to one club's logs and hour grants — volunteers from other clubs won't be captured correctly.
                                If you expect volunteers from multiple clubs, use a <strong>Password event</strong> instead so each volunteer submits hours to their own club.
                              </p>
                            </div>
                          </div>
                        )}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Event Settings</CardTitle>
                          <CardDescription>Update the event name, description, and check-in method.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-1">
                            <Label>Event Name</Label>
                            <Input value={editEventName} onChange={e => setEditEventName(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label>Description</Label>
                            <Textarea value={editEventDesc} onChange={e => setEditEventDesc(e.target.value)} rows={3} />
                          </div>
                          <div className="space-y-1">
                            <Label>Check-in Method</Label>
                            <Select value={editEventType} onValueChange={(v) => setEditEventType(v as ClubEvent['type'])}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent className="z-[200]">
                                <SelectItem value="none">Open — No check-in required</SelectItem>
                                <SelectItem value="password">Password Protected</SelectItem>
                                <SelectItem value="scan_qr">Scan QR — You scan volunteers' QR codes</SelectItem>
                                <SelectItem value="show_qr">Show QR — Volunteers scan your QR codes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {editEventType === 'password' && (
                            <div className="space-y-1">
                              <Label>Password</Label>
                              <Input value={editEventPassword} onChange={e => setEditEventPassword(e.target.value)} />
                            </div>
                          )}

                          <div className="border-t border-gray-100 pt-4 space-y-4">
                            {/* Club affiliation */}
                            <div className="space-y-1">
                              <Label>Club Affiliation <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                              <Select value={selectedTargetClubId || '_none'} onValueChange={v => setSelectedTargetClubId(v === '_none' ? '' : v)}>
                                <SelectTrigger><SelectValue placeholder="No affiliation" /></SelectTrigger>
                                <SelectContent className="z-[200]">
                                  <SelectItem value="_none">No affiliation</SelectItem>
                                  {approvedAffiliations.map(a => (
                                    <SelectItem key={a.clubId} value={a.clubId}>{a.clubName}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-gray-400">Links this event to a club — it will appear in that club's map pin. If no affiliation, a location is required.</p>
                            </div>

                            {/* Event location */}
                            <div className="space-y-1 relative">
                              <div className="flex items-center justify-between">
                                <Label>
                                  Event Location
                                  {!selectedTargetClubId && <span className="text-red-500 ml-1">*</span>}
                                </Label>
                                {selectedPartnership?.latitude != null && selectedPartnership?.longitude != null && (
                                  <button
                                    type="button"
                                    className="text-xs text-blue-600 hover:underline"
                                    onClick={() => {
                                      setEditEventLat(selectedPartnership.latitude!);
                                      setEditEventLng(selectedPartnership.longitude!);
                                      setEditEventLocationQuery('Partnership HQ');
                                      setEditEventLocationSuggestions([]);
                                    }}
                                  >
                                    Use HQ
                                  </button>
                                )}
                              </div>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <Input
                                  className="pl-9 pr-9"
                                  value={editEventLocationQuery}
                                  onChange={e => { setEditEventLocationQuery(e.target.value); setEditEventLat(null); setEditEventLng(null); }}
                                  placeholder="Search location..."
                                />
                                {editEventLocationSearching && (
                                  <RefreshCw className="absolute right-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                                )}
                                {editEventLat && editEventLng && (
                                  <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                    onClick={() => { setEditEventLat(null); setEditEventLng(null); setEditEventLocationQuery(''); }}
                                  >
                                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                  </button>
                                )}
                              </div>
                              {editEventLocationSuggestions.length > 0 && (
                                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                  {editEventLocationSuggestions.map((s: any, i: number) => (
                                    <button
                                      key={i}
                                      type="button"
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                                      onClick={() => {
                                        const name = s.display_name.split(',').slice(0, 3).join(',').trim();
                                        setEditEventLocationQuery(name);
                                        setEditEventLat(parseFloat(s.lat));
                                        setEditEventLng(parseFloat(s.lon));
                                        setEditEventLocationSuggestions([]);
                                      }}
                                    >
                                      {s.display_name.split(',').slice(0, 3).join(', ')}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {editEventLat && editEventLng && (
                                <p className="text-xs text-green-600">Location set: {editEventLat.toFixed(4)}, {editEventLng.toFixed(4)}</p>
                              )}
                              {!selectedTargetClubId && !editEventLat && (
                                <p className="text-xs text-amber-600">A location is required when no club affiliation is set — the event won't appear on the map otherwise.</p>
                              )}
                            </div>
                          </div>

                          <Button
                            onClick={() => updateEventMutation.mutate()}
                            disabled={updateEventMutation.isPending || (!selectedTargetClubId && !editEventLat)}
                            className="w-full bg-black hover:bg-gray-800 text-white disabled:opacity-50"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </CardContent>
                      </Card>
                      </div>
                    )}

                    {/* QR CODE TAB */}
                    {activePartnershipEventTab === 'qrcode' && (() => {
                      const isQRType = ['scan_qr', 'show_qr'].includes(selectedPartnershipEvent.type);
                      return (
                        <div className="space-y-6">
                          {selectedPartnershipEvent.type === 'none' && (
                            <Card>
                              <CardContent className="pt-6 text-center py-10">
                                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-gray-600 font-medium">This event has no QR code</p>
                                <p className="text-sm text-gray-400 mt-1">Change the check-in method to "Scan QR" or "Show QR" in the Information tab.</p>
                              </CardContent>
                            </Card>
                          )}
                          {selectedPartnershipEvent.type === 'password' && (
                            <Card>
                              <CardContent className="pt-6 text-center py-10">
                                <p className="text-gray-600 font-medium">Password-protected event</p>
                                <p className="text-sm text-gray-400 mt-1">Volunteers enter a password when submitting hours. No QR scanning needed.</p>
                              </CardContent>
                            </Card>
                          )}
                          {selectedPartnershipEvent.type === 'show_qr' && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2"><QrCode className="w-5 h-5" /> Event QR Codes</CardTitle>
                                <CardDescription>Display these on a screen or print them out. Volunteers scan the Check-in QR when they arrive and the Check-out QR when they leave. Their time is automatically recorded.</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-2 gap-6">
                                  <div className="text-center space-y-3">
                                    <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
                                      <CheckCircle2 className="w-4 h-4" /> Check-in
                                    </div>
                                    <div className="p-4 bg-white border-2 border-green-200 rounded-xl inline-block">
                                      <QRCode value={JSON.stringify({ eventId: selectedPartnershipEvent.id, action: 'checkin', partnershipId: selectedPartnership?.id })} size={160} />
                                    </div>
                                    <p className="text-xs text-gray-500">Scan this to check IN</p>
                                  </div>
                                  <div className="text-center space-y-3">
                                    <div className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium">
                                      <XCircle className="w-4 h-4" /> Check-out
                                    </div>
                                    <div className="p-4 bg-white border-2 border-red-200 rounded-xl inline-block">
                                      <QRCode value={JSON.stringify({ eventId: selectedPartnershipEvent.id, action: 'checkout', partnershipId: selectedPartnership?.id })} size={160} />
                                    </div>
                                    <p className="text-xs text-gray-500">Scan this to check OUT</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          {selectedPartnershipEvent.type === 'scan_qr' && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2"><ScanLine className="w-5 h-5" /> QR Code Scanner</CardTitle>
                                <CardDescription>Leave this device at the event table. Volunteers line up and show their personal QR codes (found in their profile). Scan to check them in or out.</CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="flex gap-2 border-b border-gray-200">
                                  {(['checkin', 'checkout'] as QRSubTab[]).map(sub => (
                                    <button key={sub} onClick={() => setQrSubTab(sub)}
                                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${qrSubTab === sub ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500'}`}>
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
                                {qrSubTab === 'checkin' && <QRScanner onScan={handleCheckInScan} />}
                                {qrSubTab === 'checkout' && <QRScanner onScan={handleCheckOutScan} />}
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

                          {/* Multi-club discouragement banner */}
                          {isQRType && approvedAffiliations.length !== 1 && (
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 border border-yellow-200">
                              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-yellow-800">
                                  {approvedAffiliations.length === 0
                                    ? 'No affiliated clubs yet'
                                    : `${approvedAffiliations.length} clubs are affiliated`}
                                </p>
                                <p className="text-xs text-yellow-700 mt-0.5">
                                  QR check-in events work best when you're hosting a single affiliated club — logs and hour grants are tied to one club's members.
                                  {' '}
                                  <span className="font-semibold">Consider using a Password event instead</span> — volunteers from any affiliated club can submit hours using a shared password without needing to designate a single club.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Conditionals card — QR events only */}
                          {isQRType && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">Hour Conditionals &amp; Log</CardTitle>
                                <CardDescription>
                                  Select which affiliated club this QR event is for, then choose a log. Conditionals automatically grant hours based on time stayed.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">

                                {/* Step 1: Select affiliated club */}
                                <div className="space-y-1.5">
                                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center flex-shrink-0">1</span>
                                    Select affiliated club
                                  </Label>
                                  {approvedAffiliations.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">No affiliated clubs yet. Approve affiliations in the Affiliations tab first.</p>
                                  ) : (
                                    <Select value={selectedTargetClubId} onValueChange={v => { setSelectedTargetClubId(v); setEditLogId(''); }}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Choose a club…" />
                                      </SelectTrigger>
                                      <SelectContent className="z-[200]">
                                        {approvedAffiliations.map(aff => (
                                          <SelectItem key={aff.clubId} value={aff.clubId}>{aff.clubName}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  <p className="text-xs text-gray-400">This event will be scoped to members of the selected club.</p>
                                </div>

                                {/* Step 2: Select a log — only shown once a club is chosen */}
                                <div className={`space-y-1.5 ${!selectedTargetClubId ? 'opacity-40 pointer-events-none' : ''}`}>
                                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                                    <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center flex-shrink-0 ${selectedTargetClubId ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
                                    Append hours to Log <span className="text-gray-400 font-normal">(optional)</span>
                                  </Label>
                                  <Select value={editLogId} onValueChange={setEditLogId} disabled={!selectedTargetClubId}>
                                    <SelectTrigger>
                                      <SelectValue placeholder={selectedTargetClubId ? 'No log selected' : 'Select a club first'} />
                                    </SelectTrigger>
                                    <SelectContent className="z-[200]">
                                      <SelectItem value="_none">No log</SelectItem>
                                      {targetClubLogs.map(l => (
                                        <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {selectedTargetClubId && targetClubLogs.length === 0 && (
                                    <p className="text-xs text-gray-400 italic">This club has no active logs.</p>
                                  )}
                                  <p className="text-xs text-gray-400">Granted hours will count toward the selected log's requirement.</p>
                                </div>

                                <div className="border-t border-gray-100 pt-3 space-y-3">
                                  <Label className="text-sm font-semibold">Hour Conditionals</Label>
                                  <p className="text-xs text-gray-500">Automatically grant different hours based on how long volunteers stayed. Checked in order — first match wins.</p>
                                  {editConditionals.length === 0 && (
                                    <p className="text-sm text-gray-500 italic">No conditionals yet. Add one below, or leave empty to manually set hours in Grant Hours tab.</p>
                                  )}
                                  {editConditionals.map((cond, idx) => (
                                    <div key={cond.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                      <span className="text-xs text-gray-500 w-4">{idx + 1}.</span>
                                      <span className="text-sm text-gray-700">If stayed</span>
                                      <Select value={cond.type} onValueChange={(v) => updateConditional(cond.id, 'type', v)}>
                                        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent className="z-[200]">
                                          <SelectItem value="less">less than</SelectItem>
                                          <SelectItem value="exact">exactly</SelectItem>
                                          <SelectItem value="more">at least</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Input type="number" step="0.5" min="0"
                                        value={cond.thresholdHours}
                                        onChange={e => updateConditional(cond.id, 'thresholdHours', parseFloat(e.target.value) || 0)}
                                        className="w-20 h-8 text-xs" />
                                      <span className="text-sm text-gray-700">hours → grant</span>
                                      <Input type="number" step="0.5" min="0"
                                        value={cond.grantHours}
                                        onChange={e => updateConditional(cond.id, 'grantHours', parseFloat(e.target.value) || 0)}
                                        className="w-20 h-8 text-xs" />
                                      <span className="text-sm text-gray-700">hrs</span>
                                      <button onClick={() => removeConditional(cond.id)} className="ml-auto text-red-400 hover:text-red-600">
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                  <Button variant="outline" size="sm" onClick={addConditional} className="w-full">
                                    <Plus className="w-4 h-4 mr-1" /> Add Conditional
                                  </Button>
                                </div>

                                <Button onClick={() => updateEventMutation.mutate()} disabled={updateEventMutation.isPending} className="w-full bg-black hover:bg-gray-800 text-white">
                                  <Save className="w-4 h-4 mr-2" />
                                  Save
                                </Button>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      );
                    })()}

                    {/* GRANT HOURS TAB */}
                    {activePartnershipEventTab === 'grant' && (() => {
                      const isQRType = ['scan_qr', 'show_qr'].includes(selectedPartnershipEvent.type);
                      const isPasswordType = selectedPartnershipEvent.type === 'password';
                      const conditionalsActive = (isQRType || isPasswordType) && editConditionals.length > 0;
                      return (
                        <div className="space-y-5">
                          {/* Conditionals card — password events only (in Grant Hours tab) */}
                          {isPasswordType && (
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
                                      <SelectContent className="z-[200]">
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
                                {conditionalsActive
                                  ? "Conditionals are active. Hours will be auto-calculated based on submitted amounts. You can override individual amounts below."
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
                                    {selectedPartnershipEvent.type === 'none' ? "Attendees are added when volunteers submit hours for this event." : "Attendees will appear here after checking in."}
                                  </p>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={selectedAttendees.length === attendance.length}
                                        onCheckedChange={(checked) => setSelectedAttendees(checked ? attendance.map(a => a.id) : [])}
                                      />
                                      <span className="text-sm text-gray-600">{selectedAttendees.length > 0 ? `${selectedAttendees.length} selected` : 'Select all'}</span>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => refetchAttendance()}>
                                      <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                                    </Button>
                                  </div>
                                  {!conditionalsActive && (
                                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                                      <Label className="text-sm whitespace-nowrap">Default hours for all:</Label>
                                      <Input type="number" step="0.5" min="0" value={defaultHours} onChange={e => setDefaultHours(e.target.value)} placeholder="e.g. 2.5" className="w-28 h-8" />
                                      <p className="text-xs text-gray-500">Applied to everyone without a custom amount</p>
                                    </div>
                                  )}
                                  <div className="space-y-2 max-h-96 overflow-auto">
                                    {attendance.map(a => {
                                      const effectiveMinutes = isPasswordType ? a.minutesAttended : a.minutesAttended;
                                      const conditionalHours = conditionalsActive ? computeConditionalHours(effectiveMinutes) : null;
                                      const isSelected = selectedAttendees.includes(a.id);
                                      return (
                                        <div key={a.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isSelected ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'}`}>
                                          <Checkbox checked={isSelected} onCheckedChange={(checked) => setSelectedAttendees(prev => checked ? [...prev, a.id] : prev.filter(id => id !== a.id))} />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{a.userName || a.userEmail}</p>
                                            <p className="text-xs text-gray-500 truncate">{a.userEmail}</p>
                                          </div>
                                          <div className="text-xs text-gray-500 space-y-0.5 text-right flex-shrink-0">
                                            {isPasswordType && a.minutesAttended != null && (
                                              <div className="text-gray-700 font-medium">Submitted: {a.minutesAttended / 60}h</div>
                                            )}
                                            {!isPasswordType && a.checkInTime && <div>In: {formatTime(a.checkInTime)}</div>}
                                            {!isPasswordType && a.checkOutTime && <div>Out: {formatTime(a.checkOutTime)}</div>}
                                            {!isPasswordType && a.minutesAttended != null && <div className="text-blue-600 font-medium">{formatMinutes(a.minutesAttended)}</div>}
                                          </div>
                                          {conditionalHours != null && (
                                            <Badge className="bg-blue-100 text-blue-700 text-xs">{conditionalHours}h (auto)</Badge>
                                          )}
                                          {a.grantStatus === 'granted' && (
                                            <Badge className="bg-green-100 text-green-700 text-xs">✓ {a.hoursGranted}h granted</Badge>
                                          )}
                                          <Input type="number" step="0.5" min="0" placeholder="Override" value={overrideHours[a.id] || ''} onChange={e => setOverrideHours(prev => ({ ...prev, [a.id]: e.target.value }))} className="w-24 h-7 text-xs" />
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <Button onClick={() => grantMutation.mutate()} disabled={grantMutation.isPending} className="w-full bg-black hover:bg-gray-800 text-white">
                                    <Award className="w-4 h-4 mr-2" />
                                    {grantMutation.isPending ? "Granting..." : `Grant Hours to ${selectedAttendees.length > 0 ? `${selectedAttendees.length} selected` : 'all attendees'}`}
                                  </Button>
                                </>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ) : (
          <div className="flex-1 overflow-auto">
          <div className="p-8">

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-7">
                <div className="pb-4 border-b border-gray-200">
                  <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">{selectedPartnership.name}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge className={ORG_TYPE_COLORS[selectedPartnership.orgType]}>{ORG_TYPE_LABELS[selectedPartnership.orgType]}</Badge>
                    {selectedPartnership.address && (
                      <span className="text-sm text-gray-400">{selectedPartnership.address}</span>
                    )}
                  </div>
                  {selectedPartnership.description && (
                    <p className="text-gray-500 mt-2 text-sm">{selectedPartnership.description}</p>
                  )}
                </div>

                {/* Primary stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Hours', value: totalHours.toFixed(1), icon: Award, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Volunteers', value: uniqueVolunteers, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Affiliated Clubs', value: approvedAffiliations.length, icon: Handshake, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Active Events', value: partnershipEvents.length, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
                  ].map(stat => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-5">
                        <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                          <Icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Secondary stats bar */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Submission Breakdown</h3>
                  <div className="grid grid-cols-4 divide-x divide-gray-100">
                    {[
                      { label: 'Total Submissions', value: totalSubmissions, color: 'text-gray-900' },
                      { label: 'Approved', value: approvedSubs.length, color: 'text-green-600' },
                      { label: 'Pending', value: pendingCount, color: 'text-yellow-600' },
                      { label: 'Approval Rate', value: `${approvalRate}%`, color: approvalRate >= 75 ? 'text-green-600' : approvalRate >= 50 ? 'text-yellow-600' : 'text-red-600' },
                    ].map(item => (
                      <div key={item.label} className="px-5 first:pl-0 last:pr-0">
                        <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  {totalSubmissions > 0 && (
                    <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-green-500 transition-all" style={{ width: `${(approvedSubs.length / totalSubmissions) * 100}%` }} />
                      <div className="h-full bg-yellow-400 transition-all" style={{ width: `${(pendingCount / totalSubmissions) * 100}%` }} />
                      <div className="h-full bg-red-400 transition-all" style={{ width: `${(rejectedSubs.length / totalSubmissions) * 100}%` }} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Volunteer leaderboard */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Volunteers</h3>
                    {volunteerLeaderboard.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No approved submissions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {volunteerLeaderboard.slice(0, 6).map(([email, data]: [string, any], i) => (
                          <div key={email} className="flex items-center gap-3">
                            <div className="w-6 text-center flex-shrink-0">
                              {i === 0 ? <span>🥇</span> : i === 1 ? <span>🥈</span> : i === 2 ? <span>🥉</span> : (
                                <span className="text-xs text-gray-400 font-semibold">#{i + 1}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{data.name}</p>
                              <p className="text-xs text-gray-400">{data.submissions} submission{data.submissions !== 1 ? 's' : ''}</p>
                            </div>
                            <p className="text-sm font-bold text-gray-900 flex-shrink-0">{data.hours.toFixed(1)}h</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Club breakdown */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Hours by Club</h3>
                    {clubHoursBreakdown.length === 0 ? (
                      <div className="text-center py-8">
                        <Handshake className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No club data yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {clubHoursBreakdown.slice(0, 6).map(([clubId, data]: [string, any]) => {
                          const maxHours = (clubHoursBreakdown[0][1] as any).hours;
                          const pct = maxHours > 0 ? (data.hours / maxHours) * 100 : 0;
                          return (
                            <div key={clubId}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="font-medium text-gray-700 truncate">{data.name}</span>
                                <span className="font-bold text-gray-900 ml-2 flex-shrink-0">{data.hours.toFixed(1)}h</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gray-900 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent activity */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h3>
                  {(partnershipSubmissions as any[]).length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No activity yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(partnershipSubmissions as any[]).slice(0, 8).map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === 'approved' ? 'bg-green-500' : s.status === 'rejected' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{s.userName || s.userEmail}</p>
                              <p className="text-xs text-gray-400 truncate">{s.activityName || s.description || 'No description'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                            <span className="text-sm font-bold text-gray-900">{s.hours}h</span>
                            <Badge className={`text-xs ${s.status === 'approved' ? 'bg-green-100 text-green-700' : s.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {s.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Volunteers Tab */}
            {activeTab === 'volunteers' && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Volunteer Submissions</h1>
                  <p className="text-gray-500 mt-1 text-sm">All hours submitted to this partnership.</p>
                </div>

                {(partnershipSubmissions as any[]).length > 0 && (
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      className="pl-9"
                      placeholder="Search by name, email, or club..."
                      value={volunteerSearch}
                      onChange={e => setVolunteerSearch(e.target.value)}
                    />
                  </div>
                )}

                {(() => {
                  const q = volunteerSearch.toLowerCase();
                  const filtered = (partnershipSubmissions as any[]).filter(s =>
                    !q ||
                    (s.userEmail || '').toLowerCase().includes(q) ||
                    (s.userName || '').toLowerCase().includes(q) ||
                    (s.clubName || '').toLowerCase().includes(q) ||
                    (s.activityName || '').toLowerCase().includes(q)
                  );
                  if (filtered.length === 0) return (
                    <div className="text-center py-16">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">{volunteerSearch ? 'No results found' : 'No submissions yet'}</p>
                      <p className="text-sm text-gray-400 mt-1">{volunteerSearch ? 'Try a different search term' : 'Volunteers can submit hours from their Hours page'}</p>
                    </div>
                  );
                  return (
                    <div className="space-y-2">
                      {filtered.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-900">{s.userName || s.userEmail}</p>
                              {s.clubName && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{s.clubName}</span>}
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">{s.userEmail}</p>
                            <p className="text-sm text-gray-400">{s.activityName || s.description}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                            <span className="font-bold text-gray-900">{s.hours}h</span>
                            <Badge className={s.status === 'approved' ? 'bg-green-100 text-green-700' : s.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                              {s.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Affiliations Tab */}
            {activeTab === 'affiliations' && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Club Affiliations</h1>
                  <p className="text-gray-500 mt-1 text-sm">Request clubs to affiliate. Club admins approve or reject.</p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Request Affiliation</CardTitle>
                    <CardDescription>Search clubs and send an affiliation request.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      placeholder="Search clubs..."
                      value={affiliateClubSearch}
                      onChange={e => setAffiliateClubSearch(e.target.value)}
                    />
                    {affiliateClubSearch && (
                      <div className="space-y-2 max-h-48 overflow-auto">
                        {filteredClubsForAffiliation.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-2">No clubs found</p>
                        ) : (
                          filteredClubsForAffiliation.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0" style={{ backgroundColor: c.color }} />
                                <span className="text-sm font-medium text-gray-900">{c.name}</span>
                              </div>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-black hover:bg-gray-800 text-white"
                                onClick={() => sendAffiliationMutation.mutate({ id: c.id, name: c.name })}
                                disabled={sendAffiliationMutation.isPending}
                              >
                                Request
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {pendingAffiliations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base text-yellow-700">Pending ({pendingAffiliations.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {pendingAffiliations.map(aff => (
                        <div key={aff.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                          <p className="font-medium text-gray-900 text-sm">{aff.clubName}</p>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-yellow-100 text-yellow-700">Awaiting approval</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs"
                              onClick={() => removeAffiliationMutation.mutate({ id: aff.id, clubId: aff.clubId })}
                              disabled={removeAffiliationMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Affiliated Clubs ({approvedAffiliations.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {approvedAffiliations.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No clubs affiliated yet</p>
                    ) : (
                      <div className="space-y-2">
                        {approvedAffiliations.map(aff => (
                          <div key={aff.id} className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                            <span className="font-medium text-gray-900 text-sm">{aff.clubName}</span>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-100 text-green-700">Affiliated</Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs"
                                onClick={() => removeAffiliationMutation.mutate({ id: aff.id, clubId: aff.clubId })}
                                disabled={removeAffiliationMutation.isPending}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Settings</h1>
                  <p className="text-gray-500 mt-1 text-sm">Manage your partnership details.</p>
                </div>

                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-1">
                      <Label>Logo</Label>
                      <input
                        type="file"
                        accept="image/*"
                        ref={editLogoRef}
                        className="hidden"
                        onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0], setEditLogoUrl)}
                      />
                      <div className="flex items-center gap-3">
                        <div
                          className="w-14 h-14 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: editLogoUrl ? undefined : editColor }}
                          onClick={() => editLogoRef.current?.click()}
                        >
                          {editLogoUrl
                            ? <img src={editLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                            : <Image className="w-6 h-6 text-white opacity-60" />
                          }
                        </div>
                        <div>
                          <Button type="button" variant="outline" size="sm" onClick={() => editLogoRef.current?.click()}>
                            <Upload className="w-3 h-3 mr-1" /> {editLogoUrl ? 'Change Logo' : 'Upload Logo'}
                          </Button>
                          {editLogoUrl && (
                            <Button type="button" variant="ghost" size="sm" className="ml-2 text-red-500 h-8" onClick={() => setEditLogoUrl('')}>
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Name</Label>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Description</Label>
                      <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} />
                    </div>
                    <div className="space-y-1 relative">
                      <Label>Address / Location</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <Input
                          className="pl-9 pr-9"
                          value={editAddressQuery}
                          onChange={e => { setEditAddressQuery(e.target.value); setEditLat(null); setEditLng(null); }}
                          placeholder="Search address or place..."
                        />
                        {editAddressSearching && (
                          <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                        )}
                        {editLat && editLng && !editAddressSearching && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                        )}
                      </div>
                      {editAddressSuggestions.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                          {editAddressSuggestions.map((s: any, i: number) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                              onClick={() => {
                                const name = s.display_name.split(',').slice(0, 3).join(',').trim();
                                setEditAddressQuery(name);
                                setEditAddress(name);
                                setEditLat(parseFloat(s.lat));
                                setEditLng(parseFloat(s.lon));
                                setEditAddressSuggestions([]);
                              }}
                            >
                              {s.display_name.split(',').slice(0, 3).join(', ')}
                            </button>
                          ))}
                        </div>
                      )}
                      {editLat && editLng && (
                        <p className="text-xs text-green-600">Location pinned: {editLat.toFixed(5)}, {editLng.toFixed(5)}</p>
                      )}
                      {!editLat && !editLng && editAddressQuery && (
                        <p className="text-xs text-gray-400">Type to search — select a result to pin coordinates</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label>Color</Label>
                      <div className="flex items-center gap-2">
                        <Input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-12 h-10" />
                        <Input value={editColor} onChange={e => setEditColor(e.target.value)} className="flex-1" />
                      </div>
                    </div>
                    <Button
                      className="w-full bg-black hover:bg-gray-800 text-white"
                      onClick={() => updateMutation.mutate()}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-base text-red-700">Danger Zone</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => deleteMutation.mutate(selectedPartnership.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Partnership
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          </div>
          )}
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ─────────────────────────────────────────────────────────────
  const myPartnershipIds = new Set(myPartnerships.map(p => p.id));

  return (
    <div className="flex flex-col bg-white min-h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-start justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Partnerships</h2>
            <p className="text-sm text-gray-500 mt-1">
              Organizations that accept volunteer hours from any club — food banks, businesses, nonprofits, and more.
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-black hover:bg-gray-800 text-white flex-shrink-0">
                <Plus className="w-4 h-4 mr-1.5" />
                Create Partnership
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create a Partnership</DialogTitle>
                <p className="text-sm text-gray-500">
                  For organizations like food banks, businesses, and nonprofits that want to receive volunteer hours.
                </p>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Logo <span className="text-gray-400">(optional)</span></Label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={createLogoRef}
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0], setNewLogoUrl)}
                  />
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-gray-100"
                      onClick={() => createLogoRef.current?.click()}
                    >
                      {newLogoUrl
                        ? <img src={newLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                        : <Image className="w-6 h-6 text-gray-400" />
                      }
                    </div>
                    <div>
                      <Button type="button" variant="outline" size="sm" onClick={() => createLogoRef.current?.click()}>
                        <Upload className="w-3 h-3 mr-1" /> {newLogoUrl ? 'Change' : 'Upload Logo'}
                      </Button>
                      {newLogoUrl && (
                        <Button type="button" variant="ghost" size="sm" className="ml-2 text-red-500 h-8" onClick={() => setNewLogoUrl('')}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Organization Name</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="City Food Bank, Community Center..." />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} placeholder="What does your organization do?" />
                </div>
                <div className="space-y-1">
                  <Label>Organization Type</Label>
                  <Select value={newOrgType} onValueChange={(v) => setNewOrgType(v as Partnership['orgType'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[200]">
                      <SelectItem value="nonprofit">Nonprofit</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="school">School</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Address <span className="text-gray-400">(optional)</span></Label>
                  <Input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="123 Main St, City" />
                </div>
                <Button
                  className="w-full bg-black hover:bg-gray-800 text-white"
                  onClick={() => createMutation.mutate()}
                  disabled={!newName.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Partnership"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="mt-4 max-w-7xl mx-auto">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search partnerships..."
              value={partnershipSearch}
              onChange={e => setPartnershipSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {allLoading ? (
            <div className="text-center py-16 text-gray-400">Loading partnerships...</div>
          ) : filteredAll.length === 0 ? (
            <div className="text-center py-16 max-w-md mx-auto">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700">
                {partnershipSearch ? 'No results' : 'No partnerships yet'}
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                {partnershipSearch
                  ? 'Try a different search term.'
                  : 'Create the first partnership for your organization.'}
              </p>
              {!partnershipSearch && (
                <Button className="mt-4 bg-black hover:bg-gray-800 text-white" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Partnership
                </Button>
              )}
            </div>
          ) : (() => {
            const myFiltered = filteredAll.filter(p => myPartnershipIds.has(p.id));
            const othersFiltered = filteredAll.filter(p => !myPartnershipIds.has(p.id));

            const renderCard = (p: Partnership) => {
              const owned = myPartnershipIds.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (owned) {
                      setSelectedPartnership(p);
                      setActiveTab('overview');
                      setView('manage');
                      window.location.hash = `p=${p.id}`;
                    } else {
                      setBrowsePartnership(p);
                    }
                  }}
                  className="text-left p-4 border border-gray-200 rounded-2xl hover:border-gray-400 hover:shadow-sm transition-all bg-white group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden border border-gray-100"
                      style={{ backgroundColor: p.logoUrl ? undefined : (p.color || '#3B82F6') }}
                    >
                      {p.logoUrl
                        ? <img src={p.logoUrl} alt={p.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white opacity-70" />
                          </div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate leading-tight">{p.name}</p>
                      <Badge className={`text-xs mt-1 ${ORG_TYPE_COLORS[p.orgType]}`}>
                        {ORG_TYPE_LABELS[p.orgType]}
                      </Badge>
                    </div>
                  </div>
                  {p.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{p.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{p.affiliatedClubIds?.length || 0} clubs affiliated</span>
                    {owned ? (
                      <Badge className="bg-gray-900 text-white text-xs">Manage</Badge>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    )}
                  </div>
                </button>
              );
            };

            return (
              <div className="space-y-8">
                {myFiltered.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Your Partnerships</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {myFiltered.map(renderCard)}
                    </div>
                  </div>
                )}
                {othersFiltered.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">All Partnerships</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {othersFiltered.map(renderCard)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Browse dialog (non-owned partnerships) */}
      <Dialog open={!!browsePartnership} onOpenChange={open => !open && setBrowsePartnership(null)}>
        <DialogContent className="max-w-lg">
          {browsePartnership && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden border border-gray-100"
                    style={{ backgroundColor: browsePartnership.logoUrl ? undefined : (browsePartnership.color || '#3B82F6') }}
                  >
                    {browsePartnership.logoUrl
                      ? <img src={browsePartnership.logoUrl} alt={browsePartnership.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-white opacity-70" />
                        </div>
                    }
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{browsePartnership.name}</DialogTitle>
                    <Badge className={`text-xs mt-0.5 ${ORG_TYPE_COLORS[browsePartnership.orgType]}`}>
                      {ORG_TYPE_LABELS[browsePartnership.orgType]}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {browsePartnership.description && (
                  <p className="text-sm text-gray-600">{browsePartnership.description}</p>
                )}
                {browsePartnership.address && (
                  <p className="text-sm text-gray-400">{browsePartnership.address}</p>
                )}

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Available Events</h4>
                  {browseEvents.length === 0 ? (
                    <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-xl">
                      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No events at this time
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {browseEvents.map(event => (
                        <div key={event.id} className="flex items-start justify-between p-3 border border-gray-200 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{event.name}</p>
                            {event.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>
                            )}
                          </div>
                          <Badge className="text-xs flex-shrink-0 ml-2">
                            {event.type === 'none' ? 'Open' : event.type === 'password' ? 'Password' : event.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
                  To submit hours to this partnership, go to Log Hours and select "A Partnership".
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
