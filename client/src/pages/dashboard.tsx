import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, getCurrentUser, getUserSubmissions, getUserSuperClubFedSubmissions, HoursSubmission, getClubsForUser, Club } from "@/lib/firebase";
import { Clock, TrendingUp, Calendar, Award, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ProfileCompletionGuard } from "@/components/profile-completion-guard";

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

  // Fed submissions forwarded from sub-clubs into this club (when this club is a super-club).
  // These have a different clubId so getUserSubmissions misses them entirely.
  const { data: fedSubmissions = [] } = useQuery<HoursSubmission[]>({
    queryKey: ['firebase-user-fed-submissions', userEmail, club.id],
    queryFn: () => getUserSuperClubFedSubmissions(userEmail, club.id),
    enabled: !!userEmail && !!club.id,
  });

  // Merge direct + fed, avoiding duplicates (safe: clubId vs superClubId queries never overlap)
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
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6 pt-16 lg:pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user?.name?.split(' ')[0]}!</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 bg-black rounded-lg">
                <Award className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalHours.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-full">
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Approved Hours</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approvedHours.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending Hours</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingHours.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Submissions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.submissionCount}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-full">
                  <TrendingUp className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                <span>Monthly Hours</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      domain={[0, 'dataMax + 1']}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                              <p className="font-medium text-gray-900">{label}</p>
                              <p className="text-gray-600">
                                <span className="font-medium">{payload[0].value}</span> hours
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
                      stroke="#111827" 
                      strokeWidth={3}
                      dot={{ fill: '#111827', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#111827' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900">
                <Calendar className="w-5 h-5 text-gray-600" />
                <span>Recent Submissions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {allSubmissions.slice(0, 5).map((submission, index) => (
                  <div key={index} className="py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {submission.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(submission.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className="text-sm font-medium text-gray-900">
                          {submission.hours}h
                        </span>
                        <Badge 
                          variant={submission.status === 'approved' ? 'default' : 'secondary'}
                          className={
                            submission.status === 'approved' 
                              ? 'bg-green-100 text-green-700 border-green-200' 
                              : submission.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                              : 'bg-red-100 text-red-700 border-red-200'
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
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-xs font-medium text-red-600 mb-1">Rejection Reason:</p>
                        <p className="text-xs text-red-500">{submission.rejectReason}</p>
                      </div>
                    )}
                  </div>
                ))}
                {submissions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
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
