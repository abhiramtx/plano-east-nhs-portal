import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  getAllArchivedSubmissions,
  getAllUserArchivedSubmissions,
  getYearlyArchivePeriods,
  getCurrentUser,
  Club,
  HoursSubmission,
} from '@/lib/firebase';
import {
  Clock,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Archive,
  Users,
  Search,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AdminHistoryProps {
  user?: { name: string; email: string };
  club: Club;
  isVolunteerView?: boolean;
}

type ArchivedSub = HoursSubmission & { clubName?: string; archivePeriod?: string; archivedAt?: Date };

// ─── Shared dashboard stats + chart ───────────────────────────────────────────
function ArchiveDashboard({ submissions }: { submissions: ArchivedSub[] }) {
  const stats = {
    total: submissions.reduce((s, r) => s + r.hours, 0),
    approved: submissions.filter(r => r.status === 'approved').reduce((s, r) => s + r.hours, 0),
    pending: submissions.filter(r => r.status === 'pending').reduce((s, r) => s + r.hours, 0),
    count: submissions.length,
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyData = MONTHS.map(m => ({ month: m, hours: 0 }));
  submissions.forEach(s => {
    if (s.status !== 'approved') return;
    const d = new Date(s.date);
    if (!isNaN(d.getTime())) monthlyData[d.getMonth()].hours += s.hours;
  });

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total.toFixed(1)}</p>
              </div>
              <div className="p-2.5 bg-gray-100 rounded-full">
                <Clock className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Approved</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.approved.toFixed(1)}</p>
              </div>
              <div className="p-2.5 bg-green-100 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending.toFixed(1)}</p>
              </div>
              <div className="p-2.5 bg-yellow-100 rounded-full">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Submissions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.count}</p>
              </div>
              <div className="p-2.5 bg-gray-100 rounded-full">
                <TrendingUp className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart + submission list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-gray-900">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              Monthly Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} domain={[0, 'dataMax + 1']} />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="bg-white p-2.5 border border-gray-200 rounded-lg shadow text-sm">
                          <p className="font-medium text-gray-900">{label}</p>
                          <p className="text-gray-600">{payload[0].value} hrs approved</p>
                        </div>
                      ) : null
                    }
                  />
                  <Line type="monotone" dataKey="hours" stroke="#111827" strokeWidth={2.5}
                    dot={{ fill: '#111827', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-gray-900">
              <Calendar className="w-4 h-4 text-gray-500" />
              Submissions ({submissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {submissions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No submissions in this period</p>
              ) : (
                submissions.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm text-gray-900 truncate">{(s as any).activityName || s.description}</p>
                      <p className="text-xs text-gray-400">{new Date(s.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-medium text-gray-900">{s.hours}h</span>
                      <Badge
                        variant={s.status === 'approved' ? 'default' : s.status === 'rejected' ? 'destructive' : 'secondary'}
                        className={`text-xs ${s.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' : s.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-red-100 text-red-700 border-red-200'}`}
                      >
                        {s.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Volunteer "My History" ───────────────────────────────────────────────────
function VolunteerHistory({ club }: { club: Club }) {
  const authUser = getCurrentUser();
  const [selectedClubKey, setSelectedClubKey] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  const { data: allSubs = [], isLoading } = useQuery({
    queryKey: ['firebase-user-archived', authUser?.email],
    queryFn: () => getAllUserArchivedSubmissions(authUser!.email),
    enabled: !!authUser?.email,
    staleTime: 0,
    gcTime: 0,
  });

  // Build club list from submissions
  const clubMap = useMemo(() => {
    const map: Record<string, { label: string; subs: ArchivedSub[] }> = {};
    allSubs.forEach(s => {
      const key = s.clubId || '__solo__';
      const label = s.clubId ? (s.clubName || s.clubId) : 'Solo';
      if (!map[key]) map[key] = { label, subs: [] };
      map[key].subs.push(s);
    });
    return map;
  }, [allSubs]);

  const clubKeys = Object.keys(clubMap);

  // Auto-select first club
  const activeClubKey = selectedClubKey && clubMap[selectedClubKey] ? selectedClubKey : (clubKeys[0] ?? null);

  // Periods for active club
  const periodsForClub = useMemo(() => {
    if (!activeClubKey) return [];
    const subs = clubMap[activeClubKey]?.subs ?? [];
    return [...new Set(subs.map(s => s.archivePeriod || 'Unknown'))];
  }, [activeClubKey, clubMap]);

  // Auto-select first period
  const activePeriod = selectedPeriod && periodsForClub.includes(selectedPeriod) ? selectedPeriod : (periodsForClub[0] ?? null);

  // Submissions for selected (club, period)
  const visibleSubs = useMemo(() => {
    if (!activeClubKey || !activePeriod) return [];
    return (clubMap[activeClubKey]?.subs ?? []).filter(s => (s.archivePeriod || 'Unknown') === activePeriod);
  }, [activeClubKey, activePeriod, clubMap]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
      </div>
    );
  }

  if (clubKeys.length === 0) {
    return (
      <div className="flex-1 flex flex-col bg-white min-h-0">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">My History</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Your personal submissions from past archived periods</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-700">No archived history yet</p>
            <p className="text-sm text-gray-400 mt-1">Your submissions will appear here after an admin archives a school year</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <h1 className="text-2xl font-semibold text-gray-900">My History</h1>
        <p className="text-gray-500 mt-0.5 text-sm">Your personal submissions from past archived periods</p>
      </div>

      {/* Club top-nav */}
      <div className="bg-white border-b border-gray-200 px-6 flex-shrink-0">
        <div className="flex gap-0 overflow-x-auto">
          {clubKeys.map(key => (
            <button
              key={key}
              onClick={() => { setSelectedClubKey(key); setSelectedPeriod(null); }}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                key === activeClubKey
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {clubMap[key].label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${key === activeClubKey ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {[...new Set(clubMap[key].subs.map(s => s.archivePeriod))].length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Period sub-nav */}
      {periodsForClub.length > 0 && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 flex-shrink-0">
          <div className="flex gap-0 overflow-x-auto">
            {periodsForClub.map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                  period === activePeriod
                    ? 'border-gray-700 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard content */}
      <div className="flex-1 overflow-auto p-6">
        {activePeriod ? (
          <ArchiveDashboard submissions={visibleSubs} />
        ) : (
          <div className="text-center py-16 text-gray-400">
            <Archive className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Select a club and period to view your history</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin "Archived Submissions" ─────────────────────────────────────────────
function AdminHistoryView({ club }: { club: Club }) {
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: allSubs = [], isLoading } = useQuery({
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
  });

  // All period names
  const allPeriods = useMemo(() => {
    const fromSubs = [...new Set(allSubs.map(s => s.archivePeriod || 'Unknown'))];
    const fromMeta = archivePeriods.map(p => p.schoolYear);
    return [...new Set([...fromSubs, ...fromMeta])];
  }, [allSubs, archivePeriods]);

  const activePeriod = selectedPeriod && allPeriods.includes(selectedPeriod) ? selectedPeriod : (allPeriods[0] ?? null);

  const periodSubs = useMemo(() => {
    return allSubs.filter(s => {
      const p = s.archivePeriod || 'Unknown';
      if (p !== activePeriod) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (s.userEmail?.toLowerCase().includes(q) || s.userName?.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q));
    });
  }, [allSubs, activePeriod, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <h1 className="text-2xl font-semibold text-gray-900">Archived Submissions</h1>
        <p className="text-gray-500 mt-0.5 text-sm">Historical snapshots for {club.name}</p>
      </div>

      {/* Period tabs */}
      {allPeriods.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-6 flex-shrink-0">
          <div className="flex gap-0 overflow-x-auto">
            {allPeriods.map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  period === activePeriod
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        {allPeriods.length === 0 ? (
          <div className="text-center py-16">
            <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-700">No archives yet</p>
            <p className="text-sm text-gray-400 mt-1">Use Database Management to archive a school year</p>
          </div>
        ) : activePeriod ? (
          <div className="space-y-6">
            {/* Dashboard stats for this period */}
            <ArchiveDashboard submissions={periodSubs} />

            {/* Per-volunteer search + list */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search volunteer…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-sm text-gray-500">{periodSubs.length} record{periodSubs.length !== 1 ? 's' : ''}</p>
              </div>

              <div className="space-y-3">
                {periodSubs.map(s => (
                  <Card key={s.id} className="bg-white border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Users className="w-3.5 h-3.5 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.userName || s.userEmail}</p>
                          <p className="text-xs text-gray-400">{s.userEmail}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-lg p-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-medium">Activity</p>
                          <p className="text-gray-900 truncate">{(s as any).activityName || s.description}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-medium">Hours</p>
                          <p className="text-gray-900 font-semibold">{s.hours}h</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-medium">Date</p>
                          <p className="text-gray-900">{new Date(s.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant={s.status === 'approved' ? 'default' : s.status === 'rejected' ? 'destructive' : 'secondary'}
                          className={`text-xs ${s.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' : s.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-red-100 text-red-700 border-red-200'}`}
                        >
                          {s.status}
                        </Badge>
                        {(s as any).reviewedBy && (
                          <p className="text-xs text-gray-400">reviewed by {(s as any).reviewedBy}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Entry point ──────────────────────────────────────────────────────────────
export function AdminHistory({ user, club, isVolunteerView = false }: AdminHistoryProps) {
  if (isVolunteerView) return <VolunteerHistory club={club} />;
  return <AdminHistoryView club={club} />;
}
