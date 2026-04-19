import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  User, Club, ClubBookmark, Affiliation, HoursSubmission, ClubEvent,
  getClubs,
  getApprovedSubClubs,
  getSuperClubFedSubmissions,
  getUserBookmarks,
  addBookmark,
  removeBookmark,
  getClubEvents,
} from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trophy, Search, Bookmark, BookmarkCheck, Calendar, Network, MapPin } from "lucide-react";

interface AffiliatesProps {
  user: User;
  club: Club;
}

export default function Affiliates({ user, club }: AffiliatesProps) {
  const { toast } = useToast();
  const userEmail = user.email || '';
  const [searchQuery, setSearchQuery] = useState("");

  const { data: subAffs = [] } = useQuery<Affiliation[]>({
    queryKey: ['affiliations-sub-approved', club.id],
    queryFn: () => getApprovedSubClubs(club.id),
  });

  const { data: fedSubs = [] } = useQuery<HoursSubmission[]>({
    queryKey: ['super-club-fed-submissions', club.id],
    queryFn: () => getSuperClubFedSubmissions(club.id),
  });

  const { data: allClubs = [] } = useQuery<Club[]>({
    queryKey: ['firebase-clubs'],
    queryFn: getClubs,
  });

  const { data: bookmarks = [] } = useQuery<ClubBookmark[]>({
    queryKey: ['club-bookmarks', userEmail],
    queryFn: () => getUserBookmarks(userEmail),
    enabled: !!userEmail,
  });

  const bookmarkSet = useMemo(() => new Set(bookmarks.map(b => b.clubId)), [bookmarks]);
  const clubById = useMemo(() => new Map(allClubs.map(c => [c.id, c])), [allClubs]);

  const addMutation = useMutation({
    mutationFn: (clubId: string) => addBookmark(userEmail, clubId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club-bookmarks', userEmail] });
      toast({ title: 'Bookmarked' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (clubId: string) => removeBookmark(userEmail, clubId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club-bookmarks', userEmail] });
    },
  });

  // Leaderboard: sum approved hours per sub-club for shared volunteers.
  // Sub-clubs and super-clubs approve hours independently/in parallel — we
  // count any submission the sub-club itself approved.
  const leaderboard = useMemo(() => {
    const tally = new Map<string, { clubId: string; clubName: string; hours: number; people: Set<string> }>();
    subAffs.forEach(a => {
      tally.set(a.subClubId, { clubId: a.subClubId, clubName: a.subClubName, hours: 0, people: new Set() });
    });
    fedSubs.forEach(s => {
      if (s.status !== 'approved') return;
      const t = tally.get(s.clubId);
      if (!t) return;
      t.hours += s.hours;
      t.people.add(s.userEmail);
    });
    return Array.from(tally.values())
      .map(t => ({ ...t, peopleCount: t.people.size }))
      .sort((a, b) => b.hours - a.hours);
  }, [subAffs, fedSubs]);

  const filteredClubs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allClubs.filter(c => c.id !== club.id);
    return allClubs.filter(c => c.id !== club.id && c.name.toLowerCase().includes(q));
  }, [allClubs, searchQuery, club.id]);

  // Bookmarked clubs' open events
  const bookmarkedClubIds = bookmarks.map(b => b.clubId);
  const eventsQueries = useQuery<{ clubId: string; events: ClubEvent[] }[]>({
    queryKey: ['bookmark-club-events', bookmarkedClubIds],
    queryFn: async () => {
      const results: { clubId: string; events: ClubEvent[] }[] = [];
      for (const cid of bookmarkedClubIds) {
        try {
          const events = await getClubEvents(cid);
          results.push({ clubId: cid, events: events.filter(e => e.isOpen !== false) });
        } catch {}
      }
      return results;
    },
    enabled: bookmarkedClubIds.length > 0,
  });
  const bookmarkedEvents = eventsQueries.data || [];

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="max-w-6xl mx-auto p-6 lg:p-8 space-y-8">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Network className="w-6 h-6" />
            Affiliates
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sub-clubs feeding hours into <strong>{club.name}</strong>, plus clubs you've bookmarked.
          </p>
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="w-5 h-5 text-yellow-600" />
              Sub-Club Leaderboard
            </CardTitle>
            <CardDescription>Approved hours each sub-club has contributed to this super-club.</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-gray-500">No approved sub-clubs yet. Set them up in Admin → Settings → Affiliations.</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((row, i) => (
                  <div key={row.clubId} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-200 text-gray-700' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{i + 1}</div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{row.clubName}</p>
                        <p className="text-xs text-gray-500">{row.peopleCount} contributor{row.peopleCount === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{row.hours.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">hours</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search & bookmark */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bookmark className="w-5 h-5" />
              Bookmark Clubs
            </CardTitle>
            <CardDescription>Find and bookmark clubs to follow their open events below.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search all clubs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredClubs.slice(0, 25).map(c => {
                const isBookmarked = bookmarkSet.has(c.id);
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ backgroundColor: c.logoUrl ? undefined : c.color }}>
                        {c.logoUrl ? <img src={c.logoUrl} alt={c.name} className="w-full h-full object-cover" /> : <Trophy className="w-4 h-4 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{c.name}</p>
                        <p className="text-xs text-gray-500 truncate">{c.totalApprovedHours.toFixed(1)} hours</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isBookmarked ? 'outline' : 'default'}
                      onClick={() => isBookmarked ? removeMutation.mutate(c.id) : addMutation.mutate(c.id)}
                      className={isBookmarked ? '' : 'bg-black text-white hover:bg-gray-800'}
                    >
                      {isBookmarked ? <><BookmarkCheck className="w-3.5 h-3.5 mr-1" /> Saved</> : <><Bookmark className="w-3.5 h-3.5 mr-1" /> Save</>}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Bookmarked club events */}
        {bookmarks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5" />
                Open Events from Your Bookmarked Clubs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bookmarkedEvents.every(g => g.events.length === 0) ? (
                <p className="text-sm text-gray-500">No open events from your bookmarked clubs right now.</p>
              ) : (
                <div className="space-y-4">
                  {bookmarkedEvents.map(group => {
                    if (group.events.length === 0) return null;
                    const c = clubById.get(group.clubId);
                    return (
                      <div key={group.clubId}>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{c?.name || 'Club'}</p>
                        <div className="space-y-2">
                          {group.events.map(ev => (
                            <div key={ev.id} className="p-3 border border-gray-200 rounded-lg">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-gray-900">{ev.name}</p>
                                  {ev.logName && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3 h-3" /> {ev.logName}
                                    </p>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs">{ev.createdAt.toLocaleDateString()}</Badge>
                              </div>
                              {ev.description && <p className="text-xs text-gray-600 mt-2">{ev.description}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
