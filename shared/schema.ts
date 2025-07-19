import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const adminAssignments = pgTable("admin_assignments", {
  id: serial("id").primaryKey(),
  adminEmail: text("admin_email").notNull(),
  assignedUserId: text("assigned_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const hoursSubmissions = pgTable("hours_submissions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  activityName: text("activity_name"), // Changed from studentName to activityName
  studentName: text("student_name").notNull(), // Auto-populated from profile
  studentId: text("student_id"),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  hours: decimal("hours", { precision: 4, scale: 2 }).notNull(),
  proofImageUrl: text("proof_image_url"),
  status: text("status").default("pending").notNull(), // pending, approved, rejected
  rejectReason: text("reject_reason"), // Reason for rejection
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
  userRole: integer("user_role").notNull().default(0), // 0 = student, 1 = admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const yearlyHistory = pgTable("yearly_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  schoolYear: text("school_year").notNull(), // e.g., "2024-2025"
  totalHours: decimal("total_hours", { precision: 6, scale: 2 }).notNull().default("0"),
  approvedHours: decimal("approved_hours", { precision: 6, scale: 2 }).notNull().default("0"),
  submissionCount: integer("submission_count").notNull().default(0),
  requirementMet: boolean("requirement_met").notNull().default(false),
  submissions: text("submissions").notNull(), // JSON string of all submissions
  monthlyData: text("monthly_data").notNull(), // JSON string of monthly breakdown
  archivedAt: timestamp("archived_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
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

export const insertYearlyHistorySchema = createInsertSchema(yearlyHistory).omit({
  id: true,
  archivedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertHoursSubmission = z.infer<typeof insertHoursSubmissionSchema>;
export type HoursSubmission = typeof hoursSubmissions.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertYearlyHistory = z.infer<typeof insertYearlyHistorySchema>;
export type YearlyHistory = typeof yearlyHistory.$inferSelect;
