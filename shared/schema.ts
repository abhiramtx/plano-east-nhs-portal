import { z } from "zod";

// User Schemas & Types
export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

export interface User extends InsertUser {
  id: string;
}

// Club Schemas & Types
export const insertClubSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().min(1),
  isPrivate: z.boolean().default(false),
  password: z.string().optional(),
  creatorEmail: z.string().min(1),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

export type InsertClub = z.infer<typeof insertClubSchema>;

export interface Club extends InsertClub {
  id: string;
  totalApprovedHours: string;
  bonusHours: string;
  decayedHours: string;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Club Membership Schemas & Types
export const insertClubMembershipSchema = z.object({
  clubId: z.string().min(1),
  userEmail: z.string().min(1),
  role: z.string().default("member"),
});

export type InsertClubMembership = z.infer<typeof insertClubMembershipSchema>;

export interface ClubMembership extends InsertClubMembership {
  id: string;
  totalApprovedHours: string;
  joinedAt: Date;
  updatedAt: Date;
}

// Hours Submission Schemas & Types
export const insertHoursSubmissionSchema = z.object({
  userId: z.string().min(1),
  clubId: z.string().optional(),
  activityName: z.string().optional(),
  studentName: z.string().min(1),
  studentId: z.string().optional(),
  description: z.string().min(1),
  date: z.any(),
  hours: z.string().min(1),
  proofImageUrl: z.string().optional(),
  status: z.string().default("pending"),
  rejectReason: z.string().optional(),
  serviceRequestId: z.string().optional(),
  isHighNeedArea: z.boolean().default(false),
  bonusHoursAwarded: z.string().optional(),
  locationLat: z.string().optional(),
  locationLng: z.string().optional(),
});

export type InsertHoursSubmission = z.infer<typeof insertHoursSubmissionSchema>;

export interface HoursSubmission extends InsertHoursSubmission {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User Profile Schemas & Types
export const insertUserProfileSchema = z.object({
  userId: z.string().min(1),
  goByFirstName: z.string().optional(),
  lastName: z.string().optional(),
  studentId: z.string().optional(),
  personalEmailAddress: z.string().optional(),
  cellPhoneNumber: z.string().optional(),
  gradeLevel: z.string().optional(),
  gpa: z.string().optional(),
  artTeacherName: z.string().optional(),
  artTeacherEmail: z.string().optional(),
  phoneNumber: z.string().optional(),
  isProfileComplete: z.boolean().default(false),
  userRole: z.number().default(0),
  currentClubId: z.string().optional(),
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export interface UserProfile extends InsertUserProfile {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Service Request Schemas & Types
export const insertServiceRequestSchema = z.object({
  requesterEmail: z.string().min(1),
  requesterName: z.string().min(1),
  requesterPhone: z.string().optional(),
  requesterOrganization: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  hoursOffered: z.string().min(1),
  locationName: z.string().min(1),
  locationLat: z.string().min(1),
  locationLng: z.string().min(1),
  category: z.string().optional(),
  startDate: z.any().optional(),
  endDate: z.any().optional(),
  maxParticipants: z.number().optional(),
  isHighNeedArea: z.boolean().default(false),
});

export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;

export interface ServiceRequest extends InsertServiceRequest {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// Service Participant Schemas & Types
export const insertServiceParticipantSchema = z.object({
  serviceRequestId: z.string().min(1),
  userEmail: z.string().min(1),
  userName: z.string().min(1),
  clubId: z.string().optional(),
});

export type InsertServiceParticipant = z.infer<typeof insertServiceParticipantSchema>;

export interface ServiceParticipant extends InsertServiceParticipant {
  id: string;
  status: string;
  hoursAwarded?: string;
  hoursApproved: boolean;
  joinedAt: Date;
  completedAt?: Date;
  updatedAt: Date;
}

// High Need Area Schemas & Types
export const insertHighNeedAreaSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  locationLat: z.string().min(1),
  locationLng: z.string().min(1),
  radius: z.string().optional(),
  priority: z.number().optional(),
  bonusMultiplier: z.string().optional(),
  dataSource: z.string().optional(),
});

export type InsertHighNeedArea = z.infer<typeof insertHighNeedAreaSchema>;

export interface HighNeedArea extends InsertHighNeedArea {
  id: string;
  lastUpdated: Date;
  createdAt: Date;
}

// App Setting Schemas & Types
export const insertAppSettingSchema = z.object({
  settingKey: z.string().min(1),
  settingValue: z.string().min(1),
  settingType: z.string().default("string"),
  description: z.string().optional(),
});

export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;

export interface AppSetting extends InsertAppSetting {
  id: string;
  updatedAt: Date;
}

// Yearly History Schemas & Types
export const insertYearlyHistorySchema = z.object({
  userId: z.string().min(1),
  schoolYear: z.string().min(1),
  totalHours: z.string().min(1),
  approvedHours: z.string().min(1),
  submissionCount: z.number(),
  requirementMet: z.boolean(),
  submissions: z.string().min(1),
  monthlyData: z.string().min(1),
});

export type InsertYearlyHistory = z.infer<typeof insertYearlyHistorySchema>;

export interface YearlyHistory extends InsertYearlyHistory {
  id: string;
  archivedAt: Date;
}

// Project Schemas & Types
export const insertProjectSchema = z.object({
  userId: z.string().min(1),
  projectName: z.string().min(1),
  role: z.string().min(1),
  completionDate: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

export type InsertProject = z.infer<typeof insertProjectSchema>;

export interface Project extends InsertProject {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Other Types
export interface TerritoryDecayLog {
  id: string;
  clubId: string;
  hoursDecayed: string;
  decayedAt: Date;
}

export interface LeaderboardCache {
  id: string;
  cacheType: string;
  period: string;
  data: string;
  clubId?: string;
  calculatedAt: Date;
}

// Territory Circles Schemas & Types
export const insertTerritoryCircleSchema = z.object({
  clubId: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  radiusKm: z.number(),
  hoursContributed: z.number().default(0),
  peopleCount: z.number().default(0),
  locationName: z.string().optional(),
  isMainClubLocation: z.boolean().default(false),
  lastActivityAt: z.any().optional(),
});

export type InsertTerritoryCircle = z.infer<typeof insertTerritoryCircleSchema>;

export interface TerritoryCircle extends InsertTerritoryCircle {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Custom Field Schemas & Types
export const insertCustomFieldSchema = z.object({
  clubId: z.string().min(1),
  fieldName: z.string().min(1),
  description: z.string().optional(),
  fieldType: z.enum(["text", "checkbox", "select", "number", "email", "phone", "multiselect"]),
  required: z.boolean().default(false),
  filterable: z.boolean().default(false),
  selectOptions: z.string().optional(),
  defaultValue: z.string().optional(),
  order: z.number().default(0),
});

export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;

export interface CustomField extends InsertCustomField {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Custom Field Value Schemas & Types (stores values for each user)
export const insertCustomFieldValueSchema = z.object({
  userId: z.string().min(1),
  customFieldId: z.string().min(1),
  clubId: z.string().min(1),
  value: z.string().optional(),
});

export type InsertCustomFieldValue = z.infer<typeof insertCustomFieldValueSchema>;

export interface CustomFieldValue extends InsertCustomFieldValue {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Hours Log Schemas & Types
export const insertHoursLogSchema = z.object({
  clubId: z.string().min(1),
  name: z.string().min(1),
  hoursRequired: z.number().min(0).default(15),
  isOpen: z.boolean().default(true),
  isSystem: z.boolean().default(false),
});

export type InsertHoursLog = z.infer<typeof insertHoursLogSchema>;

export interface HoursLog extends InsertHoursLog {
  id: string;
  isSystem?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
