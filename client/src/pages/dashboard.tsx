import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, getCurrentUser, getUserSubmissions, HoursSubmission } from "@/lib/firebase";
import { Clock, TrendingUp, Calendar, Award, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ProfileCompletionGuard } from "@/components/profile-completion-guard";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const userEmail = user?.email || '';

  const { data: submissions = [] } = useQuery<HoursSubmission[]>({
    queryKey: ['firebase-user-submissions', userEmail],
    queryFn: () => getUserSubmissions(userEmail),
    enabled: !!userEmail,
  });

  const stats = {
    totalHours: submissions.reduce((sum, sub) => sum + sub.hours, 0),
    approvedHours: submissions.filter(sub => sub.status === 'approved').reduce((sum, sub) => sum + sub.hours, 0),
    pendingHours: submissions.filter(sub => sub.status === 'pending').reduce((sum, sub) => sum + sub.hours, 0),
    submissionCount: submissions.length,
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

  submissions.forEach(sub => {
    const month = new Date(sub.date).toLocaleString('default', { month: 'short' });
    const monthData = monthlyData.find(m => m.month === month);
    if (monthData && sub.status === 'approved') {
      monthData.hours += sub.hours;
    }
  });

  const maxHours = Math.max(...monthlyData.map(d => d.hours), 4);

  return (
    <ProfileCompletionGuard user={user}>
    <div className="flex-1 flex flex-col bg-gray-950 min-h-0">
      <div className="bg-gray-950 border-b border-gray-800 flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6 pt-16 lg:pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-white">Dashboard</h1>
              <p className="text-gray-400 mt-1">Welcome back, {user?.name?.split(' ')[0]}!</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 bg-white rounded-lg">
                <Award className="w-5 h-5 text-black" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Hours</p>
                  <p className="text-2xl font-bold text-white">{stats.totalHours.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-full">
                  <Clock className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Approved Hours</p>
                  <p className="text-2xl font-bold text-green-400">{stats.approvedHours.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-full">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Pending Hours</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pendingHours.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-full">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Submissions</p>
                  <p className="text-2xl font-bold text-white">{stats.submissionCount}</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-full">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 lg:mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">March Requirement Status</h3>
                  <p className="text-sm text-gray-400">15 approved hours required by end of March</p>
                </div>
                <div className="text-right">
                  {stats.approvedHours >= 15 ? (
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                      <div>
                        <p className="text-lg font-bold text-green-400">Requirement Met!</p>
                        <p className="text-sm text-gray-400">{(stats.approvedHours - 15).toFixed(1)} hours over</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-6 h-6 text-orange-400" />
                      <div>
                        <p className="text-lg font-bold text-orange-400">{(15 - stats.approvedHours).toFixed(1)} hours needed</p>
                        <p className="text-sm text-gray-400">{stats.approvedHours.toFixed(1)} / 15 hours approved</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Progress</span>
                  <span className="text-sm text-gray-400">{Math.min((stats.approvedHours / 15) * 100, 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stats.approvedHours >= 15 ? 'bg-green-500' : 'bg-white'
                    }`}
                    style={{ width: `${Math.min((stats.approvedHours / 15) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <TrendingUp className="w-5 h-5 text-white" />
                <span>Monthly Hours</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#9CA3AF' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#9CA3AF' }}
                      domain={[0, 'dataMax + 1']}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-gray-800 p-3 border border-gray-700 rounded-lg">
                              <p className="font-medium text-white">{label}</p>
                              <p className="text-white">
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
                      stroke="#ffffff" 
                      strokeWidth={3}
                      dot={{ fill: '#ffffff', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#ffffff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Calendar className="w-5 h-5 text-white" />
                <span>Recent Submissions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {submissions.slice(0, 5).map((submission, index) => (
                  <div key={index} className="py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {submission.description}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(submission.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className="text-sm font-medium text-white">
                          {submission.hours}h
                        </span>
                        <Badge 
                          variant={submission.status === 'approved' ? 'default' : 'secondary'}
                          className={
                            submission.status === 'approved' 
                              ? 'bg-green-900/50 text-green-400 border-green-700' 
                              : submission.status === 'pending'
                              ? 'bg-yellow-900/50 text-yellow-400 border-yellow-700'
                              : 'bg-red-900/50 text-red-400 border-red-700'
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
                      <div className="mt-2 p-2 bg-red-900/30 border border-red-800 rounded-md">
                        <p className="text-xs font-medium text-red-400 mb-1">Rejection Reason:</p>
                        <p className="text-xs text-red-300">{submission.rejectReason}</p>
                      </div>
                    )}
                  </div>
                ))}
                {submissions.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-600" />
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
