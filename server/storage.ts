import { 
  users, hoursSubmissions, userProfiles, adminAssignments, yearlyHistory, projects,
  clubs, clubMemberships, serviceRequests, serviceParticipants, highNeedAreas, 
  appSettings, territoryDecayLog, leaderboardCache,
  type User, type InsertUser, type HoursSubmission, type InsertHoursSubmission, 
  type UserProfile, type InsertUserProfile, type YearlyHistory, type InsertYearlyHistory, 
  type Project, type InsertProject, type Club, type InsertClub, type ClubMembership,
  type InsertClubMembership, type ServiceRequest, type InsertServiceRequest,
  type ServiceParticipant, type InsertServiceParticipant, type HighNeedArea,
  type InsertHighNeedArea, type AppSetting, type InsertAppSetting
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, desc, gte, lte, ne, or } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getHoursSubmissions(userId: string): Promise<HoursSubmission[]>;
  createHoursSubmission(submission: InsertHoursSubmission): Promise<HoursSubmission>;
  updateHoursSubmission(id: number, updates: Partial<HoursSubmission>): Promise<HoursSubmission | undefined>;
  deleteHoursSubmission(id: number): Promise<boolean>;
  getAllHoursSubmissions(): Promise<HoursSubmission[]>;
  getClubHoursSubmissions(clubId: number): Promise<HoursSubmission[]>;
  
  getAllUserProfiles(): Promise<UserProfile[]>;
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  
  getUserProjects(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  getAdminProfiles(): Promise<UserProfile[]>;
  promoteToAdmin(emailKey: string): Promise<UserProfile>;
  removeAdmin(emailKey: string): Promise<void>;
  getAdminAssignment(adminEmail: string): Promise<UserProfile | null>;
  releaseAssignment(adminEmail: string, currentStudentId?: string): Promise<UserProfile | null>;
  
  createYearlyHistory(history: InsertYearlyHistory): Promise<YearlyHistory>;
  getUserYearlyHistory(userId: string): Promise<YearlyHistory[]>;
  archiveCurrentYear(schoolYear: string): Promise<void>;
  wipeDatabaseForNewYear(): Promise<void>;
  removeDemoData(): Promise<void>;

  createClub(club: InsertClub): Promise<Club>;
  getClub(id: number): Promise<Club | undefined>;
  getClubByName(name: string): Promise<Club | undefined>;
  getAllClubs(): Promise<Club[]>;
  updateClub(id: number, updates: Partial<Club>): Promise<Club | undefined>;
  deleteClub(id: number): Promise<boolean>;
  
  createClubMembership(membership: InsertClubMembership): Promise<ClubMembership>;
  getClubMemberships(clubId: number): Promise<ClubMembership[]>;
  getUserClubMembership(userEmail: string): Promise<ClubMembership | undefined>;
  updateClubMembership(id: number, updates: Partial<ClubMembership>): Promise<ClubMembership | undefined>;
  deleteClubMembership(id: number): Promise<boolean>;
  getClubMembershipByEmailAndClub(userEmail: string, clubId: number): Promise<ClubMembership | undefined>;
  
  createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest>;
  getServiceRequest(id: number): Promise<ServiceRequest | undefined>;
  getAllServiceRequests(): Promise<ServiceRequest[]>;
  getUserServiceRequests(userEmail: string): Promise<ServiceRequest[]>;
  updateServiceRequest(id: number, updates: Partial<ServiceRequest>): Promise<ServiceRequest | undefined>;
  deleteServiceRequest(id: number): Promise<boolean>;
  
  createServiceParticipant(participant: InsertServiceParticipant): Promise<ServiceParticipant>;
  getServiceParticipants(serviceRequestId: number): Promise<ServiceParticipant[]>;
  getServiceParticipant(id: number): Promise<ServiceParticipant | undefined>;
  updateServiceParticipant(id: number, updates: Partial<ServiceParticipant>): Promise<ServiceParticipant | undefined>;
  deleteServiceParticipant(id: number): Promise<boolean>;
  getUserServiceParticipations(userEmail: string): Promise<ServiceParticipant[]>;
  
  createHighNeedArea(area: InsertHighNeedArea): Promise<HighNeedArea>;
  getAllHighNeedAreas(): Promise<HighNeedArea[]>;
  updateHighNeedArea(id: number, updates: Partial<HighNeedArea>): Promise<HighNeedArea | undefined>;
  deleteHighNeedArea(id: number): Promise<boolean>;
  
  getAppSetting(key: string): Promise<AppSetting | undefined>;
  upsertAppSetting(setting: InsertAppSetting): Promise<AppSetting>;
  getAllAppSettings(): Promise<AppSetting[]>;
  
  getClubLeaderboard(period: string): Promise<Club[]>;
  getMemberLeaderboard(clubId: number): Promise<ClubMembership[]>;
  
  applyTerritoryDecay(): Promise<void>;
  recalculateClubHours(clubId: number): Promise<void>;
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
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getHoursSubmissions(userId: string): Promise<HoursSubmission[]> {
    return await db.select().from(hoursSubmissions).where(eq(hoursSubmissions.userId, userId)).orderBy(hoursSubmissions.createdAt);
  }

  async getClubHoursSubmissions(clubId: number): Promise<HoursSubmission[]> {
    return await db.select().from(hoursSubmissions).where(eq(hoursSubmissions.clubId, clubId)).orderBy(hoursSubmissions.createdAt);
  }

  async createHoursSubmission(insertSubmission: InsertHoursSubmission): Promise<HoursSubmission> {
    const [submission] = await db.insert(hoursSubmissions).values(insertSubmission).returning();
    return submission;
  }

  async updateHoursSubmission(id: number, updates: Partial<HoursSubmission>): Promise<HoursSubmission | undefined> {
    const [submission] = await db.update(hoursSubmissions).set({ ...updates, updatedAt: new Date() }).where(eq(hoursSubmissions.id, id)).returning();
    if (submission && submission.status === 'approved' && submission.clubId) {
      await this.recalculateClubHours(submission.clubId);
    }
    return submission || undefined;
  }

  async deleteHoursSubmission(id: number): Promise<boolean> {
    const result = await db.delete(hoursSubmissions).where(eq(hoursSubmissions.id, id)).returning();
    return result.length > 0;
  }

  async getAllHoursSubmissions(): Promise<HoursSubmission[]> {
    return await db.select().from(hoursSubmissions).orderBy(hoursSubmissions.createdAt);
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    return await db.select().from(userProfiles).orderBy(userProfiles.createdAt);
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile || undefined;
  }

  async upsertUserProfile(insertProfile: InsertUserProfile): Promise<UserProfile> {
    const existingProfile = await this.getUserProfile(insertProfile.userId);
    if (existingProfile) {
      const [updatedProfile] = await db.update(userProfiles).set({ ...insertProfile, updatedAt: new Date() }).where(eq(userProfiles.userId, insertProfile.userId)).returning();
      return updatedProfile;
    } else {
      const [newProfile] = await db.insert(userProfiles).values(insertProfile).returning();
      return newProfile;
    }
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(projects.createdAt);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const [project] = await db.update(projects).set({ ...updates, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    return project || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  }

  async getAdminProfiles(): Promise<UserProfile[]> {
    return await db.select().from(userProfiles).where(eq(userProfiles.userRole, 1)).orderBy(userProfiles.createdAt);
  }

  async promoteToAdmin(emailKey: string): Promise<UserProfile> {
    const existingProfile = await this.getUserProfile(emailKey);
    if (existingProfile) {
      const [updatedProfile] = await db.update(userProfiles).set({ userRole: 1, updatedAt: new Date() }).where(eq(userProfiles.userId, emailKey)).returning();
      return updatedProfile;
    } else {
      const [newProfile] = await db.insert(userProfiles).values({
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
      }).returning();
      return newProfile;
    }
  }

  async removeAdmin(emailKey: string): Promise<void> {
    await db.update(userProfiles).set({ userRole: 0, updatedAt: new Date() }).where(eq(userProfiles.userId, emailKey));
  }

  async getAdminAssignment(adminEmail: string): Promise<UserProfile | null> {
    try {
      const [existingAssignment] = await db.select().from(adminAssignments).where(eq(adminAssignments.adminEmail, adminEmail));
      if (existingAssignment) {
        const [pendingCheck] = await db.select({ count: sql<number>`count(*)`.as('count') }).from(hoursSubmissions).where(and(eq(hoursSubmissions.userId, existingAssignment.assignedUserId), eq(hoursSubmissions.status, 'pending')));
        if (pendingCheck.count > 0) {
          const [userProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, existingAssignment.assignedUserId));
          return userProfile || null;
        } else {
          await db.delete(adminAssignments).where(eq(adminAssignments.adminEmail, adminEmail));
        }
      }
      const usersWithPending = await db.select({ userId: hoursSubmissions.userId, count: sql<number>`count(*)`.as('count') }).from(hoursSubmissions).where(eq(hoursSubmissions.status, 'pending')).groupBy(hoursSubmissions.userId);
      if (usersWithPending.length === 0) return null;
      const nonAdminUsers = usersWithPending.filter(user => user.userId !== adminEmail);
      const adminUser = usersWithPending.find(user => user.userId === adminEmail);
      let assignedUserId: string;
      if (nonAdminUsers.length > 0) {
        assignedUserId = nonAdminUsers[0].userId;
      } else if (adminUser) {
        assignedUserId = adminEmail;
      } else {
        return null;
      }
      await db.insert(adminAssignments).values({ adminEmail, assignedUserId });
      const [userProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, assignedUserId));
      return userProfile || null;
    } catch (error) {
      console.error("Error getting admin assignment:", error);
      return null;
    }
  }

  async releaseAssignment(adminEmail: string, currentUserId?: string): Promise<UserProfile | null> {
    try {
      await db.delete(adminAssignments).where(eq(adminAssignments.adminEmail, adminEmail));
      const usersWithPending = await db.select({ userId: hoursSubmissions.userId, count: sql<number>`count(*)`.as('count') }).from(hoursSubmissions).where(currentUserId ? sql`${hoursSubmissions.status} = 'pending' AND ${hoursSubmissions.userId} != ${currentUserId}` : eq(hoursSubmissions.status, 'pending')).groupBy(hoursSubmissions.userId);
      if (usersWithPending.length === 0) return null;
      const shuffledUsers = [...usersWithPending].sort(() => Math.random() - 0.5);
      const newAssignedUserId = shuffledUsers[0].userId;
      await db.insert(adminAssignments).values({ adminEmail, assignedUserId: newAssignedUserId });
      const [userProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, newAssignedUserId));
      return userProfile || null;
    } catch (error) {
      console.error("Error releasing assignment:", error);
      return null;
    }
  }

  async createYearlyHistory(history: InsertYearlyHistory): Promise<YearlyHistory> {
    const [result] = await db.insert(yearlyHistory).values(history).returning();
    return result;
  }

  async getUserYearlyHistory(userId: string): Promise<YearlyHistory[]> {
    return await db.select().from(yearlyHistory).where(eq(yearlyHistory.userId, userId)).orderBy(yearlyHistory.schoolYear);
  }

  async archiveCurrentYear(schoolYear: string): Promise<void> {
    const profiles = await db.select().from(userProfiles);
    for (const profile of profiles) {
      const submissions = await db.select().from(hoursSubmissions).where(eq(hoursSubmissions.userId, profile.userId));
      const totalHours = submissions.reduce((sum, sub) => sum + parseFloat(sub.hours), 0);
      const approvedHours = submissions.filter(sub => sub.status === 'approved').reduce((sum, sub) => sum + parseFloat(sub.hours), 0);
      const submissionCount = submissions.length;
      const requirementMet = approvedHours >= 15;
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const month = new Date(2024, i).toLocaleString('default', { month: 'short' });
        const monthSubmissions = submissions.filter(sub => {
          const subDate = new Date(sub.date);
          return subDate.getMonth() === i && sub.status === 'approved';
        });
        const monthHours = monthSubmissions.reduce((sum, sub) => sum + parseFloat(sub.hours), 0);
        return { month, hours: monthHours };
      });
      await this.createYearlyHistory({
        userId: profile.userId,
        schoolYear,
        totalHours: totalHours.toString(),
        approvedHours: approvedHours.toString(),
        submissionCount,
        requirementMet,
        submissions: JSON.stringify(submissions),
        monthlyData: JSON.stringify(monthlyData),
      });
    }
  }

  async wipeDatabaseForNewYear(): Promise<void> {
    await db.delete(hoursSubmissions);
    await db.delete(adminAssignments);
    await db.update(userProfiles).set({ isProfileComplete: false, updatedAt: new Date() });
  }

  async removeDemoData(): Promise<void> {
    const demoEmails = ['demo,student@gmail,com', 'demouser2@gmail,com', 'vabhiram20092@gmail,com'];
    for (const email of demoEmails) {
      await db.delete(hoursSubmissions).where(eq(hoursSubmissions.userId, email));
      await db.delete(userProfiles).where(eq(userProfiles.userId, email));
      await db.delete(adminAssignments).where(eq(adminAssignments.adminEmail, email));
      await db.delete(adminAssignments).where(eq(adminAssignments.assignedUserId, email));
    }
  }

  async createClub(insertClub: InsertClub): Promise<Club> {
    const [club] = await db.insert(clubs).values(insertClub).returning();
    return club;
  }

  async getClub(id: number): Promise<Club | undefined> {
    const [club] = await db.select().from(clubs).where(eq(clubs.id, id));
    return club || undefined;
  }

  async getClubByName(name: string): Promise<Club | undefined> {
    const [club] = await db.select().from(clubs).where(eq(clubs.name, name));
    return club || undefined;
  }

  async getAllClubs(): Promise<Club[]> {
    return await db.select().from(clubs).orderBy(desc(clubs.totalApprovedHours));
  }

  async updateClub(id: number, updates: Partial<Club>): Promise<Club | undefined> {
    const [club] = await db.update(clubs).set({ ...updates, updatedAt: new Date() }).where(eq(clubs.id, id)).returning();
    return club || undefined;
  }

  async deleteClub(id: number): Promise<boolean> {
    await db.delete(clubMemberships).where(eq(clubMemberships.clubId, id));
    const result = await db.delete(clubs).where(eq(clubs.id, id)).returning();
    return result.length > 0;
  }

  async createClubMembership(membership: InsertClubMembership): Promise<ClubMembership> {
    const [result] = await db.insert(clubMemberships).values(membership).returning();
    return result;
  }

  async getClubMemberships(clubId: number): Promise<ClubMembership[]> {
    return await db.select().from(clubMemberships).where(eq(clubMemberships.clubId, clubId)).orderBy(desc(clubMemberships.totalApprovedHours));
  }

  async getUserClubMembership(userEmail: string): Promise<ClubMembership | undefined> {
    const [membership] = await db.select().from(clubMemberships).where(eq(clubMemberships.userEmail, userEmail));
    return membership || undefined;
  }

  async getClubMembershipByEmailAndClub(userEmail: string, clubId: number): Promise<ClubMembership | undefined> {
    const [membership] = await db.select().from(clubMemberships).where(and(eq(clubMemberships.userEmail, userEmail), eq(clubMemberships.clubId, clubId)));
    return membership || undefined;
  }

  async updateClubMembership(id: number, updates: Partial<ClubMembership>): Promise<ClubMembership | undefined> {
    const [membership] = await db.update(clubMemberships).set({ ...updates, updatedAt: new Date() }).where(eq(clubMemberships.id, id)).returning();
    return membership || undefined;
  }

  async deleteClubMembership(id: number): Promise<boolean> {
    const result = await db.delete(clubMemberships).where(eq(clubMemberships.id, id)).returning();
    return result.length > 0;
  }

  async createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest> {
    const [result] = await db.insert(serviceRequests).values(request).returning();
    return result;
  }

  async getServiceRequest(id: number): Promise<ServiceRequest | undefined> {
    const [request] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id));
    return request || undefined;
  }

  async getAllServiceRequests(): Promise<ServiceRequest[]> {
    return await db.select().from(serviceRequests).orderBy(desc(serviceRequests.createdAt));
  }

  async getUserServiceRequests(userEmail: string): Promise<ServiceRequest[]> {
    return await db.select().from(serviceRequests).where(eq(serviceRequests.requesterEmail, userEmail)).orderBy(desc(serviceRequests.createdAt));
  }

  async updateServiceRequest(id: number, updates: Partial<ServiceRequest>): Promise<ServiceRequest | undefined> {
    const [request] = await db.update(serviceRequests).set({ ...updates, updatedAt: new Date() }).where(eq(serviceRequests.id, id)).returning();
    return request || undefined;
  }

  async deleteServiceRequest(id: number): Promise<boolean> {
    await db.delete(serviceParticipants).where(eq(serviceParticipants.serviceRequestId, id));
    const result = await db.delete(serviceRequests).where(eq(serviceRequests.id, id)).returning();
    return result.length > 0;
  }

  async createServiceParticipant(participant: InsertServiceParticipant): Promise<ServiceParticipant> {
    const [result] = await db.insert(serviceParticipants).values(participant).returning();
    return result;
  }

  async getServiceParticipants(serviceRequestId: number): Promise<ServiceParticipant[]> {
    return await db.select().from(serviceParticipants).where(eq(serviceParticipants.serviceRequestId, serviceRequestId));
  }

  async getServiceParticipant(id: number): Promise<ServiceParticipant | undefined> {
    const [participant] = await db.select().from(serviceParticipants).where(eq(serviceParticipants.id, id));
    return participant || undefined;
  }

  async updateServiceParticipant(id: number, updates: Partial<ServiceParticipant>): Promise<ServiceParticipant | undefined> {
    const [participant] = await db.update(serviceParticipants).set({ ...updates, updatedAt: new Date() }).where(eq(serviceParticipants.id, id)).returning();
    return participant || undefined;
  }

  async deleteServiceParticipant(id: number): Promise<boolean> {
    const result = await db.delete(serviceParticipants).where(eq(serviceParticipants.id, id)).returning();
    return result.length > 0;
  }

  async getUserServiceParticipations(userEmail: string): Promise<ServiceParticipant[]> {
    return await db.select().from(serviceParticipants).where(eq(serviceParticipants.userEmail, userEmail));
  }

  async createHighNeedArea(area: InsertHighNeedArea): Promise<HighNeedArea> {
    const [result] = await db.insert(highNeedAreas).values(area).returning();
    return result;
  }

  async getAllHighNeedAreas(): Promise<HighNeedArea[]> {
    return await db.select().from(highNeedAreas).orderBy(desc(highNeedAreas.priority));
  }

  async updateHighNeedArea(id: number, updates: Partial<HighNeedArea>): Promise<HighNeedArea | undefined> {
    const [area] = await db.update(highNeedAreas).set({ ...updates, lastUpdated: new Date() }).where(eq(highNeedAreas.id, id)).returning();
    return area || undefined;
  }

  async deleteHighNeedArea(id: number): Promise<boolean> {
    const result = await db.delete(highNeedAreas).where(eq(highNeedAreas.id, id)).returning();
    return result.length > 0;
  }

  async getAppSetting(key: string): Promise<AppSetting | undefined> {
    const [setting] = await db.select().from(appSettings).where(eq(appSettings.settingKey, key));
    return setting || undefined;
  }

  async upsertAppSetting(insertSetting: InsertAppSetting): Promise<AppSetting> {
    const existing = await this.getAppSetting(insertSetting.settingKey);
    if (existing) {
      const [updated] = await db.update(appSettings).set({ ...insertSetting, updatedAt: new Date() }).where(eq(appSettings.settingKey, insertSetting.settingKey)).returning();
      return updated;
    } else {
      const [created] = await db.insert(appSettings).values(insertSetting).returning();
      return created;
    }
  }

  async getAllAppSettings(): Promise<AppSetting[]> {
    return await db.select().from(appSettings);
  }

  async getClubLeaderboard(period: string): Promise<Club[]> {
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return await this.getAllClubs();
    }
    const clubsWithHours = await db.select({
      club: clubs,
      periodHours: sql<string>`COALESCE(SUM(CASE WHEN ${hoursSubmissions.updatedAt} >= ${startDate} AND ${hoursSubmissions.status} = 'approved' THEN ${hoursSubmissions.hours}::decimal ELSE 0 END), 0)`.as('period_hours')
    }).from(clubs).leftJoin(hoursSubmissions, eq(clubs.id, hoursSubmissions.clubId)).groupBy(clubs.id).orderBy(desc(sql`period_hours`));
    return clubsWithHours.map(row => row.club);
  }

  async getMemberLeaderboard(clubId: number): Promise<ClubMembership[]> {
    return await db.select().from(clubMemberships).where(eq(clubMemberships.clubId, clubId)).orderBy(desc(clubMemberships.totalApprovedHours));
  }

  async applyTerritoryDecay(): Promise<void> {
    const allClubs = await this.getAllClubs();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    for (const club of allClubs) {
      if (club.lastActivityAt < oneWeekAgo) {
        const currentDecay = parseFloat(club.decayedHours);
        if (currentDecay < 10) {
          const newDecay = Math.min(currentDecay + 1, 10);
          await this.updateClub(club.id, { decayedHours: newDecay.toString() });
          await db.insert(territoryDecayLog).values({ clubId: club.id, hoursDecayed: "1" });
        }
      }
    }
  }

  async recalculateClubHours(clubId: number): Promise<void> {
    const clubSubmissions = await db.select().from(hoursSubmissions).where(and(eq(hoursSubmissions.clubId, clubId), eq(hoursSubmissions.status, 'approved')));
    const totalHours = clubSubmissions.reduce((sum, sub) => sum + parseFloat(sub.hours), 0);
    const bonusHours = clubSubmissions.reduce((sum, sub) => sum + parseFloat(sub.bonusHoursAwarded || "0"), 0);
    await this.updateClub(clubId, { 
      totalApprovedHours: totalHours.toString(), 
      bonusHours: bonusHours.toString(),
      lastActivityAt: new Date(),
      decayedHours: "0"
    });
  }
}

export const storage = new DatabaseStorage();
