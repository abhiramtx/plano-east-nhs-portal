import { users, hoursSubmissions, userProfiles, adminAssignments, type User, type InsertUser, type HoursSubmission, type InsertHoursSubmission, type UserProfile, type InsertUserProfile } from "@shared/schema";
import { db } from "./db";
import { eq, sql, and } from "drizzle-orm";

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
  getAllUserProfiles(): Promise<UserProfile[]>;
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

  async getAllUserProfiles(): Promise<UserProfile[]> {
    return await db
      .select()
      .from(userProfiles)
      .orderBy(userProfiles.createdAt);
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
      // Check if admin already has an assignment
      const [existingAssignment] = await db
        .select()
        .from(adminAssignments)
        .where(eq(adminAssignments.adminEmail, adminEmail));
      
      if (existingAssignment) {
        // Return the existing assigned user if they still have pending submissions
        const [pendingCheck] = await db
          .select({ count: sql<number>`count(*)`.as('count') })
          .from(hoursSubmissions)
          .where(
            and(
              eq(hoursSubmissions.userId, existingAssignment.assignedUserId),
              eq(hoursSubmissions.status, 'pending')
            )
          );
        
        if (pendingCheck.count > 0) {
          // Get the user profile
          const [userProfile] = await db
            .select()
            .from(userProfiles)
            .where(eq(userProfiles.userId, existingAssignment.assignedUserId));
          
          return userProfile || null;
        } else {
          // Assignment no longer valid, delete it and reassign
          await db
            .delete(adminAssignments)
            .where(eq(adminAssignments.adminEmail, adminEmail));
        }
      }
      
      // Get all users with pending submissions
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
      
      // Prioritize non-admin users first
      const nonAdminUsers = usersWithPending.filter(user => user.userId !== adminEmail);
      const adminUser = usersWithPending.find(user => user.userId === adminEmail);
      
      let assignedUserId: string;
      
      if (nonAdminUsers.length > 0) {
        // Assign to first non-admin user (stable assignment)
        assignedUserId = nonAdminUsers[0].userId;
      } else if (adminUser) {
        // Only assign to admin if no other users have pending submissions
        assignedUserId = adminEmail;
      } else {
        return null;
      }
      
      // Create new assignment record
      await db
        .insert(adminAssignments)
        .values({
          adminEmail,
          assignedUserId,
        });
      
      // Get the user profile
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
      // Delete current assignment
      await db
        .delete(adminAssignments)
        .where(eq(adminAssignments.adminEmail, adminEmail));
      
      // Get all users with pending submissions excluding the current one
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
      
      // Randomize the order and pick the first user that's not excluded
      const shuffledUsers = [...usersWithPending].sort(() => Math.random() - 0.5);
      const newAssignedUserId = shuffledUsers[0].userId;
      
      // Create new assignment record
      await db
        .insert(adminAssignments)
        .values({
          adminEmail,
          assignedUserId: newAssignedUserId,
        });
      
      // Get the user profile
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
