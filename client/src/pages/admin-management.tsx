import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, getMemberships, promoteToAdmin, removeAdminRole, Club, Membership, getUserProfile } from "@/lib/firebase";
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
  club: Club;
}

export function AdminManagement({ user, club }: AdminManagementProps) {
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [adminNames, setAdminNames] = useState<{ [email: string]: string }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allMembers = [], isLoading } = useQuery({
    queryKey: ['firebase-club-memberships', club.id],
    queryFn: () => getMemberships(club.id),
    staleTime: 0,
    gcTime: 0,
  });

  const adminProfiles = allMembers.filter((m: Membership) => m.role === 'admin');

  useEffect(() => {
    const fetchNames = async () => {
      const names: { [email: string]: string } = {};
      for (const admin of adminProfiles) {
        const profile = await getUserProfile(admin.userEmail);
        if (profile) {
          const fullName = [profile.goByFirstName, profile.lastName].filter(Boolean).join(' ');
          if (fullName) {
            names[admin.userEmail] = fullName;
          }
        }
      }
      setAdminNames(names);
    };

    if (adminProfiles.length > 0) {
      fetchNames();
    }
  }, [adminProfiles]);

  const addAdminMutation = useMutation({
    mutationFn: async (email: string) => {
      await promoteToAdmin(email, club.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-club-memberships', club.id] });
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

  const removeAdminMutation = useMutation({
    mutationFn: async (email: string) => {
      await removeAdminRole(email, club.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-club-memberships', club.id] });
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
    const emailToAdd = newAdminEmail.trim().toLowerCase();
    
    if (!emailToAdd) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Check if the email is a member of the club
    const isMember = allMembers.some(m => m.userEmail?.toLowerCase() === emailToAdd);
    if (!isMember) {
      toast({
        title: "Error",
        description: "This user must be a member of the club before being promoted to admin",
        variant: "destructive",
      });
      return;
    }

    addAdminMutation.mutate(emailToAdd);
  };

  const handleRemoveAdmin = (email: string) => {
    if (email === user?.email) {
      toast({
        title: "Error",
        description: "You cannot remove yourself as an admin",
        variant: "destructive",
      });
      return;
    }
    removeAdminMutation.mutate(email);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-[#faf8f4] min-h-0">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#faf8f4] min-h-0">
      <div className="bg-[#faf8f4] bg-white border-b border-[#d9cdbd] flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#506477' }}>
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-[#17324d]">Admin Management</h1>
              <p className="text-[#506477] mt-0.5">Add or remove administrator privileges</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
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
                  <Button className="bg-[#17324d] hover:bg-[#1f3d5a] text-white">
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
                      <p className="text-sm text-[#506477] mt-1">
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
                        className="bg-[#17324d] hover:bg-[#1f3d5a] text-white"
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
                <Shield className="w-16 h-16 mx-auto mb-4 text-[#8fa5b4]" />
                <h3 className="text-lg font-medium text-[#17324d] mb-2">No administrators found</h3>
                <p className="text-[#506477]">Add administrators to manage the system</p>
              </div>
            ) : (
              <div className="space-y-4">
                {adminProfiles.map((member: Membership) => {
                  const isCurrentUser = member.userEmail?.toLowerCase() === user?.email?.toLowerCase();
                  const displayName = adminNames[member.userEmail] || member.userName || member.userEmail;
                  return (
                    <div key={member.userEmail} className="flex items-center justify-between p-4 border rounded-lg hover:bg-[#faf8f4] transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                          <UserIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-[#17324d]">
                              {displayName}
                            </h3>
                            {isCurrentUser && (
                              <Badge className="bg-green-100 text-green-800">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-[#506477]">
                            <Mail className="w-4 h-4" />
                            <span>{member.userEmail}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-purple-100 text-purple-800">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                        {!isCurrentUser && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveAdmin(member.userEmail)}
                            disabled={removeAdminMutation.isPending}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
