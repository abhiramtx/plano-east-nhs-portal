import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, getAllSubmissions, getAllUserProfiles, getUserSubmissions, updateSubmission, HoursSubmission, UserProfile } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
  Filter,
  X,
  Calendar,
  Eye,
  Check,
  XCircle
} from "lucide-react";

interface AdminStudentsProps {
  user: User | null;
}

interface FilterState {
  gradeLevels: string[];
  requirementStatus: string[];
  submissionStatus: string[];
  userRoles: string[];
}

export function AdminStudents({ user }: AdminStudentsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [rejectingSubmission, setRejectingSubmission] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    gradeLevels: [],
    requirementStatus: [],
    submissionStatus: [],
    userRoles: []
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: studentSubmissions = [], isLoading: studentSubmissionsLoading } = useQuery({
    queryKey: ['firebase-student-submissions', selectedStudent?.email],
    queryFn: async () => {
      if (!selectedStudent?.email) return [];
      return getUserSubmissions(selectedStudent.email);
    },
    enabled: !!selectedStudent?.email
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, rejectReason }: { id: string; status: string; rejectReason?: string }) => {
      await updateSubmission(id, { 
        status, 
        rejectReason: rejectReason || undefined,
        reviewedAt: new Date(),
        reviewedBy: user?.email || ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['firebase-student-submissions'] });
      setRejectingSubmission(null);
      setRejectReason("");
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

  const handleReject = (submissionId: string) => {
    if (rejectReason.trim()) {
      updateStatusMutation.mutate({ 
        id: submissionId, 
        status: 'rejected', 
        rejectReason: rejectReason.trim() 
      });
    }
  };

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ['firebase-submissions'],
    queryFn: getAllSubmissions,
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['firebase-user-profiles'],
    queryFn: getAllUserProfiles,
  });

  const isLoading = submissionsLoading || profilesLoading;

  const studentStats = submissions.reduce((acc: any, submission: HoursSubmission) => {
    const key = submission.userEmail;
    if (!acc[key]) {
      const profile = profiles.find((p: UserProfile) => p.email === submission.userEmail);
      acc[key] = {
        email: submission.userEmail,
        studentName: submission.userName,
        gradeLevel: profile?.gradeLevel || 'N/A',
        userRole: profile?.userRole || 0,
        totalHours: 0,
        approvedHours: 0,
        pendingHours: 0,
        rejectedHours: 0,
        submissionCount: 0,
        lastSubmission: submission.createdAt
      };
    }
    
    const hours = submission.hours;
    acc[key].totalHours += hours;
    acc[key].submissionCount++;
    
    if (submission.status === 'approved') {
      acc[key].approvedHours += hours;
    } else if (submission.status === 'pending') {
      acc[key].pendingHours += hours;
    } else if (submission.status === 'rejected') {
      acc[key].rejectedHours += hours;
    }
    
    const submissionDate = typeof submission.createdAt === 'string' ? new Date(submission.createdAt) : submission.createdAt;
    const lastSubmissionDate = typeof acc[key].lastSubmission === 'string' ? new Date(acc[key].lastSubmission) : acc[key].lastSubmission;
    if (submissionDate > lastSubmissionDate) {
      acc[key].lastSubmission = submission.createdAt;
    }
    
    return acc;
  }, {});

  const allStudents = Object.values(studentStats);
  const filteredStudents = allStudents.filter((student: any) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      (student.studentName && student.studentName.toLowerCase().includes(searchLower)) ||
      (student.email && student.email.toLowerCase().includes(searchLower));
    
    const matchesGrade = filters.gradeLevels.length === 0 || 
      filters.gradeLevels.includes(student.gradeLevel);
    
    const requirementMet = student.approvedHours >= 15;
    const matchesRequirement = filters.requirementStatus.length === 0 ||
      (filters.requirementStatus.includes('met') && requirementMet) ||
      (filters.requirementStatus.includes('not-met') && !requirementMet);
    
    const hasPending = student.pendingHours > 0;
    const matchesSubmissionStatus = filters.submissionStatus.length === 0 ||
      (filters.submissionStatus.includes('has-pending') && hasPending) ||
      (filters.submissionStatus.includes('no-pending') && !hasPending);
    
    const matchesRole = filters.userRoles.length === 0 ||
      (filters.userRoles.includes('student') && student.userRole === 0) ||
      (filters.userRoles.includes('admin') && student.userRole === 1);
    
    return matchesSearch && matchesGrade && matchesRequirement && matchesSubmissionStatus && matchesRole;
  });

  const students = filteredStudents;

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRequirementStatus = (approvedHours: number) => {
    if (approvedHours >= 15) {
      return { status: 'met', color: 'bg-green-100 text-green-800', text: 'Requirement Met' };
    } else {
      const needed = 15 - approvedHours;
      return { 
        status: 'pending', 
        color: 'bg-yellow-100 text-yellow-800', 
        text: `${needed.toFixed(1)} hours needed` 
      };
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-3 h-3" />;
      case 'rejected': return <XCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const gradeLevels = ['9', '10', '11', '12'];
  const activeFilterCount = Object.values(filters).flat().length;

  const handleFilterChange = (category: keyof FilterState, value: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      [category]: checked
        ? [...prev[category], value]
        : prev[category].filter(v => v !== value)
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      gradeLevels: [],
      requirementStatus: [],
      submissionStatus: [],
      userRoles: []
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading member data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-white min-h-0">
      {showFilters && (
        <div className="w-56 border-r border-gray-200 flex-shrink-0 bg-gray-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="bg-blue-100 text-blue-800">{activeFilterCount}</Badge>
                )}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="w-full mb-4"
              >
                Clear All
              </Button>
            )}

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Grade Level</h4>
                <div className="space-y-2">
                  {gradeLevels.map(grade => (
                    <div key={grade} className="flex items-center space-x-2">
                      <Checkbox
                        id={`grade-${grade}`}
                        checked={filters.gradeLevels.includes(grade)}
                        onCheckedChange={(checked) => 
                          handleFilterChange('gradeLevels', grade, checked as boolean)
                        }
                      />
                      <label htmlFor={`grade-${grade}`} className="text-sm text-gray-700">
                        Grade {grade}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Requirements</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="req-met"
                      checked={filters.requirementStatus.includes('met')}
                      onCheckedChange={(checked) => 
                        handleFilterChange('requirementStatus', 'met', checked as boolean)
                      }
                    />
                    <label htmlFor="req-met" className="text-sm text-gray-700">
                      Requirements Met
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="req-not-met"
                      checked={filters.requirementStatus.includes('not-met')}
                      onCheckedChange={(checked) => 
                        handleFilterChange('requirementStatus', 'not-met', checked as boolean)
                      }
                    />
                    <label htmlFor="req-not-met" className="text-sm text-gray-700">
                      Requirements Not Met
                    </label>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Submission Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has-pending"
                      checked={filters.submissionStatus.includes('has-pending')}
                      onCheckedChange={(checked) => 
                        handleFilterChange('submissionStatus', 'has-pending', checked as boolean)
                      }
                    />
                    <label htmlFor="has-pending" className="text-sm text-gray-700">
                      Has Pending Hours
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="no-pending"
                      checked={filters.submissionStatus.includes('no-pending')}
                      onCheckedChange={(checked) => 
                        handleFilterChange('submissionStatus', 'no-pending', checked as boolean)
                      }
                    />
                    <label htmlFor="no-pending" className="text-sm text-gray-700">
                      No Pending Hours
                    </label>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Role</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-student"
                      checked={filters.userRoles.includes('student')}
                      onCheckedChange={(checked) => 
                        handleFilterChange('userRoles', 'student', checked as boolean)
                      }
                    />
                    <label htmlFor="role-student" className="text-sm text-gray-700">
                      Students
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-admin"
                      checked={filters.userRoles.includes('admin')}
                      onCheckedChange={(checked) => 
                        handleFilterChange('userRoles', 'admin', checked as boolean)
                      }
                    />
                    <label htmlFor="role-admin" className="text-sm text-gray-700">
                      Admins
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <div className="bg-white border-b border-gray-200 flex-shrink-0">
          <div className="px-4 lg:px-6 py-4 lg:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Member Management</h1>
                <p className="text-gray-600 mt-1">Track member progress and manage requirements</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge className="bg-blue-100 text-blue-800">{activeFilterCount}</Badge>
                  )}
                </Button>
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search members by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Members</p>
                    <p className="text-2xl font-bold text-gray-900">{students.length}</p>
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
                    <p className="text-sm font-medium text-gray-600">Requirements Met</p>
                    <p className="text-2xl font-bold text-green-600">
                      {students.filter((s: any) => s.approvedHours >= 15).length}
                    </p>
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
                    <p className="text-sm font-medium text-gray-600">Pending Review</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {students.filter((s: any) => s.pendingHours > 0).length}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-full">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Student Progress
                {activeFilterCount > 0 && (
                  <Badge className="bg-blue-100 text-blue-800">
                    {students.length} of {allStudents.length} shown
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                  <p className="text-gray-500">
                    {searchTerm || activeFilterCount > 0 
                      ? "Try adjusting your search terms or filters" 
                      : "Students will appear here once they submit hours"
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {students.map((student: any, index: number) => {
                    const requirement = getRequirementStatus(student.approvedHours);
                    return (
                      <div 
                        key={index} 
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer" 
                        onClick={() => setSelectedStudent(student)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full">
                                <span className="text-white text-sm font-medium">
                                  {student.email.split('@')[0].substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-gray-900">{student.studentName}</h3>
                                  {student.userRole === 1 && (
                                    <Badge className="bg-purple-100 text-purple-800 text-xs">Admin</Badge>
                                  )}
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    <span>{student.email}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <GraduationCap className="w-3 h-3" />
                                    <span>Grade {student.gradeLevel}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">{student.approvedHours.toFixed(1)}</div>
                              <div className="text-xs text-gray-500">approved hours</div>
                            </div>
                            <Badge className={requirement.color}>{requirement.text}</Badge>
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
      </div>

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStudent?.studentName} - Submissions
            </DialogTitle>
          </DialogHeader>
          
          {studentSubmissionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : studentSubmissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No submissions found
            </div>
          ) : (
            <div className="space-y-4">
              {studentSubmissions.map((submission: HoursSubmission) => (
                <div key={submission.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{submission.activityName || 'Unnamed Activity'}</h4>
                    <Badge className={getStatusBadgeColor(submission.status)}>
                      {getStatusIcon(submission.status)}
                      <span className="ml-1 capitalize">{submission.status}</span>
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{submission.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(submission.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {submission.hours} hours
                    </span>
                  </div>
                  
                  {submission.status === 'pending' && (
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: submission.id, status: 'approved' })}
                        className="text-green-600"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectingSubmission(submission.id)}
                        className="text-red-600"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectingSubmission} onOpenChange={() => setRejectingSubmission(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectingSubmission(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => rejectingSubmission && handleReject(rejectingSubmission)}
                disabled={!rejectReason.trim()}
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
