import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Club, HoursSubmission,
  getSuperClubFedSubmissions,
  setSuperClubApprovalStatus,
  getApprovedSubClubs,
} from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Network, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  user: { name: string; email: string };
  club: Club;
}

export function SuperClubApprovals({ user, club }: Props) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: subAffs = [] } = useQuery({
    queryKey: ['affiliations-sub-approved', club.id],
    queryFn: () => getApprovedSubClubs(club.id),
  });

  const { data: fedSubs = [], isLoading } = useQuery<HoursSubmission[]>({
    queryKey: ['super-club-fed-submissions', club.id],
    queryFn: () => getSuperClubFedSubmissions(club.id),
    refetchInterval: 10000,
  });

  // Submissions still pending this super-club's review
  const pending = fedSubs.filter(s => {
    const st = s.superClubStatus?.[club.id];
    return !st || st.status === 'pending';
  });

  const subClubNameById = new Map(subAffs.map(a => [a.subClubId, a.subClubName]));

  const approveMutation = useMutation({
    mutationFn: (s: HoursSubmission) =>
      setSuperClubApprovalStatus(s.id, club.id, 'approved', s.hours, user.email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-club-fed-submissions', club.id] });
      toast({ title: 'Approved into ' + club.name });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ s, reason }: { s: HoursSubmission; reason: string }) =>
      setSuperClubApprovalStatus(s.id, club.id, 'rejected', 0, user.email, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-club-fed-submissions', club.id] });
      setRejectingId(null);
      setRejectReason("");
      toast({ title: 'Rejected for super-club credit' });
    },
  });

  if (subAffs.length === 0) return null;

  return (
    <Card className="mb-4 border-amber-200 bg-amber-50/30">
      <CardHeader
        className="cursor-pointer py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Network className="w-4 h-4 text-amber-700" />
            Sub-Club Submissions Awaiting Super-Club Approval
            <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 ml-2">{pending.length}</Badge>
          </span>
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          <p className="text-xs text-gray-600 mb-3">
            These were already approved by their sub-club. Approving here adds them to this super-club's totals as well.
            Only volunteers who are members of both clubs appear.
          </p>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing waiting for super-club approval.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {pending.map(s => (
                <div key={s.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{s.activityName || s.description}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {s.userName || s.userEmail} · {s.hours}h ·{' '}
                        <span className="text-amber-700 font-medium">from {subClubNameById.get(s.clubId) || 'sub-club'}</span>
                      </p>
                    </div>
                    {rejectingId !== s.id && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button size="sm" onClick={() => approveMutation.mutate(s)} disabled={approveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectingId(s.id)} className="h-8">
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                  {s.description && <p className="text-xs text-gray-600 mt-1">{s.description}</p>}
                  {rejectingId === s.id && (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason (optional)"
                        rows={2}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancel</Button>
                        <Button size="sm" onClick={() => rejectMutation.mutate({ s, reason: rejectReason })} disabled={rejectMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white">
                          Confirm Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
