import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, getCurrentUser, getUserSubmissions, deleteSubmission, HoursSubmission, Club } from "@/lib/firebase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, FileText, Calendar, CheckCircle, XCircle, AlertCircle, Trash2, Eye, Edit } from "lucide-react";
import { HoursSubmissionForm } from "@/components/hours-submission-form";
import { ProfileCompletionGuard } from "@/components/profile-completion-guard";
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

  const openLogs = hoursLogs.filter(log => log.isOpen);
  const selectedLog = openLogs.find(log => String(log.id) === selectedLogId) || null;

  const { data: submissions = [], isLoading } = useQuery<HoursSubmission[]>({
    queryKey: ['firebase-user-submissions', userEmail, club.id],
    queryFn: () => getUserSubmissions(userEmail, club.id),
    enabled: !!userEmail && !!club.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteSubmission(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-user-submissions', userEmail, club.id] });
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
    queryClient.invalidateQueries({ queryKey: ['firebase-user-submissions', userEmail, club.id] });
  };

  const filteredSubmissions = selectedLogId
    ? submissions.filter(s => s.logId === selectedLogId)
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
      <div className="flex-1 flex flex-col h-full bg-white">
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6 pt-16 lg:pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Hours Management</h1>
              <p className="text-gray-600 mt-1">Track and manage your service hours</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 bg-black rounded-lg">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-black hover:bg-gray-800 text-white"
                    disabled={openLogs.length > 0 && !selectedLogId}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Submit Hours
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl bg-white border-gray-200">
                <DialogHeader>
                  <DialogTitle className="text-gray-900">
                    {editingSubmission ? 'Edit Service Hours' : `Submit Service Hours${selectedLog ? ` — ${selectedLog.name}` : ''}`}
                  </DialogTitle>
                </DialogHeader>
                <HoursSubmissionForm 
                  user={user} 
                  onSuccess={handleFormSuccess} 
                  editingSubmission={editingSubmission}
                  clubId={club.id}
                  logId={editingSubmission ? (editingSubmission as any).logId : (selectedLogId || undefined)}
                  logName={editingSubmission ? (editingSubmission as any).logName : (selectedLog?.name || undefined)}
                />
              </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {openLogs.length > 0 && (
          <div className="px-4 lg:px-6 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              {openLogs.map(log => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLogId(String(log.id))}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    selectedLogId === String(log.id)
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {log.name}
                  <span className="ml-1.5 text-xs opacity-75">({log.hoursRequired}h req)</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            {filteredSubmissions.length === 0 ? (
              <Card className="bg-white border-gray-200">
                <CardContent className="p-12">
                  <div className="text-center">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
                    <p className="text-gray-500 mb-6">Start by submitting your first service hours</p>
                    <Button 
                      onClick={() => setIsFormOpen(true)} 
                      className="bg-black hover:bg-gray-800 text-white"
                      disabled={openLogs.length > 0 && !selectedLogId}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Submit Your First Hours
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 lg:space-y-6">
                {filteredSubmissions.map((submission: HoursSubmission) => (
                  <Card key={submission.id} className="bg-white border-gray-200">
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
                                className="w-24 h-24 lg:w-32 lg:h-32 object-cover rounded-lg border border-gray-200"
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
                              className="border-gray-200 text-gray-600 hover:bg-gray-100"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {submission.status === 'rejected' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-gray-200 text-gray-600 hover:bg-gray-100"
                              onClick={() => handleEdit(submission)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-gray-200 text-gray-600 hover:bg-gray-100"
                            onClick={() => deleteMutation.mutate(submission.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
              className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-colors"
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
