import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@/lib/firebase";
import { UserProfile, HoursSubmission } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  const [rejectingSubmission, setRejectingSubmission] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    gradeLevels: [],
    requirementStatus: [],
    submissionStatus: [],
    userRoles: []
  });
  const { toast } = useToast();

  // Fetch student's hours submissions when modal opens
  const { data: studentSubmissions = [], isLoading: studentSubmissionsLoading } = useQuery({
    queryKey: ['/api/hours-submissions', selectedStudent?.userId],
    queryFn: async () => {
      if (!selectedStudent?.userId) return [];
      const response = await apiRequest('GET', `/api/hours-submissions/${selectedStudent.userId}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!selectedStudent?.userId
  });

  // Mutation for updating submission status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, rejectReason }: { id: number; status: string; rejectReason?: string }) => {
      const response = await apiRequest('PUT', `/api/hours-submissions/${id}`, { status, rejectReason });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hours-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hours-submissions', selectedStudent?.userId] });
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

  const handleReject = (submissionId: number) => {
    if (rejectReason.trim()) {
      updateStatusMutation.mutate({ 
        id: submissionId, 
        status: 'rejected', 
        rejectReason: rejectReason.trim() 
      });
    }
  };

  // Fetch all submissions to get student data
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ['/api/hours-submissions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/hours-submissions');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch all user profiles to get additional information
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['/api/user-profiles'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/user-profiles');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const isLoading = submissionsLoading || profilesLoading;

  // Group submissions by student and merge with profile data
  const studentStats = submissions.reduce((acc: any, submission: HoursSubmission) => {
    const key = submission.userId;
    if (!acc[key]) {
      const profile = profiles.find(p => p.userId === submission.userId);
      acc[key] = {
        userId: submission.userId,
        studentName: submission.studentName,
        studentId: submission.studentId,
        email: submission.userId, // User ID is the email
        personalEmail: profile?.personalEmailAddress || '',
        gradeLevel: profile?.gradeLevel || 'N/A',
        gpa: profile?.gpa || null,
        phoneNumber: profile?.cellPhoneNumber || '',
        userRole: profile?.userRole || 0,
        isProfileComplete: profile?.isProfileComplete || false,
        totalHours: 0,
        approvedHours: 0,
        pendingHours: 0,
        rejectedHours: 0,
        submissionCount: 0,
        lastSubmission: submission.createdAt
      };
    }
    
    const hours = parseFloat(submission.hours);
    acc[key].totalHours += hours;
    acc[key].submissionCount++;
    
    if (submission.status === 'approved') {
      acc[key].approvedHours += hours;
    } else if (submission.status === 'pending') {
      acc[key].pendingHours += hours;
    } else if (submission.status === 'rejected') {
      acc[key].rejectedHours += hours;
    }
    
    if (new Date(submission.createdAt) > new Date(acc[key].lastSubmission)) {
      acc[key].lastSubmission = submission.createdAt;
    }
    
    return acc;
  }, {});

  // Filter and search logic
  const allStudents = Object.values(studentStats);
  const filteredStudents = allStudents.filter((student: any) => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      (student.studentName && student.studentName.toLowerCase().includes(searchLower)) ||
      (student.studentId && student.studentId.toLowerCase().includes(searchLower)) ||
      (student.email && student.email.toLowerCase().includes(searchLower)) ||
      (student.personalEmail && student.personalEmail.toLowerCase().includes(searchLower));
    
    // Grade level filter
    const matchesGrade = filters.gradeLevels.length === 0 || 
      filters.gradeLevels.includes(student.gradeLevel);
    
    // Requirement status filter
    const requirementMet = student.approvedHours >= 15;
    const matchesRequirement = filters.requirementStatus.length === 0 ||
      (filters.requirementStatus.includes('met') && requirementMet) ||
      (filters.requirementStatus.includes('not-met') && !requirementMet);
    
    // Submission status filter
    const hasPending = student.pendingHours > 0;
    const matchesSubmissionStatus = filters.submissionStatus.length === 0 ||
      (filters.submissionStatus.includes('has-pending') && hasPending) ||
      (filters.submissionStatus.includes('no-pending') && !hasPending);
    
    // User role filter
    const matchesRole = filters.userRoles.length === 0 ||
      (filters.userRoles.includes('student') && student.userRole === 0) ||
      (filters.userRoles.includes('admin') && student.userRole === 1);
    
    return matchesSearch && matchesGrade && matchesRequirement && matchesSubmissionStatus && matchesRole;
  });

  const students = filteredStudents;
  
  // Remove debug logging since issue is fixed

  // Helper functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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

  // Fixed grade levels for high school
  const gradeLevels = ['9', '10', '11', '12'];
  const activeFilterCount = Object.values(filters).flat().length;

  // Filter handlers
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
      {/* Filter Sidebar */}
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
              {/* Grade Level Filter */}
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

              {/* Requirement Status Filter */}
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

              {/* Submission Status Filter */}
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

              {/* User Role Filter */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0">
          <div className="px-4 lg:px-6 py-4 lg:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Member Management</h1>
                <p className="text-gray-600 mt-1">Track member progress and manage requirements (students & admins)</p>
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

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search members by name, ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Stats Overview */}
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

          {/* Students List */}
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
                              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                                <UserIcon className="w-5 h-5 text-white" />
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
                                    <span>{student.email.replace(/,/g, '.')}</span>
                                  </div>
                                  {student.personalEmail && student.personalEmail !== student.email && (
                                    <div className="flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      <span className="text-gray-500">Personal: {student.personalEmail}</span>
                                    </div>
                                  )}
                                  {student.phoneNumber && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      <span>{student.phoneNumber}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                      <span className="font-medium">ID:</span>
                                      <span>{student.studentId || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <GraduationCap className="w-3 h-3" />
                                      <span>Grade {student.gradeLevel}</span>
                                    </div>
                                    {student.gpa && (
                                      <div className="flex items-center gap-1">
                                        <span className="font-medium">GPA:</span>
                                        <span>{student.gpa}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
                              <div className="text-center">
                                <p className="text-xs text-gray-600 mb-1">Total Hours</p>
                                <p className="font-semibold text-gray-900">{student.totalHours.toFixed(1)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-600 mb-1">Approved</p>
                                <p className="font-semibold text-green-600">{student.approvedHours.toFixed(1)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-600 mb-1">Pending</p>
                                <p className="font-semibold text-yellow-600">{student.pendingHours.toFixed(1)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-600 mb-1">Submissions</p>
                                <p className="font-semibold text-gray-900">{student.submissionCount}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end space-y-2">
                            <Badge className={requirement.color}>
                              {requirement.text}
                            </Badge>
                            <p className="text-xs text-gray-500">
                              Last activity: {formatDate(student.lastSubmission)}
                            </p>
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

      {/* Student Profile Main Content Area */}
      {selectedStudent && (
        <div className="fixed top-0 left-64 right-0 bottom-0 bg-white overflow-auto z-50">
          <div className="min-h-full">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b border-gray-200">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                      <UserIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        {selectedStudent.studentName}
                      </h1>
                      <p className="text-gray-600">Student Profile & Hours Review</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedStudent(null)}
                    className="bg-white"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Close Profile
                  </Button>
                </div>

                {/* Complete Profile Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-gray-600">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="text-xs text-gray-500">Google Account</p>
                          <p className="text-sm font-medium">{selectedStudent.email.replace(/,/g, '.')}</p>
                        </div>
                      </div>
                      {selectedStudent.personalEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-green-500" />
                          <div>
                            <p className="text-xs text-gray-500">Personal Email</p>
                            <p className="text-sm font-medium">{selectedStudent.personalEmail}</p>
                          </div>
                        </div>
                      )}
                      {selectedStudent.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-purple-500" />
                          <div>
                            <p className="text-xs text-gray-500">Phone Number</p>
                            <p className="text-sm font-medium">{selectedStudent.phoneNumber}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-gray-600">Academic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="text-xs text-gray-500">Grade Level</p>
                          <p className="text-sm font-medium">Grade {selectedStudent.gradeLevel}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 flex items-center justify-center text-green-500 font-bold">#</span>
                        <div>
                          <p className="text-xs text-gray-500">Student ID</p>
                          <p className="text-sm font-medium">{selectedStudent.studentId || 'Not provided'}</p>
                        </div>
                      </div>
                      {selectedStudent.gpa && (
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-yellow-500" />
                          <div>
                            <p className="text-xs text-gray-500">GPA</p>
                            <p className="text-sm font-medium">{selectedStudent.gpa}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-gray-600">NAHS Requirements</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{selectedStudent.approvedHours.toFixed(1)}</p>
                        <p className="text-xs text-gray-500">Approved Hours</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{width: `${Math.min((selectedStudent.approvedHours / 15) * 100, 100)}%`}}
                        ></div>
                      </div>
                      <p className="text-xs text-center text-gray-500">
                        {selectedStudent.approvedHours >= 15 ? 'Requirements Met!' : `${(15 - selectedStudent.approvedHours).toFixed(1)} hours remaining`}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto p-6">
              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-gray-600 mb-1">Total Hours</p>
                    <p className="text-3xl font-bold text-gray-900">{selectedStudent.totalHours.toFixed(1)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-gray-600 mb-1">Approved</p>
                    <p className="text-3xl font-bold text-green-600">{selectedStudent.approvedHours.toFixed(1)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-gray-600 mb-1">Pending</p>
                    <p className="text-3xl font-bold text-yellow-600">{selectedStudent.pendingHours.toFixed(1)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-gray-600 mb-1">Submissions</p>
                    <p className="text-3xl font-bold text-gray-900">{selectedStudent.submissionCount}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Hours Submissions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Hours Submissions</h3>
                {studentSubmissionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading submissions...</p>
                  </div>
                ) : studentSubmissions.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">No submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {studentSubmissions.map((submission: HoursSubmission) => (
                      <Card key={submission.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getStatusBadgeColor(submission.status)}>
                                  {getStatusIcon(submission.status)}
                                  <span className="ml-1 capitalize">{submission.status}</span>
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {new Date(submission.date).toLocaleDateString()}
                                </span>
                              </div>
                              <h4 className="font-medium text-gray-900 mb-1">
                                {submission.activityName || "Activity Name Not Provided"}
                              </h4>
                              <p className="text-sm text-gray-600 mb-2">{submission.description}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {submission.hours} hours
                                </div>
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  {new Date(submission.date).toLocaleDateString()}
                                </div>
                              </div>
                              {submission.status === 'rejected' && submission.rejectReason && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                                  <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason:</p>
                                  <p className="text-sm text-red-700">{submission.rejectReason}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              {submission.proofImageUrl && (
                                <Button variant="outline" size="sm">
                                  <Eye className="w-4 h-4 mr-1" />
                                  View Proof
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ id: submission.id, status: 'pending' })}
                                disabled={updateStatusMutation.isPending}
                                className="text-yellow-600 hover:bg-yellow-50"
                              >
                                <Clock className="w-4 h-4 mr-1" />
                                Pending
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ id: submission.id, status: 'approved' })}
                                disabled={updateStatusMutation.isPending}
                                className="text-green-600 hover:bg-green-50"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRejectingSubmission(submission.id)}
                                disabled={updateStatusMutation.isPending}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Dialog */}
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