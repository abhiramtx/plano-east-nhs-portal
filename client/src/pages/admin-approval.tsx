import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { HoursSubmission, UserProfile } from '@shared/schema';
import { 
  Clock, 
  Calendar, 
  User, 
  CheckCircle, 
  XCircle, 
  Image as ImageIcon,
  Mail,
  GraduationCap,
  IdCard,
  Eye,
  X,
  UserX
} from 'lucide-react';

interface AdminApprovalProps {
  user: { name: string; email: string };
}

export function AdminApproval({ user }: AdminApprovalProps) {
  const [assignedStudent, setAssignedStudent] = useState<UserProfile | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<HoursSubmission | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get assigned student for this admin
  const { data: assignment, isLoading: assignmentLoading } = useQuery({
    queryKey: ['/api/admin-assignment', user.email],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/admin-assignment/${encodeURIComponent(user.email.replace(/\./g, ','))}`);
      return response;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get student's pending submissions
  const { data: studentSubmissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ['/api/student-submissions', assignment?.userId],
    queryFn: async () => {
      if (!assignment?.userId) return [];
      const response = await apiRequest('GET', `/api/hours-submissions/${assignment.userId}`);
      return Array.isArray(response) ? response.filter((sub: HoursSubmission) => sub.status === 'pending') : [];
    },
    enabled: !!assignment?.userId,
  });

  // Set assigned student and first submission
  useEffect(() => {
    if (assignment) {
      setAssignedStudent(assignment);
      if (studentSubmissions.length > 0 && !selectedSubmission) {
        setSelectedSubmission(studentSubmissions[0]);
      }
    }
  }, [assignment, studentSubmissions, selectedSubmission]);

  // Mutation for approving/rejecting submissions
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PUT', `/api/hours-submissions/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/student-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hours-submissions'] });
      toast({
        title: "Success",
        description: "Submission status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update submission status",
        variant: "destructive",
      });
    },
  });

  // Mutation for releasing assignment and getting a new one
  const releaseMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/release-assignment', { 
        adminEmail: user.email.replace(/\./g, ','),
        currentStudentId: assignedStudent?.userId 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin-assignment'] });
      setAssignedStudent(null);
      setSelectedSubmission(null);
      toast({
        title: "Success",
        description: "Assignment released. Getting new assignment...",
      });
    },
    onError: (error) => {
      console.error("Release error:", error);
      toast({
        title: "Error",
        description: "Failed to release assignment",
        variant: "destructive",
      });
    }
  });

  const handleApprove = () => {
    if (selectedSubmission) {
      updateStatusMutation.mutate({ id: selectedSubmission.id, status: 'approved' });
      // Move to next submission or close
      const currentIndex = studentSubmissions.findIndex(s => s.id === selectedSubmission.id);
      const nextSubmission = studentSubmissions[currentIndex + 1];
      if (nextSubmission) {
        setSelectedSubmission(nextSubmission);
      } else {
        setSelectedSubmission(null);
      }
    }
  };

  const handleReject = () => {
    if (selectedSubmission) {
      updateStatusMutation.mutate({ id: selectedSubmission.id, status: 'rejected' });
      // Move to next submission or close
      const currentIndex = studentSubmissions.findIndex(s => s.id === selectedSubmission.id);
      const nextSubmission = studentSubmissions[currentIndex + 1];
      if (nextSubmission) {
        setSelectedSubmission(nextSubmission);
      } else {
        setSelectedSubmission(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (assignmentLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Getting your assignment...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Assignment Available</h3>
          <p className="text-gray-500">All submissions have been assigned to other administrators</p>
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
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Hours Approval</h1>
              <p className="text-gray-600 mt-1">Review and approve student submissions</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar - Student Activities */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
          {/* Student Info */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  {assignedStudent?.goByFirstName} {assignedStudent?.lastName}
                </h3>
                <p className="text-sm text-gray-500">{assignedStudent?.personalEmailAddress}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <IdCard className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">ID: {assignedStudent?.studentId}</span>
              </div>
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Grade: {assignedStudent?.gradeLevel}</span>
              </div>
            </div>
            <div className="mt-3">
              <Button
                onClick={() => releaseMutation.mutate()}
                disabled={releaseMutation.isPending}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <UserX className="w-4 h-4 mr-2" />
                {releaseMutation.isPending ? 'Releasing...' : 'Release & Get New Assignment'}
              </Button>
            </div>
          </div>

          {/* Activities List */}
          <div className="flex-1 overflow-y-auto p-4">
            <h4 className="font-medium text-gray-900 mb-3">Pending Activities ({studentSubmissions.length})</h4>
            {submissionsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading activities...</p>
              </div>
            ) : studentSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                <p className="text-sm text-gray-600">All activities reviewed!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {studentSubmissions.map((submission: HoursSubmission) => (
                  <button
                    key={submission.id}
                    onClick={() => setSelectedSubmission(submission)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedSubmission?.id === submission.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {submission.activityName || 'Unnamed Activity'}
                      </span>
                      <span className="text-xs text-gray-500">{submission.hours}h</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(submission.date)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Submission Details */}
        <div className="flex-1 overflow-y-auto">
          {selectedSubmission ? (
            <div className="p-6">
              {/* Action Buttons */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedSubmission.activityName || 'Unnamed Activity'}
                </h2>
                <div className="flex space-x-3">
                  <Button
                    onClick={handleReject}
                    disabled={updateStatusMutation.isPending}
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 border-red-200"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={updateStatusMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </div>

              {/* Submission Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Activity Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Activity Name</label>
                      <p className="text-gray-900">{selectedSubmission.activityName || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Description</label>
                      <p className="text-gray-900">{selectedSubmission.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Date</label>
                        <p className="text-gray-900">{formatDate(selectedSubmission.date)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Hours</label>
                        <p className="text-gray-900">{selectedSubmission.hours}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Submitted</label>
                      <p className="text-gray-900">{formatDate(selectedSubmission.createdAt)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Proof of Service
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedSubmission.proofImageUrl ? (
                      <div className="space-y-4">
                        <div className="relative">
                          <img
                            src={selectedSubmission.proofImageUrl}
                            alt="Proof of service"
                            className="w-full h-48 object-cover rounded-lg cursor-pointer"
                            onClick={() => setImageModalOpen(true)}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-20 transition-colors rounded-lg cursor-pointer">
                            <Eye className="w-6 h-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setImageModalOpen(true)}
                          className="w-full"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Full Size
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-600">No proof image provided</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Activity</h3>
                <p className="text-gray-500">Choose an activity from the sidebar to review</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {imageModalOpen && selectedSubmission?.proofImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto">
            <button
              onClick={() => setImageModalOpen(false)}
              className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <img
              src={selectedSubmission.proofImageUrl}
              alt="Proof of service"
              className="max-w-full max-h-full rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}