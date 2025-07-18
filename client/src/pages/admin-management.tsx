import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@/lib/firebase";
import { UserProfile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Settings, 
  UserPlus, 
  UserMinus, 
  Mail, 
  Shield, 
  User as UserIcon,
  Crown,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface AdminManagementProps {
  user: User | null;
}

// Helper function to convert email to storage key
const emailToKey = (email: string) => email.replace(/\./g, ',');

export function AdminManagement({ user }: AdminManagementProps) {
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch all user profiles to see who are admins
  const { data: adminProfiles = [], isLoading } = useQuery({
    queryKey: ['/api/admin-profiles'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin-profiles');
      console.log('Admin profiles response:', response);
      console.log('Is array:', Array.isArray(response));
      return Array.isArray(response) ? response : [];
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Add admin mutation
  const addAdminMutation = useMutation({
    mutationFn: async (email: string) => {
      const emailKey = emailToKey(email);
      return await apiRequest('POST', '/api/admin-profiles', { email: emailKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin-profiles'] });
      toast({
        title: "Success",
        description: "Admin added successfully",
      });
      setNewAdminEmail("");
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add admin",
        variant: "destructive",
      });
    }
  });

  // Remove admin mutation
  const removeAdminMutation = useMutation({
    mutationFn: async (emailKey: string) => {
      return await apiRequest('DELETE', `/api/admin-profiles/${emailKey}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin-profiles'] });
      toast({
        title: "Success",
        description: "Admin removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove admin",
        variant: "destructive",
      });
    }
  });

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    addAdminMutation.mutate(newAdminEmail.trim());
  };

  const handleRemoveAdmin = (emailKey: string) => {
    if (emailKey === emailToKey(user?.email || "")) {
      toast({
        title: "Error",
        description: "You cannot remove yourself as an admin",
        variant: "destructive",
      });
      return;
    }
    removeAdminMutation.mutate(emailKey);
  };

  const formatEmailFromKey = (emailKey: string) => {
    return emailKey.replace(/,/g, '.');
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-white min-h-0">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Admin Management</h1>
              <p className="text-gray-600 mt-1">Add or remove administrator privileges</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Settings className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {/* Add Admin Section */}
        <div className="mb-6 lg:mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Add New Administrator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Administrator</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddAdmin} className="space-y-4">
                    <div>
                      <Label htmlFor="adminEmail">Email Address</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="Enter admin email address"
                        className="mt-1"
                        required
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        The person must have a Google account and must sign in at least once before being granted admin privileges.
                      </p>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={addAdminMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {addAdminMutation.isPending ? "Adding..." : "Add Admin"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        {/* Current Admins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Current Administrators
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adminProfiles.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No administrators found</h3>
                <p className="text-gray-500">Add administrators to manage the NAHS system</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.isArray(adminProfiles) && adminProfiles.map((profile: UserProfile) => (
                  <div key={profile.userId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                        <UserIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">
                            {profile.goByFirstName && profile.lastName 
                              ? `${profile.goByFirstName} ${profile.lastName}`
                              : formatEmailFromKey(profile.userId)
                            }
                          </h3>
                          {profile.userId === emailToKey(user?.email || "") && (
                            <Badge className="bg-green-100 text-green-800">
                              <Crown className="w-3 h-3 mr-1" />
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Mail className="w-4 h-4" />
                          <span>{formatEmailFromKey(profile.userId)}</span>
                        </div>
                        {profile.studentId && (
                          <p className="text-sm text-gray-500">Student ID: {profile.studentId}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-purple-100 text-purple-800">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                      {profile.userId !== emailToKey(user?.email || "") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveAdmin(profile.userId)}
                          disabled={removeAdminMutation.isPending}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}