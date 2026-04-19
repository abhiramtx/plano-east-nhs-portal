import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  getAllUserArchivedSubmissions,
  getMemberships,
  Club,
  HoursSubmission,
} from '@/lib/firebase';
import {
  Calendar,
  Archive,
  Search,
  User,
  Image,
  MapPin,
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

interface Props {
  user?: { name: string; email: string };
  club: Club;
}

type ArchivedSub = HoursSubmission & { clubName?: string; archivePeriod?: string; archivedAt?: Date };

function SubmissionCard({ s }: { s: ArchivedSub }) {
  const [imgOpen, setImgOpen] = useState(false);
  const activityName = (s as any).activityName || s.description || '—';
  const description = s.description || null;
  const locationLabel = typeof s.location === 'string' && s.location ? s.location : null;
  const logName = s.logName || null;

  return (
    <Card className="bg-white border-gray-200">
      <CardContent className="p-4 space-y-3">
        {/* Activity + hours + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{activityName}</p>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(s.date).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm font-bold text-gray-900">{s.hours}h</span>
            <Badge className={`text-xs ${s.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' : s.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
              {s.status}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {description && (
          <div>
            <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Description</p>
            <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {s.archivePeriod && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              <Archive className="w-3 h-3" />{s.archivePeriod}
            </span>
          )}
          {s.clubName && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              <User className="w-3 h-3" />{s.clubName}
            </span>
          )}
          {logName && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              <Calendar className="w-3 h-3" />{logName}
            </span>
          )}
          {locationLabel && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              <MapPin className="w-3 h-3" />{locationLabel}
            </span>
          )}
        </div>

        {(s as any).reviewedBy && (
          <p className="text-xs text-gray-400">Reviewed by {(s as any).reviewedBy}</p>
        )}

        {s.status === 'rejected' && (s as any).rejectReason && (
          <div className="p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
            <span className="font-semibold">Reason: </span>{(s as any).rejectReason}
          </div>
        )}

        {s.proofImageUrl && (
          <div>
            <button onClick={() => setImgOpen(v => !v)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800">
              <Image className="w-3 h-3" />
              {imgOpen ? 'Hide proof image' : 'View proof image'}
            </button>
            {imgOpen && (
              <img src={s.proofImageUrl} alt="Proof" className="mt-2 max-w-full max-h-64 rounded-lg border border-gray-200 object-contain" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UserHistoryDashboard({ subs }: { subs: ArchivedSub[] }) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyData = MONTHS.map(m => ({ month: m, hours: 0 }));
  subs.forEach(s => {
    if (s.status !== 'approved') return;
    const d = new Date(s.date);
    if (!isNaN(d.getTime())) monthlyData[d.getMonth()].hours += s.hours;
  });

  const total = subs.reduce((a, s) => a + s.hours, 0);
  const approved = subs.filter(s => s.status === 'approved').reduce((a, s) => a + s.hours, 0);
  const pending = subs.filter(s => s.status === 'pending').length;
  const rejected = subs.filter(s => s.status === 'rejected').length;

  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubKeys = useMemo(() => [...new Set(subs.map(s => s.clubId || '__solo__'))], [subs]);
  const clubNames: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    subs.forEach(s => { map[s.clubId || '__solo__'] = s.clubName || (s.clubId ? s.clubId : 'Solo'); });
    return map;
  }, [subs]);

  const activePeriods = useMemo(() => [...new Set(subs.map(s => s.archivePeriod || 'Unknown'))], [subs]);
  const activePeriod = selectedPeriod && activePeriods.includes(selectedPeriod) ? selectedPeriod : activePeriods[0] ?? null;
  const activeClub = selectedClub && clubKeys.includes(selectedClub) ? selectedClub : null;

  const filteredSubs = useMemo(() =>
    subs.filter(s => {
      if (activePeriod && (s.archivePeriod || 'Unknown') !== activePeriod) return false;
      if (activeClub && (s.clubId || '__solo__') !== activeClub) return false;
      return true;
    }), [subs, activePeriod, activeClub]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Total Hours</p>
          <p className="text-2xl font-bold text-gray-900">{total.toFixed(1)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Approved</p>
          <p className="text-2xl font-bold text-green-600">{approved.toFixed(1)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{pending}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Rejected</p>
          <p className="text-2xl font-bold text-red-500">{rejected}</p>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-4">
        <p className="text-xs font-medium text-gray-500 uppercase mb-2">Monthly Approved Hours (all time)</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} domain={[0, 'dataMax + 1']} />
              <Tooltip content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="bg-white p-2 border border-gray-200 rounded shadow text-sm">
                    <p className="font-medium">{label}</p>
                    <p className="text-gray-600">{payload[0].value}h approved</p>
                  </div>
                ) : null} />
              <Line type="monotone" dataKey="hours" stroke="#111827" strokeWidth={2}
                dot={{ fill: '#111827', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent></Card>

      <div className="flex flex-wrap gap-2">
        <div>
          <p className="text-xs text-gray-500 mb-1 font-medium">Period</p>
          <div className="flex gap-1 flex-wrap">
            {activePeriods.map(p => (
              <button key={p} onClick={() => setSelectedPeriod(p === activePeriod ? null : p)}
                className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${p === activePeriod ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >{p}</button>
            ))}
          </div>
        </div>
        {clubKeys.length > 1 && (
          <div>
            <p className="text-xs text-gray-500 mb-1 font-medium">Club</p>
            <div className="flex gap-1 flex-wrap">
              {clubKeys.map(k => (
                <button key={k} onClick={() => setSelectedClub(k === activeClub ? null : k)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${k === activeClub ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >{clubNames[k]}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Submissions ({filteredSubs.length})</p>
        {filteredSubs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No submissions for this filter</p>
        ) : (
          filteredSubs.map(s => <SubmissionCard key={s.id} s={s} />)
        )}
      </div>
    </div>
  );
}

export function AdminQueryHistory({ user, club }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ['firebase-memberships', club.id],
    queryFn: () => getMemberships(club.id),
    staleTime: 30000,
  });

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return members;
    const q = searchTerm.toLowerCase();
    return members.filter((m: any) =>
      (m.userName || '').toLowerCase().includes(q) ||
      (m.userEmail || '').toLowerCase().includes(q)
    );
  }, [members, searchTerm]);

  const { data: userSubs = [], isLoading: subsLoading } = useQuery({
    queryKey: ['firebase-query-history', selectedEmail],
    queryFn: () => getAllUserArchivedSubmissions(selectedEmail!),
    enabled: !!selectedEmail,
    staleTime: 0,
    gcTime: 0,
  });

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <h1 className="text-2xl font-semibold text-gray-900">Query History</h1>
        <p className="text-gray-500 mt-0.5 text-sm">Look up any volunteer's full archived history</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search volunteer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Name or email…"
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setSelectedEmail(null); }}
                  className="pl-9"
                />
              </div>

              {searchTerm && filtered.length > 0 && (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  {filtered.map((m: any) => (
                    <button
                      key={m.userEmail}
                      onClick={() => { setSelectedEmail(m.userEmail); setSearchTerm(m.userName || m.userEmail); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${selectedEmail === m.userEmail ? 'bg-gray-50' : ''}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{m.userName || m.userEmail}</p>
                        <p className="text-xs text-gray-400 truncate">{m.userEmail}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchTerm && filtered.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">No matching volunteers</p>
              )}
            </CardContent>
          </Card>

          {selectedEmail && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {members.find((m: any) => m.userEmail === selectedEmail)?.userName || selectedEmail}
                  </p>
                  <p className="text-xs text-gray-400">{selectedEmail}</p>
                </div>
              </div>

              {subsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-gray-400" />
                </div>
              ) : userSubs.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-600">No archived history</p>
                  <p className="text-xs text-gray-400 mt-1">This volunteer has no archived submissions yet</p>
                </div>
              ) : (
                <UserHistoryDashboard subs={userSubs as ArchivedSub[]} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
