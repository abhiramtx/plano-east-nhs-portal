import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/lib/firebase";
import { UserProfile, HoursSubmission } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertCircle,
  User as UserIcon
} from "lucide-react";

interface AdminStudentsProps {
  user: User | null;
}

export function AdminStudents({ user }: AdminStudentsProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all submissions to get student data
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['/api/hours-submissions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/hours-submissions');
      return Array.isArray(response) ? response : [];
    },
  });

  // Group submissions by student
  const studentStats = submissions.reduce((acc: any, submission: HoursSubmission) => {
    const key = submission.studentId || submission.studentName;
    if (!acc[key]) {
      acc[key] = {
        studentName: submission.studentName,
        studentId: submission.studentId,
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

  const students = Object.values(studentStats).filter((student: any) =>
    student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-white min-h-0">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 lg:px-6 py-4 lg:py-6 pt-16 lg:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Student Management</h1>
              <p className="text-gray-600 mt-1">Track student progress and manage requirements</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search students by name or ID..."
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
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                <p className="text-gray-500">
                  {searchTerm ? "Try adjusting your search terms" : "Students will appear here once they submit hours"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {students.map((student: any, index: number) => {
                  const requirement = getRequirementStatus(student.approvedHours);
                  return (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                              <UserIcon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{student.studentName}</h3>
                              <p className="text-sm text-gray-500">Student ID: {student.studentId || 'N/A'}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Total Hours</p>
                              <p className="font-medium">{student.totalHours.toFixed(1)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Approved</p>
                              <p className="font-medium text-green-600">{student.approvedHours.toFixed(1)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Pending</p>
                              <p className="font-medium text-yellow-600">{student.pendingHours.toFixed(1)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Submissions</p>
                              <p className="font-medium">{student.submissionCount}</p>
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
  );
}