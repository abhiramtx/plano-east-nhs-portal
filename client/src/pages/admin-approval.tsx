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
  getPendingSubmissionsForUserInClub, 
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
    refetchInterval: 5000,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: studentSubmissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ['firebase-pending-submissions', assignment?.email, club.id],
    queryFn: async () => {
      if (!assignment?.email) return [];
      return getPendingSubmissionsForUserInClub(assignment.email, club.id);
    },
    enabled: !!assignment?.email,
    staleTime: 0,
    gcTime: 0,
  });

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
          <p className="text-gray-500">All submissions have been reviewed or assigned to other administrators</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Hours Approval</h1>
              <p className="text-gray-600 mt-1">Each admin reviews one volunteer at a time. Submissions require a set number of approvals before hours are finalized — configure this threshold in Settings → Approvals.</p>
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
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <div className="p-2">
                        <button
                          onClick={() => setSelectedLogIds([])}
                          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                            selectedLogIds.length === 0 ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                          }`}
                        >
                          All Logs
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        {hoursLogs.map((log: HoursLog) => (
                          <label
                            key={log.id}
                            className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-50 cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedLogIds.includes(log.id)}
                              onCheckedChange={() => toggleLogId(log.id)}
                            />
                            <span className="text-sm text-gray-900 truncate">{log.name}</span>
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
              <div className="flex items-center justify-center w-10 h-10 bg-black rounded-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 bg-black rounded-full">
                <span className="text-white text-sm font-medium">
                  {assignedStudent?.email?.split('@')[0].substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-gray-900">
                    {[assignedStudent?.goByFirstName, assignedStudent?.lastName].filter(Boolean).join(' ') || assignedStudent?.displayName || assignedStudent?.email}
                  </h3>
                  {assignedStudent?.userRole === 1 && (
                    <Badge variant="secondary" className="text-xs">Admin</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500">{assignedStudent?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <IdCard className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">ID: {assignedStudent?.studentId || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Grade: {assignedStudent?.gradeLevel || 'N/A'}</span>
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
            <h4 className="font-medium text-gray-900 mb-3">Pending Activities ({filteredSubmissions.length})</h4>
            {submissionsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading activities...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                <p className="text-sm text-gray-600">
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
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(submission.date)}
                      </div>
                      <div className="flex items-center gap-1">
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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedSubmission.activityName || 'Unnamed Activity'}
                  </h2>
                </div>
                <div className="flex items-center space-x-3">
                  {(approvalsRequired > 1 || rejectionsRequired > 1) && (
                    <span className="text-xs text-gray-500 mr-2">
                      {(selectedSubmission.approvals || []).length}/{approvalsRequired} approvals
                      {' · '}
                      {(selectedSubmission.rejections || []).length}/{rejectionsRequired} rejections
                    </span>
                  )}
                  <Button
                    onClick={() => updateStatusMutation.mutate({ id: selectedSubmission.id, status: 'pending' })}
                    disabled={updateStatusMutation.isPending}
                    variant="outline"
                    className="text-yellow-600 hover:bg-yellow-50 border-yellow-200"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Pending
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={updateStatusMutation.isPending || alreadyApproved(selectedSubmission)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {alreadyApproved(selectedSubmission) ? 'Approved' : 'Approve'}
                  </Button>
                  <Button
                    onClick={() => setRejectingSubmission(selectedSubmission?.id || null)}
                    disabled={updateStatusMutation.isPending || alreadyRejected(selectedSubmission)}
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 border-red-200"
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
                    {selectedSubmission.logName && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Log</label>
                        <p className="text-gray-900">{selectedSubmission.logName}</p>
                      </div>
                    )}
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

      {rejectingSubmission && (
        <Dialog open={!!rejectingSubmission} onOpenChange={() => setRejectingSubmission(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Submission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Please provide a reason for rejecting this submission. This will be visible to the student.
              </p>
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setRejectingSubmission(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleReject(rejectingSubmission)}
                  disabled={!rejectReason.trim() || updateStatusMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {updateStatusMutation.isPending ? "Rejecting..." : "Reject Submission"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
