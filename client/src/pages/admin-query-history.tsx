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
    <Card className="bg-card border-border">
      <CardContent className="p-4 space-y-3">
        {/* Activity + hours + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{activityName}</p>
            <p className="text-xs text-muted-foreground/80 mt-0.5">{new Date(s.date).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm font-bold text-foreground">{s.hours}h</span>
            <Badge className={`text-xs ${s.status === 'approved' ? 'bg-chart-3/15 text-chart-3 border-chart-3/30' : s.status === 'pending' ? 'bg-chart-1/15 text-chart-1 border-chart-1/30' : 'bg-destructive/15 text-destructive border-destructive/30'}`}>
              {s.status}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {description && (
          <div>
            <p className="text-xs text-muted-foreground/80 uppercase font-medium mb-0.5">Description</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {s.archivePeriod && (
            <span className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
              <Archive className="w-3 h-3" />{s.archivePeriod}
            </span>
          )}
          {s.clubName && (
            <span className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
              <User className="w-3 h-3" />{s.clubName}
            </span>
          )}
          {logName && (
            <span className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
              <Calendar className="w-3 h-3" />{logName}
            </span>
          )}
          {locationLabel && (
            <span className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
              <MapPin className="w-3 h-3" />{locationLabel}
            </span>
          )}
        </div>

        {(s as any).reviewedBy && (
          <p className="text-xs text-muted-foreground/80">Reviewed by {(s as any).reviewedBy}</p>
        )}

        {s.status === 'rejected' && (s as any).rejectReason && (
          <div className="p-2 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive">
            <span className="font-semibold">Reason: </span>{(s as any).rejectReason}
          </div>
        )}

        {s.proofImageUrl && (
          <div>
            <button onClick={() => setImgOpen(v => !v)} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80">
              <Image className="w-3 h-3" />
              {imgOpen ? 'Hide proof image' : 'View proof image'}
            </button>
            {imgOpen && (
              <img src={s.proofImageUrl} alt="Proof" className="mt-2 max-w-full max-h-64 rounded-lg border border-border object-contain" />
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
          <p className="text-xs text-muted-foreground uppercase font-medium">Total Hours</p>
          <p className="text-2xl font-bold text-foreground">{total.toFixed(1)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase font-medium">Approved</p>
          <p className="text-2xl font-bold text-chart-3">{approved.toFixed(1)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase font-medium">Pending</p>
          <p className="text-2xl font-bold text-chart-1">{pending}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase font-medium">Rejected</p>
          <p className="text-2xl font-bold text-destructive">{rejected}</p>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Monthly Approved Hours (all time)</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 'dataMax + 1']} />
              <Tooltip content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="bg-card p-2 border border-border rounded text-sm">
                    <p className="font-medium">{label}</p>
                    <p className="text-muted-foreground">{payload[0].value}h approved</p>
                  </div>
                ) : null} />
              <Line type="monotone" dataKey="hours" stroke="hsl(var(--primary))" strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent></Card>

      <div className="flex flex-wrap gap-2">
        <div>
           <p className="text-xs text-muted-foreground mb-1 font-medium">Period</p>
          <div className="flex gap-1 flex-wrap">
            {activePeriods.map(p => (
              <button key={p} onClick={() => setSelectedPeriod(p === activePeriod ? null : p)}
                 className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${p === activePeriod ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-background'}`}
              >{p}</button>
            ))}
          </div>
        </div>
        {clubKeys.length > 1 && (
          <div>
             <p className="text-xs text-muted-foreground mb-1 font-medium">Club</p>
            <div className="flex gap-1 flex-wrap">
              {clubKeys.map(k => (
                <button key={k} onClick={() => setSelectedClub(k === activeClub ? null : k)}
                   className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${k === activeClub ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-background'}`}
                >{clubNames[k]}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
         <p className="text-sm font-medium text-foreground">Submissions ({filteredSubs.length})</p>
        {filteredSubs.length === 0 ? (
           <p className="text-sm text-muted-foreground/80 text-center py-6">No submissions for this filter</p>
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
    <div className="flex-1 flex flex-col bg-background min-h-0">
      <div className="bg-card border-b border-border px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-primary">
            <Search className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="page-title text-xl lg:text-2xl font-bold text-foreground">Query History</h1>
            <p className="text-muted-foreground mt-0.5">Look up any volunteer's full archived history</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="w-full max-w-5xl mx-auto space-y-6">
            <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search volunteer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
                <Input
                  placeholder="Name or email…"
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setSelectedEmail(null); }}
                  className="pl-9"
                />
              </div>

              {searchTerm && filtered.length > 0 && (
                <div className="border border-border rounded-lg divide-y divide-border max-h-56 overflow-y-auto">
                  {filtered.map((m: any) => (
                    <button
                      key={m.userEmail}
                      onClick={() => { setSelectedEmail(m.userEmail); setSearchTerm(m.userName || m.userEmail); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-background transition-colors ${selectedEmail === m.userEmail ? 'bg-background' : ''}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-secondary-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{m.userName || m.userEmail}</p>
                        <p className="text-xs text-muted-foreground/80 truncate">{m.userEmail}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchTerm && filtered.length === 0 && (
                <p className="text-sm text-muted-foreground/80 text-center py-2">No matching volunteers</p>
              )}
            </CardContent>
          </Card>

          {selectedEmail && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {members.find((m: any) => m.userEmail === selectedEmail)?.userName || selectedEmail}
                  </p>
                  <p className="text-xs text-muted-foreground/80">{selectedEmail}</p>
                </div>
              </div>

              {subsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
                </div>
              ) : userSubs.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No archived history</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">This volunteer has no archived submissions yet</p>
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
