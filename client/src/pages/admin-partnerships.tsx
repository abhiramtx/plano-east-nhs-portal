import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Club, Partnership, PartnershipAffiliation, ClubEvent,
  getAllPartnerships, getPartnershipsByOwner, createPartnership, updatePartnership, deletePartnership,
  getPartnershipAffiliations, getClubAffiliations, requestAffiliation, respondToAffiliation,
  getPartnershipEvents, createEvent, updateEvent, deleteEvent, getPartnershipSubmissions, getClubs
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
import {
  Plus, Trash2, Save, Building2, Users, Clock, Award, ChevronRight,
  BarChart3, Calendar, Handshake, Settings, Globe, Check, X, AlertCircle,
  Upload, Image, LayoutDashboard, Search
} from "lucide-react";

interface AdminPartnershipsProps {
  user: User;
  club?: Club;
  hideHeader?: boolean;
}

type PartnershipView = 'list' | 'manage' | 'browse-detail';
type ManageTab = 'overview' | 'events' | 'volunteers' | 'affiliations' | 'settings';

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
  const [newEventType, setNewEventType] = useState<'none' | 'password'>('none');
  const [newEventPassword, setNewEventPassword] = useState('');

  // Selected partnership event management
  const [selectedPartnershipEvent, setSelectedPartnershipEvent] = useState<ClubEvent | null>(null);
  const [showCreateEventDialog, setShowCreateEventDialog] = useState(false);
  const [editEventName, setEditEventName] = useState('');
  const [editEventDesc, setEditEventDesc] = useState('');
  const [editEventType, setEditEventType] = useState<'none' | 'password'>('none');
  const [editEventPassword, setEditEventPassword] = useState('');

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

  useEffect(() => {
    if (selectedPartnership) {
      setEditName(selectedPartnership.name);
      setEditDesc(selectedPartnership.description || '');
      setEditAddress(selectedPartnership.address || '');
      setEditColor(selectedPartnership.color || '#3B82F6');
      setEditLogoUrl(selectedPartnership.logoUrl || '');
    }
  }, [selectedPartnership]);

  useEffect(() => {
    if (selectedPartnershipEvent) {
      setEditEventName(selectedPartnershipEvent.name);
      setEditEventDesc(selectedPartnershipEvent.description || '');
      setEditEventType(selectedPartnershipEvent.type as 'none' | 'password');
      setEditEventPassword(selectedPartnershipEvent.password || '');
    }
  }, [selectedPartnershipEvent?.id]);

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
      address: editAddress,
      color: editColor,
      logoUrl: editLogoUrl || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-partnerships-owned', user.email] });
      qc.invalidateQueries({ queryKey: ['firebase-all-partnerships'] });
      toast({ title: "Partnership updated" });
    },
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
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-partnership-events', selectedPartnership?.id] });
      setSelectedPartnershipEvent(prev => prev ? {
        ...prev,
        name: editEventName,
        description: editEventDesc,
        type: editEventType as any,
        password: editEventType === 'password' ? editEventPassword : undefined,
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
              onClick={() => { setView('list'); setSelectedPartnership(null); }}
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
                          <Select value={newEventType} onValueChange={(v) => setNewEventType(v as 'none' | 'password')}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Open — No check-in required</SelectItem>
                              <SelectItem value="password">Password — Volunteers enter a password</SelectItem>
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
                    const typeLabel = event.type === 'none' ? 'Open' : event.type === 'password' ? 'Password' : event.type;
                    const typeColor = event.type === 'none' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
                    return (
                      <button
                        key={event.id}
                        onClick={() => setSelectedPartnershipEvent(event)}
                        className={`w-full text-left rounded-lg border p-3 transition-colors ${isSelected ? 'bg-gray-100 border-gray-400' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{event.name}</p>
                            {event.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{event.description}</p>}
                          </div>
                          <Badge className={`text-xs flex-shrink-0 ${typeColor}`}>{typeLabel}</Badge>
                        </div>
                        {isSelected && <ChevronRight className="w-4 h-4 text-gray-400 mt-1" />}
                      </button>
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
                          <Badge className={selectedPartnershipEvent.type === 'none' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                            {selectedPartnershipEvent.type === 'none' ? 'Open' : 'Password'}
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
                      <button className="px-4 py-2 text-sm font-medium border-b-2 border-gray-900 text-gray-900">
                        Information
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-6">
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
                          <Select value={editEventType} onValueChange={(v) => setEditEventType(v as 'none' | 'password')}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent className="z-[200]">
                              <SelectItem value="none">Open — No check-in required</SelectItem>
                              <SelectItem value="password">Password Protected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {editEventType === 'password' && (
                          <div className="space-y-1">
                            <Label>Password</Label>
                            <Input value={editEventPassword} onChange={e => setEditEventPassword(e.target.value)} />
                          </div>
                        )}
                        <Button
                          onClick={() => updateEventMutation.mutate()}
                          disabled={updateEventMutation.isPending}
                          className="w-full bg-black hover:bg-gray-800 text-white"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </CardContent>
                    </Card>
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
                          <Badge className="bg-yellow-100 text-yellow-700">Awaiting approval</Badge>
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
                            <Badge className="bg-green-100 text-green-700">Affiliated</Badge>
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
                    <div className="space-y-1">
                      <Label>Address / Location</Label>
                      <Input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="123 Main St, City, State" />
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
                    <SelectContent>
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAll.map(p => {
                const owned = myPartnershipIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (owned) {
                        setSelectedPartnership(p);
                        setActiveTab('overview');
                        setView('manage');
                      } else {
                        setBrowsePartnership(p);
                      }
                    }}
                    className="text-left p-4 border border-gray-200 rounded-2xl hover:border-gray-400 hover:shadow-sm transition-all bg-white group"
                  >
                    {/* Logo + name row */}
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
              })}
            </div>
          )}
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
