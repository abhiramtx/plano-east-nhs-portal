import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, subscribeToClubSubmissions, getAllUserProfiles, updateSubmission, HoursSubmission, UserProfile, Club } from "@/lib/firebase";
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
  club: Club;
}

export function AdminDashboard({ user, club }: AdminDashboardProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<HoursSubmission | null>(null);
  const { toast } = useToast();

  const [submissions, setSubmissions] = useState<HoursSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!club.id) return;
    setIsLoading(true);
    const unsub = subscribeToClubSubmissions(club.id, (subs) => {
      setSubmissions(subs);
      setIsLoading(false);
    });
    return unsub;
  }, [club.id]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['firebase-user-profiles'],
    queryFn: getAllUserProfiles,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await updateSubmission(id, { 
        status, 
        reviewedAt: new Date(),
        reviewedBy: user?.email || ''
      });
    },
    onSuccess: () => {
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

  const stats = {
    totalSubmissions: submissions.length,
    pendingSubmissions: submissions.filter((s: HoursSubmission) => s.status === 'pending').length,
    approvedSubmissions: submissions.filter((s: HoursSubmission) => s.status === 'approved').length,
    rejectedSubmissions: submissions.filter((s: HoursSubmission) => s.status === 'rejected').length,
    totalHours: submissions.reduce((sum: number, s: HoursSubmission) => sum + s.hours, 0),
    approvedHours: submissions
      .filter((s: HoursSubmission) => s.status === 'approved')
      .reduce((sum: number, s: HoursSubmission) => sum + s.hours, 0),
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
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

  const handleStatusUpdate = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-[#faf8f4] min-h-0">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#faf8f4] min-h-0">
      <div className="bg-white border-b border-[#d9cdbd] flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#17324d' }}>
              <Award className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="page-title text-xl lg:text-2xl font-bold text-[#17324d]">Admin Dashboard</h1>
              <p className="text-[#506477] mt-0.5">Manage student submissions and track program progress</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#506477]">Total Submissions</p>
                  <p className="text-2xl font-bold text-[#17324d]">{stats.totalSubmissions}</p>
                </div>
                <div className="p-3 bg-[#eee5d7] rounded-full">
                  <Users className="w-5 h-5 text-[#17324d]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#506477]">Pending Review</p>
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
                  <p className="text-sm font-medium text-[#506477]">Approved Hours</p>
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
                  <p className="text-sm font-medium text-[#506477]">Total Hours</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalHours.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-full">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                <Clock className="w-16 h-16 mx-auto mb-4 text-[#8fa5b4]" />
                <h3 className="text-lg font-medium text-[#17324d] mb-2">No submissions yet</h3>
                <p className="text-[#506477]">Students will see their submissions here once they start submitting hours</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission: HoursSubmission) => {
                  const profile = profiles.find((p: UserProfile) => p.email === submission.userEmail);
                  return (
                    <div key={submission.id} className="p-4 lg:p-6 border rounded-lg hover:bg-[#faf8f4] transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-3">
                            <Badge className={getStatusColor(submission.status)}>
                              {getStatusIcon(submission.status)}
                              <span className="ml-1 capitalize">{submission.status}</span>
                            </Badge>
                            <span className="text-sm text-[#506477]">
                              {submission.userName}
                            </span>
                          </div>
                          
                          <div className="text-sm text-[#506477] mb-3 space-y-1">
                            <div>Email: {submission.userEmail}</div>
                            {profile?.gradeLevel && (
                              <div>Grade: {profile.gradeLevel}</div>
                            )}
                          </div>
                          
                          <h3 className="font-medium text-[#17324d] mb-2">
                            {submission.activityName || "Activity Name Not Provided"}
                          </h3>
                          
                          <div className="flex items-center gap-4 text-sm text-[#506477] mb-2">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(submission.date)}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {submission.hours} hours
                            </div>
                          </div>
                          
                          <p className="text-[#506477] text-sm mb-4">{submission.description}</p>
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
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedSubmission && selectedSubmission.proofImageUrl && (
        <div className="fixed inset-0 bg-[#17324d] bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#faf8f4] rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Proof of Service</h3>
                <Button variant="ghost" onClick={() => setSelectedSubmission(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="mb-4">
                <p className="text-sm text-[#506477] mb-2">
                  <strong>Student:</strong> {selectedSubmission.userName}
                </p>
                <p className="text-sm text-[#506477] mb-2">
                  <strong>Activity:</strong> {selectedSubmission.activityName || "Not provided"}
                </p>
                <p className="text-sm text-[#506477]">
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
