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
import { Save, Settings, Eye, Clock, MapPin, Palette, Lock, FileText, BookOpen } from "lucide-react";

interface AdminSettingsProps {
  user: User;
  club: Club;
}

export function AdminSettings({ user, club }: AdminSettingsProps) {
  const { toast } = useToast();
  const [innerPage, setInnerPage] = useState<'custom-fields' | 'logs' | 'general'>('custom-fields');

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
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Admin Settings
          </h3>
        </div>
        <div className="flex-1 p-4 space-y-2 overflow-auto">
          <button
            onClick={() => setInnerPage('custom-fields')}
            className={`w-full px-3 py-2 rounded-lg text-left transition-colors flex items-center gap-2 ${
              innerPage === 'custom-fields'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            Custom Fields
          </button>

          <button
            onClick={() => setInnerPage('logs')}
            className={`w-full px-3 py-2 rounded-lg text-left transition-colors flex items-center gap-2 ${
              innerPage === 'logs'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Logs
          </button>

          <button
            onClick={() => setInnerPage('general')}
            className={`w-full px-3 py-2 rounded-lg text-left transition-colors flex items-center gap-2 ${
              innerPage === 'general'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Palette className="w-4 h-4" />
            General Settings
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto bg-white">
        {innerPage === 'custom-fields' && (
          <AdminCustomFields user={user} club={club} />
        )}

        {innerPage === 'logs' && (
          <AdminLogs user={user} club={club} />
        )}

        {innerPage === 'general' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Club Settings
                </CardTitle>
                <CardDescription>
                  Update your club's basic information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 pb-4 border-b">
                  <h4 className="font-semibold text-gray-900">Basic Information</h4>
                  <div className="space-y-2">
                    <Label htmlFor="clubName">Club Name</Label>
                    <Input
                      id="clubName"
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      placeholder="Club name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clubDescription">Description</Label>
                    <Input
                      id="clubDescription"
                      value={clubDescription}
                      onChange={(e) => setClubDescription(e.target.value)}
                      placeholder="Club description"
                    />
                  </div>
                </div>

                <div className="space-y-4 pb-4 border-b">
                  <h4 className="font-semibold text-gray-900">Club Color</h4>
                  <div className="space-y-2">
                    <Label htmlFor="clubColor">Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="clubColor"
                        type="color"
                        value={clubColor}
                        onChange={(e) => setClubColor(e.target.value)}
                        className="w-12 h-10"
                      />
                      <Input
                        type="text"
                        value={clubColor}
                        onChange={(e) => setClubColor(e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pb-4 border-b">
                  <h4 className="font-semibold text-gray-900">Club Location</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clubLatitude">Latitude</Label>
                      <Input
                        id="clubLatitude"
                        value={clubLatitude}
                        onChange={(e) => setClubLatitude(e.target.value)}
                        placeholder="0.0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clubLongitude">Longitude</Label>
                      <Input
                        id="clubLongitude"
                        value={clubLongitude}
                        onChange={(e) => setClubLongitude(e.target.value)}
                        placeholder="0.0000"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">Club Password</h4>
                      <p className="text-sm text-gray-600">Change club access password</p>
                    </div>
                    <Switch
                      checked={showPasswordField}
                      onCheckedChange={setShowPasswordField}
                    />
                  </div>
                  {showPasswordField && (
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="clubPassword">New Password</Label>
                      <Input
                        id="clubPassword"
                        type="password"
                        value={clubPassword}
                        onChange={(e) => setClubPassword(e.target.value)}
                        placeholder="Leave empty to keep current password"
                      />
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => {
                    toast({
                      title: "Info",
                      description: "Club settings update coming soon",
                    });
                  }}
                  className="w-full bg-black hover:bg-gray-800 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Club Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Profile Field Visibility
                </CardTitle>
                <CardDescription>
                  Control which fields are visible to volunteers and on reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Student ID</Label>
                <p className="text-sm text-gray-500">Show student ID numbers</p>
              </div>
              <Switch
                checked={showStudentId}
                onCheckedChange={setShowStudentId}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Grade Level</Label>
                <p className="text-sm text-gray-500">Display grade level information</p>
              </div>
              <Switch
                checked={showGradeLevel}
                onCheckedChange={setShowGradeLevel}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>GPA</Label>
                <p className="text-sm text-gray-500">Show GPA on profiles</p>
              </div>
              <Switch
                checked={showGpa}
                onCheckedChange={setShowGpa}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Phone Number</Label>
                <p className="text-sm text-gray-500">Display phone numbers</p>
              </div>
              <Switch
                checked={showPhone}
                onCheckedChange={setShowPhone}
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label>Require Proof Image</Label>
                <p className="text-sm text-gray-500">Require photo proof when submitting hours</p>
              </div>
              <Switch
                checked={requireProofImage}
                onCheckedChange={setRequireProofImage}
              />
            </div>
            <Button 
              onClick={handleSaveVisibility}
              disabled={updateSettingsMutation.isPending}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Territory Decay Settings
                </CardTitle>
                <CardDescription>
                  Configure how territories shrink without activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Decay Rate (hours per week)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={decayRate}
                    onChange={(e) => setDecayRate(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Hours lost per week of inactivity</p>
                </div>
                <div className="space-y-2">
                  <Label>Maximum Decay (hours)</Label>
                  <Input
                    type="number"
                    value={maxDecay}
                    onChange={(e) => setMaxDecay(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Maximum hours that can be lost to decay</p>
                </div>
                <div className="space-y-2">
                  <Label>High-Need Area Bonus Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={bonusMultiplier}
                    onChange={(e) => setBonusMultiplier(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Extra hours multiplier for high-need areas (e.g., 1.5 = 50% bonus)</p>
                </div>
                <Button 
                  onClick={handleSaveDecay}
                  disabled={updateSettingsMutation.isPending}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Decay Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Platform Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Platform</p>
                    <p className="font-semibold text-gray-900">VolunteerClub.io</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Version</p>
                    <p className="font-semibold text-gray-900">1.0.0</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Admin</p>
                    <p className="font-semibold text-gray-900">{user.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
