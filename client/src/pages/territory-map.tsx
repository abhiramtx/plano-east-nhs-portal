import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trophy, MapPin, Clock, TrendingUp, Users, Megaphone, Globe } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WorldMap } from "@/components/world-map";
import { 
  getClubs, 
  getLeaderboard, 
  Club, 
  ServiceRequest,
  getOpenServiceRequests,
  getUserParticipations,
  joinServiceRequest,
  ServiceRequestParticipant,
  getCurrentUser,
} from "@/lib/firebase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TerritoryMapProps {
  currentClubId?: string;
}

export default function TerritoryMap({ currentClubId }: TerritoryMapProps) {
  const { toast } = useToast();
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("all");
  const user = getCurrentUser();
  const userEmail = user?.email || '';

  const { data: clubs = [] } = useQuery<Club[]>({
    queryKey: ['firebase-clubs'],
    queryFn: getClubs,
    refetchInterval: 30000,
  });

  const { data: leaderboardClubs = [] } = useQuery<Club[]>({
    queryKey: ['firebase-leaderboard'],
    queryFn: getLeaderboard,
  });

  const { data: serviceRequests = [] } = useQuery<ServiceRequest[]>({
    queryKey: ['firebase-open-service-requests'],
    queryFn: getOpenServiceRequests,
    refetchInterval: 30000,
  });

  const { data: myParticipations = [] } = useQuery<ServiceRequestParticipant[]>({
    queryKey: ['firebase-my-participations', userEmail],
    queryFn: () => getUserParticipations(userEmail),
    enabled: !!userEmail,
  });

  const joinedRequestIds = myParticipations.map(p => p.requestId);

  const joinMutation = useMutation({
    mutationFn: async (request: ServiceRequest) => {
      return await joinServiceRequest(request.id, userEmail, user?.name || userEmail.split('@')[0]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-my-participations'] });
      toast({ title: "Joined!", description: "You've successfully joined this service request." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    }
  });

  const requestsWithLocation = serviceRequests.filter(r => r.latitude && r.longitude);

  const calculateTotalHours = (club: Club) => {
    return club.totalApprovedHours + club.bonusHours - club.decayedHours;
  };

  const currentClub = clubs.find(c => c.id === currentClubId);
  const currentClubRank = leaderboardClubs.findIndex(c => c.id === currentClubId) + 1;
  const totalHoursGlobal = clubs.reduce((sum, c) => sum + calculateTotalHours(c), 0);

  return (
    <div className="p-6 space-y-6 max-h-screen overflow-y-auto bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Territory Map</h1>
            <p className="text-gray-600">Watch clubs compete for global dominance</p>
          </div>
        </div>
        {currentClub && currentClubRank > 0 && (
          <div className="bg-black text-white px-5 py-3 rounded-xl">
            <span className="text-sm text-gray-400">Your Rank</span>
            <span className="font-bold text-2xl ml-2">#{currentClubRank}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <Users className="w-6 h-6 mx-auto text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{clubs.length}</p>
          <p className="text-sm text-gray-600">Active Clubs</p>
        </Card>
        <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <Clock className="w-6 h-6 mx-auto text-green-600 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{totalHoursGlobal.toFixed(0)}</p>
          <p className="text-sm text-gray-600">Total Hours</p>
        </Card>
        <Card className="p-4 text-center bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <Megaphone className="w-6 h-6 mx-auto text-purple-600 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{requestsWithLocation.length}</p>
          <p className="text-sm text-gray-600">Service Requests</p>
        </Card>
        <Card className="p-4 text-center bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <Trophy className="w-6 h-6 mx-auto text-orange-600 mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {currentClub ? calculateTotalHours(currentClub).toFixed(0) : 0}
          </p>
          <p className="text-sm text-gray-600">Your Club Hours</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden shadow-xl">
            <CardHeader className="pb-2 bg-gray-900 text-white">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Global Territories
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <WorldMap 
                clubs={clubs}
                serviceRequests={requestsWithLocation}
                onJoinRequest={(request) => joinMutation.mutate(request)}
                joinedRequestIds={joinedRequestIds}
                height="550px"
                interactive={true}
                showTerritories={true}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs value={leaderboardPeriod} onValueChange={setLeaderboardPeriod}>
                <TabsList className="grid grid-cols-4 w-full mb-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="year">Year</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                </TabsList>
                <TabsContent value={leaderboardPeriod} className="space-y-2 max-h-[400px] overflow-y-auto">
                  {leaderboardClubs.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No clubs yet</p>
                  ) : (
                    leaderboardClubs.slice(0, 15).map((club, index) => {
                      const totalHours = calculateTotalHours(club);
                      const isCurrentClub = club.id === currentClubId;
                      return (
                        <div 
                          key={club.id}
                          className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                            isCurrentClub 
                              ? 'bg-black text-white ring-2 ring-black' 
                              : index < 3 
                                ? 'bg-gradient-to-r from-yellow-50 to-orange-50' 
                                : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-gray-300 text-gray-700' :
                              index === 2 ? 'bg-amber-600 text-amber-100' :
                              isCurrentClub ? 'bg-white text-black' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {index + 1}
                            </span>
                            <div 
                              className="w-5 h-5 rounded-full ring-2 ring-white shadow"
                              style={{ backgroundColor: club.color }}
                            />
                            <span className="font-medium truncate max-w-[120px]">{club.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className={`w-4 h-4 ${isCurrentClub ? 'text-green-400' : 'text-green-500'}`} />
                            <span className="font-semibold">{totalHours.toFixed(1)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {currentClub && (
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="pb-2" style={{ backgroundColor: currentClub.color + '20' }}>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div 
                    className="w-6 h-6 rounded-full ring-2 ring-white shadow"
                    style={{ backgroundColor: currentClub.color }}
                  />
                  {currentClub.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Approved Hours</span>
                  <span className="font-semibold">{currentClub.totalApprovedHours.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Bonus Hours</span>
                  <span className="font-semibold text-green-600">+{currentClub.bonusHours.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Decayed Hours</span>
                  <span className="font-semibold text-red-600">-{currentClub.decayedHours.toFixed(1)}</span>
                </div>
                <div className="pt-3 border-t flex justify-between items-center">
                  <span className="text-gray-900 font-medium">Net Total</span>
                  <span className="font-bold text-lg">{calculateTotalHours(currentClub).toFixed(1)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
