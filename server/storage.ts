import { users, hoursSubmissions, userProfiles, type User, type InsertUser, type HoursSubmission, type InsertHoursSubmission, type UserProfile, type InsertUserProfile } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Hours submissions
  getHoursSubmissions(userId: string): Promise<HoursSubmission[]>;
  createHoursSubmission(submission: InsertHoursSubmission): Promise<HoursSubmission>;
  updateHoursSubmission(id: number, updates: Partial<HoursSubmission>): Promise<HoursSubmission | undefined>;
  deleteHoursSubmission(id: number): Promise<boolean>;
  getAllHoursSubmissions(): Promise<HoursSubmission[]>;
  
  // User profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  
  // Admin management
  getAdminProfiles(): Promise<UserProfile[]>;
  promoteToAdmin(emailKey: string): Promise<UserProfile>;
  removeAdmin(emailKey: string): Promise<void>;
  getAdminAssignment(adminEmail: string): Promise<UserProfile | null>;
  releaseAssignment(adminEmail: string, currentStudentId?: string): Promise<UserProfile | null>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getHoursSubmissions(userId: string): Promise<HoursSubmission[]> {
    return await db
      .select()
      .from(hoursSubmissions)
      .where(eq(hoursSubmissions.userId, userId))
      .orderBy(hoursSubmissions.createdAt);
  }

  async createHoursSubmission(insertSubmission: InsertHoursSubmission): Promise<HoursSubmission> {
    const [submission] = await db
      .insert(hoursSubmissions)
      .values(insertSubmission)
      .returning();
    return submission;
  }

  async updateHoursSubmission(id: number, updates: Partial<HoursSubmission>): Promise<HoursSubmission | undefined> {
    const [submission] = await db
      .update(hoursSubmissions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(hoursSubmissions.id, id))
      .returning();
    return submission || undefined;
  }

  async deleteHoursSubmission(id: number): Promise<boolean> {
    const result = await db
      .delete(hoursSubmissions)
      .where(eq(hoursSubmissions.id, id))
      .returning();
    return result.length > 0;
  }

  async getAllHoursSubmissions(): Promise<HoursSubmission[]> {
    return await db
      .select()
      .from(hoursSubmissions)
      .orderBy(hoursSubmissions.createdAt);
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile || undefined;
  }

  async upsertUserProfile(insertProfile: InsertUserProfile): Promise<UserProfile> {
    // Try to find existing profile
    const existingProfile = await this.getUserProfile(insertProfile.userId);
    
    if (existingProfile) {
      // Update existing profile
      const [updatedProfile] = await db
        .update(userProfiles)
        .set({ ...insertProfile, updatedAt: new Date() })
        .where(eq(userProfiles.userId, insertProfile.userId))
        .returning();
      return updatedProfile;
    } else {
      // Create new profile
      const [newProfile] = await db
        .insert(userProfiles)
        .values(insertProfile)
        .returning();
      return newProfile;
    }
  }

  async getAdminProfiles(): Promise<UserProfile[]> {
    return await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userRole, 1))
      .orderBy(userProfiles.createdAt);
  }

  async promoteToAdmin(emailKey: string): Promise<UserProfile> {
    // First check if user profile exists
    const existingProfile = await this.getUserProfile(emailKey);

    if (existingProfile) {
      // Update existing profile to admin
      const [updatedProfile] = await db
        .update(userProfiles)
        .set({ userRole: 1, updatedAt: new Date() })
        .where(eq(userProfiles.userId, emailKey))
        .returning();
      return updatedProfile;
    } else {
      // Create new profile with admin role
      const [newProfile] = await db
        .insert(userProfiles)
        .values({
          userId: emailKey,
          userRole: 1,
          goByFirstName: '',
          lastName: '',
          studentId: '',
          gradeLevel: '',
          gpa: '',
          artTeacherName: '',
          artTeacherEmail: '',
          phoneNumber: '',
          isProfileComplete: false
        })
        .returning();
      return newProfile;
    }
  }

  async removeAdmin(emailKey: string): Promise<void> {
    await db
      .update(userProfiles)
      .set({ userRole: 0, updatedAt: new Date() })
      .where(eq(userProfiles.userId, emailKey));
  }

  async getAdminAssignment(adminEmail: string): Promise<UserProfile | null> {
    try {
      // Get all users (students AND admins) with pending submissions
      const usersWithPending = await db
        .select({
          userId: hoursSubmissions.userId,
          count: sql<number>`count(*)`.as('count')
        })
        .from(hoursSubmissions)
        .where(eq(hoursSubmissions.status, 'pending'))
        .groupBy(hoursSubmissions.userId);
      
      if (usersWithPending.length === 0) {
        return null;
      }
      
      // Check if the admin has their own pending submissions
      const adminHasPending = usersWithPending.some(user => user.userId === adminEmail);
      
      let assignedUserId: string;
      
      if (adminHasPending) {
        // If admin has pending submissions, assign them their own submissions first
        assignedUserId = adminEmail;
      } else {
        // Otherwise, assign based on round-robin
        const adminIndex = adminEmail.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const assignedUserIndex = adminIndex % usersWithPending.length;
        assignedUserId = usersWithPending[assignedUserIndex].userId;
      }
      
      // Get the user profile (could be student or admin)
      const [userProfile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, assignedUserId));
      
      return userProfile || null;
    } catch (error) {
      console.error("Error getting admin assignment:", error);
      return null;
    }
  }

  async releaseAssignment(adminEmail: string, currentUserId?: string): Promise<UserProfile | null> {
    try {
      // Get all users (students AND admins) with pending submissions excluding the current one
      const usersWithPending = await db
        .select({
          userId: hoursSubmissions.userId,
          count: sql<number>`count(*)`.as('count')
        })
        .from(hoursSubmissions)
        .where(
          currentUserId 
            ? sql`${hoursSubmissions.status} = 'pending' AND ${hoursSubmissions.userId} != ${currentUserId}`
            : eq(hoursSubmissions.status, 'pending')
        )
        .groupBy(hoursSubmissions.userId);
      
      if (usersWithPending.length === 0) {
        return null;
      }
      
      // Try to get a different user than the admin first
      let newAssignedUserId = usersWithPending[0].userId;
      
      // If first user is the admin and there are other options, pick the second one
      if (newAssignedUserId === adminEmail && usersWithPending.length > 1) {
        newAssignedUserId = usersWithPending[1].userId;
      }
      
      // Get the user profile (could be student or admin)
      const [userProfile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, newAssignedUserId));
      
      return userProfile || null;
    } catch (error) {
      console.error("Error releasing assignment:", error);
      return null;
    }
  }
}

export const storage = new DatabaseStorage();
