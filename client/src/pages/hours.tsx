import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, getCurrentUser, subscribeToUserSubmissions, deleteSubmission, HoursSubmission, Club, getAdminSettings, AdminSettings as AdminSettingsType } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, FileText, Calendar, CheckCircle, XCircle, AlertCircle, Trash2, Eye, Edit, Zap, ArrowUpCircle, GitMerge } from "lucide-react";
import { HoursSubmissionForm } from "@/components/hours-submission-form";
import { ProfileCompletionGuard } from "@/components/profile-completion-guard";
import { ClubPageHeader } from "@/components/club-page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { HoursLog } from "@shared/schema";

interface HoursProps {
  club: Club;
}

export default function Hours({ club }: HoursProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState<HoursSubmission | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<HoursSubmission | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const userEmail = user?.email || '';

  const { data: hoursLogs = [] } = useQuery<HoursLog[]>({
    queryKey: ['/api/hours-logs', club.id],
    enabled: !!club.id,
  });

  const { data: adminSettings } = useQuery<AdminSettingsType | null>({
    queryKey: ['firebase-admin-settings'],
    queryFn: getAdminSettings,
  });

  const requireProofImage = adminSettings?.requireProofImage ?? false;

  const openLogs = hoursLogs.filter(log => log.isOpen);
  const selectedLog = hoursLogs.find(log => String(log.id) === selectedLogId) || null;
  const selectedLogIsOpen = selectedLog ? openLogs.some(l => String(l.id) === selectedLogId) : false;
  const selectedLogIsSystem = selectedLog?.isSystem === true;

  const getSubClubContributionForLog = (_targetLogId: string) => ({ hours: 0, rules: [] as any[] });

  const [directSubmissions, setDirectSubmissions] = useState<HoursSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userEmail || !club.id) return;
    setIsLoading(true);
    const unsub = subscribeToUserSubmissions(userEmail, club.id, (subs) => {
      setDirectSubmissions(subs);
      setIsLoading(false);
    });
    return unsub;
  }, [userEmail, club.id]);

  const submissions = directSubmissions;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteSubmission(id);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Hours submission deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete hours submission",
        variant: "destructive",
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const handleEdit = (submission: HoursSubmission) => {
    setEditingSubmission(submission);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingSubmission(null);
  };

  const filteredSubmissions = selectedLogId
    ? submissions.filter(s =>
        s.logId === selectedLogId ||
        // Event-granted submissions with no log assignment are always visible
        // in every log tab so students can see them regardless of which log is active.
        ((s as any).eventId && !s.logId)
      )
    : hoursLogs.length > 0
      ? submissions.filter(s => !(s as any).logId) // unassigned (event-granted) when no log selected
      : submissions;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ProfileCompletionGuard user={user}>
      <div className="flex-1 flex flex-col h-full">
      <div className="flex-shrink-0 px-4 pt-6 lg:px-6 lg:pt-6">
        <ClubPageHeader
          club={club}
          title="Hours Management"
          description="Track and manage your service hours"
          icon={Clock}
          actions={
              <Dialog open={isFormOpen} onOpenChange={(selectedLogIsSystem || !selectedLogIsOpen) ? undefined : setIsFormOpen}>
                {(!selectedLogIsSystem && (selectedLogIsOpen || !selectedLogId)) && (
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-primary text-primary-foreground hover:bg-primary/85"
                      disabled={hoursLogs.length > 0 && !selectedLogId}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Submit Hours
                    </Button>
                  </DialogTrigger>
                )}
              <DialogContent
                className="max-w-2xl bg-[#faf8f4] border-[#d9cdbd] flex flex-col max-h-[90vh] overflow-hidden p-0"
                onPointerDownOutside={e => {
                  const target = ((e as any).detail?.originalEvent?.target ?? e.target) as HTMLElement | null;
                  if (target?.closest?.('[data-location-suggestions]')) e.preventDefault();
                }}
                onInteractOutside={e => {
                  const target = ((e as any).detail?.originalEvent?.target ?? e.target) as HTMLElement | null;
                  if (target?.closest?.('[data-location-suggestions]')) e.preventDefault();
                }}
              >
                <DialogHeader className="px-6 pt-6 pb-0 flex-shrink-0">
                  <DialogTitle className="text-gray-900">
                    {editingSubmission ? 'Edit Service Hours' : `Submit Service Hours${selectedLog ? ` — ${selectedLog.name}` : ''}`}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
                  <HoursSubmissionForm 
                    user={user} 
                    onSuccess={handleFormSuccess}
                    onCancel={() => setIsFormOpen(false)}
                    editingSubmission={editingSubmission}
                    clubId={club.id}
                    clubName={club.name}
                    logId={editingSubmission ? (editingSubmission as any).logId : (selectedLogId || undefined)}
                    logName={editingSubmission ? (editingSubmission as any).logName : (selectedLog?.name || undefined)}
                    requireProofImage={requireProofImage}
                  />
                </div>
              </DialogContent>
              </Dialog>
          }
        />

        {hoursLogs.length > 0 && (
          <div className="mt-6 pb-2">
            <div className="sm:hidden">
              <label htmlFor="hours-log-mobile" className="sr-only">Choose a log</label>
              <select
                id="hours-log-mobile"
                value={selectedLogId || ''}
                onChange={e => setSelectedLogId(e.target.value || null)}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground"
              >
                <option value="" disabled>Select a log</option>
                {hoursLogs.map(log => {
                  const isOpen = openLogs.some(l => String(l.id) === String(log.id));
                  return <option key={log.id} value={String(log.id)}>
                    {log.name} ({log.hoursRequired}h req){!isOpen ? ' · Closed' : ''}
                  </option>;
                })}
              </select>
            </div>
            <div className="hidden min-w-0 items-center gap-2 overflow-x-auto sm:flex">
              <div className="flex w-max min-w-full gap-2">
                {hoursLogs.map(log => {
                  const isOpen = openLogs.some(l => String(l.id) === String(log.id));
                  return (
                    <button
                      key={log.id}
                      onClick={() => setSelectedLogId(String(log.id))}
                      className={`flex flex-none items-center justify-center rounded-lg px-4 py-2 text-center text-sm font-medium whitespace-nowrap transition-colors ${
                        selectedLogId === String(log.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-accent'
                      }`}
                    >
                      {log.name}
                      <span className="ml-1.5 text-xs opacity-75">({log.hoursRequired}h req)</span>
                      {!isOpen && (
                        <span className="ml-1.5 text-xs opacity-60">· Closed</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {selectedLog && !selectedLogIsSystem && (() => {
          const approvedHours = submissions
            .filter(s => s.logId === selectedLogId && s.status === 'approved')
            .reduce((sum, s) => sum + s.hours, 0);
          const subContrib = getSubClubContributionForLog(selectedLogId!);
          const totalHours = approvedHours + subContrib.hours;
          const pct = Math.min(100, (totalHours / selectedLog.hoursRequired) * 100);
          const met = totalHours >= selectedLog.hoursRequired;
          return (
            <div className="pb-2">
              <div className="w-full rounded-xl border border-border bg-background px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{selectedLog.name} Progress</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${met ? 'bg-[#63a89a]/15 text-[#8bc4b7]' : 'bg-[#d7a85a]/15 text-[#e4bd79]'}`}>
                    {met ? 'Requirement Met' : 'In Progress'}
                  </span>
                </div>
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-2xl font-bold text-foreground leading-none">{totalHours.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground mb-0.5">/ {selectedLog.hoursRequired}h required</span>
                </div>
                <div className="w-full bg-muted-foreground/20 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${met ? 'bg-[#63a89a]' : 'bg-primary'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {subContrib.hours > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <GitMerge className="w-3 h-3 text-amber-600 flex-shrink-0" />
                    <span className="text-xs text-amber-800">
                      Includes {subContrib.hours.toFixed(1)}h from Sub-Club contributions
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-0 lg:px-6 lg:pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            {selectedLogIsSystem && (
              <div className="mb-4 p-3 bg-background border border-border rounded-lg flex items-center gap-2 text-sm text-foreground/85">
                <ArrowUpCircle className="w-4 h-4 text-[#63a89a] flex-shrink-0" />
                <span>Hours in this log are added automatically from sub-club submissions — you cannot submit directly here.</span>
              </div>
            )}
            {selectedLog && !selectedLogIsOpen && !selectedLogIsSystem && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm text-foreground/85">
                <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span>This log is closed — submissions are no longer accepted, but your recorded hours are shown below.</span>
              </div>
            )}
            {selectedLogId && !selectedLogIsSystem && (() => {
              const contrib = getSubClubContributionForLog(selectedLogId);
              if (contrib.rules.length === 0) return null;
              const fmtDate = (d: string) => {
                if (!d) return '';
                const [y, m, day] = d.split('-');
                return `${m}/${day}/${y}`;
              };
              return (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                  <div className="flex items-start gap-2">
                    <GitMerge className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Sub-Club Hours contribution</p>
                      {contrib.rules.map(rule => (
                        <p key={rule.id} className="text-amber-800">
                          {fmtDate(rule.fromDate)} – {fmtDate(rule.toDate)}
                          {rule.label ? ` (${rule.label})` : ''}
                          {' '}→ this log's total
                        </p>
                      ))}
                      {contrib.hours > 0 && (
                        <p className="mt-1 font-semibold">{contrib.hours.toFixed(1)} hours from Sub-Club contributions count toward this log.</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            {filteredSubmissions.length === 0 ? (
              <Card className="bg-[#faf8f4] border-[#d9cdbd]">
                <CardContent className="p-12">
                  <div className="text-center">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    {!selectedLogId && hoursLogs.length > 0 ? (
                      <>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Log</h3>
                        <p className="text-gray-500">Choose a log above to view your hours</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
                        <p className="text-gray-500 mb-6">{selectedLogIsSystem ? 'Hours forwarded from sub-clubs will appear here once approved.' : 'Start by submitting your first service hours'}</p>
                        {!selectedLogIsSystem && selectedLogIsOpen && (
                          <Button 
                            onClick={() => setIsFormOpen(true)} 
                            className="bg-black hover:bg-gray-800 text-white"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Submit Your First Hours
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 lg:space-y-6">
                {filteredSubmissions.map((submission: HoursSubmission) => {
                  const isFed = (submission as any).__fedToSuperClubId === club.id;
                  const fedFromName = (submission as any).__fedFromSubClubName || (submission as any).subClubName || 'sub-club';
                  return (
                  <Card key={`${isFed ? 'fed-' : ''}${submission.id}`} className="bg-[#faf8f4] border-[#d9cdbd]">
                    <CardContent className="p-4 lg:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-3">
                            <Badge 
                              variant={submission.status === 'approved' ? 'default' : 'secondary'}
                              className={`${getStatusColor(submission.status)}`}
                            >
                              {getStatusIcon(submission.status)}
                              <span className="ml-1 capitalize">{submission.status}</span>
                            </Badge>
                            {isFed && (
                              <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-xs">
                                Submitted from sub-club: {fedFromName}
                              </Badge>
                            )}
                            {submission.eventId && (
                              <Badge className="bg-purple-100 text-purple-700 border border-purple-200">
                                <Zap className="w-3 h-3 mr-1" />
                                Event
                              </Badge>
                            )}
                            <div className="flex items-center text-sm text-gray-500">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(submission.date)}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock className="w-4 h-4 mr-1" />
                              {submission.hours} hours
                            </div>
                          </div>
                          
                          <h3 className="font-medium text-gray-900 mb-2">{submission.activityName || submission.userEmail}</h3>
                          <p className="text-gray-600 mb-4">{submission.description}</p>
                          
                          {submission.status === 'rejected' && submission.rejectReason && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                              <p className="text-sm font-medium text-red-600 mb-1">Rejection Reason:</p>
                              <p className="text-sm text-red-500">{submission.rejectReason}</p>
                            </div>
                          )}
                          
                          {submission.proofImageUrl && (
                            <div className="mb-4">
                              <img 
                                src={submission.proofImageUrl} 
                                alt="Proof of service" 
                                className="w-24 h-24 lg:w-32 lg:h-32 object-cover rounded-lg border border-[#d9cdbd]"
                              />
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500">
                            Submitted on {formatDate(submission.createdAt)}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {submission.proofImageUrl && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-[#d9cdbd] text-gray-600 hover:bg-gray-100"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {!isFed && submission.status === 'rejected' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-[#d9cdbd] text-gray-600 hover:bg-gray-100"
                              onClick={() => handleEdit(submission)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {!isFed && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-[#d9cdbd] text-gray-600 hover:bg-gray-100"
                              onClick={() => deleteMutation.mutate(submission.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          {isFed && (
                            <span className="text-xs text-gray-500 italic max-w-[160px] text-right">
                              Edit or delete from {fedFromName}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {selectedSubmission && selectedSubmission.proofImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto">
            <button
              onClick={() => setSelectedSubmission(null)}
              className="absolute top-4 right-4 bg-[#faf8f4] bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-colors"
            >
              <Eye className="w-6 h-6 text-white" />
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
    </ProfileCompletionGuard>
  );
}
