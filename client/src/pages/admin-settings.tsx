import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Club, AdminSettings as AdminSettingsType, getAdminSettings, updateAdminSettings } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { AdminCustomFields } from "./admin-custom-fields";
import { AdminLogs } from "./admin-logs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Save, Settings, Eye, Clock, MapPin, Palette, Lock, FileText, BookOpen, CheckCircle } from "lucide-react";

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
  const [clubLatitude, setClubLatitude] = useState(club.latitude || '');
  const [clubLongitude, setClubLongitude] = useState(club.longitude || '');

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

      <div className="flex-1 p-6 overflow-auto bg-white">
        {innerPage === 'logs' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Hours Logs</h2>
              <p className="text-sm text-gray-500 mt-0.5">Logs are named time periods (e.g., "Fall Semester", "Spring 2026") with an hours requirement. Volunteers see open logs in their Hours tab and submit entries to specific logs. You can view per-log progress in the Volunteers tab.</p>
            </div>
            <AdminLogs user={user} club={club} />
          </div>
        )}

        {innerPage === 'approvals' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Approvals</h2>
              <p className="text-sm text-gray-500 mt-0.5">Configure how the hours approval workflow works. You can require multiple admins to approve or reject before a submission is finalized — great for clubs with multiple admins who want checks and balances.</p>
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
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Club</h2>
              <p className="text-sm text-gray-500 mt-0.5">Your club's public identity on the platform — name, color, and home base location for territory calculations.</p>
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
                <Button onClick={() => toast({ title: "Info", description: "Club settings update coming soon" })} className="w-full bg-black hover:bg-gray-800 text-white">
                  <Save className="w-4 h-4 mr-2" />Save Club Info
                </Button>
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
                <Button onClick={() => toast({ title: "Info", description: "Location update coming soon" })} className="w-full bg-black hover:bg-gray-800 text-white">
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
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Members</h2>
              <p className="text-sm text-gray-500 mt-0.5">Control what information volunteers provide in their profiles, which fields are visible on reports, and add custom fields for your club's specific needs.</p>
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
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Territory</h2>
              <p className="text-sm text-gray-500 mt-0.5">Territory circles on the world map grow as your club logs hours at a location. Configure how quickly inactive territories shrink (decay) and whether high-need areas earn bonus credit.</p>
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
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Partnerships</h2>
              <p className="text-sm text-gray-500 mt-0.5">Partnerships let volunteers from your club log hours at external organizations — food banks, hospitals, community orgs — without that org needing to be a club. Manage how your club affiliates with partner organizations.</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Affiliation Requests
                </CardTitle>
                <CardDescription>When a Partnership (external org) invites your club or your club requests to affiliate with a Partnership, those requests appear here for approval.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600 text-center">
                  Affiliation request management is available in the Partnerships page.
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
