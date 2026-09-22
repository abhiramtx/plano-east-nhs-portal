import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Clock, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Club, getClubSubmissions, getMemberships, HoursSubmission, Membership } from "@/lib/firebase";
import { ClubPageHeader } from "@/components/club-page-header";

export default function Leaderboard({ club }: { club: Club }) {
  const { data: members = [], isLoading: membersLoading } = useQuery<Membership[]>({
    queryKey: ["single-club-members"],
    queryFn: () => getMemberships(club.id),
    staleTime: 60_000,
  });
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<HoursSubmission[]>({
    queryKey: ["single-club-submissions"],
    queryFn: () => getClubSubmissions(club.id),
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    const totals = new Map<string, number>();
    submissions.forEach((submission) => {
      if (submission.status === "approved") {
        const email = submission.userEmail.toLowerCase();
        totals.set(email, (totals.get(email) || 0) + Number(submission.hours || 0));
      }
    });
    return members
      .map((member) => ({
        ...member,
        hours: totals.get(member.userEmail.toLowerCase()) || 0,
      }))
      .sort((a, b) => b.hours - a.hours || a.userName.localeCompare(b.userName));
  }, [members, submissions]);

  return (
    <div className="min-h-full space-y-6 p-4 sm:p-6">
      <ClubPageHeader
        club={club}
        title="Volunteer Leaderboard"
        description="Recognizing the students who are making the biggest difference."
        icon={Trophy}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 pt-6"><Trophy className="h-5 w-5 text-[#d7a85a]" /><div><p className="text-xs text-muted-foreground">Top volunteer</p><p className="font-semibold">{rows[0]?.userName || "—"}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6"><Clock className="h-5 w-5 text-[#63a89a]" /><div><p className="text-xs text-muted-foreground">Approved hours</p><p className="font-semibold">{rows.reduce((sum, row) => sum + row.hours, 0).toFixed(1)}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6"><Users className="h-5 w-5 text-[#d4785f]" /><div><p className="text-xs text-muted-foreground">NHS volunteers</p><p className="font-semibold">{members.length}</p></div></CardContent></Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Plano East NHS volunteers</CardTitle>
          <CardDescription>Ranked by approved service hours.</CardDescription>
        </CardHeader>
        <CardContent>
          {membersLoading || submissionsLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading leaderboard…</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No volunteer hours have been approved yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((row, index) => (
                <div key={row.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${index === 0 ? "bg-[#d7a85a] text-[#121212]" : index === 1 ? "bg-[#d9cdbd] text-[#17324d]" : index === 2 ? "bg-[#d4785f] text-white" : "bg-muted text-muted-foreground"}`}>{index + 1}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.userName || row.userEmail}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.personalEmailAddress || row.userEmail}</p>
                  </div>
                  {index < 3 && <Badge variant="secondary">{index === 0 ? "Top contributor" : `#${index + 1}`}</Badge>}
                  <p className="w-20 text-right font-semibold">{row.hours.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">hrs</span></p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}