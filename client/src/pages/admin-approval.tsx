import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  getAdminAssignmentForClub, 
  subscribeToPendingSubmissionsForUserInClub,
  updateSubmission,
  setSuperClubApprovalStatus,
  recalculateClubHours,
  getUserProfile,
  getAdminSettings,
  AdminSettings,
  HoursSubmission, 
  UserProfile,
  Club
} from '@/lib/firebase';
import { HoursLog } from '@shared/schema';
import { ProofMetadata } from '@/components/proof-metadata';
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
  UserX,
  BookOpen,
  ChevronDown,
  Filter,
} from 'lucide-react';

interface AdminApprovalProps {
  user: { name: string; email: string };
  club: Club;
}

export function AdminApproval({ user, club }: AdminApprovalProps) {
  const [assignedStudent, setAssignedStudent] = useState<UserProfile | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<HoursSubmission | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [rejectingSubmission, setRejectingSubmission] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [skippedEmails, setSkippedEmails] = useState<string[]>([]);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [logDropdownOpen, setLogDropdownOpen] = useState(false);
  const logDropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adminSettings } = useQuery<AdminSettings | null>({
    queryKey: ['firebase-admin-settings'],
    queryFn: getAdminSettings,
  });

  const { data: hoursLogs = [] } = useQuery<HoursLog[]>({
    queryKey: ['/api/hours-logs', club.id],
  });

  const approvalsRequired = adminSettings?.approvalsRequired ?? 1;
  const rejectionsRequired = adminSettings?.rejectionsRequired ?? 1;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (logDropdownRef.current && !logDropdownRef.current.contains(e.target as Node)) {
        setLogDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync club hours on load to fix any stale totalApprovedHours
  useEffect(() => {
    if (club?.id) {
      recalculateClubHours(club.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ['firebase-clubs'] });
      }).catch(err => console.error('recalculateClubHours failed:', err));
    }
  }, [club?.id]);

  const toggleLogId = (logId: string) => {
    setSelectedLogIds(prev =>
      prev.includes(logId) ? prev.filter(id => id !== logId) : [...prev, logId]
    );
  };

  const { data: assignment, isLoading: assignmentLoading, refetch: refetchAssignment } = useQuery({
    queryKey: ['firebase-admin-assignment', club.id, user.email, skippedEmails],
    queryFn: () => getAdminAssignmentForClub(club.id, user.email, skippedEmails),
    refetchInterval: 30000,
    staleTime: 15000,
    gcTime: 60000,
  });

  const [studentSubmissions, setStudentSubmissions] = useState<HoursSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  useEffect(() => {
    if (!assignment?.email) {
      setStudentSubmissions([]);
      return;
    }
    setSubmissionsLoading(true);
    const unsub = subscribeToPendingSubmissionsForUserInClub(assignment.email, club.id, (subs) => {
      setStudentSubmissions(subs);
      setSubmissionsLoading(false);
    });
    return unsub;
  }, [assignment?.email, club.id]);

  const filteredSubmissions = selectedLogIds.length > 0
    ? studentSubmissions.filter((s: HoursSubmission) => s.logId && selectedLogIds.includes(s.logId))
    : studentSubmissions;

  useEffect(() => {
    if (assignment) {
      setAssignedStudent(assignment);
      if (filteredSubmissions.length > 0 && !selectedSubmission) {
        setSelectedSubmission(filteredSubmissions[0]);
      }
      if (selectedSubmission && selectedLogIds.length > 0 && selectedSubmission.logId && !selectedLogIds.includes(selectedSubmission.logId)) {
        setSelectedSubmission(filteredSubmissions[0] || null);
      }
    }
  }, [assignment, filteredSubmissions, selectedSubmission, selectedLogIds]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, rejectReason }: { id: string; status: string; rejectReason?: string }) => {
      const submission = studentSubmissions.find((s: HoursSubmission) => s.id === id);

      // Fed submission opted-in to this super-club: route through superClubStatus,
      // unless the affiliation is in SHARED mode — then write directly to the
      // source submission so the sub-club sees the same status.
      const fedTo = (submission as any)?.__fedToSuperClubId as string | undefined;
      const sharedApproval = (submission as any)?.__sharedApproval === true;
      if (fedTo && fedTo === club.id) {
        if (status === 'approved' || status === 'rejected' || status === 'pending') {
          if (sharedApproval) {
            await updateSubmission(id, {
              status,
              rejectReason: status === 'rejected' ? rejectReason : undefined,
              reviewedAt: new Date(),
              reviewedBy: user.email,
            } as any);
          } else {
            await setSuperClubApprovalStatus(
              id,
              club.id,
              status,
              submission?.hours || 0,
              user.email,
              status === 'rejected' ? rejectReason : undefined,
            );
          }
          // Recalculate this superclub's total whenever a fed submission is finalized
          if (status === 'approved' || status === 'rejected') {
            await recalculateClubHours(club.id);
          }
        }
        return;
      }

      const currentApprovals = submission?.approvals || [];
      const currentRejections = submission?.rejections || [];
      const currentRejectionReasons = submission?.rejectionReasons || {};

      let finalStatus: string | null = null;

      if (status === 'approved') {
        const newApprovals = currentApprovals.includes(user.email) 
          ? currentApprovals 
          : [...currentApprovals, user.email];
        
        if (newApprovals.length >= approvalsRequired) {
          await updateSubmission(id, { 
            status: 'approved',
            approvals: newApprovals,
            reviewedAt: new Date(),
            reviewedBy: user.email
          } as any);
          finalStatus = 'approved';
        } else {
          await updateSubmission(id, { 
            approvals: newApprovals,
          } as any);
        }
      } else if (status === 'rejected') {
        const newRejections = currentRejections.includes(user.email)
          ? currentRejections
          : [...currentRejections, user.email];
        const newRejectionReasons = { ...currentRejectionReasons };
        if (rejectReason) newRejectionReasons[user.email] = rejectReason;

        if (newRejections.length >= rejectionsRequired) {
          await updateSubmission(id, { 
            status: 'rejected',
            rejections: newRejections,
            rejectionReasons: newRejectionReasons,
            rejectReason: Object.values(newRejectionReasons).join(' | '),
            reviewedAt: new Date(),
            reviewedBy: user.email
          } as any);
          finalStatus = 'rejected';
        } else {
          await updateSubmission(id, { 
            rejections: newRejections,
            rejectionReasons: newRejectionReasons,
          } as any);
        }
      } else {
        await updateSubmission(id, { 
          status, 
          reviewedAt: new Date(),
          reviewedBy: user.email
        });
        finalStatus = status;
      }

      // Recalculate club totalApprovedHours whenever a submission is finalized
      if (finalStatus === 'approved' || finalStatus === 'rejected') {
        const submission = studentSubmissions.find((s: HoursSubmission) => s.id === id);
        if (submission?.clubId) {
          await recalculateClubHours(submission.clubId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-pending-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-clubs'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-admin-assignment', club.id] });
      queryClient.invalidateQueries({ queryKey: ['super-club-fed-submissions', club.id] });
      setRejectingSubmission(null);
      setRejectReason("");
      toast({
        title: "Success",
        description: "Your review has been recorded",
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

  const handleReleaseAssignment = () => {
    if (assignedStudent?.email) {
      setSkippedEmails(prev => [...prev, assignedStudent.email]);
    }
    setAssignedStudent(null);
    setSelectedSubmission(null);
    toast({
      title: "Success",
      description: "Assignment released. Getting new assignment...",
    });
  };

  const alreadyApproved = (submission: HoursSubmission | null) =>
    (submission?.approvals || []).includes(user.email);
  const alreadyRejected = (submission: HoursSubmission | null) =>
    (submission?.rejections || []).includes(user.email);

  const handleApprove = () => {
    if (selectedSubmission) {
      updateStatusMutation.mutate({ id: selectedSubmission.id, status: 'approved' });
      const currentIndex = filteredSubmissions.findIndex((s: HoursSubmission) => s.id === selectedSubmission.id);
      const nextSubmission = filteredSubmissions[currentIndex + 1];
      if (nextSubmission) {
        setSelectedSubmission(nextSubmission);
      } else {
        setSelectedSubmission(null);
      }
    }
  };

  const handleReject = (submissionId: string) => {
    if (rejectReason.trim()) {
      updateStatusMutation.mutate({ 
        id: submissionId, 
        status: 'rejected', 
        rejectReason: rejectReason.trim() 
      });
      const currentIndex = filteredSubmissions.findIndex((s: HoursSubmission) => s.id === submissionId);
      const nextSubmission = filteredSubmissions[currentIndex + 1];
      if (nextSubmission) {
        setSelectedSubmission(nextSubmission);
      } else {
        setSelectedSubmission(null);
      }
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (assignmentLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Getting your assignment...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground/60" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Assignment Available</h3>
          <p className="text-muted-foreground">All submissions have been reviewed or assigned to other administrators</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0">
      <div className="bg-card border-b border-border flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-chart-3">
                <CheckCircle className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="page-title text-xl lg:text-2xl font-bold text-foreground">Hours Approval</h1>
                <p className="text-muted-foreground mt-0.5">Review and approve volunteer hour submissions</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {hoursLogs.length > 0 && (
                <div className="relative" ref={logDropdownRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLogDropdownOpen(!logDropdownOpen)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    {selectedLogIds.length === 0 ? 'All Logs' : `${selectedLogIds.length} Log${selectedLogIds.length > 1 ? 's' : ''}`}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  {logDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50">
                      <div className="p-2">
                        <button
                          onClick={() => setSelectedLogIds([])}
                          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                            selectedLogIds.length === 0 ? 'bg-secondary font-medium' : 'hover:bg-background'
                          }`}
                        >
                          All Logs
                        </button>
                        <div className="border-t border-border my-1" />
                        {hoursLogs.map((log: HoursLog) => (
                          <label
                            key={log.id}
                            className="flex items-center gap-2 px-3 py-2 rounded hover:bg-background cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedLogIds.includes(log.id)}
                              onCheckedChange={() => toggleLogId(log.id)}
                            />
                            <span className="text-sm text-foreground truncate">{log.name}</span>
                            {!log.isOpen && (
                              <Badge variant="secondary" className="text-xs ml-auto">Closed</Badge>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <CheckCircle className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-80 bg-background border-r border-border flex flex-col">
          <div className="p-4 border-b border-border bg-card">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-full">
                <span className="text-primary-foreground text-sm font-medium">
                  {assignedStudent?.email?.split('@')[0].substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-foreground">
                    {[assignedStudent?.goByFirstName, assignedStudent?.lastName].filter(Boolean).join(' ') || assignedStudent?.displayName || assignedStudent?.email}
                  </h3>
                  {assignedStudent?.userRole === 1 && (
                    <Badge variant="secondary" className="text-xs">Admin</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{assignedStudent?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <IdCard className="w-4 h-4 text-muted-foreground/80" />
                <span className="text-muted-foreground">ID: {assignedStudent?.studentId || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-4 h-4 text-muted-foreground/80" />
                <span className="text-muted-foreground">Grade: {assignedStudent?.gradeLevel || 'N/A'}</span>
              </div>
            </div>
            <div className="mt-3">
              <Button
                onClick={handleReleaseAssignment}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <UserX className="w-4 h-4 mr-2" />
                Release & Get New Assignment
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <h4 className="font-medium text-foreground mb-3">Pending Activities ({filteredSubmissions.length})</h4>
            {submissionsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading activities...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-chart-3" />
                <p className="text-sm text-muted-foreground">
                  {selectedLogIds.length > 0 ? 'No activities for selected logs' : 'All activities reviewed!'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSubmissions.map((submission: HoursSubmission) => (
                  <button
                    key={submission.id}
                    onClick={() => setSelectedSubmission(submission)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedSubmission?.id === submission.id
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-card border-border hover:bg-background'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-foreground truncate">
                        {submission.activityName || 'Unnamed Activity'}
                      </span>
                      <span className="text-xs text-muted-foreground">{submission.hours}h</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(submission.date)}
                      </div>
                      <div className="flex items-center gap-1">
                        {(submission as any).__fedFromSubClubName && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary hover:bg-primary/20">
                            ↑ {(submission as any).__fedFromSubClubName}
                          </Badge>
                        )}
                        {submission.logName && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {submission.logName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {selectedSubmission ? (
            <div className="p-6">
              {(selectedSubmission as any).__fedFromSubClubName && (
                <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center gap-2 text-sm text-foreground">
                  <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
                  Submitted by sub-club: <strong>{(selectedSubmission as any).__fedFromSubClubName}</strong>
                  <span className="ml-auto text-xs text-muted-foreground font-normal">
                    {(selectedSubmission as any).__sharedApproval ? 'Shared approval — approving here also approves in sub-club.' : 'Independent approval — only counts for this club.'}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-foreground">
                    {selectedSubmission.activityName || 'Unnamed Activity'}
                  </h2>
                </div>
                <div className="flex items-center space-x-3">
                  {(approvalsRequired > 1 || rejectionsRequired > 1) && (
                    <span className="text-xs text-muted-foreground mr-2">
                      {(selectedSubmission.approvals || []).length}/{approvalsRequired} approvals
                      {' · '}
                      {(selectedSubmission.rejections || []).length}/{rejectionsRequired} rejections
                    </span>
                  )}
                  <Button
                    onClick={() => updateStatusMutation.mutate({ id: selectedSubmission.id, status: 'pending' })}
                    disabled={updateStatusMutation.isPending}
                    variant="outline"
                    className="text-chart-1 hover:bg-chart-1/10 border-chart-1/30"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Pending
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={updateStatusMutation.isPending || alreadyApproved(selectedSubmission)}
                    className="bg-chart-3 hover:bg-chart-3/85 text-primary-foreground"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {alreadyApproved(selectedSubmission) ? 'Approved' : 'Approve'}
                  </Button>
                  <Button
                    onClick={() => setRejectingSubmission(selectedSubmission?.id || null)}
                    disabled={updateStatusMutation.isPending || alreadyRejected(selectedSubmission)}
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {alreadyRejected(selectedSubmission) ? 'Rejected' : 'Reject'}
                  </Button>
                </div>
              </div>

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
                        <label className="text-sm font-medium text-foreground">Activity Name</label>
                        <p className="text-foreground">{selectedSubmission.activityName || 'Not provided'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-foreground">Description</label>
                        <p className="text-foreground">{selectedSubmission.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-sm font-medium text-foreground">Date</label>
                          <p className="text-foreground">{formatDate(selectedSubmission.date)}</p>
                      </div>
                      <div>
                          <label className="text-sm font-medium text-foreground">Hours</label>
                          <p className="text-foreground">{selectedSubmission.hours}</p>
                      </div>
                    </div>
                    {selectedSubmission.logName && (
                      <div>
                        <label className="text-sm font-medium text-foreground">Log</label>
                        <p className="text-foreground">{selectedSubmission.logName}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-foreground">Submitted</label>
                      <p className="text-foreground">{formatDate(selectedSubmission.createdAt)}</p>
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
                        <ProofMetadata
                          metadata={selectedSubmission.proofImageMetadata}
                          serviceDate={selectedSubmission.date}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground/60" />
                        <p className="text-muted-foreground">No proof image provided</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground/60" />
                <h3 className="text-lg font-medium text-foreground mb-2">Select an Activity</h3>
                <p className="text-muted-foreground">Choose an activity from the sidebar to review</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {imageModalOpen && selectedSubmission?.proofImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto">
             <button
              onClick={() => setImageModalOpen(false)}
               className="absolute top-4 right-4 bg-card/20 hover:bg-card/30 rounded-full p-2 transition-colors"
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

      {rejectingSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[100]">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Reject Submission</h2>
              <button
                onClick={() => setRejectingSubmission(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please provide a reason for rejecting this submission. This will be visible to the student.
              </p>
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="bg-card"
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" className="border-border text-muted-foreground" onClick={() => setRejectingSubmission(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => handleReject(rejectingSubmission)}
                  disabled={!rejectReason.trim() || updateStatusMutation.isPending}
                  className="bg-destructive hover:bg-destructive/85 text-destructive-foreground"
                >
                  {updateStatusMutation.isPending ? "Rejecting..." : "Reject Submission"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
