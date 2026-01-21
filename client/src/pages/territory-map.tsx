import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, MapPin, Clock, TrendingUp, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WorldMap } from "@/components/world-map";
import type { Club, HighNeedArea } from "@shared/schema";

interface TerritoryMapProps {
  currentClubId?: number;
}

export default function TerritoryMap({ currentClubId }: TerritoryMapProps) {
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("all");

  const { data: clubs = [] } = useQuery<Club[]>({
    queryKey: ['/api/clubs'],
    refetchInterval: 30000,
  });

  const { data: highNeedAreas = [] } = useQuery<HighNeedArea[]>({
    queryKey: ['/api/high-need-areas'],
  });

  const { data: leaderboardClubs = [] } = useQuery<Club[]>({
    queryKey: ['/api/leaderboard/clubs', leaderboardPeriod],
  });

  const calculateTotalHours = (club: Club) => {
    return parseFloat(club.totalApprovedHours) + parseFloat(club.bonusHours) - parseFloat(club.decayedHours);
  };

  const currentClub = clubs.find(c => c.id === currentClubId);
  const currentClubRank = leaderboardClubs.findIndex(c => c.id === currentClubId) + 1;

  return (
    <div className="p-6 space-y-6 max-h-screen overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">World Map</h1>
            <p className="text-gray-600">See where clubs are making an impact</p>
          </div>
        </div>
        {currentClub && (
          <div className="bg-black text-white px-4 py-2 rounded-lg">
            <span className="text-sm">Your Club Rank:</span>
            <span className="font-bold text-lg ml-2">#{currentClubRank || "—"}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Club Territories
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <WorldMap 
                clubs={clubs}
                height="500px"
                interactive={false}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <Card className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{clubs.length}</p>
              <p className="text-sm text-gray-500">Active Clubs</p>
            </Card>
            <Card className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {clubs.reduce((sum, c) => sum + calculateTotalHours(c), 0).toFixed(0)}
              </p>
              <p className="text-sm text-gray-500">Total Hours</p>
            </Card>
            <Card className="p-4 text-center">
              <MapPin className="w-6 h-6 mx-auto text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{highNeedAreas.length}</p>
              <p className="text-sm text-gray-500">High-Need Areas</p>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={leaderboardPeriod} onValueChange={setLeaderboardPeriod}>
                <TabsList className="grid grid-cols-4 w-full mb-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="year">Year</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                </TabsList>
                <TabsContent value={leaderboardPeriod} className="space-y-2">
                  {leaderboardClubs.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No clubs yet</p>
                  ) : (
                    leaderboardClubs.slice(0, 10).map((club, index) => {
                      const totalHours = calculateTotalHours(club);
                      const isCurrentClub = club.id === currentClubId;
                      return (
                        <div 
                          key={club.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            isCurrentClub ? 'bg-black text-white' : 'bg-gray-50'
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
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: club.color }}
                            />
                            <span className="font-medium truncate max-w-[120px]">{club.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className={`w-4 h-4 ${isCurrentClub ? 'text-white' : 'text-green-500'}`} />
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

          {highNeedAreas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-500" />
                  High-Need Areas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {highNeedAreas.slice(0, 5).map((area) => (
                  <div key={area.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <span className="font-medium text-gray-900">{area.name}</span>
                    <span className="text-sm text-red-600">{parseFloat(area.bonusMultiplier || "1.5").toFixed(1)}x bonus</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
