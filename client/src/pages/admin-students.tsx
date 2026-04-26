import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, getClubSubmissions, getAllUserProfiles, getUserSubmissionsAllClubs, updateSubmission, createSubmission, getMemberships, deleteMembership, getSuperClubFedSubmissions, setSuperClubApprovalStatus, getSubClubHoursRules, SubClubHoursRule, HoursSubmission, UserProfile, Club, Membership } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QRCode from "react-qr-code";
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
  XCircle,
  Hash,
  ArrowLeft,
  Download,
  BookOpen,
  Plus,
  QrCode,
  Award,
  GitMerge,
} from "lucide-react";

interface AdminStudentsProps {
  user: User | null;
  club: Club;
}

interface CustomField {
  id: string;
  clubId: string;
  fieldName: string;
  fieldType: "text" | "checkbox" | "select" | "number" | "email" | "phone" | "multiselect";
  required: boolean;
  filterable: boolean;
  selectOptions?: string;
  defaultValue?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

interface HoursLogType {
  id: string;
  clubId: string;
  name: string;
  hoursRequired: number;
  isOpen: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FilterState {
  gradeLevels: string[];
  requirementStatus: string[];
  submissionStatus: string[];
  userRoles: string[];
  customFields: { [fieldId: string]: string | string[] };
  logs: { [logId: string]: string[] };
}

export function AdminStudents({ user, club }: AdminStudentsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [rejectingSubmission, setRejectingSubmission] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<{ [userId: string]: { [fieldId: string]: string } }>({});
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [csvColumns, setCsvColumns] = useState<{ [key: string]: boolean }>({});
  const [filters, setFilters] = useState<FilterState>({
    gradeLevels: [],
    requirementStatus: [],
    submissionStatus: [],
    userRoles: [],
    customFields: {},
    logs: {}
  });
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [grantHours, setGrantHours] = useState('');
  const [grantDescription, setGrantDescription] = useState('');
  const [grantLogId, setGrantLogId] = useState('');
  const [grantDate, setGrantDate] = useState(new Date().toISOString().split('T')[0]);
  const [showStudentQR, setShowStudentQR] = useState<string | null>(null);
  const [editingSubmissionHours, setEditingSubmissionHours] = useState<{ id: string; hours: string } | null>(null);
  const [kickDialogOpen, setKickDialogOpen] = useState(false);
  const [memberToKick, setMemberToKick] = useState<{ email: string; name: string; membershipId: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: studentSubmissions = [], isLoading: studentSubmissionsLoading } = useQuery({
    queryKey: ['firebase-student-submissions', selectedStudent?.email],
    queryFn: async () => {
      if (!selectedStudent?.email) return [];
      return getUserSubmissionsAllClubs(selectedStudent.email);
    },
    enabled: !!selectedStudent?.email
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, rejectReason }: { id: string; status: string; rejectReason?: string }) => {
      // Fed (opted-in) submission: route through per-superclub status,
      // unless the affiliation is in SHARED-approval mode — then write
      // straight to the source submission so both views reflect it.
      const sub = (submissions.find((s: HoursSubmission) => s.id === id) ?? studentSubmissions.find((s: HoursSubmission) => s.id === id)) as any;
      if (sub?.__fedToSuperClubId === club.id) {
        if (sub.__sharedApproval) {
          await updateSubmission(id, {
            status,
            rejectReason: rejectReason || undefined,
            reviewedAt: new Date(),
            reviewedBy: user?.email || '',
          });
        } else {
          await setSuperClubApprovalStatus(id, club.id, status as any, sub.hours || 0, user?.email || '', rejectReason);
        }
        return;
      }
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
      queryClient.invalidateQueries({ queryKey: ['super-club-fed-submissions'] });
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

  const grantHoursMutation = useMutation({
    mutationFn: async () => {
      const hours = parseFloat(grantHours);
      if (!selectedStudent?.email || isNaN(hours) || hours <= 0) throw new Error("Invalid hours");
      const selectedLog = (hoursLogs as any[]).find(l => String(l.id) === grantLogId);
      await createSubmission({
        clubId: club.id,
        userEmail: selectedStudent.email,
        userName: selectedStudent.studentName || selectedStudent.email,
        hours,
        description: grantDescription || `Hours granted by admin`,
        activityName: grantDescription || `Admin Grant`,
        date: new Date(grantDate).toISOString(),
        status: 'approved',
        grantedByAdmin: true,
        reviewedBy: user?.email || '',
        reviewedAt: new Date(),
        logId: selectedLog?.id ? String(selectedLog.id) : undefined,
        logName: selectedLog?.name,
        createdAt: new Date().toISOString(),
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-student-submissions', selectedStudent?.email] });
      queryClient.invalidateQueries({ queryKey: ['firebase-submissions', club.id] });
      setShowGrantDialog(false);
      setGrantHours(''); setGrantDescription(''); setGrantLogId('');
      toast({ title: "Hours granted", description: `${grantHours} hours added to ${selectedStudent?.studentName}` });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const editSubmissionHoursMutation = useMutation({
    mutationFn: async ({ id, hours }: { id: string; hours: number }) => {
      await updateSubmission(id, { hours });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-student-submissions', selectedStudent?.email] });
      queryClient.invalidateQueries({ queryKey: ['firebase-submissions', club.id] });
      setEditingSubmissionHours(null);
      toast({ title: "Hours updated" });
    },
  });

  const kickMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      await deleteMembership(membershipId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-club-memberships', club.id] });
      queryClient.invalidateQueries({ queryKey: ['firebase-submissions', club.id] });
      setKickDialogOpen(false);
      setMemberToKick(null);
      toast({ title: "Member removed", description: `${memberToKick?.name || memberToKick?.email} has been removed from the club.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove member", variant: "destructive" });
    },
  });

  const { data: directSubmissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ['firebase-submissions', club.id],
    queryFn: () => getClubSubmissions(club.id),
  });

  // Fed sub-club submissions of shared volunteers — count toward this
  // super-club using the per-superclub approval status.
  const { data: fedSubmissions = [] } = useQuery({
    queryKey: ['super-club-fed-submissions', club.id],
    queryFn: () => getSuperClubFedSubmissions(club.id),
  });

  // Sub-club submissions of shared volunteers are pooled into this super-club
  // using their shared approval status. The super-club admin can still flip
  // an approved submission to rejected from the volunteer page (uses the
  // existing updateSubmission flow).
  const submissions = useMemo<HoursSubmission[]>(() => {
    const directIds = new Set(directSubmissions.map((s: HoursSubmission) => s.id));
    const fedDeduped = fedSubmissions.filter((s: HoursSubmission) => !directIds.has(s.id));
    return [...directSubmissions, ...fedDeduped];
  }, [directSubmissions, fedSubmissions]);

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['firebase-user-profiles'],
    queryFn: getAllUserProfiles,
  });

  const { data: clubMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['firebase-club-memberships', club.id],
    queryFn: () => getMemberships(club.id),
  });

  const { data: customFields = [] } = useQuery<CustomField[]>({
    queryKey: ['/api/custom-fields', club.id],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/custom-fields/${club.id}`, { credentials: "include" });
        if (!response.ok) return [];
        return response.json() as Promise<CustomField[]>;
      } catch {
        return [];
      }
    }
  });

  const { data: hoursLogs = [] } = useQuery<HoursLogType[]>({
    queryKey: ['/api/hours-logs', club.id],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/hours-logs/${club.id}`, { credentials: "include" });
        if (!response.ok) return [];
        return response.json() as Promise<HoursLogType[]>;
      } catch {
        return [];
      }
    }
  });

  const { data: subClubRules = [] } = useQuery<SubClubHoursRule[]>({
    queryKey: ['sub-club-hours-rules', club.id],
    queryFn: () => getSubClubHoursRules(club.id),
    enabled: !!club.id,
  });

  const getSubClubContributionForStudentLog = (studentEmail: string, targetLogId: string): number => {
    const matchingRules = subClubRules.filter(r => r.targetLogId === targetLogId);
    if (matchingRules.length === 0) return 0;
    const normalizedEmail = studentEmail.replace(/,/g, '.');
    const approvedFed = (fedSubmissions as HoursSubmission[]).filter(
      s => s.status === 'approved' && s.userEmail?.replace(/,/g, '.') === normalizedEmail
    );
    let total = 0;
    for (const rule of matchingRules) {
      for (const sub of approvedFed) {
        if (sub.date >= rule.fromDate && sub.date <= rule.toDate) {
          total += sub.hours;
        }
      }
    }
    return total;
  };

  const filterableCustomFields = customFields.filter(f => f.filterable);

  const isLoading = submissionsLoading || profilesLoading || membersLoading;

  const studentStats: any = {};

  const findProfile = (email: string): UserProfile | undefined => {
    const dotEmail = email.replace(/,/g, '.');
    const commaEmail = email.replace(/\./g, ',');
    const byDot = profiles.find((p: UserProfile) => p.email === dotEmail);
    const byComma = profiles.find((p: UserProfile) => p.email === commaEmail);
    if (!byDot && !byComma) return undefined;
    const merged: any = { email: dotEmail };
    for (const obj of [byDot, byComma]) {
      if (!obj) continue;
      for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined && v !== null && v !== '') merged[k] = v;
      }
    }
    return merged as UserProfile;
  };

  clubMembers.forEach((member: Membership) => {
    const key = member.userEmail;
    const profile = findProfile(member.userEmail);
    const displayName = profile
      ? [profile.goByFirstName, profile.lastName].filter(Boolean).join(' ') || member.userName
      : member.userName;
    const isComplete = !!(profile?.goByFirstName && profile?.lastName && profile?.studentId && profile?.personalEmailAddress && profile?.cellPhoneNumber && profile?.gradeLevel);
    studentStats[key] = {
      email: member.userEmail,
      studentName: displayName,
      gradeLevel: profile?.gradeLevel || 'N/A',
      userRole: member.role === 'admin' ? 1 : 0,
      personalEmail: profile?.personalEmailAddress || '',
      phone: profile?.cellPhoneNumber || profile?.phoneNumber || '',
      studentId: profile?.studentId || '',
      profileComplete: isComplete,
      totalHours: 0,
      approvedHours: 0,
      pendingHours: 0,
      rejectedHours: 0,
      submissionCount: 0,
      lastSubmission: member.joinedAt
    };
  });

  submissions.forEach((submission: HoursSubmission) => {
    const key = submission.userEmail;
    if (!studentStats[key]) {
      const profile = findProfile(submission.userEmail);
      const isComplete = !!(profile?.goByFirstName && profile?.lastName && profile?.studentId && profile?.personalEmailAddress && profile?.cellPhoneNumber && profile?.gradeLevel);
      studentStats[key] = {
        email: submission.userEmail,
        studentName: submission.userName,
        gradeLevel: profile?.gradeLevel || 'N/A',
        userRole: profile?.userRole || 0,
        personalEmail: profile?.personalEmailAddress || '',
        phone: profile?.cellPhoneNumber || profile?.phoneNumber || '',
        studentId: profile?.studentId || '',
        profileComplete: isComplete,
        totalHours: 0,
        approvedHours: 0,
        pendingHours: 0,
        rejectedHours: 0,
        submissionCount: 0,
        lastSubmission: submission.createdAt
      };
    }
    
    const hours = submission.hours;
    studentStats[key].totalHours += hours;
    studentStats[key].submissionCount++;
    
    if (submission.status === 'approved') {
      studentStats[key].approvedHours += hours;
    } else if (submission.status === 'pending') {
      studentStats[key].pendingHours += hours;
    } else if (submission.status === 'rejected') {
      studentStats[key].rejectedHours += hours;
    }
    
    const submissionDate = typeof submission.createdAt === 'string' ? new Date(submission.createdAt) : submission.createdAt;
    const lastSubmissionDate = typeof studentStats[key].lastSubmission === 'string' ? new Date(studentStats[key].lastSubmission) : studentStats[key].lastSubmission;
    if (submissionDate > lastSubmissionDate) {
      studentStats[key].lastSubmission = submission.createdAt;
    }
  });

  const studentLogHours: { [email: string]: { [logId: string]: number } } = {};
  submissions.forEach((submission: HoursSubmission) => {
    if (submission.status === 'approved' && (submission as any).logId) {
      const key = submission.userEmail;
      if (!studentLogHours[key]) studentLogHours[key] = {};
      const logId = (submission as any).logId;
      studentLogHours[key][logId] = (studentLogHours[key][logId] || 0) + submission.hours;
    }
  });

  const allStudents = Object.values(studentStats);

  // For custom field filtering, we need to fetch values for each student
  // For now, we'll fetch them as part of the filter process
  useQuery({
    queryKey: ['custom-field-values', allStudents.map(s => s.email).join(',')],
    enabled: filterableCustomFields.length > 0 && allStudents.length > 0,
    queryFn: async () => {
      const values: { [userId: string]: { [fieldId: string]: string } } = {};
      for (const student of allStudents) {
        const userId = student.email.replace(/\./g, ',');
        try {
          const response = await fetch(`/api/custom-field-values/${userId}/${club.id}`, { credentials: "include" });
          const fieldValues = await response.json();
          values[userId] = {};
          fieldValues.forEach((fv: any) => {
            values[userId][fv.customFieldId] = fv.value || '';
          });
        } catch {
          values[userId] = {};
        }
      }
      setCustomFieldValues(values);
      return values;
    }
  });

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

    // Check custom field filters
    const userId = student.email.replace(/\./g, ',');
    const userCustomFields = customFieldValues[userId] || {};
    const matchesCustomFields = Object.entries(filters.customFields).every(([fieldId, filterValue]) => {
      if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) return true;
      const userValueRaw = userCustomFields[fieldId] || '';
      let userValues: string[] = [];
      try {
        const parsed = JSON.parse(userValueRaw);
        if (Array.isArray(parsed)) userValues = parsed.map((v: any) => String(v));
        else userValues = [String(parsed)];
      } catch {
        userValues = [userValueRaw];
      }

      if (Array.isArray(filterValue)) {
        // match if user has ANY of the selected options
        return (filterValue as string[]).some(fv => userValues.includes(fv));
      } else {
        return userValues.some(uv => uv.toLowerCase().includes((filterValue as string).toLowerCase()));
      }
    });
    
    const matchesLogs = Object.entries(filters.logs).every(([logId, filterValues]) => {
      if (!filterValues || filterValues.length === 0) return true;
      const log = hoursLogs.find(l => l.id === logId);
      if (!log) return true;
      const logApprovedHours = studentLogHours[student.email]?.[logId] || 0;
      const met = logApprovedHours >= log.hoursRequired;
      return (filterValues.includes('met') && met) || (filterValues.includes('not-met') && !met);
    });

    return matchesSearch && matchesGrade && matchesRequirement && matchesSubmissionStatus && matchesRole && matchesCustomFields && matchesLogs;
  });

  const students = filteredStudents;

  const profileColumns = [
    { key: 'studentName', label: 'Name' },
    { key: 'email', label: 'School Email' },
    { key: 'personalEmail', label: 'Personal Email' },
    { key: 'studentId', label: 'Student ID' },
    { key: 'gradeLevel', label: 'Grade Level' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'userRole', label: 'Role' },
    { key: 'approvedHours', label: 'Approved Hours' },
    { key: 'pendingHours', label: 'Pending Hours' },
    { key: 'rejectedHours', label: 'Rejected Hours' },
    { key: 'totalHours', label: 'Total Hours' },
    { key: 'submissionCount', label: 'Submission Count' },
    { key: 'requirementStatus', label: 'Requirement Status' },
  ];

  const customFieldColumns = filterableCustomFields.map(f => ({
    key: `cf_${f.id}`,
    label: f.fieldName,
    fieldId: f.id,
  }));

  const logColumns = hoursLogs.map(log => ({
    key: `log_${log.id}`,
    label: `${log.name} (${log.hoursRequired}h)`,
    logId: log.id,
  }));

  const allCsvColumns = [...profileColumns, ...customFieldColumns, ...logColumns];

  const openCsvDialog = () => {
    const defaults: { [key: string]: boolean } = {};
    allCsvColumns.forEach(col => { defaults[col.key] = true; });
    setCsvColumns(defaults);
    setShowCsvDialog(true);
  };

  const downloadCsv = () => {
    const selectedCols = allCsvColumns.filter(col => csvColumns[col.key]);
    if (selectedCols.length === 0) return;

    const escCsv = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const header = selectedCols.map(c => escCsv(c.label)).join(',');
    const rows = students.map((s: any) => {
      return selectedCols.map(col => {
        if (col.key === 'userRole') return escCsv(s.userRole === 1 ? 'Admin' : 'Student');
        if (col.key === 'requirementStatus') return escCsv(s.approvedHours >= 15 ? 'Met' : 'Not Met');
        if (col.key.startsWith('log_')) {
          const logId = (col as any).logId;
          const log = hoursLogs.find(l => l.id === logId);
          if (!log) return '';
          const logApproved = studentLogHours[s.email]?.[logId] || 0;
          return escCsv(logApproved >= log.hoursRequired ? 'Met' : 'Not Met');
        }
        if (col.key.startsWith('cf_')) {
          const fieldId = (col as any).fieldId;
          const userId = s.email.replace(/\./g, ',');
          const val = customFieldValues[userId]?.[fieldId] || '';
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return escCsv(parsed.join('; '));
          } catch {}
          if (val === 'true') return 'Yes';
          if (val === 'false') return 'No';
          return escCsv(val);
        }
        const val = s[col.key];
        return escCsv(val != null ? String(val) : '');
      }).join(',');
    });

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `volunteers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowCsvDialog(false);
  };

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
  const activeFilterCount = Object.values(filters).reduce((count: number, filterArray: any) => {
    if (Array.isArray(filterArray)) {
      return count + filterArray.length;
    } else if (typeof filterArray === 'object') {
      return count + Object.values(filterArray).filter((v: any) => {
        if (Array.isArray(v)) return v.length > 0;
        return !!v;
      }).length;
    }
    return count;
  }, 0);

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
      userRoles: [],
      customFields: {},
      logs: {}
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
        <div className="w-56 border-r border-gray-200 flex-shrink-0 bg-gray-50 overflow-y-auto">
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

              {filterableCustomFields.length > 0 && (
                <>
                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Additional Parameters</h4>
                    <div className="space-y-4">
                      {filterableCustomFields.map(field => (
                        <div key={field.id}>
                          <label htmlFor={`filter-${field.id}`} className="text-sm font-medium text-gray-700 mb-1 block">
                            {field.fieldName}
                          </label>
                          {(field.fieldType === 'select' || field.fieldType === 'multiselect' || field.fieldType === 'checkbox') ? (
                            <div className="space-y-2">
                              {field.fieldType === 'checkbox' ? (
                                <>
                                  {['Yes', 'No'].map((option) => {
                                    const selected = Array.isArray(filters.customFields[field.id]) && (filters.customFields[field.id] as string[]).includes(option === 'Yes' ? 'true' : 'false');
                                    return (
                                      <div key={option} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`filter-${field.id}-${option}`}
                                          checked={selected}
                                          onCheckedChange={(checked) => {
                                            setFilters(prev => {
                                              const prevVal = prev.customFields[field.id];
                                              let nextArr: string[] = Array.isArray(prevVal) ? [...prevVal] : [];
                                              const val = option === 'Yes' ? 'true' : 'false';
                                              if (checked) {
                                                if (!nextArr.includes(val)) nextArr.push(val);
                                              } else {
                                                nextArr = nextArr.filter(v => v !== val);
                                              }
                                              return { ...prev, customFields: { ...prev.customFields, [field.id]: nextArr } };
                                            });
                                          }}
                                        />
                                        <label htmlFor={`filter-${field.id}-${option}`} className="text-sm text-gray-700">{option}</label>
                                      </div>
                                    );
                                  })}
                                </>
                              ) : (
                                <>
                                  {field.selectOptions && JSON.parse(field.selectOptions).map((option: string) => {
                                    const selected = Array.isArray(filters.customFields[field.id]) && (filters.customFields[field.id] as string[]).includes(option);
                                    return (
                                      <div key={option} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`filter-${field.id}-${option}`}
                                          checked={selected}
                                          onCheckedChange={(checked) => {
                                            setFilters(prev => {
                                              const prevVal = prev.customFields[field.id];
                                              let nextArr: string[] = Array.isArray(prevVal) ? [...prevVal] : [];
                                              if (checked) {
                                                if (!nextArr.includes(option)) nextArr.push(option);
                                              } else {
                                                nextArr = nextArr.filter(v => v !== option);
                                              }
                                              return { ...prev, customFields: { ...prev.customFields, [field.id]: nextArr } };
                                            });
                                          }}
                                        />
                                        <label htmlFor={`filter-${field.id}-${option}`} className="text-sm text-gray-700">{option}</label>
                                      </div>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          ) : (
                            <input
                              id={`filter-${field.id}`}
                              type={field.fieldType === 'number' ? 'number' : 'text'}
                              placeholder={`Filter by ${field.fieldName.toLowerCase()}`}
                              value={(filters.customFields[field.id] as string) || ''}
                              onChange={(e) => {
                                setFilters(prev => ({
                                  ...prev,
                                  customFields: {
                                    ...prev.customFields,
                                    [field.id]: e.target.value
                                  }
                                }));
                              }}
                              className="w-full text-sm bg-transparent border-0 border-b border-gray-300 focus:border-gray-900 focus:outline-none py-1 px-0 text-gray-900 placeholder-gray-400"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {hoursLogs.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Hour Logs</h4>
                    <div className="space-y-4">
                      {hoursLogs.map(log => (
                        <div key={log.id}>
                          <span className="text-sm font-medium text-gray-700 mb-1 block">{log.name} ({log.hoursRequired}h)</span>
                          <div className="space-y-2">
                            {['met', 'not-met'].map(val => {
                              const selected = (filters.logs[log.id] || []).includes(val);
                              return (
                                <div key={val} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`log-${log.id}-${val}`}
                                    checked={selected}
                                    onCheckedChange={(checked) => {
                                      setFilters(prev => {
                                        const prevArr = prev.logs[log.id] || [];
                                        let nextArr: string[];
                                        if (checked) {
                                          nextArr = [...prevArr, val];
                                        } else {
                                          nextArr = prevArr.filter(v => v !== val);
                                        }
                                        return { ...prev, logs: { ...prev.logs, [log.id]: nextArr } };
                                      });
                                    }}
                                  />
                                  <label htmlFor={`log-${log.id}-${val}`} className="text-sm text-gray-700">
                                    {val === 'met' ? 'Met' : 'Not Met'}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <Button
                onClick={openCsvDialog}
                variant="outline"
                className="w-full flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showCsvDialog} onOpenChange={setShowCsvDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Export to CSV</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            {students.length} volunteer{students.length !== 1 ? 's' : ''} will be exported. Select columns to include:
          </p>
          <div className="max-h-72 overflow-y-auto space-y-2 border border-gray-200 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase">Columns</span>
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => {
                  const allSelected = allCsvColumns.every(c => csvColumns[c.key]);
                  const next: { [key: string]: boolean } = {};
                  allCsvColumns.forEach(c => { next[c.key] = !allSelected; });
                  setCsvColumns(next);
                }}
              >
                {allCsvColumns.every(c => csvColumns[c.key]) ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            {allCsvColumns.map(col => (
              <div key={col.key} className="flex items-center space-x-2">
                <Checkbox
                  id={`csv-${col.key}`}
                  checked={!!csvColumns[col.key]}
                  onCheckedChange={(checked) => setCsvColumns(prev => ({ ...prev, [col.key]: !!checked }))}
                />
                <label htmlFor={`csv-${col.key}`} className="text-sm text-gray-700 cursor-pointer">
                  {col.label}
                </label>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={downloadCsv}
              disabled={!allCsvColumns.some(c => csvColumns[c.key])}
              className="flex-1 bg-black hover:bg-gray-800 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCsvDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={kickDialogOpen} onOpenChange={setKickDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to remove <strong>{memberToKick?.name || memberToKick?.email}</strong> from the club? Their hours history will remain, but they will lose access.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setKickDialogOpen(false); setMemberToKick(null); }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={kickMemberMutation.isPending}
              onClick={() => memberToKick && kickMemberMutation.mutate(memberToKick.membershipId)}
            >
              {kickMemberMutation.isPending ? "Removing..." : "Remove Member"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                <div className="flex items-center justify-center w-10 h-10 bg-black rounded-lg">
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
                  <div className="p-3 bg-gray-100 rounded-full">
                    <Users className="w-5 h-5 text-gray-900" />
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
                <div className="space-y-3">
                  {students.map((student: any, index: number) => {
                    const requirement = getRequirementStatus(student.approvedHours);
                    const lastActivity = student.lastSubmission 
                      ? `Last activity: ${formatDate(student.lastSubmission)}` 
                      : '';
                    return (
                      <div 
                        key={index} 
                        className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors cursor-pointer" 
                        onClick={() => setSelectedStudent(student)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="flex items-center justify-center w-10 h-10 bg-gray-900 rounded-full flex-shrink-0">
                              <span className="text-white text-sm font-medium">
                                {student.studentName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || student.email.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 truncate">{student.studentName}</h3>
                                {student.userRole === 1 && (
                                  <Badge className="bg-gray-200 text-gray-900 text-xs flex-shrink-0">Admin</Badge>
                                )}
                                {!student.profileComplete && (
                                  <a
                                    href="/volunteer/profile"
                                    className="text-sm text-gray-500 underline flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Complete Profile
                                  </a>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {student.email}
                                </span>
                                {student.personalEmail && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    Personal: {student.personalEmail}
                                  </span>
                                )}
                                {student.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {student.phone}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                                {student.studentId && (
                                  <span className="flex items-center gap-1">
                                    <Hash className="w-3 h-3" />
                                    ID: {student.studentId}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <GraduationCap className="w-3 h-3" />
                                  Grade {student.gradeLevel}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {lastActivity && (
                              <span className="text-xs text-gray-400">{lastActivity}</span>
                            )}
                            {(() => {
                              const membership = (clubMembers as Membership[]).find(m => m.userEmail === student.email);
                              if (!membership) return null;
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400 text-xs h-7 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMemberToKick({ email: student.email, name: student.studentName, membershipId: membership.id });
                                    setKickDialogOpen(true);
                                  }}
                                >
                                  Remove
                                </Button>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-100">
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Total Hours</div>
                            <div className="text-sm font-bold text-gray-900">{student.totalHours.toFixed(1)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Approved</div>
                            <div className="text-sm font-bold text-gray-900">{student.approvedHours.toFixed(1)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Pending</div>
                            <div className="text-sm font-bold text-gray-900">{student.pendingHours.toFixed(1)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Submissions</div>
                            <div className="text-sm font-bold text-gray-900">{student.submissionCount}</div>
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
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 bg-white [&>button:last-child]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedStudent?.studentName} - Profile</DialogTitle>
          </DialogHeader>
          <div className="p-8 pb-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-14 h-14 bg-gray-900 rounded-full">
                  <span className="text-white text-lg font-medium">
                    {selectedStudent?.studentName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '??'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">{selectedStudent?.studentName}</h2>
                    {selectedStudent?.userRole === 1 && (
                      <Badge className="bg-gray-200 text-gray-900 text-xs">Admin</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">Student Profile & Hours Review</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStudentQR(selectedStudent?.email)}
                  className="flex items-center gap-1"
                >
                  <QrCode className="w-4 h-4" />
                  QR Code
                </Button>
                <Button
                  size="sm"
                  className="bg-black hover:bg-gray-800 text-white flex items-center gap-1"
                  onClick={() => { setShowGrantDialog(true); setGrantDate(new Date().toISOString().split('T')[0]); }}
                >
                  <Award className="w-4 h-4" />
                  Grant Hours
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedStudent(null)} className="flex items-center gap-1">
                  <X className="w-4 h-4" />
                  Close Profile
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                      <Mail className="w-3 h-3" />
                      Google Account
                    </div>
                    <p className="text-sm font-medium text-gray-900">{selectedStudent?.email}</p>
                  </div>
                  {selectedStudent?.personalEmail && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                        <Mail className="w-3 h-3" />
                        Personal Email
                      </div>
                      <p className="text-sm font-medium text-gray-900">{selectedStudent.personalEmail}</p>
                    </div>
                  )}
                  {selectedStudent?.phone && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                        <Phone className="w-3 h-3" />
                        Phone Number
                      </div>
                      <p className="text-sm font-medium text-gray-900">{selectedStudent.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Academic Information</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                      <GraduationCap className="w-3 h-3" />
                      Grade Level
                    </div>
                    <p className="text-sm font-medium text-gray-900">Grade {selectedStudent?.gradeLevel}</p>
                  </div>
                  {selectedStudent?.studentId && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                        <Hash className="w-3 h-3" />
                        Student ID
                      </div>
                      <p className="text-sm font-medium text-gray-900">{selectedStudent.studentId}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Custom Fields</h4>
                <div className="space-y-3">
                  {(() => {
                    const userId = selectedStudent?.email?.replace(/\./g, ',') || '';
                    const vals = customFieldValues[userId] || {};
                    const fieldsWithValues = customFields.filter((f: CustomField) => vals[f.id]);
                    if (fieldsWithValues.length === 0) {
                      return <p className="text-sm text-gray-400 italic">No custom fields set</p>;
                    }
                    return fieldsWithValues.map((field: CustomField) => (
                      <div key={field.id}>
                        <div className="text-xs text-gray-500 mb-0.5">{field.fieldName}</div>
                        <p className="text-sm font-medium text-gray-900">
                          {field.fieldType === 'checkbox' ? (vals[field.id] === 'true' ? 'Yes' : 'No') : vals[field.id]}
                        </p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {hoursLogs.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Log Progress
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {hoursLogs.map((log: HoursLogType) => {
                    const logHours = studentLogHours[selectedStudent?.email]?.[log.id] || 0;
                    const pct = Math.min(100, (logHours / log.hoursRequired) * 100);
                    const met = logHours >= log.hoursRequired;
                    return (
                      <div key={log.id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{log.name}</span>
                          <Badge variant={met ? "default" : "outline"} className={met ? "bg-green-100 text-green-800 text-xs" : "text-xs"}>
                            {met ? 'Met' : 'Not Met'}
                          </Badge>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{logHours.toFixed(1)} <span className="text-sm font-normal text-gray-500">/ {log.hoursRequired}h</span></div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${met ? 'bg-green-600' : 'bg-gray-900'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {met ? 'Requirement met' : `${(log.hoursRequired - logHours).toFixed(1)} hours remaining`}
                        </div>
                        {(() => {
                          const studentEmail = selectedStudent?.email;
                          if (!studentEmail) return null;
                          const contrib = getSubClubContributionForStudentLog(studentEmail, String(log.id));
                          if (contrib <= 0) return null;
                          return (
                            <div className="flex items-start gap-1.5 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                              <GitMerge className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5" />
                              <span className="text-xs text-amber-800">
                                {contrib.toFixed(1)}h from Sub-Club contributions count toward this log
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="border border-gray-200 rounded-xl p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Total Hours</div>
                <div className="text-2xl font-bold text-gray-900">{selectedStudent?.totalHours?.toFixed(1)}</div>
              </div>
              <div className="border border-gray-200 rounded-xl p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Approved</div>
                <div className="text-2xl font-bold text-gray-900">{selectedStudent?.approvedHours?.toFixed(1)}</div>
              </div>
              <div className="border border-gray-200 rounded-xl p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Pending</div>
                <div className="text-2xl font-bold text-gray-900">{selectedStudent?.pendingHours?.toFixed(1)}</div>
              </div>
              <div className="border border-gray-200 rounded-xl p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Submissions</div>
                <div className="text-2xl font-bold text-gray-900">{selectedStudent?.submissionCount}</div>
              </div>
            </div>
          </div>

          <div className="px-8 pb-8">
            <h3 className="font-semibold text-gray-900 text-lg mb-4">Hours Submissions</h3>
            {studentSubmissionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : studentSubmissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No submissions found
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const grouped: { [key: string]: { logName: string; submissions: HoursSubmission[] } } = {};
                  const ungrouped: HoursSubmission[] = [];
                  studentSubmissions.forEach((s: HoursSubmission) => {
                    if (s.logId && s.logName) {
                      if (!grouped[s.logId]) grouped[s.logId] = { logName: s.logName, submissions: [] };
                      grouped[s.logId].submissions.push(s);
                    } else {
                      ungrouped.push(s);
                    }
                  });
                  const sections = [
                    ...Object.entries(grouped).map(([logId, data]) => ({ logId, logName: data.logName, items: data.submissions })),
                    ...(ungrouped.length > 0 ? [{ logId: '_none', logName: 'Uncategorized', items: ungrouped }] : [])
                  ];
                  return sections.map(section => (
                    <div key={section.logId}>
                      <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="w-4 h-4 text-gray-500" />
                        <h4 className="font-semibold text-gray-700">{section.logName}</h4>
                        <Badge variant="outline" className="text-xs">{section.items.length}</Badge>
                      </div>
                      <div className="space-y-3 ml-6">
                        {section.items.map((submission: HoursSubmission) => (
                          <div key={submission.id} className="border border-gray-200 rounded-xl p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={getStatusBadgeColor(submission.status)}>
                                    {getStatusIcon(submission.status)}
                                    <span className="ml-1 capitalize">{submission.status}</span>
                                  </Badge>
                                  <span className="text-sm text-gray-500">{formatDate(submission.date)}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-gray-900">{submission.activityName || 'Unnamed Activity'}</h4>
                                  {(submission as any).grantedByAdmin && (
                                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                                      <Award className="w-3 h-3 mr-1" /> Granted by Admin
                                    </Badge>
                                  )}
                                  {submission.eventName && (
                                    <Badge className="bg-purple-100 text-purple-700 text-xs">
                                      Event: {submission.eventName}
                                    </Badge>
                                  )}
                                  {(submission as any).__fedToSuperClubId === club.id && (
                                    <Badge className="bg-amber-100 text-amber-800 text-xs border border-amber-200">
                                      Submitted from sub-club: {(submission as any).__fedFromSubClubName || (submission as any).subClubName || 'sub-club'}
                                    </Badge>
                                  )}
                                </div>
                                {submission.description && (
                                  <p className="text-sm text-gray-500">{submission.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {editingSubmissionHours?.id === submission.id ? (
                                      <span className="flex items-center gap-1">
                                        <Input
                                          type="number"
                                          step="0.5"
                                          min="0"
                                          value={editingSubmissionHours.hours}
                                          onChange={e => setEditingSubmissionHours({ id: submission.id, hours: e.target.value })}
                                          className="w-20 h-6 text-xs"
                                          onClick={e => e.stopPropagation()}
                                        />
                                        <button
                                          className="text-green-600 hover:text-green-800"
                                          onClick={e => { e.stopPropagation(); editSubmissionHoursMutation.mutate({ id: submission.id, hours: parseFloat(editingSubmissionHours.hours) }); }}
                                        ><Check className="w-3 h-3" /></button>
                                        <button
                                          className="text-red-400 hover:text-red-600"
                                          onClick={e => { e.stopPropagation(); setEditingSubmissionHours(null); }}
                                        ><X className="w-3 h-3" /></button>
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 cursor-pointer hover:text-gray-900" onClick={e => { e.stopPropagation(); setEditingSubmissionHours({ id: submission.id, hours: String(submission.hours) }); }}>
                                        {submission.hours} hours <span className="text-gray-400 text-xs">(click to edit)</span>
                                      </span>
                                    )}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(submission.date)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {submission.status !== 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: submission.id, status: 'pending' }); }}
                                    className="text-gray-600 border-gray-300"
                                  >
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pending
                                  </Button>
                                )}
                                {submission.status !== 'approved' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: submission.id, status: 'approved' }); }}
                                    className="text-gray-900 border-gray-300"
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    Approve
                                  </Button>
                                )}
                                {submission.status !== 'rejected' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => { e.stopPropagation(); setRejectingSubmission(submission.id); }}
                                    className="text-gray-600 border-gray-300"
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Reject
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
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

      {/* Grant Hours Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Grant Hours to {selectedStudent?.studentName}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-1">
            This creates an auto-approved submission on behalf of this volunteer. It will appear in their hours with a "Granted by Admin" badge.
          </p>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Hours to Grant</Label>
              <Input
                type="number" step="0.5" min="0.5"
                value={grantHours}
                onChange={e => setGrantHours(e.target.value)}
                placeholder="e.g. 2.5"
              />
            </div>
            <div className="space-y-1">
              <Label>Activity / Description</Label>
              <Input
                value={grantDescription}
                onChange={e => setGrantDescription(e.target.value)}
                placeholder="e.g. Beach Cleanup, Admin correction..."
              />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={grantDate}
                onChange={e => setGrantDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Append to Log <span className="text-gray-400">(optional)</span></Label>
              <Select value={grantLogId} onValueChange={setGrantLogId}>
                <SelectTrigger>
                  <SelectValue placeholder="No log" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No log</SelectItem>
                  {(hoursLogs as any[]).map(l => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowGrantDialog(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-black hover:bg-gray-800 text-white"
                onClick={() => grantHoursMutation.mutate()}
                disabled={!grantHours || parseFloat(grantHours) <= 0 || grantHoursMutation.isPending}
              >
                {grantHoursMutation.isPending ? 'Granting...' : `Grant ${grantHours || '0'} Hours`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student QR Code Dialog */}
      <Dialog open={!!showStudentQR} onOpenChange={() => setShowStudentQR(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Volunteer QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-2">
            <p className="text-sm text-gray-500">
              This QR code encodes the volunteer's email. Use it with a Scan QR event — the volunteer shows this on their phone and you scan it to check them in or out.
            </p>
            <div className="flex justify-center">
              <div className="p-4 bg-white border-2 border-gray-200 rounded-xl inline-block">
                {showStudentQR && <QRCode value={showStudentQR} size={180} />}
              </div>
            </div>
            <p className="text-xs text-gray-400 font-mono">{showStudentQR}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
