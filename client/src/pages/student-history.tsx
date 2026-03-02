import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, getCurrentUser } from "@/lib/firebase";
import { YearlyHistory } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Clock, 
  Calendar, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  History,
  Target
} from "lucide-react";

// Helper function to convert email to storage key
const emailToKey = (email: string) => email.replace(/\./g, ',');

export default function StudentHistory() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const { data: yearlyHistory = [], isLoading } = useQuery({
    queryKey: ['/api/yearly-history', user?.email ? emailToKey(user.email) : ''],
    enabled: !!user?.email,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-white min-h-0">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6 pt-16 lg:pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">History</h1>
              <p className="text-gray-600 mt-1">View your service hours from previous years</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                <History className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {yearlyHistory.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <History className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No historical data</h3>
                <p className="text-gray-500">Your service hours history will appear here after year-end archiving</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={yearlyHistory[0]?.schoolYear} className="space-y-6">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {yearlyHistory.map((year: YearlyHistory) => (
                <TabsTrigger key={year.schoolYear} value={year.schoolYear} className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>{year.schoolYear}</span>
                  {year.requirementMet && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                </TabsTrigger>
              ))}
            </TabsList>

            {yearlyHistory.map((year: YearlyHistory) => {
              const submissions = JSON.parse(year.submissions);
              const monthlyData = JSON.parse(year.monthlyData);
              
              return (
                <TabsContent key={year.schoolYear} value={year.schoolYear} className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Hours</p>
                            <p className="text-2xl font-bold text-gray-900">{parseFloat(year.totalHours).toFixed(1)}</p>
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
                            <p className="text-2xl font-bold text-green-600">{parseFloat(year.approvedHours).toFixed(1)}</p>
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
                            <p className="text-sm font-medium text-gray-600">Submissions</p>
                            <p className="text-2xl font-bold text-purple-600">{year.submissionCount}</p>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-full">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Requirement</p>
                            <p className={`text-2xl font-bold ${year.requirementMet ? 'text-green-600' : 'text-red-600'}`}>
                              {year.requirementMet ? 'Met' : 'Not Met'}
                            </p>
                          </div>
                          <div className={`p-3 rounded-full ${year.requirementMet ? 'bg-green-50' : 'bg-red-50'}`}>
                            <Target className={`w-5 h-5 ${year.requirementMet ? 'text-green-600' : 'text-red-600'}`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Year Summary */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{year.schoolYear} Summary</h3>
                          <p className="text-sm text-gray-600">Total approved hours for the year</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">{parseFloat(year.approvedHours).toFixed(1)}</p>
                          <p className="text-sm text-gray-600">approved hours</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Monthly Chart */}
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

                    {/* Submissions List */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Calendar className="w-5 h-5 text-green-600" />
                          <span>All Submissions</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4 max-h-80 overflow-y-auto">
                          {submissions.map((submission: any, index: number) => (
                            <div key={index} className="py-2">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {submission.description}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(submission.date)}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                  <span className="text-sm font-medium text-gray-900">
                                    {submission.hours}h
                                  </span>
                                  <Badge 
                                    variant={submission.status === 'approved' ? 'default' : 'secondary'}
                                    className={getStatusColor(submission.status)}
                                  >
                                    {getStatusIcon(submission.status)}
                                    <span className="ml-1 capitalize">{submission.status}</span>
                                  </Badge>
                                </div>
                              </div>
                              {submission.status === 'rejected' && submission.rejectReason && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                  <p className="text-xs font-medium text-red-800 mb-1">Rejection Reason:</p>
                                  <p className="text-xs text-red-700">{submission.rejectReason}</p>
                                </div>
                              )}
                            </div>
                          ))}
                          {submissions.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                              <p>No submissions for this year</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>
    </div>
  );
}