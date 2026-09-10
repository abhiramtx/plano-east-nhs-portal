import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Club,
  HoursSubmission,
  UserProfile,
  getProfileDisplayName,
  getSubClubHoursRules,
  getSuperClubFedSubmissions,
  getUserProfile,
  getUserSubmissionsAllClubs,
  setSuperClubApprovalStatus,
  updateSubmission,
} from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import QRCode from "react-qr-code";
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Eye,
  GitMerge,
  GraduationCap,
  Hash,
  Mail,
  Phone,
  QrCode,
  X,
  XCircle,
} from "lucide-react";
import { ProofMetadata } from "@/components/proof-metadata";

interface CustomField {
  id: string;
  fieldName: string;
  fieldType: string;
}

interface HoursLog {
  id: string;
  name: string;
  hoursRequired: number;
}

export interface AdminStudentProfile {
  email: string;
  studentName?: string;
  userRole?: number;
  personalEmail?: string;
  phone?: string;
  gradeLevel?: string;
  studentId?: string;
  totalHours?: number;
  approvedHours?: number;
  pendingHours?: number;
  submissionCount?: number;
}

interface AdminStudentProfileDialogProps {
  student: AdminStudentProfile | null;
  club: Club;
  adminEmail?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGrantHours?: () => void;
}

const normalizeEmail = (email: string) => email.replace(/,/g, ".").trim().toLowerCase();

const formatDate = (value: Date | string | undefined) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getStatusBadgeColor = (status: string) => {
  if (status === "approved") return "bg-chart-3/15 text-chart-3 border-chart-3/30";
  if (status === "rejected") return "bg-destructive/15 text-destructive border-destructive/30";
  return "bg-chart-1/15 text-chart-1 border-chart-1/30";
};

const statusIcon = (status: string) => {
  if (status === "approved") return <Check className="w-3 h-3" />;
  if (status === "rejected") return <XCircle className="w-3 h-3" />;
  return <Clock className="w-3 h-3" />;
};

export function AdminStudentProfileDialog({
  student,
  club,
  adminEmail = "",
  open,
  onOpenChange,
  onGrantHours,
}: AdminStudentProfileDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showQr, setShowQr] = useState(false);
  const [editingHours, setEditingHours] = useState<{ id: string; hours: string } | null>(null);
  const [rejectingSubmission, setRejectingSubmission] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const email = student?.email || "";
  const normalizedEmail = normalizeEmail(email);

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile | null>({
    queryKey: ["admin-student-profile", normalizedEmail],
    queryFn: () => getUserProfile(email),
    enabled: open && !!email,
    staleTime: 60000,
  });

  const { data: directSubmissions = [], isLoading: submissionsLoading } = useQuery<HoursSubmission[]>({
    queryKey: ["admin-student-profile-submissions", normalizedEmail],
    queryFn: () => getUserSubmissionsAllClubs(email),
    enabled: open && !!email,
  });

  const { data: federatedSubmissions = [] } = useQuery<HoursSubmission[]>({
    queryKey: ["admin-student-profile-federated-submissions", club.id],
    queryFn: () => getSuperClubFedSubmissions(club.id),
    enabled: open && !!email,
  });

  const { data: hoursLogs = [] } = useQuery<HoursLog[]>({
    queryKey: ["admin-student-profile-hours-logs", club.id],
    queryFn: async () => {
      const response = await fetch(`/api/hours-logs/${club.id}`, { credentials: "include" });
      if (!response.ok) return [];
      return response.json() as Promise<HoursLog[]>;
    },
    enabled: open,
    staleTime: 60000,
  });

  const { data: customFields = [] } = useQuery<CustomField[]>({
    queryKey: ["admin-student-profile-custom-fields", club.id],
    queryFn: async () => {
      const response = await fetch(`/api/custom-fields/${club.id}`, { credentials: "include" });
      if (!response.ok) return [];
      return response.json() as Promise<CustomField[]>;
    },
    enabled: open,
    staleTime: 60000,
  });

  const { data: customFieldValues = {} } = useQuery<Record<string, string>>({
    queryKey: ["admin-student-profile-custom-field-values", normalizedEmail, club.id],
    queryFn: async () => {
      const response = await fetch(
        `/api/custom-field-values/${email.replace(/\./g, ",")}/${club.id}`,
        { credentials: "include" },
      );
      if (!response.ok) return {};
      return response.json() as Promise<Record<string, string>>;
    },
    enabled: open && !!email,
    staleTime: 60000,
  });

  const { data: subClubRules = [] } = useQuery({
    queryKey: ["admin-student-profile-sub-club-rules", club.id],
    queryFn: () => getSubClubHoursRules(club.id),
    enabled: open,
    staleTime: 60000,
  });

  const submissions = useMemo(() => {
    const direct = directSubmissions.filter(
      submission => submission.clubId === club.id || (submission as any).superClubId === club.id,
    );
    const fed = federatedSubmissions.filter(
      submission => normalizeEmail(submission.userEmail || "") === normalizedEmail,
    );
    const byId = new Map<string, HoursSubmission>();
    [...direct, ...fed].forEach(submission => byId.set(submission.id, submission));
    return [...byId.values()];
  }, [club.id, directSubmissions, federatedSubmissions, normalizedEmail]);

  const profileName = getProfileDisplayName(profile, student?.studentName || email);
  const personalEmail = profile?.personalEmailAddress || student?.personalEmail || "";
  const phone = profile?.cellPhoneNumber || profile?.phoneNumber || student?.phone || "";
  const gradeLevel = profile?.gradeLevel || student?.gradeLevel || "";
  const studentId = profile?.studentId || student?.studentId || "";
  const userRole = profile?.userRole ?? student?.userRole ?? 0;

  const stats = useMemo(() => ({
    totalHours: submissions.reduce((sum, submission) => sum + (submission.hours || 0), 0),
    approvedHours: submissions
      .filter(submission => submission.status === "approved")
      .reduce((sum, submission) => sum + (submission.hours || 0), 0),
    pendingHours: submissions
      .filter(submission => submission.status === "pending")
      .reduce((sum, submission) => sum + (submission.hours || 0), 0),
    submissionCount: submissions.length,
  }), [submissions]);

  const logHours = useMemo(() => {
    const totals: Record<string, number> = {};
    submissions.forEach(submission => {
      if (submission.status === "approved" && (submission as any).logId) {
        const logId = String((submission as any).logId);
        totals[logId] = (totals[logId] || 0) + (submission.hours || 0);
      }
    });
    return totals;
  }, [submissions]);

  const getSubClubContribution = (logId: string) => {
    const rules = (subClubRules as any[]).filter(rule => String(rule.targetLogId) === String(logId));
    if (rules.length === 0) return 0;
    return submissions
      .filter(submission => (submission as any).__fedToSuperClubId === club.id && submission.status === "approved")
      .reduce((total, submission) => {
        const date = submission.date;
        return total + (rules.some(rule => date >= rule.fromDate && date <= rule.toDate) ? submission.hours : 0);
      }, 0);
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const submission = submissions.find(item => item.id === id) as any;
      if (submission?.__fedToSuperClubId === club.id && !submission.__sharedApproval) {
        await setSuperClubApprovalStatus(id, club.id, status as any, submission.hours || 0, adminEmail, reason);
      } else {
        await updateSubmission(id, {
          status,
          rejectReason: reason || undefined,
          reviewedAt: new Date(),
          reviewedBy: adminEmail,
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-student-profile-submissions", normalizedEmail] });
      queryClient.invalidateQueries({ queryKey: ["admin-student-profile-federated-submissions", club.id] });
      setRejectingSubmission(null);
      setRejectReason("");
      toast({ title: "Submission updated" });
    },
    onError: () => toast({ title: "Failed to update submission", variant: "destructive" }),
  });

  const editHoursMutation = useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: number }) => updateSubmission(id, { hours }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-student-profile-submissions", normalizedEmail] });
      setEditingHours(null);
      toast({ title: "Hours updated" });
    },
    onError: () => toast({ title: "Failed to update hours", variant: "destructive" }),
  });

  const initials = profileName.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "??";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl w-[calc(100vw-1rem)] sm:w-[95vw] max-h-[92vh] overflow-y-auto p-0 bg-card [&>button:last-child]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{profileName} - Profile</DialogTitle>
            <DialogDescription>Student profile and hours review</DialogDescription>
          </DialogHeader>

          <div className="p-4 sm:p-8 pb-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-primary rounded-full flex-shrink-0">
                  <span className="text-primary-foreground text-base sm:text-lg font-medium">{initials}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground break-words">{profileName}</h2>
                    {userRole === 1 && <Badge className="border-primary/30 bg-primary/15 text-primary text-xs">Admin</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">Student Profile &amp; Hours Review</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowQr(true)}>
                  <QrCode className="w-4 h-4 mr-1" /> QR Code
                </Button>
                {onGrantHours && (
                  <Button type="button" size="sm" className="bg-primary hover:bg-primary/85 text-primary-foreground" onClick={onGrantHours}>
                    <Award className="w-4 h-4 mr-1" /> Grant Hours
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  <X className="w-4 h-4 mr-1" /> Close Profile
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <div className="border border-border rounded-xl p-4">
                <h4 className="font-semibold text-foreground mb-3">Contact Information</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5"><Mail className="w-3 h-3" /> Google Account</div>
                    <p className="text-sm font-medium text-foreground break-all">{email}</p>
                  </div>
                  {personalEmail && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5"><Mail className="w-3 h-3" /> Personal Email</div>
                      <p className="text-sm font-medium text-foreground break-all">{personalEmail}</p>
                    </div>
                  )}
                  {phone && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5"><Phone className="w-3 h-3" /> Phone Number</div>
                      <p className="text-sm font-medium text-foreground">{phone}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-border rounded-xl p-4">
                <h4 className="font-semibold text-foreground mb-3">Academic Information</h4>
                <div className="space-y-3">
                  {gradeLevel && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5"><GraduationCap className="w-3 h-3" /> Grade Level</div>
                      <p className="text-sm font-medium text-foreground">Grade {gradeLevel}</p>
                    </div>
                  )}
                  {studentId && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5"><Hash className="w-3 h-3" /> Student ID</div>
                      <p className="text-sm font-medium text-foreground">{studentId}</p>
                    </div>
                  )}
                  {!gradeLevel && !studentId && <p className="text-sm text-muted-foreground/80 italic">No academic details available</p>}
                </div>
              </div>

              <div className="border border-border rounded-xl p-4">
                <h4 className="font-semibold text-foreground mb-3">Custom Fields</h4>
                <div className="space-y-3">
                  {Object.entries(customFieldValues).length === 0 ? (
                    <p className="text-sm text-muted-foreground/80 italic">No custom fields set</p>
                  ) : (
                    customFields.filter(field => customFieldValues[field.id]).map(field => {
                      const value = customFieldValues[field.id];
                      let displayValue = value;
                      try {
                        const parsed = JSON.parse(value);
                        if (Array.isArray(parsed)) displayValue = parsed.join(", ");
                      } catch {}
                      if (value === "true") displayValue = "Yes";
                      if (value === "false") displayValue = "No";
                      return (
                        <div key={field.id}>
                          <div className="text-xs text-muted-foreground mb-0.5">{field.fieldName}</div>
                          <p className="text-sm font-medium text-foreground break-words">{displayValue}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {hoursLogs.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Log Progress</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {hoursLogs.map(log => {
                    const hours = logHours[String(log.id)] || 0;
                    const contributed = getSubClubContribution(String(log.id));
                    const percent = log.hoursRequired > 0 ? Math.min(100, (hours / log.hoursRequired) * 100) : 100;
                    const met = hours >= log.hoursRequired;
                    return (
                      <div key={log.id} className="border border-border rounded-xl p-4">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground truncate">{log.name}</span>
                          <Badge variant={met ? "default" : "outline"} className={met ? "border border-[var(--teal)]/35 bg-[var(--teal)]/15 text-[var(--teal)] text-xs" : "text-xs"}>{met ? "Met" : "Not Met"}</Badge>
                        </div>
                        <div className="text-2xl font-bold text-foreground">{hours.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ {log.hoursRequired}h</span></div>
                        <div className="w-full bg-secondary rounded-full h-2 mt-2"><div className={`h-2 rounded-full transition-all ${met ? "bg-[var(--teal)]" : "bg-foreground"}`} style={{ width: `${percent}%` }} /></div>
                        <div className="text-xs text-muted-foreground mt-1">{met ? "Requirement met" : `${Math.max(0, log.hoursRequired - hours).toFixed(1)} hours remaining`}</div>
                        {contributed > 0 && (
                          <div className="flex items-start gap-1.5 mt-2 bg-chart-1/10 border border-chart-1/30 rounded-lg px-2 py-1.5">
                            <GitMerge className="w-3 h-3 text-chart-1 flex-shrink-0 mt-0.5" />
                            <span className="text-xs text-chart-1">{contributed.toFixed(1)}h from Sub-Club contributions count toward this log</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {[
                ["Total Hours", stats.totalHours],
                ["Approved", stats.approvedHours],
                ["Pending", stats.pendingHours],
                ["Submissions", stats.submissionCount],
              ].map(([label, value]) => (
                <div key={String(label)} className="border border-border rounded-xl p-3 sm:p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1">{label}</div>
                  <div className="text-2xl font-bold text-foreground">{typeof value === "number" && label !== "Submissions" ? value.toFixed(1) : value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 sm:px-8 pb-8">
            <h3 className="font-semibold text-foreground text-lg mb-4">Hours Submissions</h3>
            {profileLoading || submissionsLoading ? (
              <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No submissions found</div>
            ) : (
              <div className="space-y-6">
                {Object.entries(
                  submissions.reduce((groups, submission) => {
                    const isFederated = (submission as any).superClubId === club.id;
                    const key = isFederated ? ((submission as any).superClubLogId || submission.logId || "_none") : (submission.logId || "_none");
                    const name = isFederated ? ((submission as any).superClubLogName || submission.logName || "Uncategorized") : (submission.logName || "Uncategorized");
                    if (!groups[key]) groups[key] = { name, items: [] };
                    groups[key].items.push(submission);
                    return groups;
                  }, {} as Record<string, { name: string; items: HoursSubmission[] }>)
                ).map(([key, group]) => (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-3"><BookOpen className="w-4 h-4 text-muted-foreground" /><h4 className="font-semibold text-foreground">{group.name}</h4><Badge variant="outline" className="text-xs">{group.items.length}</Badge></div>
                    <div className="space-y-3 sm:ml-6">
                      {group.items.map(submission => (
                        <div key={submission.id} className="border border-border rounded-xl p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge className={getStatusBadgeColor(submission.status)}>{statusIcon(submission.status)}<span className="ml-1 capitalize">{submission.status}</span></Badge>
                                <span className="text-sm text-muted-foreground">{formatDate(submission.date)}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-foreground">{submission.activityName || "Unnamed Activity"}</h4>
                                {(submission as any).grantedByAdmin && <Badge className="bg-chart-3/15 text-chart-3 border-chart-3/30 text-xs"><Award className="w-3 h-3 mr-1" /> Granted by Admin</Badge>}
                                {submission.eventName && <Badge className="border-destructive/30 bg-destructive/15 text-destructive text-xs">Event: {submission.eventName}</Badge>}
                                {(submission as any).__fedToSuperClubId === club.id && <Badge className="border border-primary/35 bg-primary/15 text-primary text-xs">Submitted from sub-club: {(submission as any).__fedFromSubClubName || "sub-club"}</Badge>}
                              </div>
                              {submission.description && <p className="text-sm text-muted-foreground">{submission.description}</p>}
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />
                                  {editingHours?.id === submission.id ? (
                                    <span className="flex items-center gap-1">
                                      <Input type="number" step="0.5" min="0" value={editingHours.hours} onChange={event => setEditingHours({ id: submission.id, hours: event.target.value })} className="w-20 h-6 text-xs" />
                                      <button type="button" className="text-chart-3 hover:text-chart-3/80" onClick={() => editHoursMutation.mutate({ id: submission.id, hours: parseFloat(editingHours.hours) })}><Check className="w-3 h-3" /></button>
                                      <button type="button" className="text-destructive/80 hover:text-destructive" onClick={() => setEditingHours(null)}><X className="w-3 h-3" /></button>
                                    </span>
                                  ) : (
                                    <button type="button" className="hover:text-foreground" onClick={() => setEditingHours({ id: submission.id, hours: String(submission.hours) })}>{submission.hours} hours <span className="text-muted-foreground/80 text-xs">(click to edit)</span></button>
                                  )}
                                </span>
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(submission.date)}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                              {submission.status !== "pending" && <Button type="button" size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: submission.id, status: "pending" })}><Clock className="w-3 h-3 mr-1" /> Pending</Button>}
                              {submission.status !== "approved" && <Button type="button" size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: submission.id, status: "approved" })}><Check className="w-3 h-3 mr-1" /> Approve</Button>}
                              {submission.status !== "rejected" && <Button type="button" size="sm" variant="outline" onClick={() => setRejectingSubmission(submission.id)}><XCircle className="w-3 h-3 mr-1" /> Reject</Button>}
                            </div>
                          </div>
                          {submission.proofImageUrl && (
                            <div className="mt-4 border-t border-border pt-4">
                              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground"><Eye className="h-4 w-4" /> Photo proof verification</div>
                              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[180px_1fr]">
                                <img src={submission.proofImageUrl} alt="Proof of service" className="h-32 w-full rounded-lg border border-border object-cover" />
                                <ProofMetadata metadata={submission.proofImageMetadata} serviceDate={submission.date} compact />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Volunteer QR Code</DialogTitle>
            <DialogDescription>Use this code to identify {profileName} at a scan QR event.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="rounded-xl bg-white p-4"><QRCode value={email} size={190} /></div>
            <p className="text-xs text-muted-foreground font-mono break-all text-center">{email}</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectingSubmission} onOpenChange={isOpen => !isOpen && setRejectingSubmission(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>Enter a reason for rejecting this submission.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={rejectReason} onChange={event => setRejectReason(event.target.value)} placeholder="Enter reason for rejection..." />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRejectingSubmission(null)}>Cancel</Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!rejectReason.trim() || updateStatusMutation.isPending}
                onClick={() => rejectingSubmission && updateStatusMutation.mutate({ id: rejectingSubmission, status: "rejected", reason: rejectReason.trim() })}
              >
                {updateStatusMutation.isPending ? "Rejecting..." : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}