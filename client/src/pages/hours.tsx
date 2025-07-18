import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, getCurrentUser } from "@/lib/firebase";
import { HoursSubmission } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, FileText, Calendar, CheckCircle, XCircle, AlertCircle, Trash2, Eye } from "lucide-react";
import { HoursSubmissionForm } from "@/components/hours-submission-form";
import { ProfileCompletionGuard } from "@/components/profile-completion-guard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Helper function to convert email to storage key
const emailToKey = (email: string) => email.replace(/\./g, ',');

export default function Hours() {
  const [user, setUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['/api/hours-submissions', user?.email ? emailToKey(user.email) : ''],
    enabled: !!user?.email,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/hours-submissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hours-submissions', user?.email ? emailToKey(user.email) : ''] });
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
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/hours-submissions', user?.email ? emailToKey(user.email) : ''] });
  };

  return (
    <ProfileCompletionGuard user={user}>
      <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6 pt-16 lg:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Hours Management</h1>
              <p className="text-gray-600 mt-1">Track and manage your service hours</p>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Hours
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Submit Service Hours</DialogTitle>
                </DialogHeader>
                <HoursSubmissionForm user={user} onSuccess={handleFormSuccess} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {submissions.length === 0 ? (
              <Card>
                <CardContent className="p-12">
                  <div className="text-center">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
                    <p className="text-gray-500 mb-6">Start by submitting your first service hours</p>
                    <Button onClick={() => setIsFormOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Submit Your First Hours
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 lg:space-y-6">
                {submissions.map((submission: HoursSubmission) => (
                  <Card key={submission.id} className="overflow-hidden">
                    <CardContent className="p-4 lg:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-3">
                            <Badge 
                              variant={submission.status === 'approved' ? 'default' : 'secondary'}
                              className={`${
                                submission.status === 'approved' 
                                  ? 'bg-green-100 text-green-800' 
                                  : submission.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
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
                          
                          <h3 className="font-medium text-gray-900 mb-2">{submission.activityName || submission.studentName}</h3>
                          <p className="text-gray-600 mb-4">{submission.description}</p>
                          
                          {submission.proofImageUrl && (
                            <div className="mb-4">
                              <img 
                                src={submission.proofImageUrl} 
                                alt="Proof of service" 
                                className="w-24 h-24 lg:w-32 lg:h-32 object-cover rounded-lg border"
                              />
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500">
                            Submitted on {formatDate(submission.createdAt)}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
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
    </div>
    </ProfileCompletionGuard>
  );
}