import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Club, Partnership, PartnershipAffiliation, ClubEvent,
  getAllPartnerships, getPartnershipsByOwner, createPartnership, updatePartnership, deletePartnership,
  getPartnershipAffiliations, getClubAffiliations, requestAffiliation, respondToAffiliation,
  getPartnershipEvents, createEvent, getPartnershipSubmissions
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
import { Switch } from "@/components/ui/switch";
import {
  Plus, Trash2, Save, Building2, Users, Clock, Award, ChevronRight,
  BarChart3, Calendar, Handshake, Settings, Globe, Check, X, AlertCircle, ExternalLink
} from "lucide-react";

interface AdminPartnershipsProps {
  user: User;
  club: Club;
}

type PartnershipView = 'list' | 'manage';
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

export function AdminPartnerships({ user, club }: AdminPartnershipsProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [view, setView] = useState<PartnershipView>('list');
  const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null);
  const [activeTab, setActiveTab] = useState<ManageTab>('overview');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAffiliateDialog, setShowAffiliateDialog] = useState(false);
  const [affiliateSearch, setAffiliateSearch] = useState('');

  // Create form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newOrgType, setNewOrgType] = useState<Partnership['orgType']>('nonprofit');
  const [newRequireApproval, setNewRequireApproval] = useState(true);
  const [newAddress, setNewAddress] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');

  // Edit settings
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editRequireApproval, setEditRequireApproval] = useState(true);
  const [editAddress, setEditAddress] = useState('');
  const [editColor, setEditColor] = useState('#3B82F6');

  // Create event form
  const [newEventName, setNewEventName] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventType, setNewEventType] = useState<'none' | 'password'>('none');
  const [newEventPassword, setNewEventPassword] = useState('');

  const { data: myPartnerships = [], isLoading } = useQuery<Partnership[]>({
    queryKey: ['firebase-partnerships-owned', user.email],
    queryFn: () => getPartnershipsByOwner(user.email),
    enabled: !!user.email,
  });

  const { data: allPartnerships = [] } = useQuery<Partnership[]>({
    queryKey: ['firebase-all-partnerships'],
    queryFn: getAllPartnerships,
  });

  const { data: partnershipEvents = [] } = useQuery<ClubEvent[]>({
    queryKey: ['firebase-partnership-events', selectedPartnership?.id],
    queryFn: () => getPartnershipEvents(selectedPartnership!.id),
    enabled: !!selectedPartnership?.id,
  });

  const { data: affiliations = [] } = useQuery<PartnershipAffiliation[]>({
    queryKey: ['firebase-partnership-affiliations', selectedPartnership?.id],
    queryFn: () => getPartnershipAffiliations(selectedPartnership!.id),
    enabled: !!selectedPartnership?.id,
  });

  const { data: clubAffiliations = [] } = useQuery<PartnershipAffiliation[]>({
    queryKey: ['firebase-club-affiliations', club.id],
    queryFn: () => getClubAffiliations(club.id),
    enabled: !!club.id,
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
      setEditRequireApproval(selectedPartnership.requireApproval);
      setEditAddress(selectedPartnership.address || '');
      setEditColor(selectedPartnership.color || '#3B82F6');
    }
  }, [selectedPartnership]);

  const createMutation = useMutation({
    mutationFn: () => createPartnership({
      name: newName,
      description: newDesc,
      ownerEmail: user.email,
      ownerName: user.name,
      orgType: newOrgType,
      requireApproval: newRequireApproval,
      address: newAddress,
      color: newColor,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-partnerships-owned', user.email] });
      qc.invalidateQueries({ queryKey: ['firebase-all-partnerships'] });
      setShowCreateDialog(false);
      setNewName(''); setNewDesc(''); setNewAddress(''); setNewColor('#3B82F6');
      toast({ title: "Partnership created!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updatePartnership(selectedPartnership!.id, {
      name: editName,
      description: editDesc,
      requireApproval: editRequireApproval,
      address: editAddress,
      color: editColor,
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
      name: newEventName,
      description: newEventDesc,
      type: newEventType,
      password: newEventType === 'password' ? newEventPassword : undefined,
      conditionals: [],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-partnership-events', selectedPartnership?.id] });
      setNewEventName(''); setNewEventDesc(''); setNewEventType('none'); setNewEventPassword('');
      toast({ title: "Event created" });
    },
  });

  const requestAffiliationMutation = useMutation({
    mutationFn: (partnership: Partnership) =>
      requestAffiliation(partnership.id, partnership.name, club.id, club.name, user.email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-club-affiliations', club.id] });
      setShowAffiliateDialog(false);
      toast({ title: "Affiliation requested!", description: "The partnership will review your request." });
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      respondToAffiliation(id, selectedPartnership!.id, affiliations.find(a => a.id === id)?.clubId || '', status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firebase-partnership-affiliations', selectedPartnership?.id] });
      qc.invalidateQueries({ queryKey: ['firebase-partnerships-owned', user.email] });
      toast({ title: "Responded to affiliation request" });
    },
  });

  // Stats
  const totalHours = partnershipSubmissions
    .filter((s: any) => s.status === 'approved')
    .reduce((sum: number, s: any) => sum + (s.hours || 0), 0);
  const uniqueVolunteers = new Set(partnershipSubmissions.map((s: any) => s.userEmail)).size;
  const pendingCount = partnershipSubmissions.filter((s: any) => s.status === 'pending').length;

  const filteredPartnerships = allPartnerships.filter(p =>
    p.name.toLowerCase().includes(affiliateSearch.toLowerCase())
  );

  const pendingAffiliations = affiliations.filter(a => a.status === 'pending');
  const approvedAffiliations = affiliations.filter(a => a.status === 'approved');

  if (view === 'manage' && selectedPartnership) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => { setView('list'); setSelectedPartnership(null); }} className="text-gray-400 hover:text-gray-700 text-sm">
              ← Partnerships
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: selectedPartnership.color }} />
              <span className="font-semibold text-gray-900">{selectedPartnership.name}</span>
              <Badge className={ORG_TYPE_COLORS[selectedPartnership.orgType]}>{ORG_TYPE_LABELS[selectedPartnership.orgType]}</Badge>
              {pendingAffiliations.length > 0 && (
                <Badge className="bg-orange-100 text-orange-700">{pendingAffiliations.length} pending affiliations</Badge>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 border-b border-gray-200 -mb-4">
            {(['overview', 'events', 'volunteers', 'affiliations', 'settings'] as ManageTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'affiliations' && pendingAffiliations.length > 0 ? (
                  <span className="flex items-center gap-1">
                    Affiliations <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingAffiliations.length}</span>
                  </span>
                ) : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-4xl">
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <Award className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</p>
                        <p className="text-xs text-gray-500">Total Hours</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{uniqueVolunteers}</p>
                        <p className="text-xs text-gray-500">Unique Volunteers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-8 h-8 text-yellow-600" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                        <p className="text-xs text-gray-500">Pending Submissions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <Handshake className="w-8 h-8 text-purple-600" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{approvedAffiliations.length}</p>
                        <p className="text-xs text-gray-500">Affiliated Clubs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Recent Submissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {partnershipSubmissions.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No submissions yet</p>
                    ) : (
                      <div className="space-y-2">
                        {partnershipSubmissions.slice(0, 5).map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 truncate">{s.userName || s.userEmail}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="font-medium">{s.hours}h</span>
                              <Badge className={s.status === 'approved' ? 'bg-green-100 text-green-700' : s.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                                {s.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Top Volunteers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {uniqueVolunteers === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No volunteers yet</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(
                          partnershipSubmissions
                            .filter((s: any) => s.status === 'approved')
                            .reduce((acc: Record<string, { name: string; hours: number }>, s: any) => {
                              if (!acc[s.userEmail]) acc[s.userEmail] = { name: s.userName || s.userEmail, hours: 0 };
                              acc[s.userEmail].hours += s.hours;
                              return acc;
                            }, {})
                        )
                          .sort(([, a], [, b]) => (b as any).hours - (a as any).hours)
                          .slice(0, 5)
                          .map(([email, data]: [string, any]) => (
                            <div key={email} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700 truncate">{data.name}</span>
                              <span className="font-medium text-gray-900">{data.hours.toFixed(1)}h</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Partnership Events</h3>
                  <p className="text-sm text-gray-500">Events for this partnership. Volunteers can submit hours for these specific events.</p>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Create Event</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label>Event Name</Label>
                    <Input value={newEventName} onChange={e => setNewEventName(e.target.value)} placeholder="Volunteer Day, Community Fair..." />
                  </div>
                  <div className="space-y-1">
                    <Label>Description <span className="text-gray-400">(optional)</span></Label>
                    <Textarea value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select value={newEventType} onValueChange={(v) => setNewEventType(v as 'none' | 'password')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Open</SelectItem>
                        <SelectItem value="password">Password Protected</SelectItem>
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
                    <Plus className="w-4 h-4 mr-2" />
                    Create Event
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-2">
                {partnershipEvents.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No events yet</p>
                ) : (
                  partnershipEvents.map(event => (
                    <div key={event.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{event.name}</p>
                        {event.description && <p className="text-xs text-gray-500">{event.description}</p>}
                      </div>
                      <Badge className="text-xs">
                        {event.type === 'none' ? 'Open' : event.type === 'password' ? 'Password' : event.type === 'scan_qr' ? 'Scan QR' : 'Show QR'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Volunteers Tab */}
          {activeTab === 'volunteers' && (
            <div className="max-w-2xl space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">Volunteer Submissions</h3>
                <p className="text-sm text-gray-500">All hours submitted to this partnership.</p>
              </div>
              {partnershipSubmissions.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No submissions yet</p>
                  <p className="text-xs text-gray-400 mt-1">Volunteers can submit hours to your partnership from their Hours page</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {partnershipSubmissions.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{s.userName || s.userEmail}</p>
                        <p className="text-xs text-gray-500">{s.activityName || s.description}</p>
                        {s.partnershipVerified && (
                          <Badge className="bg-green-100 text-green-700 text-xs mt-1">Partnership Verified</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-gray-900">{s.hours}h</span>
                        <Badge className={s.status === 'approved' ? 'bg-green-100 text-green-700' : s.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                          {s.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Affiliations Tab */}
          {activeTab === 'affiliations' && (
            <div className="max-w-2xl space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">Club Affiliations</h3>
                <p className="text-sm text-gray-500">Clubs that have requested to affiliate with your partnership. Affiliated clubs' volunteers' hours submissions show up here as well.</p>
              </div>

              {pendingAffiliations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-orange-700">Pending Requests ({pendingAffiliations.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {pendingAffiliations.map(aff => (
                      <div key={aff.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{aff.clubName}</p>
                          <p className="text-xs text-gray-500">Requested by {aff.requestedBy}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                            onClick={() => respondMutation.mutate({ id: aff.id, status: 'approved' })}>
                            <Check className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 h-7 text-xs"
                            onClick={() => respondMutation.mutate({ id: aff.id, status: 'rejected' })}>
                            <X className="w-3 h-3 mr-1" /> Decline
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
                        <div key={aff.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
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
            <div className="max-w-xl space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Partnership Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Require Approval</p>
                      <p className="text-xs text-gray-500">If off, submissions are auto-verified as "Partnership Verified"</p>
                    </div>
                    <Switch checked={editRequireApproval} onCheckedChange={setEditRequireApproval} />
                  </div>
                  <Button
                    className="w-full bg-black hover:bg-gray-800 text-white"
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
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
    );
  }

  // List view
  return (
    <div className="flex-1 flex flex-col bg-white min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Partnerships</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Partnerships let volunteers submit hours to organizations like food banks, businesses, and nonprofits — without joining them as a club.
              <br />
              <span className="text-blue-600 font-medium">Own a food bank or nonprofit? Create a partnership instead of a club.</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showAffiliateDialog} onOpenChange={setShowAffiliateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Handshake className="w-4 h-4" />
                  Affiliate with Partnership
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Affiliate Your Club with a Partnership</DialogTitle>
                  <p className="text-sm text-gray-500">
                    Affiliating lets your club's volunteers show up in the partnership's volunteer list, and affiliated events appear in your club's Affiliations tab.
                  </p>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input
                    placeholder="Search partnerships..."
                    value={affiliateSearch}
                    onChange={e => setAffiliateSearch(e.target.value)}
                  />
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {filteredPartnerships.map(p => {
                      const existing = clubAffiliations.find(a => a.partnershipId === p.id);
                      return (
                        <div key={p.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{p.name}</p>
                              <p className="text-xs text-gray-500">{ORG_TYPE_LABELS[p.orgType]}</p>
                            </div>
                          </div>
                          {existing ? (
                            <Badge className={existing.status === 'approved' ? 'bg-green-100 text-green-700' : existing.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                              {existing.status}
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-black hover:bg-gray-800 text-white"
                              onClick={() => requestAffiliationMutation.mutate(p)}
                              disabled={requestAffiliationMutation.isPending}
                            >
                              Request
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    {filteredPartnerships.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">No partnerships found</p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-black hover:bg-gray-800 text-white">
                  <Plus className="w-4 h-4 mr-1" />
                  Create Partnership
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create a Partnership</DialogTitle>
                  <p className="text-sm text-gray-500">
                    Partnerships are for organizations like food banks, small businesses, and nonprofits that want to receive volunteer hours without managing a full club.
                  </p>
                </DialogHeader>
                <div className="space-y-4 pt-2">
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
                  <div className="space-y-1">
                    <Label>Color</Label>
                    <div className="flex items-center gap-2">
                      <Input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-12 h-10" />
                      <Input value={newColor} onChange={e => setNewColor(e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Require Approval</p>
                      <p className="text-xs text-gray-500">Approve each hours submission manually</p>
                    </div>
                    <Switch checked={newRequireApproval} onCheckedChange={setNewRequireApproval} />
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
        </div>
      </div>

      {/* Club affiliations banner */}
      {clubAffiliations.filter(a => a.status === 'approved').length > 0 && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
          <p className="text-sm text-blue-700">
            <Handshake className="w-4 h-4 inline mr-1" />
            Your club is affiliated with {clubAffiliations.filter(a => a.status === 'approved').length} partnerships:{' '}
            {clubAffiliations.filter(a => a.status === 'approved').map(a => a.partnershipName).join(', ')}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading partnerships...</div>
        ) : myPartnerships.length === 0 ? (
          <div className="text-center py-16 max-w-md mx-auto">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No partnerships yet</h3>
            <p className="text-sm text-gray-500 mt-2">
              Create a partnership if you own or manage a food bank, community center, business, or any other organization that receives volunteer hours.
            </p>
            <Button
              className="mt-4 bg-black hover:bg-gray-800 text-white"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Partnership
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
            {myPartnerships.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedPartnership(p); setActiveTab('overview'); setView('manage'); }}
                className="text-left p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                      <Badge className={`text-xs ${ORG_TYPE_COLORS[p.orgType]}`}>{ORG_TYPE_LABELS[p.orgType]}</Badge>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
                {p.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{p.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{p.affiliatedClubIds.length} clubs affiliated</span>
                  {!p.requireApproval && (
                    <Badge className="bg-green-100 text-green-700 text-xs">Auto-approve</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
