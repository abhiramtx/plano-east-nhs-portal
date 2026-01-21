import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Trophy, Clock, Settings, UserMinus, Crown, LogOut, MapPin, Globe } from "lucide-react";
import type { Club, ClubMembership, HoursSubmission } from "@shared/schema";

interface ClubDashboardProps {
  user: User;
  club: Club;
  membership: ClubMembership;
  onLeaveClub: () => void;
}

export default function ClubDashboard({ user, club, membership, onLeaveClub }: ClubDashboardProps) {
  const { toast } = useToast();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [kickDialogOpen, setKickDialogOpen] = useState(false);
  const [memberToKick, setMemberToKick] = useState<ClubMembership | null>(null);
  
  const userEmail = user.email?.replace(/\./g, ',') || '';
  const isAdmin = membership.role === 'admin';

  const { data: members = [] } = useQuery<ClubMembership[]>({
    queryKey: ['/api/clubs', club.id, 'members'],
  });

  const { data: clubSubmissions = [] } = useQuery<HoursSubmission[]>({
    queryKey: ['/api/hours-submissions'],
    select: (data) => data.filter(s => s.clubId === club.id),
  });

  const leaveClubMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/clubs/${club.id}/leave`, { userEmail });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-club', userEmail] });
      toast({ title: "Left club", description: "You have left the club." });
      onLeaveClub();
    },
    onError: (error: any) => {
      toast({ title: "Failed to leave", description: error.message, variant: "destructive" });
    }
  });

  const kickMemberMutation = useMutation({
    mutationFn: async (memberEmail: string) => {
      const res = await apiRequest('POST', `/api/clubs/${club.id}/kick`, { userEmail: memberEmail, adminEmail: userEmail });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clubs', club.id, 'members'] });
      setKickDialogOpen(false);
      toast({ title: "Member removed", description: "The member has been removed from the club." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
    }
  });

  const approvedHours = clubSubmissions.filter(s => s.status === 'approved').reduce((sum, s) => sum + parseFloat(s.hours), 0);
  const pendingHours = clubSubmissions.filter(s => s.status === 'pending').reduce((sum, s) => sum + parseFloat(s.hours), 0);
  const totalSubmissions = clubSubmissions.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: club.color }}
          >
            <Globe className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{club.name}</h1>
            <p className="text-gray-600">{club.description || "No description"}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isAdmin && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              <Crown className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          )}
          <Button variant="outline" onClick={() => setLeaveDialogOpen(true)}>
            <LogOut className="w-4 h-4 mr-2" />
            Leave Club
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Approved Hours</p>
                <p className="text-2xl font-bold text-gray-900">{approvedHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Hours</p>
                <p className="text-2xl font-bold text-gray-900">{pendingHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Members</p>
                <p className="text-2xl font-bold text-gray-900">{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Territory Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.max(20, Math.sqrt(parseFloat(club.totalApprovedHours)) * 10).toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Trophy className="w-4 h-4 mr-2" />
            Leaderboard
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Club Members</CardTitle>
              <CardDescription>Manage your club's membership</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">
                            {member.userEmail.replace(/,/g, '.')}
                          </p>
                          {member.role === 'admin' && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                              Admin
                            </Badge>
                          )}
                          {member.userEmail === userEmail && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {parseFloat(member.totalApprovedHours).toFixed(1)} approved hours
                        </p>
                      </div>
                    </div>
                    {isAdmin && member.userEmail !== userEmail && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setMemberToKick(member);
                          setKickDialogOpen(true);
                        }}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle>Member Leaderboard</CardTitle>
              <CardDescription>Top contributors in your club</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...members]
                  .sort((a, b) => parseFloat(b.totalApprovedHours) - parseFloat(a.totalApprovedHours))
                  .map((member, index) => (
                    <div 
                      key={member.id}
                      className={`flex items-center space-x-4 p-4 rounded-lg ${
                        member.userEmail === userEmail ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-400 text-orange-900' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {member.userEmail.replace(/,/g, '.')}
                          {member.userEmail === userEmail && " (You)"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {parseFloat(member.totalApprovedHours).toFixed(1)}
                        </p>
                        <p className="text-xs text-gray-500">hours</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Club Settings</CardTitle>
                <CardDescription>Manage your club's configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Club Privacy</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {club.isPrivate ? "This club is private and requires a password to join." : "This club is public and anyone can join."}
                    </p>
                    <Badge variant={club.isPrivate ? "secondary" : "outline"}>
                      {club.isPrivate ? "Private" : "Public"}
                    </Badge>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Club Color</h3>
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-lg"
                        style={{ backgroundColor: club.color }}
                      />
                      <span className="text-sm text-gray-600">{club.color}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Club?</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave {club.name}? Your hours will remain on record but you won't be able to contribute until you join another club.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => leaveClubMutation.mutate()}
              disabled={leaveClubMutation.isPending}
            >
              {leaveClubMutation.isPending ? "Leaving..." : "Leave Club"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={kickDialogOpen} onOpenChange={setKickDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {memberToKick?.userEmail.replace(/,/g, '.')} from the club?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKickDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => memberToKick && kickMemberMutation.mutate(memberToKick.userEmail)}
              disabled={kickMemberMutation.isPending}
            >
              {kickMemberMutation.isPending ? "Removing..." : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
