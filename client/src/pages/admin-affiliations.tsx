import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Club,
  Affiliation,
  getClubs,
  getOutgoingAffiliations,
  getIncomingAffiliations,
  requestAffiliation,
  respondToAffiliation,
  removeAffiliation,
} from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Send, CheckCircle, XCircle, Trash2, ArrowUp, ArrowDown, Trophy } from "lucide-react";

interface AdminAffiliationsProps {
  user: { name?: string; email?: string };
  club: Club;
}

export function AdminAffiliations({ user, club }: AdminAffiliationsProps) {
  const { toast } = useToast();
  const userEmail = user.email || '';
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allClubs = [] } = useQuery<Club[]>({
    queryKey: ['firebase-clubs'],
    queryFn: getClubs,
  });

  const { data: outgoing = [], isLoading: outLoading } = useQuery<Affiliation[]>({
    queryKey: ['affiliations-outgoing', club.id],
    queryFn: () => getOutgoingAffiliations(club.id),
  });

  const { data: incoming = [], isLoading: inLoading } = useQuery<Affiliation[]>({
    queryKey: ['affiliations-incoming', club.id],
    queryFn: () => getIncomingAffiliations(club.id),
  });

  const requestMutation = useMutation({
    mutationFn: (target: Club) =>
      requestAffiliation(club.id, club.name, target.id, target.name, userEmail),
    onSuccess: (_d, target) => {
      queryClient.invalidateQueries({ queryKey: ['affiliations-outgoing', club.id] });
      toast({ title: 'Request sent', description: `Asked ${target.name} to be your super-club.` });
    },
    onError: (err: any) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
  });

  const invalidateAllAffiliationViews = () => {
    queryClient.invalidateQueries({ queryKey: ['affiliations-incoming', club.id] });
    queryClient.invalidateQueries({ queryKey: ['affiliations-outgoing', club.id] });
    queryClient.invalidateQueries({ queryKey: ['affiliations-sub-approved', club.id] });
    queryClient.invalidateQueries({ queryKey: ['affiliations-all-approved'] });
    queryClient.invalidateQueries({ queryKey: ['super-club-fed-submissions', club.id] });
  };

  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      respondToAffiliation(id, status, userEmail),
    onSuccess: (_d, { status }) => {
      invalidateAllAffiliationViews();
      toast({ title: status === 'approved' ? 'Affiliation approved' : 'Request rejected' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeAffiliation(id),
    onSuccess: () => {
      invalidateAllAffiliationViews();
      toast({ title: 'Affiliation removed' });
    },
  });

  const outgoingMap = useMemo(() => {
    const m = new Map<string, Affiliation>();
    outgoing.forEach(a => m.set(a.superClubId, a));
    return m;
  }, [outgoing]);

  const candidateClubs = allClubs.filter(c =>
    c.id !== club.id &&
    (!searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const incomingPending = incoming.filter(a => a.status === 'pending');
  const incomingApproved = incoming.filter(a => a.status === 'approved');
  const outgoingApproved = outgoing.filter(a => a.status === 'approved');
  const outgoingPending = outgoing.filter(a => a.status === 'pending');
  const outgoingRejected = outgoing.filter(a => a.status === 'rejected');

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900">Affiliations</h2>
        <p className="text-sm text-gray-500 mt-1">
          Affiliate <strong>{club.name}</strong> as a sub-club under another (super-) club, or approve sub-clubs that want to feed hours into this one.
          Hours from a sub-club only flow into the super-club for volunteers who are members of <em>both</em>.
        </p>
      </div>

      {/* Incoming requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowDown className="w-4 h-4" /> Incoming Requests
          </CardTitle>
          <CardDescription>Other clubs asking to become sub-clubs of this club.</CardDescription>
        </CardHeader>
        <CardContent>
          {inLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : incomingPending.length === 0 ? (
            <p className="text-sm text-gray-500">No pending requests.</p>
          ) : (
            <div className="space-y-2">
              {incomingPending.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{a.subClubName}</p>
                    <p className="text-xs text-gray-500">Requested by {a.requestedBy} · {a.requestedAt.toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => respondMutation.mutate({ id: a.id, status: 'approved' })} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => respondMutation.mutate({ id: a.id, status: 'rejected' })}>
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved relationships */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="w-4 h-4" /> Approved Affiliations
          </CardTitle>
          <CardDescription>Active super-club / sub-club relationships.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Sub-clubs feeding INTO this club</p>
            {incomingApproved.length === 0 ? (
              <p className="text-sm text-gray-500">No approved sub-clubs yet.</p>
            ) : (
              <div className="space-y-2">
                {incomingApproved.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{a.subClubName}</p>
                      <p className="text-xs text-gray-500">Approved {a.respondedAt?.toLocaleDateString()}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeMutation.mutate(a.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Super-clubs this club feeds INTO</p>
            {outgoingApproved.length === 0 ? (
              <p className="text-sm text-gray-500">Not affiliated as a sub-club anywhere yet.</p>
            ) : (
              <div className="space-y-2">
                {outgoingApproved.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{a.superClubName}</p>
                      <p className="text-xs text-gray-500">Approved {a.respondedAt?.toLocaleDateString()}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeMutation.mutate(a.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Send affiliation request */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowUp className="w-4 h-4" /> Become a Sub-Club
          </CardTitle>
          <CardDescription>Send a request asking another club to be your super-club. They must approve before hours flow into them.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search clubs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {outLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : candidateClubs.length === 0 ? (
              <p className="text-sm text-gray-500">No clubs match.</p>
            ) : (
              candidateClubs.map(c => {
                const existing = outgoingMap.get(c.id);
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden" style={{ backgroundColor: c.logoUrl ? undefined : c.color }}>
                        {c.logoUrl && <img src={c.logoUrl} alt={c.name} className="w-full h-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{c.name}</p>
                        <p className="text-xs text-gray-500 truncate">{c.description || 'No description'}</p>
                      </div>
                    </div>
                    {existing ? (
                      <Badge variant="outline" className={
                        existing.status === 'approved' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' :
                        existing.status === 'rejected' ? 'border-red-300 text-red-700 bg-red-50' :
                        'border-amber-300 text-amber-700 bg-amber-50'
                      }>
                        {existing.status}
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={() => requestMutation.mutate(c)} disabled={requestMutation.isPending} className="bg-black text-white hover:bg-gray-800">
                        <Send className="w-3 h-3 mr-1" /> Request
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending / rejected outgoing */}
      {(outgoingPending.length > 0 || outgoingRejected.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outgoing Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {outgoingPending.map(a => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{a.superClubName}</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>
                  <Button size="sm" variant="ghost" onClick={() => removeMutation.mutate(a.id)} className="h-7 px-2 text-gray-500 hover:text-red-600">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            {outgoingRejected.map(a => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{a.superClubName}</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>
                  <Button size="sm" variant="ghost" onClick={() => removeMutation.mutate(a.id)} className="h-7 px-2 text-gray-500 hover:text-red-600">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
