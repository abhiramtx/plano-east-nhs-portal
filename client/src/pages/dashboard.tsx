import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, getCurrentUser, getUserSubmissions, getUserSuperClubFedSubmissions, HoursSubmission, getClubsForUser, Club } from "@/lib/firebase";
import { Clock, TrendingUp, Calendar, Award, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ProfileCompletionGuard } from "@/components/profile-completion-guard";
import { ClubPageHeader } from "@/components/club-page-header";

interface DashboardProps {
  club: Club;
}

export default function Dashboard({ club }: DashboardProps) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const userEmail = user?.email || '';

  const { data: submissions = [] } = useQuery<HoursSubmission[]>({
    queryKey: ['firebase-user-submissions', userEmail, club.id],
    queryFn: () => getUserSubmissions(userEmail, club.id),
    enabled: !!userEmail && !!club.id,
  });

  const { data: fedSubmissions = [] } = useQuery<HoursSubmission[]>({
    queryKey: ['firebase-user-fed-submissions', userEmail, club.id],
    queryFn: () => getUserSuperClubFedSubmissions(userEmail, club.id),
    enabled: !!userEmail && !!club.id,
  });

  const allSubmissions = [...submissions, ...fedSubmissions];

  const stats = {
    totalHours: allSubmissions.reduce((sum, sub) => sum + sub.hours, 0),
    approvedHours: allSubmissions.filter(sub => sub.status === 'approved').reduce((sum, sub) => sum + sub.hours, 0),
    pendingHours: allSubmissions.filter(sub => sub.status === 'pending').reduce((sum, sub) => sum + sub.hours, 0),
    submissionCount: allSubmissions.length,
  };

  const monthlyData = [
    { month: "Jun", hours: 0 },
    { month: "Jul", hours: 0 },
    { month: "Aug", hours: 0 },
    { month: "Sep", hours: 0 },
    { month: "Oct", hours: 0 },
    { month: "Nov", hours: 0 },
    { month: "Dec", hours: 0 },
    { month: "Jan", hours: 0 },
    { month: "Feb", hours: 0 },
    { month: "Mar", hours: 0 },
    { month: "Apr", hours: 0 },
    { month: "May", hours: 0 },
  ];

  allSubmissions.forEach(sub => {
    const month = new Date(sub.date).toLocaleString('default', { month: 'short' });
    const monthData = monthlyData.find(m => m.month === month);
    if (monthData && sub.status === 'approved') {
      monthData.hours += sub.hours;
    }
  });

  const maxHours = Math.max(...monthlyData.map(d => d.hours), 4);

  return (
    <ProfileCompletionGuard user={user}>
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-6">
        <ClubPageHeader
          club={club}
          title="Dashboard"
          description={`Welcome back, ${user?.name?.split(' ')[0]}!`}
          icon={Award}
        />
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-6 lg:mb-8">
          <Card className="bg-[#faf8f4] border-[#d9cdbd] shadow-[4px_4px_0_rgba(23,50,77,0.08)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#506477]">Total Hours</p>
                  <p className="text-2xl font-bold text-[#17324d]">{stats.totalHours.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-[#a8aa9f]/12 rounded-full">
                  <Clock className="w-5 h-5 text-[#a8aa9f]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#faf8f4] border-[#d9cdbd] shadow-[4px_4px_0_rgba(23,50,77,0.08)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#506477]">Approved Hours</p>
                  <p className="text-2xl font-bold text-[#63a89a]">{stats.approvedHours.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-[#63a89a]/15 rounded-full">
                  <CheckCircle2 className="w-5 h-5 text-[#63a89a]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#faf8f4] border-[#d9cdbd] shadow-[4px_4px_0_rgba(23,50,77,0.08)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#506477]">Pending Hours</p>
                  <p className="text-2xl font-bold text-[#e5a72c]">{stats.pendingHours.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-[#d7a85a]/15 rounded-full">
                  <AlertCircle className="w-5 h-5 text-[#d7a85a]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#faf8f4] border-[#d9cdbd] shadow-[4px_4px_0_rgba(23,50,77,0.08)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#506477]">Submissions</p>
                  <p className="text-2xl font-bold text-[#17324d]">{stats.submissionCount}</p>
                </div>
                <div className="p-3 bg-[#d4785f]/15 rounded-full">
                  <TrendingUp className="w-5 h-5 text-[#d4785f]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Monthly Hours chart */}
          <Card className="bg-[#faf8f4] border-[#d9cdbd] shadow-[4px_4px_0_rgba(23,50,77,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-[#17324d]">
                <TrendingUp className="w-5 h-5 text-[#506477]" />
                <span>Monthly Hours</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d9cdbd" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#506477' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#506477' }}
                      domain={[0, 'dataMax + 1']}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[#f7f2e9] p-3 border border-[#d9cdbd] rounded-lg shadow-md">
                              <p className="font-medium text-[#17324d]">{label}</p>
                              <p className="text-[#506477]">
                                <span className="font-semibold">{payload[0].value}</span> hours
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="#d4785f"
                      strokeWidth={3}
                      dot={{ fill: '#d4785f', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#d85c45' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card className="bg-[#faf8f4] border-[#d9cdbd] shadow-[4px_4px_0_rgba(23,50,77,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-[#17324d]">
                <Calendar className="w-5 h-5 text-[#506477]" />
                <span>Recent Submissions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {allSubmissions.slice(0, 5).map((submission, index) => (
                  <div key={index} className="py-2 border-b border-[#d9cdbd]/50 last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#17324d] truncate">
                          {submission.description}
                        </p>
                        <p className="text-xs text-[#506477]">
                          {new Date(submission.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className="text-sm font-medium text-[#17324d]">
                          {submission.hours}h
                        </span>
                        <Badge
                          variant={submission.status === 'approved' ? 'default' : 'secondary'}
                          className={
                            submission.status === 'approved'
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : submission.status === 'pending'
                              ? 'bg-[#e5a72c]/15 text-[#c48a1a] border-[#e5a72c]/30'
                              : 'bg-[#d85c45]/10 text-[#d85c45] border-[#d85c45]/20'
                          }
                        >
                          {submission.status === 'approved' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {submission.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {submission.status === 'rejected' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {submission.status}
                        </Badge>
                      </div>
                    </div>
                    {submission.status === 'rejected' && submission.rejectReason && (
                      <div className="mt-2 p-2 bg-[#d85c45]/8 border border-[#d85c45]/20 rounded-md">
                        <p className="text-xs font-medium text-[#d85c45] mb-1">Rejection Reason:</p>
                        <p className="text-xs text-[#d85c45]/80">{submission.rejectReason}</p>
                      </div>
                    )}
                  </div>
                ))}
                {submissions.length === 0 && (
                  <div className="text-center py-8 text-[#506477]">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-[#506477]/40" />
                    <p>No submissions yet</p>
                    <p className="text-sm">Start by submitting your first hours!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </ProfileCompletionGuard>
  );
}
