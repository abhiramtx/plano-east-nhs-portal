import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  getAllArchivedSubmissions,
  getYearlyArchivePeriods,
  getCurrentUser,
  Club,
  HoursSubmission 
} from '@/lib/firebase';
import { 
  Calendar,
  Clock,
  User,
  Search,
  Archive,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AdminHistoryProps {
  user?: { name: string; email: string };
  club: Club;
  isVolunteerView?: boolean;
}

export function AdminHistory({ user, club, isVolunteerView = false }: AdminHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
  const authUser = getCurrentUser();

  const { data: archivedData = [], isLoading } = useQuery({
    queryKey: ['firebase-archived-submissions', club.id],
    queryFn: () => getAllArchivedSubmissions(club.id),
    staleTime: 0,
    gcTime: 0,
  });

  const { data: archivePeriods = [] } = useQuery({
    queryKey: ['firebase-archive-periods'],
    queryFn: () => getYearlyArchivePeriods(),
    staleTime: 0,
    gcTime: 0,
    enabled: !isVolunteerView,
  });

  // Filter to current user's submissions if on volunteer view
  const filteredData = archivedData.filter(item => {
    if (isVolunteerView) {
      return item.userEmail === authUser?.email;
    }
    const matchesSearch = 
      item.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.archivePeriod?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Group submissions by archive period
  const byPeriod = filteredData.reduce<Record<string, typeof filteredData>>((acc, s) => {
    const p = s.archivePeriod || 'Unknown';
    if (!acc[p]) acc[p] = [];
    acc[p].push(s);
    return acc;
  }, {});

  // All period names (union of archive periods from Firestore + submissions)
  const allPeriodNames = !isVolunteerView
    ? [...new Set([...archivePeriods.map(p => p.schoolYear), ...Object.keys(byPeriod)])]
    : Object.keys(byPeriod);

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {isVolunteerView ? 'My History' : 'Archived Submissions'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isVolunteerView 
                  ? 'Your personal submissions from past archived periods'
                  : `View archived submission history for ${club.name}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {!isVolunteerView && (
          <div className="mb-6">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by volunteer name, email, or period..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
          </div>
        ) : isVolunteerView ? (
          /* ── Volunteer view: flat list of own submissions ── */
          filteredData.length === 0 ? (
            <Card className="bg-white border-gray-200">
              <CardContent className="p-8 text-center">
                <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="font-medium text-gray-700">No personal history found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Your archived submissions will appear here after an admin archives a school year
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredData.map(s => (
                <SubmissionCard key={s.id} submission={s} />
              ))}
            </div>
          )
        ) : (
          /* ── Admin view: grouped by archive period ── */
          allPeriodNames.length === 0 ? (
            <Card className="bg-white border-gray-200">
              <CardContent className="p-8 text-center">
                <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="font-medium text-gray-700">No archives yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Use Database Management to archive a school year. Archived submissions will appear here grouped by period.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {allPeriodNames.map(period => {
                const submissions = byPeriod[period] || [];
                const meta = archivePeriods.find(p => p.schoolYear === period);
                const isExpanded = expandedPeriod === period;
                return (
                  <Card key={period} className="bg-white border-gray-200 overflow-hidden">
                    <button
                      className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedPeriod(isExpanded ? null : period)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 bg-gray-100 rounded-lg">
                          <Archive className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">{period}</p>
                          <p className="text-xs text-gray-500">
                            {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
                            {meta?.archivedAt && ` · Archived ${meta.archivedAt.toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{submissions.length} records</Badge>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-6 py-4 space-y-3 bg-gray-50">
                        {submissions.length === 0 ? (
                          <p className="text-sm text-gray-500 py-4 text-center">
                            No submissions were in the database when this archive was created.
                          </p>
                        ) : (
                          submissions.map(s => <SubmissionCard key={s.id} submission={s} compact />)
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function SubmissionCard({ submission, compact = false }: { submission: HoursSubmission & { archivePeriod?: string; archivedAt?: Date }; compact?: boolean }) {
  return (
    <Card className="bg-white border-gray-200">
      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full flex-shrink-0">
                <User className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{submission.userName || submission.userEmail}</p>
                <p className="text-xs text-gray-500">{submission.userEmail}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Activity</p>
                <p className="text-sm text-gray-900">{(submission as any).activityName || submission.description}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Hours</p>
                <p className="text-sm text-gray-900 font-medium">{submission.hours}h</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Date</p>
                <p className="text-sm text-gray-900">{new Date(submission.date).toLocaleDateString()}</p>
              </div>
              {submission.archivePeriod && !compact && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Archive Period</p>
                  <p className="text-sm text-gray-900">{submission.archivePeriod}</p>
                </div>
              )}
            </div>

            {(submission as any).rejectReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <p className="text-xs font-medium text-red-700 uppercase mb-1">Rejection Reason</p>
                <p className="text-sm text-red-600">{(submission as any).rejectReason}</p>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Badge variant={submission.status === 'approved' ? 'default' : submission.status === 'rejected' ? 'destructive' : 'secondary'}>
                {submission.status}
              </Badge>
              {(submission as any).reviewedBy && (
                <p className="text-xs text-gray-500">
                  Reviewed by {(submission as any).reviewedBy}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
