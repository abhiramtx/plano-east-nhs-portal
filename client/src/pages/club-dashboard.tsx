import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  User, 
  Club, 
  Membership, 
  HoursSubmission,
  getMemberships,
  getClubSubmissions,
  deleteMembershipByUserAndClub,
  deleteMembership
} from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Trophy, Clock, Settings, UserMinus, Crown, LogOut, Globe } from "lucide-react";

interface ClubDashboardProps {
  user: User;
  club: Club;
  membership: Membership;
  onLeaveClub: () => void;
}

export default function ClubDashboard({ user, club, membership, onLeaveClub }: ClubDashboardProps) {
  const { toast } = useToast();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [kickDialogOpen, setKickDialogOpen] = useState(false);
  const [memberToKick, setMemberToKick] = useState<Membership | null>(null);
  
  const userEmail = user.email || '';
  const isAdmin = membership.role === 'admin';

  const { data: members = [] } = useQuery<Membership[]>({
    queryKey: ['firebase-club-members', club.id],
    queryFn: () => getMemberships(club.id),
  });

  const { data: clubSubmissions = [] } = useQuery<HoursSubmission[]>({
    queryKey: ['firebase-club-submissions', club.id],
    queryFn: () => getClubSubmissions(club.id),
  });

  const leaveClubMutation = useMutation({
    mutationFn: async () => {
      await deleteMembershipByUserAndClub(userEmail, club.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-user-club', userEmail] });
      toast({ title: "Left club", description: "You have left the club." });
      onLeaveClub();
    },
    onError: (error: any) => {
      toast({ title: "Failed to leave", description: error.message, variant: "destructive" });
    }
  });

  const kickMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await deleteMembership(memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-club-members', club.id] });
      setKickDialogOpen(false);
      toast({ title: "Member removed", description: "The member has been removed from the club." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
    }
  });

  const approvedHours = clubSubmissions.filter(s => s.status === 'approved').reduce((sum, s) => sum + s.hours, 0);
  const pendingHours = clubSubmissions.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.hours, 0);

  const getMemberApprovedHours = (memberEmail: string) => {
    return clubSubmissions
      .filter(s => s.userEmail === memberEmail && s.status === 'approved')
      .reduce((sum, s) => sum + s.hours, 0);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-950 min-h-full">
      <div className="flex items-center justify-between pt-10 lg:pt-0">
        <div className="flex items-center space-x-4">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: club.color }}
          >
            <Globe className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{club.name}</h1>
            <p className="text-gray-400">{club.description || "No description"}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isAdmin && (
            <Badge variant="secondary" className="bg-purple-900/50 text-purple-400 border-purple-700">
              <Crown className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          )}
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800" onClick={() => setLeaveDialogOpen(true)}>
            <LogOut className="w-4 h-4 mr-2" />
            Leave Club
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Approved Hours</p>
                <p className="text-2xl font-bold text-white">{approvedHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Pending Hours</p>
                <p className="text-2xl font-bold text-white">{pendingHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Members</p>
                <p className="text-2xl font-bold text-white">{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Territory Size</p>
                <p className="text-2xl font-bold text-white">
                  {Math.max(20, Math.sqrt(club.totalApprovedHours) * 10).toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="bg-gray-900 border-gray-800">
          <TabsTrigger value="members" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400">
            <Users className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400">
            <Trophy className="w-4 h-4 mr-2" />
            Leaderboard
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="settings" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Club Members</CardTitle>
              <CardDescription className="text-gray-400">Manage your club's membership</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-300" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-white">
                            {member.userEmail}
                          </p>
                          {member.role === 'admin' && (
                            <Badge variant="secondary" className="bg-purple-900/50 text-purple-400 border-purple-700 text-xs">
                              Admin
                            </Badge>
                          )}
                          {member.userEmail === userEmail && (
                            <Badge variant="secondary" className="bg-blue-900/50 text-blue-400 border-blue-700 text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
                          {getMemberApprovedHours(member.userEmail).toFixed(1)} approved hours
                        </p>
                      </div>
                    </div>
                    {isAdmin && member.userEmail !== userEmail && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
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
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Member Leaderboard</CardTitle>
              <CardDescription className="text-gray-400">Top contributors in your club</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...members]
                  .sort((a, b) => getMemberApprovedHours(b.userEmail) - getMemberApprovedHours(a.userEmail))
                  .map((member, index) => (
                    <div 
                      key={member.id}
                      className={`flex items-center space-x-4 p-4 rounded-lg ${
                        member.userEmail === userEmail ? 'bg-blue-900/30 border border-blue-700' : 'bg-gray-800'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500 text-yellow-900' :
                        index === 1 ? 'bg-gray-400 text-gray-900' :
                        index === 2 ? 'bg-orange-500 text-orange-900' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">
                          {member.userEmail}
                          {member.userEmail === userEmail && " (You)"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white">
                          {getMemberApprovedHours(member.userEmail).toFixed(1)}
                        </p>
                        <p className="text-xs text-gray-400">hours</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="settings">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Club Settings</CardTitle>
                <CardDescription className="text-gray-400">Manage your club's configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <h3 className="font-medium text-white mb-2">Club Privacy</h3>
                    <p className="text-sm text-gray-400 mb-2">
                      {club.isPrivate ? "This club is private and requires a password to join." : "This club is public and anyone can join."}
                    </p>
                    <Badge variant={club.isPrivate ? "secondary" : "outline"} className={club.isPrivate ? "bg-gray-700 text-gray-300" : "border-gray-600 text-gray-300"}>
                      {club.isPrivate ? "Private" : "Public"}
                    </Badge>
                  </div>
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <h3 className="font-medium text-white mb-2">Club Color</h3>
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-lg"
                        style={{ backgroundColor: club.color }}
                      />
                      <span className="text-sm text-gray-400">{club.color}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Leave Club?</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to leave {club.name}? Your hours will remain on record but you won't be able to contribute until you join another club.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800" onClick={() => setLeaveDialogOpen(false)}>
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
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Remove Member?</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to remove {memberToKick?.userEmail} from the club?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800" onClick={() => setKickDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => memberToKick && kickMemberMutation.mutate(memberToKick.id)}
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
