import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@/lib/firebase";
import { HoursSubmission } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  Users, 
  TrendingUp,
  Award,
  Eye,
  Check,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminDashboardProps {
  user: User | null;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<HoursSubmission | null>(null);
  const { toast } = useToast();

  // Fetch all submissions for admin review
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['/api/hours-submissions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/hours-submissions');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Update submission status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest('PUT', `/api/hours-submissions/${id}`, { status });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hours-submissions'] });
      toast({
        title: "Success",
        description: "Submission status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update submission status",
        variant: "destructive",
      });
    }
  });

  // Calculate statistics
  const stats = {
    totalSubmissions: submissions.length,
    pendingSubmissions: submissions.filter((s: HoursSubmission) => s.status === 'pending').length,
    approvedSubmissions: submissions.filter((s: HoursSubmission) => s.status === 'approved').length,
    rejectedSubmissions: submissions.filter((s: HoursSubmission) => s.status === 'rejected').length,
    totalHours: submissions.reduce((sum: number, s: HoursSubmission) => sum + parseFloat(s.hours), 0),
    approvedHours: submissions
      .filter((s: HoursSubmission) => s.status === 'approved')
      .reduce((sum: number, s: HoursSubmission) => sum + parseFloat(s.hours), 0),
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleStatusUpdate = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
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
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage student submissions and track program progress</p>
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
                  <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSubmissions}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingSubmissions}</p>
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
                  <p className="text-sm font-medium text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalHours.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-full">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Student Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
                <p className="text-gray-500">Students will see their submissions here once they start submitting hours</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission: HoursSubmission) => (
                  <div key={submission.id} className="p-4 lg:p-6 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-3">
                          <Badge className={getStatusColor(submission.status)}>
                            {getStatusIcon(submission.status)}
                            <span className="ml-1 capitalize">{submission.status}</span>
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {submission.studentName} (ID: {submission.studentId})
                          </span>
                        </div>
                        
                        <h3 className="font-medium text-gray-900 mb-2">
                          {submission.activityName || "Activity Name Not Provided"}
                        </h3>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(submission.date)}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {submission.hours} hours
                          </div>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-4">{submission.description}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {submission.proofImageUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSubmission(submission)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Proof
                          </Button>
                        )}
                        
                        {submission.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(submission.id, 'approved')}
                              disabled={updateStatusMutation.isPending}
                              className="text-green-600 hover:bg-green-50"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(submission.id, 'rejected')}
                              disabled={updateStatusMutation.isPending}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Proof Image Modal */}
      {selectedSubmission && selectedSubmission.proofImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Proof of Service</h3>
                <Button variant="ghost" onClick={() => setSelectedSubmission(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Student:</strong> {selectedSubmission.studentName}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Activity:</strong> {selectedSubmission.activityName || "Not provided"}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Hours:</strong> {selectedSubmission.hours}
                </p>
              </div>
              <img 
                src={selectedSubmission.proofImageUrl} 
                alt="Proof of service"
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}