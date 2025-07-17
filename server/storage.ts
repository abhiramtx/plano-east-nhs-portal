import { users, type User, type InsertUser, type HoursSubmission, type InsertHoursSubmission, type UserProfile, type InsertUserProfile } from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private hoursSubmissions: Map<number, HoursSubmission>;
  private userProfiles: Map<string, UserProfile>;
  private currentUserId: number;
  private currentSubmissionId: number;
  private currentProfileId: number;

  constructor() {
    this.users = new Map();
    this.hoursSubmissions = new Map();
    this.userProfiles = new Map();
    this.currentUserId = 1;
    this.currentSubmissionId = 1;
    this.currentProfileId = 1;
    this.seedMockData();
  }

  private seedMockData() {
    // Add some mock submissions for demo purposes
    const mockSubmissions = [
      {
        id: 1,
        userId: "demo,student@gmail,com",
        studentName: "Demo Student",
        description: "Helped organize art supplies and cleaned brushes after painting session",
        date: new Date("2024-01-15"),
        hours: "2.5",
        status: "approved" as const,
        proofImageUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop",
        createdAt: new Date("2024-01-15T10:00:00Z"),
        updatedAt: new Date("2024-01-15T10:00:00Z"),
      },
      {
        id: 2,
        userId: "demo,student@gmail,com",
        studentName: "Demo Student",
        description: "Assisted with setting up art exhibition display and guided visitors",
        date: new Date("2024-01-20"),
        hours: "3.0",
        status: "pending" as const,
        proofImageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
        createdAt: new Date("2024-01-20T14:30:00Z"),
        updatedAt: new Date("2024-01-20T14:30:00Z"),
      },
      {
        id: 3,
        userId: "demo,student@gmail,com",
        studentName: "Demo Student",
        description: "Helped clean up after pottery workshop and arranged student artwork",
        date: new Date("2024-02-05"),
        hours: "1.5",
        status: "approved" as const,
        proofImageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
        createdAt: new Date("2024-02-05T16:00:00Z"),
        updatedAt: new Date("2024-02-05T16:00:00Z"),
      },
    ];

    mockSubmissions.forEach(submission => {
      this.hoursSubmissions.set(submission.id, submission);
    });
    
    this.currentSubmissionId = 4;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getHoursSubmissions(userId: string): Promise<HoursSubmission[]> {
    return Array.from(this.hoursSubmissions.values()).filter(
      (submission) => submission.userId === userId,
    );
  }

  async createHoursSubmission(insertSubmission: InsertHoursSubmission): Promise<HoursSubmission> {
    const id = this.currentSubmissionId++;
    const now = new Date();
    const submission: HoursSubmission = {
      ...insertSubmission,
      id,
      status: insertSubmission.status || "pending",
      proofImageUrl: insertSubmission.proofImageUrl || null,
      createdAt: now,
      updatedAt: now,
    };
    this.hoursSubmissions.set(id, submission);
    return submission;
  }

  async updateHoursSubmission(id: number, updates: Partial<HoursSubmission>): Promise<HoursSubmission | undefined> {
    const submission = this.hoursSubmissions.get(id);
    if (!submission) return undefined;
    
    const updatedSubmission: HoursSubmission = {
      ...submission,
      ...updates,
      id, // Ensure id doesn't change
      updatedAt: new Date(),
    };
    
    this.hoursSubmissions.set(id, updatedSubmission);
    return updatedSubmission;
  }

  async deleteHoursSubmission(id: number): Promise<boolean> {
    return this.hoursSubmissions.delete(id);
  }

  async getAllHoursSubmissions(): Promise<HoursSubmission[]> {
    return Array.from(this.hoursSubmissions.values());
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    return this.userProfiles.get(userId);
  }

  async upsertUserProfile(insertProfile: InsertUserProfile): Promise<UserProfile> {
    const existingProfile = this.userProfiles.get(insertProfile.userId);
    const now = new Date();
    
    if (existingProfile) {
      // Update existing profile
      const updatedProfile: UserProfile = {
        ...existingProfile,
        ...insertProfile,
        updatedAt: now,
      };
      this.userProfiles.set(insertProfile.userId, updatedProfile);
      return updatedProfile;
    } else {
      // Create new profile
      const id = this.currentProfileId++;
      const newProfile: UserProfile = {
        id,
        userId: insertProfile.userId,
        goByFirstName: insertProfile.goByFirstName || null,
        lastName: insertProfile.lastName || null,
        studentId: insertProfile.studentId || null,
        personalEmailAddress: insertProfile.personalEmailAddress || null,
        cellPhoneNumber: insertProfile.cellPhoneNumber || null,
        gradeLevel: insertProfile.gradeLevel || null,
        createdAt: now,
        updatedAt: now,
      };
      this.userProfiles.set(insertProfile.userId, newProfile);
      return newProfile;
    }
  }
}

export const storage = new MemStorage();
