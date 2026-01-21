import { pgTable, text, serial, integer, boolean, timestamp, decimal, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  color: text("color").notNull(),
  isPrivate: boolean("is_private").default(false).notNull(),
  password: text("password"),
  creatorEmail: text("creator_email").notNull(),
  totalApprovedHours: decimal("total_approved_hours", { precision: 10, scale: 2 }).default("0").notNull(),
  bonusHours: decimal("bonus_hours", { precision: 10, scale: 2 }).default("0").notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  decayedHours: decimal("decayed_hours", { precision: 10, scale: 2 }).default("0").notNull(),
  territoryX: decimal("territory_x", { precision: 10, scale: 4 }).default("0").notNull(),
  territoryY: decimal("territory_y", { precision: 10, scale: 4 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clubMemberships = pgTable("club_memberships", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull(),
  userEmail: text("user_email").notNull(),
  role: text("role").default("member").notNull(),
  totalApprovedHours: decimal("total_approved_hours", { precision: 10, scale: 2 }).default("0").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const hoursSubmissions = pgTable("hours_submissions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  clubId: integer("club_id"),
  activityName: text("activity_name"),
  studentName: text("student_name").notNull(),
  studentId: text("student_id"),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  hours: decimal("hours", { precision: 4, scale: 2 }).notNull(),
  proofImageUrl: text("proof_image_url"),
  status: text("status").default("pending").notNull(),
  rejectReason: text("reject_reason"),
  serviceRequestId: integer("service_request_id"),
  isHighNeedArea: boolean("is_high_need_area").default(false),
  bonusHoursAwarded: decimal("bonus_hours_awarded", { precision: 4, scale: 2 }).default("0"),
  locationLat: decimal("location_lat", { precision: 10, scale: 6 }),
  locationLng: decimal("location_lng", { precision: 10, scale: 6 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  goByFirstName: text("go_by_first_name"),
  lastName: text("last_name"),
  studentId: text("student_id"),
  personalEmailAddress: text("personal_email_address"),
  cellPhoneNumber: text("cell_phone_number"),
  gradeLevel: text("grade_level"),
  gpa: text("gpa"),
  artTeacherName: text("art_teacher_name"),
  artTeacherEmail: text("art_teacher_email"),
  phoneNumber: text("phone_number"),
  isProfileComplete: boolean("is_profile_complete").default(false),
  userRole: integer("user_role").notNull().default(0),
  currentClubId: integer("current_club_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const serviceRequests = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  requesterEmail: text("requester_email").notNull(),
  requesterName: text("requester_name").notNull(),
  requesterPhone: text("requester_phone"),
  requesterOrganization: text("requester_organization"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  hoursOffered: decimal("hours_offered", { precision: 4, scale: 2 }).notNull(),
  locationName: text("location_name").notNull(),
  locationLat: decimal("location_lat", { precision: 10, scale: 6 }).notNull(),
  locationLng: decimal("location_lng", { precision: 10, scale: 6 }).notNull(),
  category: text("category"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  maxParticipants: integer("max_participants"),
  status: text("status").default("open").notNull(),
  isHighNeedArea: boolean("is_high_need_area").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const serviceParticipants = pgTable("service_participants", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  userEmail: text("user_email").notNull(),
  userName: text("user_name").notNull(),
  clubId: integer("club_id"),
  status: text("status").default("joined").notNull(),
  hoursAwarded: decimal("hours_awarded", { precision: 4, scale: 2 }),
  hoursApproved: boolean("hours_approved").default(false),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const highNeedAreas = pgTable("high_need_areas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  locationLat: decimal("location_lat", { precision: 10, scale: 6 }).notNull(),
  locationLng: decimal("location_lng", { precision: 10, scale: 6 }).notNull(),
  radius: decimal("radius", { precision: 10, scale: 2 }).default("500"),
  priority: integer("priority").default(1),
  bonusMultiplier: decimal("bonus_multiplier", { precision: 3, scale: 2 }).default("1.5"),
  dataSource: text("data_source"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  settingType: text("setting_type").default("string").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const territoryDecayLog = pgTable("territory_decay_log", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull(),
  hoursDecayed: decimal("hours_decayed", { precision: 4, scale: 2 }).notNull(),
  decayedAt: timestamp("decayed_at").defaultNow().notNull(),
});

export const leaderboardCache = pgTable("leaderboard_cache", {
  id: serial("id").primaryKey(),
  cacheType: text("cache_type").notNull(),
  period: text("period").notNull(),
  data: text("data").notNull(),
  clubId: integer("club_id"),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

export const adminAssignments = pgTable("admin_assignments", {
  id: serial("id").primaryKey(),
  adminEmail: text("admin_email").notNull(),
  assignedUserId: text("assigned_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const yearlyHistory = pgTable("yearly_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  schoolYear: text("school_year").notNull(),
  totalHours: decimal("total_hours", { precision: 6, scale: 2 }).notNull().default("0"),
  approvedHours: decimal("approved_hours", { precision: 6, scale: 2 }).notNull().default("0"),
  submissionCount: integer("submission_count").notNull().default(0),
  requirementMet: boolean("requirement_met").notNull().default(false),
  submissions: text("submissions").notNull(),
  monthlyData: text("monthly_data").notNull(),
  archivedAt: timestamp("archived_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  projectName: text("project_name").notNull(),
  role: text("role").notNull(),
  completionDate: text("completion_date").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertClubSchema = createInsertSchema(clubs).omit({
  id: true,
  totalApprovedHours: true,
  bonusHours: true,
  decayedHours: true,
  lastActivityAt: true,
  territoryX: true,
  territoryY: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClubMembershipSchema = createInsertSchema(clubMemberships).omit({
  id: true,
  totalApprovedHours: true,
  joinedAt: true,
  updatedAt: true,
});

export const insertHoursSubmissionSchema = createInsertSchema(hoursSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceParticipantSchema = createInsertSchema(serviceParticipants).omit({
  id: true,
  status: true,
  hoursAwarded: true,
  hoursApproved: true,
  joinedAt: true,
  completedAt: true,
  updatedAt: true,
});

export const insertHighNeedAreaSchema = createInsertSchema(highNeedAreas).omit({
  id: true,
  lastUpdated: true,
  createdAt: true,
});

export const insertAppSettingSchema = createInsertSchema(appSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertYearlyHistorySchema = createInsertSchema(yearlyHistory).omit({
  id: true,
  archivedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClub = z.infer<typeof insertClubSchema>;
export type Club = typeof clubs.$inferSelect;

export type InsertClubMembership = z.infer<typeof insertClubMembershipSchema>;
export type ClubMembership = typeof clubMemberships.$inferSelect;

export type InsertHoursSubmission = z.infer<typeof insertHoursSubmissionSchema>;
export type HoursSubmission = typeof hoursSubmissions.$inferSelect;

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;

export type InsertServiceParticipant = z.infer<typeof insertServiceParticipantSchema>;
export type ServiceParticipant = typeof serviceParticipants.$inferSelect;

export type InsertHighNeedArea = z.infer<typeof insertHighNeedAreaSchema>;
export type HighNeedArea = typeof highNeedAreas.$inferSelect;

export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;
export type AppSetting = typeof appSettings.$inferSelect;

export type InsertYearlyHistory = z.infer<typeof insertYearlyHistorySchema>;
export type YearlyHistory = typeof yearlyHistory.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type TerritoryDecayLog = typeof territoryDecayLog.$inferSelect;
export type LeaderboardCache = typeof leaderboardCache.$inferSelect;
