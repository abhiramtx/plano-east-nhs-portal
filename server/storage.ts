import { db } from "./db";
import type { 
  User, InsertUser, HoursSubmission, InsertHoursSubmission, 
  UserProfile, InsertUserProfile, YearlyHistory, InsertYearlyHistory, 
  Project, InsertProject, Club, InsertClub, ClubMembership,
  InsertClubMembership, ServiceRequest, InsertServiceRequest,
  ServiceParticipant, InsertServiceParticipant, HighNeedArea,
  InsertHighNeedArea, AppSetting, InsertAppSetting, TerritoryCircle,
  InsertTerritoryCircle, CustomField, InsertCustomField, CustomFieldValue,
  InsertCustomFieldValue, HoursLog, InsertHoursLog
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getHoursSubmissions(userId?: string, clubId?: string): Promise<HoursSubmission[]>;
  createHoursSubmission(submission: InsertHoursSubmission): Promise<HoursSubmission>;
  updateHoursSubmission(id: string, updates: Partial<HoursSubmission>): Promise<HoursSubmission | undefined>;
  deleteHoursSubmission(id: string): Promise<boolean>;
  getAllHoursSubmissions(): Promise<HoursSubmission[]>;
  getClubHoursSubmissions(clubId: string): Promise<HoursSubmission[]>;
  
  getAllUserProfiles(): Promise<UserProfile[]>;
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  
  getUserProjects(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  getAdminProfiles(clubId?: string): Promise<UserProfile[]>;
  promoteToAdmin(emailKey: string): Promise<UserProfile>;
  removeAdmin(emailKey: string): Promise<void>;
  getAdminAssignment(clubId: string, adminEmail: string): Promise<UserProfile | null>;
  releaseAssignment(clubId: string, adminEmail: string, currentStudentId?: string): Promise<UserProfile | null>;
  
  createYearlyHistory(history: InsertYearlyHistory): Promise<YearlyHistory>;
  getUserYearlyHistory(userId: string): Promise<YearlyHistory[]>;
  archiveCurrentYear(clubId: string, schoolYear: string): Promise<void>;
  wipeDatabaseForNewYear(clubId: string): Promise<void>;
  removeDemoData(clubId: string): Promise<void>;

  createClub(club: InsertClub): Promise<Club>;
  getClub(id: string): Promise<Club | undefined>;
  getClubByName(name: string): Promise<Club | undefined>;
  getAllClubs(): Promise<Club[]>;
  updateClub(id: string, updates: Partial<Club>): Promise<Club | undefined>;
  deleteClub(id: string): Promise<boolean>;
  
  createClubMembership(membership: InsertClubMembership): Promise<ClubMembership>;
  getClubMemberships(clubId: string): Promise<ClubMembership[]>;
  getUserClubMembership(userEmail: string): Promise<ClubMembership | undefined>;
  updateClubMembership(id: string, updates: Partial<ClubMembership>): Promise<ClubMembership | undefined>;
  deleteClubMembership(id: string): Promise<boolean>;
  getClubMembershipByEmailAndClub(userEmail: string, clubId: string): Promise<ClubMembership | undefined>;
  
  createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest>;
  getServiceRequest(id: string): Promise<ServiceRequest | undefined>;
  getAllServiceRequests(): Promise<ServiceRequest[]>;
  getUserServiceRequests(userEmail: string): Promise<ServiceRequest[]>;
  updateServiceRequest(id: string, updates: Partial<ServiceRequest>): Promise<ServiceRequest | undefined>;
  deleteServiceRequest(id: string): Promise<boolean>;
  
  createServiceParticipant(participant: InsertServiceParticipant): Promise<ServiceParticipant>;
  getServiceParticipants(serviceRequestId: string): Promise<ServiceParticipant[]>;
  getServiceParticipant(id: string): Promise<ServiceParticipant | undefined>;
  updateServiceParticipant(id: string, updates: Partial<ServiceParticipant>): Promise<ServiceParticipant | undefined>;
  deleteServiceParticipant(id: string): Promise<boolean>;
  getUserServiceParticipations(userEmail: string): Promise<ServiceParticipant[]>;
  
  createHighNeedArea(area: InsertHighNeedArea): Promise<HighNeedArea>;
  getAllHighNeedAreas(): Promise<HighNeedArea[]>;
  updateHighNeedArea(id: string, updates: Partial<HighNeedArea>): Promise<HighNeedArea | undefined>;
  deleteHighNeedArea(id: string): Promise<boolean>;
  
  getAppSetting(key: string): Promise<AppSetting | undefined>;
  upsertAppSetting(setting: InsertAppSetting): Promise<AppSetting>;
  getAllAppSettings(): Promise<AppSetting[]>;
  
  getClubLeaderboard(clubId: string, period: string): Promise<Club[]>;
  getMemberLeaderboard(clubId: string): Promise<ClubMembership[]>;
  
  applyTerritoryDecay(clubId: string): Promise<void>;
  recalculateClubHours(clubId: string): Promise<void>;
  
  // Territory Circle Management
  getTerritoryCircles(clubId: string): Promise<TerritoryCircle[]>;
  upsertTerritoryCircle(circle: InsertTerritoryCircle): Promise<TerritoryCircle>;
  updateTerritoryCircle(circleId: string, updates: Partial<TerritoryCircle>): Promise<TerritoryCircle | undefined>;
  deleteTerritoryCircle(circleId: string): Promise<boolean>;
  calculateAndUpdateTerritoryCircles(clubId: string): Promise<void>;

  // Custom Field Management
  createCustomField(field: InsertCustomField): Promise<CustomField>;
  getCustomFields(clubId: string): Promise<CustomField[]>;
  getCustomField(fieldId: string): Promise<CustomField | undefined>;
  updateCustomField(fieldId: string, updates: Partial<CustomField>): Promise<CustomField | undefined>;
  deleteCustomField(fieldId: string): Promise<boolean>;
  
  createCustomFieldValue(value: InsertCustomFieldValue): Promise<CustomFieldValue>;
  getCustomFieldValue(userId: string, customFieldId: string): Promise<CustomFieldValue | undefined>;
  getCustomFieldValues(userId: string, clubId: string): Promise<CustomFieldValue[]>;
  upsertCustomFieldValue(userId: string, customFieldId: string, clubId: string, value: string): Promise<CustomFieldValue>;
  deleteCustomFieldValue(fieldValueId: string): Promise<boolean>;

  createHoursLog(log: InsertHoursLog): Promise<HoursLog>;
  getHoursLogs(clubId: string): Promise<HoursLog[]>;
  updateHoursLog(logId: string, updates: Partial<HoursLog>): Promise<HoursLog | undefined>;
  deleteHoursLog(logId: string): Promise<boolean>;
}

export class FirestoreStorage implements IStorage {
  private generateId(): string {
    return db.collection("_meta").doc().id;
  }

  async getUser(id: string): Promise<User | undefined> {
    const doc = await db.collection("users").doc(id).get();
    return doc.exists ? (doc.data() as User) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const snapshot = await db.collection("users").where("username", "==", username).limit(1).get();
    return snapshot.empty ? undefined : (snapshot.docs[0].data() as User);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.generateId();
    const user: User = { id, ...insertUser } as any;
    await db.collection("users").doc(id).set(user);
    return user;
  }

  async getHoursSubmissions(userId?: string, clubId?: string): Promise<HoursSubmission[]> {
    let query = db.collection("submissions") as any;
    if (userId) query = query.where("userId", "==", userId);
    if (clubId) query = query.where("clubId", "==", clubId);
    const snapshot = await query.orderBy("createdAt", "desc").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HoursSubmission));
  }

  async getClubHoursSubmissions(clubId: string): Promise<HoursSubmission[]> {
    // Fetch all submissions for the club first (no composite index needed)
    const snapshot = await db.collection("submissions")
      .where("clubId", "==", clubId)
      .get();
    
    // Filter for approved status and sort client-side to avoid needing a composite index
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as HoursSubmission))
      .filter(s => s.status === "approved")
      .sort((a, b) => (b.createdAt as any) - (a.createdAt as any));
  }

  async createHoursSubmission(insertSubmission: InsertHoursSubmission): Promise<HoursSubmission> {
    const id = this.generateId();
    const now = new Date();
    const submission: HoursSubmission = { id, ...insertSubmission, createdAt: now, updatedAt: now } as any;
    await db.collection("submissions").doc(id).set(submission);
    return submission;
  }

  async updateHoursSubmission(id: string, updates: Partial<HoursSubmission>): Promise<HoursSubmission | undefined> {
    const doc = await db.collection("submissions").doc(id).get();
    if (!doc.exists) return undefined;
    const updated = { ...doc.data(), ...updates, updatedAt: new Date() };
    await db.collection("submissions").doc(id).set(updated);
    if (updated.status === "approved") await this.recalculateClubHours(updated.clubId);
    return updated as HoursSubmission;
  }

  async deleteHoursSubmission(id: string): Promise<boolean> {
    const doc = await db.collection("submissions").doc(id).get();
    if (!doc.exists) return false;
    await doc.ref.delete();
    return true;
  }

  async getAllHoursSubmissions(): Promise<HoursSubmission[]> {
    const snapshot = await db.collection("submissions").orderBy("createdAt", "desc").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HoursSubmission));
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    const snapshot = await db.collection("userProfiles").orderBy("createdAt", "desc").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const doc = await db.collection("userProfiles").doc(userId).get();
    const altId = userId.includes(',') ? userId.replace(/,/g, '.') : userId.replace(/\./g, ',');
    const altDoc = await db.collection("userProfiles").doc(altId).get();
    const primary = doc.exists ? doc.data() : null;
    const alt = altDoc.exists ? altDoc.data() : null;
    if (!primary && !alt) return undefined;
    const merged: any = {};
    for (const obj of [primary, alt]) {
      if (!obj) continue;
      for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined && v !== null && v !== '') merged[k] = v;
      }
    }
    return { id: userId, ...merged } as UserProfile;
  }

  async upsertUserProfile(insertProfile: InsertUserProfile): Promise<UserProfile> {
    const existingProfile = await this.getUserProfile(insertProfile.userId);
    const now = new Date();
    const profile: UserProfile = {
      id: insertProfile.userId,
      ...insertProfile,
      createdAt: existingProfile?.createdAt || now,
      updatedAt: now,
    } as any;
    await db.collection("userProfiles").doc(insertProfile.userId).set(profile);
    return profile;
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    const snapshot = await db.collection("projects")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.generateId();
    const now = new Date();
    const project: Project = { id, ...insertProject, createdAt: now, updatedAt: now } as any;
    await db.collection("projects").doc(id).set(project);
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const doc = await db.collection("projects").doc(id).get();
    if (!doc.exists) return undefined;
    const updated = { ...doc.data(), ...updates, updatedAt: new Date() };
    await db.collection("projects").doc(id).set(updated);
    return updated as Project;
  }

  async deleteProject(id: string): Promise<boolean> {
    const doc = await db.collection("projects").doc(id).get();
    if (!doc.exists) return false;
    await doc.ref.delete();
    return true;
  }

  async getAdminProfiles(clubId?: string): Promise<UserProfile[]> {
    const snapshot = await db.collection("userProfiles").where("userRole", "==", 1).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
  }

  async promoteToAdmin(emailKey: string): Promise<UserProfile> {
    const existingProfile = await this.getUserProfile(emailKey);
    if (existingProfile) {
      const updated = { ...existingProfile, userRole: 1, updatedAt: new Date() };
      await db.collection("userProfiles").doc(emailKey).set(updated);
      return updated as UserProfile;
    } else {
      const profile: UserProfile = {
        id: emailKey,
        userId: emailKey,
        userRole: 1,
        isProfileComplete: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
      await db.collection("userProfiles").doc(emailKey).set(profile);
      return profile;
    }
  }

  async removeAdmin(emailKey: string): Promise<void> {
    const profile = await this.getUserProfile(emailKey);
    if (profile) {
      const updated = { ...profile, userRole: 0, updatedAt: new Date() };
      await db.collection("userProfiles").doc(emailKey).set(updated);
    }
  }

  async getAdminAssignment(clubId: string, adminEmail: string): Promise<UserProfile | null> {
    try {
      const submissions = await db.collection("submissions")
        .where("clubId", "==", clubId)
        .where("status", "==", "pending")
        .get();
      if (submissions.empty) return null;
      const userIds = [...new Set(submissions.docs.map(doc => doc.data().userId))];
      const nonAdminUsers = userIds.filter(id => id !== adminEmail);
      const assignedUserId = nonAdminUsers.length > 0 ? nonAdminUsers[0] : adminEmail;
      return await this.getUserProfile(assignedUserId);
    } catch (error) {
      console.error("Error getting admin assignment:", error);
      return null;
    }
  }

  async releaseAssignment(clubId: string, adminEmail: string, currentUserId?: string): Promise<UserProfile | null> {
    try {
      const usersWithPending = await db.collection("submissions")
        .where("clubId", "==", clubId)
        .where("status", "==", "pending")
        .get();
      if (usersWithPending.empty) return null;
      const userIds = [...new Set(usersWithPending.docs.map(doc => doc.data().userId))];
      const shuffledUsers = [...userIds].sort(() => Math.random() - 0.5);
      const newAssignedUserId = shuffledUsers[0];
      return await this.getUserProfile(newAssignedUserId);
    } catch (error) {
      console.error("Error releasing assignment:", error);
      return null;
    }
  }

  async createYearlyHistory(history: InsertYearlyHistory): Promise<YearlyHistory> {
    const id = this.generateId();
    const now = new Date();
    const record: YearlyHistory = { id, ...history, archivedAt: now } as any;
    await db.collection("yearlyHistory").doc(id).set(record);
    return record;
  }

  async getUserYearlyHistory(userId: string): Promise<YearlyHistory[]> {
    const snapshot = await db.collection("yearlyHistory")
      .where("userId", "==", userId)
      .orderBy("schoolYear")
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as YearlyHistory));
  }

  async archiveCurrentYear(clubId: string, schoolYear: string): Promise<void> {
    const submissions = await this.getAllHoursSubmissions();
    const profiles = await this.getAllUserProfiles();
    for (const profile of profiles) {
      const userSubmissions = submissions.filter(s => s.userId === profile.userId);
      const totalHours = userSubmissions.reduce((sum, sub) => sum + parseFloat(String(sub.hours)), 0);
      const approvedHours = userSubmissions.filter(sub => sub.status === "approved")
        .reduce((sum, sub) => sum + parseFloat(String(sub.hours)), 0);
      await this.createYearlyHistory({
        userId: profile.userId,
        schoolYear,
        totalHours: totalHours.toString(),
        approvedHours: approvedHours.toString(),
        submissionCount: userSubmissions.length,
        requirementMet: approvedHours >= 15,
        submissions: JSON.stringify(userSubmissions),
        monthlyData: JSON.stringify([]),
      });
    }
  }

  async wipeDatabaseForNewYear(clubId: string): Promise<void> {
    const submissions = await db.collection("submissions").where("clubId", "==", clubId).get();
    for (const doc of submissions.docs) await doc.ref.delete();
  }

  async removeDemoData(clubId: string): Promise<void> {
    const demoEmails = ["demo,student@gmail,com", "demouser2@gmail,com"];
    for (const email of demoEmails) {
      const submissions = await db.collection("submissions").where("userId", "==", email).get();
      for (const doc of submissions.docs) await doc.ref.delete();
    }
  }

  async createClub(insertClub: InsertClub): Promise<Club> {
    const id = this.generateId();
    const now = new Date();
    const club: Club = { id, ...insertClub, totalApprovedHours: "0", bonusHours: "0", decayedHours: "0", lastActivityAt: now, createdAt: now, updatedAt: now } as any;
    await db.collection("clubs").doc(id).set(club);
    return club;
  }

  async getClub(id: string): Promise<Club | undefined> {
    const doc = await db.collection("clubs").doc(id).get();
    if (!doc.exists) return undefined;
    const data = doc.data();
    return { id: doc.id, ...data } as Club;
  }

  async getClubByName(name: string): Promise<Club | undefined> {
    const snapshot = await db.collection("clubs").where("name", "==", name).limit(1).get();
    return snapshot.empty ? undefined : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Club);
  }

  async getAllClubs(): Promise<Club[]> {
    const snapshot = await db.collection("clubs").orderBy("totalApprovedHours", "desc").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
  }

  async updateClub(id: string, updates: Partial<Club>): Promise<Club | undefined> {
    const doc = await db.collection("clubs").doc(id).get();
    if (!doc.exists) return undefined;
    const updated = { ...doc.data(), ...updates, updatedAt: new Date() };
    await db.collection("clubs").doc(id).set(updated);
    return updated as Club;
  }

  async deleteClub(id: string): Promise<boolean> {
    const memberships = await db.collection("memberships").where("clubId", "==", id).get();
    for (const doc of memberships.docs) await doc.ref.delete();
    const doc = await db.collection("clubs").doc(id).get();
    if (!doc.exists) return false;
    await doc.ref.delete();
    return true;
  }

  async createClubMembership(membership: InsertClubMembership): Promise<ClubMembership> {
    const id = this.generateId();
    const now = new Date();
    const record: ClubMembership = { id, ...membership, totalApprovedHours: "0", joinedAt: now, updatedAt: now } as any;
    await db.collection("memberships").doc(id).set(record);
    return record;
  }

  async getClubMemberships(clubId: string): Promise<ClubMembership[]> {
    const snapshot = await db.collection("memberships")
      .where("clubId", "==", clubId)
      .orderBy("totalApprovedHours", "desc")
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubMembership));
  }

  async getUserClubMembership(userEmail: string): Promise<ClubMembership | undefined> {
    const snapshot = await db.collection("memberships").where("userEmail", "==", userEmail).limit(1).get();
    return snapshot.empty ? undefined : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ClubMembership);
  }

  async getClubMembershipByEmailAndClub(userEmail: string, clubId: string): Promise<ClubMembership | undefined> {
    const snapshot = await db.collection("memberships")
      .where("userEmail", "==", userEmail)
      .where("clubId", "==", clubId)
      .limit(1)
      .get();
    return snapshot.empty ? undefined : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ClubMembership);
  }

  async updateClubMembership(id: string, updates: Partial<ClubMembership>): Promise<ClubMembership | undefined> {
    const doc = await db.collection("memberships").doc(id).get();
    if (!doc.exists) return undefined;
    const updated = { ...doc.data(), ...updates, updatedAt: new Date() };
    await db.collection("memberships").doc(id).set(updated);
    return updated as ClubMembership;
  }

  async deleteClubMembership(id: string): Promise<boolean> {
    const doc = await db.collection("memberships").doc(id).get();
    if (!doc.exists) return false;
    await doc.ref.delete();
    return true;
  }

  async createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest> {
    const id = this.generateId();
    const now = new Date();
    const record: ServiceRequest = { id, ...request, status: "open", createdAt: now, updatedAt: now } as any;
    await db.collection("serviceRequests").doc(id).set(record);
    return record;
  }

  async getServiceRequest(id: string): Promise<ServiceRequest | undefined> {
    const doc = await db.collection("serviceRequests").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as ServiceRequest) : undefined;
  }

  async getAllServiceRequests(): Promise<ServiceRequest[]> {
    const snapshot = await db.collection("serviceRequests").orderBy("createdAt", "desc").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRequest));
  }

  async getUserServiceRequests(userEmail: string): Promise<ServiceRequest[]> {
    const snapshot = await db.collection("serviceRequests")
      .where("requesterEmail", "==", userEmail)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRequest));
  }

  async updateServiceRequest(id: string, updates: Partial<ServiceRequest>): Promise<ServiceRequest | undefined> {
    const doc = await db.collection("serviceRequests").doc(id).get();
    if (!doc.exists) return undefined;
    const updated = { ...doc.data(), ...updates, updatedAt: new Date() };
    await db.collection("serviceRequests").doc(id).set(updated);
    return updated as ServiceRequest;
  }

  async deleteServiceRequest(id: string): Promise<boolean> {
    const participants = await db.collection("serviceParticipants").where("serviceRequestId", "==", id).get();
    for (const doc of participants.docs) await doc.ref.delete();
    const doc = await db.collection("serviceRequests").doc(id).get();
    if (!doc.exists) return false;
    await doc.ref.delete();
    return true;
  }

  async createServiceParticipant(participant: InsertServiceParticipant): Promise<ServiceParticipant> {
    const id = this.generateId();
    const now = new Date();
    const record: ServiceParticipant = { id, ...participant, status: "joined", hoursApproved: false, joinedAt: now, updatedAt: now } as any;
    await db.collection("serviceParticipants").doc(id).set(record);
    return record;
  }

  async getServiceParticipants(serviceRequestId: string): Promise<ServiceParticipant[]> {
    const snapshot = await db.collection("serviceParticipants").where("serviceRequestId", "==", serviceRequestId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceParticipant));
  }

  async getServiceParticipant(id: string): Promise<ServiceParticipant | undefined> {
    const doc = await db.collection("serviceParticipants").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as ServiceParticipant) : undefined;
  }

  async updateServiceParticipant(id: string, updates: Partial<ServiceParticipant>): Promise<ServiceParticipant | undefined> {
    const doc = await db.collection("serviceParticipants").doc(id).get();
    if (!doc.exists) return undefined;
    const updated = { ...doc.data(), ...updates, updatedAt: new Date() };
    await db.collection("serviceParticipants").doc(id).set(updated);
    return updated as ServiceParticipant;
  }

  async deleteServiceParticipant(id: string): Promise<boolean> {
    const doc = await db.collection("serviceParticipants").doc(id).get();
    if (!doc.exists) return false;
    await doc.ref.delete();
    return true;
  }

  async getUserServiceParticipations(userEmail: string): Promise<ServiceParticipant[]> {
    const snapshot = await db.collection("serviceParticipants").where("userEmail", "==", userEmail).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceParticipant));
  }

  async createHighNeedArea(area: InsertHighNeedArea): Promise<HighNeedArea> {
    const id = this.generateId();
    const now = new Date();
    const record: HighNeedArea = { id, ...area, lastUpdated: now, createdAt: now } as any;
    await db.collection("highNeedAreas").doc(id).set(record);
    return record;
  }

  async getAllHighNeedAreas(): Promise<HighNeedArea[]> {
    const snapshot = await db.collection("highNeedAreas").orderBy("priority", "desc").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HighNeedArea));
  }

  async updateHighNeedArea(id: string, updates: Partial<HighNeedArea>): Promise<HighNeedArea | undefined> {
    const doc = await db.collection("highNeedAreas").doc(id).get();
    if (!doc.exists) return undefined;
    const updated = { ...doc.data(), ...updates, lastUpdated: new Date() };
    await db.collection("highNeedAreas").doc(id).set(updated);
    return updated as HighNeedArea;
  }

  async deleteHighNeedArea(id: string): Promise<boolean> {
    const doc = await db.collection("highNeedAreas").doc(id).get();
    if (!doc.exists) return false;
    await doc.ref.delete();
    return true;
  }

  async getAppSetting(key: string): Promise<AppSetting | undefined> {
    const doc = await db.collection("appSettings").doc(key).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as AppSetting) : undefined;
  }

  async upsertAppSetting(insertSetting: InsertAppSetting): Promise<AppSetting> {
    const now = new Date();
    const setting: AppSetting = { id: insertSetting.settingKey, ...insertSetting, updatedAt: now } as any;
    await db.collection("appSettings").doc(insertSetting.settingKey).set(setting);
    return setting;
  }

  async getAllAppSettings(): Promise<AppSetting[]> {
    const snapshot = await db.collection("appSettings").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppSetting));
  }

  async getClubLeaderboard(clubId: string, period: string): Promise<Club[]> {
    const club = await this.getClub(clubId);
    return club ? [club] : [];
  }

  async getMemberLeaderboard(clubId: string): Promise<ClubMembership[]> {
    return await this.getClubMemberships(clubId);
  }

  async applyTerritoryDecay(clubId: string): Promise<void> {
    const club = await this.getClub(clubId);
    if (!club) return;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (club.lastActivityAt < oneWeekAgo) {
      const currentDecay = parseFloat(club.decayedHours || "0");
      if (currentDecay < 10) {
        const newDecay = Math.min(currentDecay + 1, 10);
        await this.updateClub(clubId, { decayedHours: newDecay.toString() });
      }
    }
  }

  async recalculateClubHours(clubId: string): Promise<void> {
    const submissions = await this.getClubHoursSubmissions(clubId);
    const totalHours = submissions.reduce((sum, doc) => sum + parseFloat(String(doc.hours) || "0"), 0);
    const bonusHours = submissions.reduce((sum, doc) => sum + parseFloat(String(doc.bonusHoursAwarded) || "0"), 0);
    await this.updateClub(clubId, {
      totalApprovedHours: totalHours.toString(),
      bonusHours: bonusHours.toString(),
      lastActivityAt: new Date(),
      decayedHours: "0",
    });
  }

  async getTerritoryCircles(clubId: string): Promise<TerritoryCircle[]> {
    const snapshot = await db.collection("clubs").doc(clubId)
      .collection("circles")
      .orderBy("updatedAt", "desc")
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TerritoryCircle));
  }

  async upsertTerritoryCircle(circle: InsertTerritoryCircle): Promise<TerritoryCircle> {
    const now = new Date();
    // Create a geohash-based ID from coordinates
    const id = this.geohashId(circle.latitude, circle.longitude);
    const fullCircle: TerritoryCircle = {
      id,
      ...circle,
      createdAt: circle.createdAt || now,
      updatedAt: now,
    } as any;
    await db.collection("clubs").doc(circle.clubId)
      .collection("circles")
      .doc(id)
      .set(fullCircle, { merge: true });
    return fullCircle;
  }

  async updateTerritoryCircle(circleId: string, updates: Partial<TerritoryCircle>): Promise<TerritoryCircle | undefined> {
    // Note: This requires clubId context. For now we search across all clubs
    const clubs = await this.getAllClubs();
    for (const club of clubs) {
      const doc = await db.collection("clubs").doc(club.id)
        .collection("circles")
        .doc(circleId)
        .get();
      if (doc.exists) {
        const updated = { ...doc.data(), ...updates, updatedAt: new Date() };
        await doc.ref.set(updated);
        return updated as TerritoryCircle;
      }
    }
    return undefined;
  }

  async deleteTerritoryCircle(circleId: string): Promise<boolean> {
    const clubs = await this.getAllClubs();
    for (const club of clubs) {
      const doc = await db.collection("clubs").doc(club.id)
        .collection("circles")
        .doc(circleId)
        .get();
      if (doc.exists) {
        await doc.ref.delete();
        return true;
      }
    }
    return false;
  }

  async calculateAndUpdateTerritoryCircles(clubId: string): Promise<TerritoryCircle[]> {
    const submissions = await this.getClubHoursSubmissions(clubId);
    const club = await this.getClub(clubId);
    if (!club) return [];

    const circles: TerritoryCircle[] = [];
    
    // Accumulate hours from submissions with no location → go to HQ circle
    let hqHours = 0;
    const hqPeople = new Set<string>();
    let hqLastActivity: Date | undefined;

    // Group submissions by location (geohash)
    const locationMap = new Map<string, { lat: number; lng: number; hours: number; people: Set<string>; lastActivity: Date; name: string }>();
    
    for (const sub of submissions) {
      let lat = sub.locationLat ? parseFloat(String(sub.locationLat)) : null;
      let lng = sub.locationLng ? parseFloat(String(sub.locationLng)) : null;
      const submitDate = new Date(sub.date || sub.createdAt || 0);
      
      // Skip submissions at the main club location
      if (club.latitude && club.longitude) {
        const clubLat = parseFloat(String(club.latitude));
        const clubLng = parseFloat(String(club.longitude));
        if (lat === clubLat && lng === clubLng) continue;
      }
      
      if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
        // No location — roll into HQ circle
        hqHours += parseFloat(String(sub.hours)) || 0;
        hqPeople.add(sub.userId);
        if (!hqLastActivity || submitDate > hqLastActivity) hqLastActivity = submitDate;
        continue;
      }

      const geohash = this.geohashId(lat, lng);
      const existing = locationMap.get(geohash);

      if (existing) {
        existing.hours += parseFloat(String(sub.hours)) || 0;
        existing.people.add(sub.userId);
        if (submitDate > existing.lastActivity) existing.lastActivity = submitDate;
      } else {
        locationMap.set(geohash, {
          lat,
          lng,
          hours: parseFloat(String(sub.hours)) || 0,
          people: new Set([sub.userId]),
          lastActivity: submitDate,
          name: sub.activityName || `Volunteer Location`,
        });
      }
    }

    // Build the HQ circle (base 5 miles + hours from no-location submissions)
    if (club.latitude && club.longitude) {
      const clubLat = parseFloat(String(club.latitude));
      const clubLng = parseFloat(String(club.longitude));
      if (!isNaN(clubLat) && !isNaN(clubLng)) {
        const baseKm = 5 * 1.60934;
        const hqRadiusKm = hqHours > 0
          ? Math.max(baseKm, this.calculateTerritoryRadius(hqHours, hqPeople.size, hqLastActivity))
          : baseKm;
        circles.push({
          id: `${clubId}_home`,
          clubId,
          latitude: clubLat,
          longitude: clubLng,
          radiusKm: hqRadiusKm,
          hoursContributed: hqHours,
          peopleCount: hqPeople.size,
          locationName: `${club.name} (Home Base)`,
          isMainClubLocation: true,
          lastActivityAt: hqLastActivity || new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as TerritoryCircle);
      }
    }

    // Calculate and create circles for other locations
    for (const [, location] of locationMap.entries()) {
      const radiusKm = this.calculateTerritoryRadius(location.hours, location.people.size, location.lastActivity);
      
      circles.push({
        id: this.geohashId(location.lat, location.lng),
        clubId,
        latitude: location.lat,
        longitude: location.lng,
        radiusKm,
        hoursContributed: location.hours,
        peopleCount: location.people.size,
        locationName: location.name,
        isMainClubLocation: false,
        lastActivityAt: location.lastActivity,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as TerritoryCircle);
    }

    return circles;
  }

  private geohashId(lat: number, lng: number, precision: number = 7): string {
    const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    let minLat = -90, maxLat = 90, minLng = -180, maxLng = 180;
    let hash = '';
    let bit = 0;
    let ch = 0;
    let isLng = true;
    
    while (hash.length < precision) {
      if (isLng) {
        const mid = (minLng + maxLng) / 2;
        if (lng >= mid) {
          ch |= (1 << (4 - bit));
          minLng = mid;
        } else {
          maxLng = mid;
        }
      } else {
        const mid = (minLat + maxLat) / 2;
        if (lat >= mid) {
          ch |= (1 << (4 - bit));
          minLat = mid;
        } else {
          maxLat = mid;
        }
      }
      isLng = !isLng;
      bit++;
      if (bit === 5) {
        hash += base32[ch];
        bit = 0;
        ch = 0;
      }
    }
    return hash;
  }

  private calculateTerritoryRadius(hours: number, peopleCount: number, lastActivityDate?: Date): number {
    const baseMiles = 5;
    const maxMiles = 20;
    const baseKm = baseMiles * 1.60934;
    const maxKm = maxMiles * 1.60934;

    // Growth factor: fewer people with more hours = greater radius
    // inversely proportional to people count, proportional to hours
    const hoursPerPerson = peopleCount > 0 ? hours / peopleCount : hours;
    const growthFactor = Math.log10(hoursPerPerson + 1) / Math.log10(100);
    let radiusKm = baseKm + (maxKm - baseKm) * Math.min(1, growthFactor);

    // Apply decay for inactive circles
    if (lastActivityDate) {
      const now = new Date();
      const weeksInactive = Math.floor((now.getTime() - lastActivityDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      
      if (weeksInactive > 0) {
        const decayPerWeekKm = 0.25 * 1.60934;
        const maxDecayKm = Math.max(baseKm, radiusKm) * 0.10;
        const totalDecayKm = Math.min(weeksInactive * decayPerWeekKm, maxDecayKm);
        radiusKm = Math.max(baseKm, radiusKm - totalDecayKm);
      }
    }

    return radiusKm;
  }

  // Custom Field Management
  async createCustomField(insertField: InsertCustomField): Promise<CustomField> {
    const id = this.generateId();
    const now = new Date();
    const field: CustomField = { id, ...insertField, createdAt: now, updatedAt: now } as any;
    await db.collection("customFields").doc(id).set(field);
    return field;
  }

  async getCustomFields(clubId: string): Promise<CustomField[]> {
    const snapshot = await db.collection("customFields")
      .where("clubId", "==", clubId)
      .get();
    const fields = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomField));
    return fields.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  async getCustomField(fieldId: string): Promise<CustomField | undefined> {
    const doc = await db.collection("customFields").doc(fieldId).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as CustomField) : undefined;
  }

  async updateCustomField(fieldId: string, updates: Partial<CustomField>): Promise<CustomField | undefined> {
    const doc = await db.collection("customFields").doc(fieldId).get();
    if (!doc.exists) return undefined;
    const updated = { ...doc.data(), ...updates, updatedAt: new Date() };
    await db.collection("customFields").doc(fieldId).set(updated);
    return updated as CustomField;
  }

  async deleteCustomField(fieldId: string): Promise<boolean> {
    const doc = await db.collection("customFields").doc(fieldId).get();
    if (!doc.exists) return false;
    await doc.ref.delete();
    
    // Also delete all field values associated with this field
    const valuesSnapshot = await db.collection("customFieldValues")
      .where("customFieldId", "==", fieldId)
      .get();
    const batch = db.batch();
    valuesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    return true;
  }

  async createCustomFieldValue(insertValue: InsertCustomFieldValue): Promise<CustomFieldValue> {
    const id = this.generateId();
    const now = new Date();
    const value: CustomFieldValue = { id, ...insertValue, createdAt: now, updatedAt: now } as any;
    await db.collection("customFieldValues").doc(id).set(value);
    return value;
  }

  async getCustomFieldValue(userId: string, customFieldId: string): Promise<CustomFieldValue | undefined> {
    const snapshot = await db.collection("customFieldValues")
      .where("userId", "==", userId)
      .where("customFieldId", "==", customFieldId)
      .limit(1)
      .get();
    return snapshot.empty ? undefined : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CustomFieldValue);
  }

  async getCustomFieldValues(userId: string, clubId: string): Promise<CustomFieldValue[]> {
    const snapshot = await db.collection("customFieldValues")
      .where("userId", "==", userId)
      .where("clubId", "==", clubId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomFieldValue));
  }

  async upsertCustomFieldValue(userId: string, customFieldId: string, clubId: string, value: string): Promise<CustomFieldValue> {
    const existing = await this.getCustomFieldValue(userId, customFieldId);
    if (existing) {
      const updated = { ...existing, value, updatedAt: new Date() };
      await db.collection("customFieldValues").doc(existing.id).set(updated);
      return updated as CustomFieldValue;
    } else {
      return this.createCustomFieldValue({
        userId,
        customFieldId,
        clubId,
        value,
      });
    }
  }

  async deleteCustomFieldValue(fieldValueId: string): Promise<boolean> {
    const doc = await db.collection("customFieldValues").doc(fieldValueId).get();
    if (!doc.exists) return false;
    await doc.ref.delete();
    return true;
  }

  async createHoursLog(insertLog: InsertHoursLog): Promise<HoursLog> {
    const id = this.generateId();
    const now = new Date();
    const log: HoursLog = { id, ...insertLog, createdAt: now, updatedAt: now } as any;
    await db.collection("hoursLogs").doc(id).set(log);
    return log;
  }

  async getHoursLogs(clubId: string): Promise<HoursLog[]> {
    const snapshot = await db.collection("hoursLogs")
      .where("clubId", "==", clubId)
      .get();
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HoursLog));
    logs.sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt as any).getTime();
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt as any).getTime();
      return bTime - aTime;
    });
    return logs;
  }

  async updateHoursLog(logId: string, updates: Partial<HoursLog>): Promise<HoursLog | undefined> {
    const doc = await db.collection("hoursLogs").doc(logId).get();
    if (!doc.exists) return undefined;
    const updated = { ...doc.data(), ...updates, updatedAt: new Date() };
    await db.collection("hoursLogs").doc(logId).set(updated);
    return updated as HoursLog;
  }

  async deleteHoursLog(logId: string): Promise<boolean> {
    const doc = await db.collection("hoursLogs").doc(logId).get();
    if (!doc.exists) return false;
    await db.collection("hoursLogs").doc(logId).delete();
    return true;
  }
}

export const storage = new FirestoreStorage();
