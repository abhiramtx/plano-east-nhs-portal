import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  User, Club, Partnership, PartnershipAffiliation,
  AdminSettings as AdminSettingsType,
  getAdminSettings, updateAdminSettings, updateClub, recalculateClubHours,
  getClubAffiliations, respondToAffiliation, removeAffiliation
} from "@/lib/firebase";
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
import { Save, Settings, Eye, Clock, MapPin, Palette, Lock, FileText, BookOpen, CheckCircle, Upload, Image, Check, X, Handshake } from "lucide-react";

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

            {/* Approved affiliations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Handshake className="w-5 h-5" />
                  Affiliated Partnerships ({clubAffiliations.filter(a => a.status === 'approved').length})
                </CardTitle>
                <CardDescription>Organizations your club is currently affiliated with. Your members can log hours with these organizations.</CardDescription>
              </CardHeader>
              <CardContent>
                {clubAffiliations.filter(a => a.status === 'approved').length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
                    No approved affiliations yet. Partnerships can request to affiliate with your club.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clubAffiliations.filter(a => a.status === 'approved').map(aff => (
                      <div key={aff.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <span className="font-medium text-gray-900 text-sm">{aff.partnershipName}</span>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-700">Affiliated</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs"
                            onClick={() => removeAffiliationMutation.mutate({ id: aff.id, partnershipId: aff.partnershipId })}
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
        </div>
      </div>
    </div>
  );
}
