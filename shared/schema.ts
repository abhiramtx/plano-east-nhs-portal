import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const hoursSubmissions = pgTable("hours_submissions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  studentName: text("student_name").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  hours: decimal("hours", { precision: 4, scale: 2 }).notNull(),
  proofImageUrl: text("proof_image_url"),
  status: text("status").default("pending").notNull(), // pending, approved, rejected
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertHoursSubmission = z.infer<typeof insertHoursSubmissionSchema>;
export type HoursSubmission = typeof hoursSubmissions.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
