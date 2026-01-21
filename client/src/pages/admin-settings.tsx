import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, AdminSettings as AdminSettingsType, getAdminSettings, updateAdminSettings } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Save, Settings, Eye, Clock, MapPin } from "lucide-react";

interface AdminSettingsProps {
  user: User;
}

export function AdminSettings({ user }: AdminSettingsProps) {
  const { toast } = useToast();
  const [showStudentId, setShowStudentId] = useState(true);
  const [showGradeLevel, setShowGradeLevel] = useState(true);
  const [showGpa, setShowGpa] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
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
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
          <Settings className="w-6 h-6 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure your club's volunteer portal</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <Button 
              onClick={handleSaveVisibility}
              disabled={updateSettingsMutation.isPending}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Visibility Settings
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
      </div>

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
  );
}
