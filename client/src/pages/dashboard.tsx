import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, getCurrentUser } from "@/lib/firebase";
import { Clock, TrendingUp, Calendar, Award, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ProfileCompletionGuard } from "@/components/profile-completion-guard";

// Helper function to convert email to storage key
const emailToKey = (email: string) => email.replace(/\./g, ',');

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  // Fetch user's hours submissions
  const { data: submissions = [] } = useQuery({
    queryKey: ['/api/hours-submissions', user?.email ? emailToKey(user.email) : ''],
    enabled: !!user?.email,
  });

  // Calculate statistics
  const stats = {
    totalHours: submissions.reduce((sum, sub) => sum + parseFloat(sub.hours), 0),
    approvedHours: submissions.filter(sub => sub.status === 'approved').reduce((sum, sub) => sum + parseFloat(sub.hours), 0),
    pendingHours: submissions.filter(sub => sub.status === 'pending').reduce((sum, sub) => sum + parseFloat(sub.hours), 0),
    submissionCount: submissions.length,
  };

  // Monthly data for chart - Initialize with some sample data points
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

  // Add some sample data if no submissions exist to show chart structure
  if (submissions.length === 0) {
    monthlyData[0].hours = 0;
    monthlyData[1].hours = 0;
    monthlyData[2].hours = 0;
    monthlyData[3].hours = 0;
    monthlyData[4].hours = 0;
    monthlyData[5].hours = 0;
    monthlyData[6].hours = 0;
    monthlyData[7].hours = 0;
    monthlyData[8].hours = 0;
    monthlyData[9].hours = 0;
    monthlyData[10].hours = 0;
    monthlyData[11].hours = 0;
  }

  // Calculate monthly hours from submissions
  submissions.forEach(sub => {
    const month = new Date(sub.date).toLocaleString('default', { month: 'short' });
    const monthData = monthlyData.find(m => m.month === month);
    if (monthData && sub.status === 'approved') {
      monthData.hours += parseFloat(sub.hours);
    }
  });

  const maxHours = Math.max(...monthlyData.map(d => d.hours), 4);

  return (
    <ProfileCompletionGuard user={user}>
    <div className="flex-1 flex flex-col bg-white min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6 pt-16 lg:pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user?.name?.split(' ')[0]}!</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Award className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalHours.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved Hours</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approvedHours.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Hours</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingHours.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-full">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Submissions</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.submissionCount}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-full">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requirements Status */}
        <div className="mb-6 lg:mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">March 2025 Requirement Status</h3>
                  <p className="text-sm text-gray-600">15 approved hours required by end of March</p>
                </div>
                <div className="text-right">
                  {stats.approvedHours >= 15 ? (
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="text-lg font-bold text-green-600">Requirement Met!</p>
                        <p className="text-sm text-gray-600">{(stats.approvedHours - 15).toFixed(1)} hours over</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                      <div>
                        <p className="text-lg font-bold text-orange-600">{(15 - stats.approvedHours).toFixed(1)} hours needed</p>
                        <p className="text-sm text-gray-600">{stats.approvedHours.toFixed(1)} / 15 hours approved</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Progress</span>
                  <span className="text-sm text-gray-600">{Math.min((stats.approvedHours / 15) * 100, 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stats.approvedHours >= 15 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min((stats.approvedHours / 15) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span>Monthly Hours</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
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
                            <div className="bg-white p-3 border border-gray-200 rounded-lg">
                              <p className="font-medium text-gray-900">{label}</p>
                              <p className="text-blue-600">
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
                      stroke="#2563eb" 
                      strokeWidth={3}
                      dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#2563eb' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <span>Recent Submissions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submissions.slice(0, 5).map((submission, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {submission.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(submission.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {submission.hours}h
                      </span>
                      <Badge 
                        variant={submission.status === 'approved' ? 'default' : 'secondary'}
                        className={submission.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                      >
                        {submission.status}
                      </Badge>
                    </div>
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