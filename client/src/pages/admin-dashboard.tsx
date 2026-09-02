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
      case 'approved': return 'bg-chart-3/15 text-chart-3 border-chart-3/30';
      case 'rejected': return 'border-destructive/35 bg-destructive/15 text-destructive';
      default: return 'bg-chart-1/15 text-chart-1 border-chart-1/30';
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
      <div className="flex-1 flex flex-col bg-background min-h-0">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0">
      <div className="bg-card border-b border-border flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-primary">
              <Award className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="page-title text-xl lg:text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-0.5">Manage student submissions and track program progress</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalSubmissions}</p>
                </div>
                <div className="p-3 bg-secondary rounded-full">
                  <Users className="w-5 h-5 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold text-primary">{stats.pendingSubmissions}</p>
                </div>
                <div className="rounded-full bg-primary/15 p-3">
                  <AlertCircle className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved Hours</p>
                  <p className="text-2xl font-bold text-chart-3">{stats.approvedHours.toFixed(1)}</p>
                </div>
                <div className="rounded-full bg-chart-3/15 p-3">
                  <CheckCircle2 className="h-5 w-5 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                  <p className="text-2xl font-bold text-chart-5">{stats.totalHours.toFixed(1)}</p>
                </div>
                <div className="rounded-full bg-chart-5/15 p-3">
                  <TrendingUp className="h-5 w-5 text-chart-5" />
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
                <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground/60" />
                <h3 className="text-lg font-medium text-foreground mb-2">No submissions yet</h3>
                <p className="text-muted-foreground">Students will see their submissions here once they start submitting hours</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission: HoursSubmission) => {
                  const profile = profiles.find((p: UserProfile) => p.email === submission.userEmail);
                  return (
                    <div key={submission.id} className="p-4 lg:p-6 border border-border rounded-lg hover:bg-background transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-3">
                            <Badge className={getStatusColor(submission.status)}>
                              {getStatusIcon(submission.status)}
                              <span className="ml-1 capitalize">{submission.status}</span>
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {submission.userName}
                            </span>
                          </div>
                          
                          <div className="text-sm text-muted-foreground mb-3 space-y-1">
                            <div>Email: {submission.userEmail}</div>
                            {profile?.gradeLevel && (
                              <div>Grade: {profile.gradeLevel}</div>
                            )}
                          </div>
                          
                          <h3 className="font-medium text-foreground mb-2">
                            {submission.activityName || "Activity Name Not Provided"}
                          </h3>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(submission.date)}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {submission.hours} hours
                            </div>
                          </div>
                          
                          <p className="text-muted-foreground text-sm mb-4">{submission.description}</p>
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
                                className="text-chart-3 hover:bg-chart-3/10"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusUpdate(submission.id, 'rejected')}
                                disabled={updateStatusMutation.isPending}
                                className="text-destructive hover:bg-destructive/10"
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
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Proof of Service</h3>
                <Button variant="ghost" onClick={() => setSelectedSubmission(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Student:</strong> {selectedSubmission.userName}
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Activity:</strong> {selectedSubmission.activityName || "Not provided"}
                </p>
                <p className="text-sm text-muted-foreground">
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
