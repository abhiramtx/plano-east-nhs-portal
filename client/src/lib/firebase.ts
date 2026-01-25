import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User as FirebaseUser
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  setDoc
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBldNhs1GNNJtJtRgJqn1JuD0sYGFVMJWI",
  authDomain: "volunteerio-893c1.firebaseapp.com",
  projectId: "volunteerio-893c1",
  storageBucket: "volunteerio-893c1.firebasestorage.app",
  messagingSenderId: "1088273269747",
  appId: "1:1088273269747:web:fd30fa3f6d2ced011e0886",
  measurementId: "G-Z4J4ZJ4VMC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export interface User {
  email: string;
  name: string;
  photoURL?: string;
  uid?: string;
}

export interface Club {
  id: string;
  name: string;
  description?: string;
  color: string;
  isPrivate: boolean;
  password?: string;
  creatorEmail: string;
  totalApprovedHours: number;
  bonusHours: number;
  decayedHours: number;
  latitude?: number;
  longitude?: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Membership {
  id: string;
  clubId: string;
  userEmail: string;
  userName: string;
  role: string;
  joinedAt: Date;
}

export interface HoursSubmission {
  id: string;
  clubId: string;
  userEmail: string;
  userName: string;
  hours: number;
  description: string;
  proofImageUrl?: string;
  status: string;
  date: string;
  activityName?: string;
  rejectReason?: string;
  createdAt: string;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  hoursOffered: number;
  createdBy: string;
  creatorName: string;
  creatorEmail: string;
  contactEmail: string;
  contactPhone?: string;
  organizationName?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  maxParticipants?: number;
  dateTime?: string;
  requirements?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceRequestParticipant {
  id: string;
  requestId: string;
  userEmail: string;
  userName: string;
  status: 'joined' | 'approved' | 'rejected' | 'completed';
  hoursAwarded?: number;
  joinedAt: Date;
  approvedAt?: Date;
}

export interface AdminSettings {
  id: string;
  showStudentId: boolean;
  showGradeLevel: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showGpa: boolean;
  decayRate: number;
  maxDecay: number;
  bonusMultiplier: number;
  customFields: string[];
  updatedAt: Date;
  updatedBy: string;
}

export interface UserProfile {
  email: string;
  displayName: string;
  gradeLevel?: string;
  studentId?: string;
  profileComplete: boolean;
  userRole: number;
  createdAt: Date;
  updatedAt: Date;
}

let currentUser: User | null = null;
let authListeners: ((user: User | null) => void)[] = [];

const notifyAuthListeners = (user: User | null) => {
  currentUser = user;
  authListeners.forEach(listener => listener(user));
};

const firebaseUserToUser = (fbUser: FirebaseUser | null): User | null => {
  if (!fbUser || !fbUser.email) return null;
  return {
    email: fbUser.email,
    name: fbUser.displayName || fbUser.email.split('@')[0],
    photoURL: fbUser.photoURL || undefined,
    uid: fbUser.uid
  };
};

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  authListeners.push(callback);
  callback(currentUser);
  
  return () => {
    authListeners = authListeners.filter(listener => listener !== callback);
  };
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = firebaseUserToUser(result.user);
    if (user) {
      notifyAuthListeners(user);
    }
    return user;
  } catch (error) {
    console.error('Failed to sign in with Google:', error);
    throw error;
  }
};

export const handleSignOut = async () => {
  try {
    await firebaseSignOut(auth);
    notifyAuthListeners(null);
  } catch (error) {
    console.error('Failed to sign out:', error);
    throw error;
  }
};

export const getCurrentUser = (): User | null => {
  return currentUser;
};

export const initializeAuth = () => {
  firebaseOnAuthStateChanged(auth, (fbUser) => {
    const user = firebaseUserToUser(fbUser);
    notifyAuthListeners(user);
  });
};

// ============ FIRESTORE DATA OPERATIONS ============

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

// ============ CLUBS ============

export const getClubs = async (): Promise<Club[]> => {
  const querySnapshot = await getDocs(collection(db, "clubs"));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    lastActivityAt: toDate(doc.data().lastActivityAt),
    createdAt: toDate(doc.data().createdAt),
    updatedAt: toDate(doc.data().updatedAt),
  })) as Club[];
};

export const getClub = async (clubId: string): Promise<Club | null> => {
  const docRef = doc(db, "clubs", clubId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    lastActivityAt: toDate(data.lastActivityAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Club;
};

export const createClub = async (clubData: Omit<Club, 'id' | 'createdAt' | 'updatedAt' | 'lastActivityAt' | 'totalApprovedHours' | 'bonusHours' | 'decayedHours'>): Promise<Club> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, "clubs"), {
    ...clubData,
    totalApprovedHours: 0,
    bonusHours: 0,
    decayedHours: 0,
    lastActivityAt: Timestamp.fromDate(now),
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return {
    id: docRef.id,
    ...clubData,
    totalApprovedHours: 0,
    bonusHours: 0,
    decayedHours: 0,
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
  };
};

export const updateClub = async (clubId: string, updates: Partial<Club>): Promise<void> => {
  const docRef = doc(db, "clubs", clubId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

export const deleteClub = async (clubId: string): Promise<void> => {
  await deleteDoc(doc(db, "clubs", clubId));
};

// ============ MEMBERSHIPS ============

export const getMemberships = async (clubId: string): Promise<Membership[]> => {
  const q = query(collection(db, "memberships"), where("clubId", "==", clubId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    joinedAt: toDate(doc.data().joinedAt),
  })) as Membership[];
};

export const getUserMembership = async (userEmail: string): Promise<{ membership: Membership; club: Club } | null> => {
  const q = query(collection(db, "memberships"), where("userEmail", "==", userEmail));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  
  const membershipDoc = querySnapshot.docs[0];
  const membership = {
    id: membershipDoc.id,
    ...membershipDoc.data(),
    joinedAt: toDate(membershipDoc.data().joinedAt),
  } as Membership;
  
  const club = await getClub(membership.clubId);
  if (!club) return null;
  
  return { membership, club };
};

export const createMembership = async (data: { clubId: string; userEmail: string; userName: string; role: string }): Promise<Membership> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, "memberships"), {
    ...data,
    joinedAt: Timestamp.fromDate(now),
  });
  return {
    id: docRef.id,
    ...data,
    joinedAt: now,
  };
};

export const deleteMembership = async (membershipId: string): Promise<void> => {
  await deleteDoc(doc(db, "memberships", membershipId));
};

export const deleteMembershipByUserAndClub = async (userEmail: string, clubId: string): Promise<void> => {
  const q = query(
    collection(db, "memberships"),
    where("userEmail", "==", userEmail),
    where("clubId", "==", clubId)
  );
  const querySnapshot = await getDocs(q);
  const batch = writeBatch(db);
  querySnapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
};

// ============ HOURS SUBMISSIONS ============

export const getClubSubmissions = async (clubId: string): Promise<HoursSubmission[]> => {
  const q = query(collection(db, "submissions"), where("clubId", "==", clubId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    submittedAt: toDate(doc.data().submittedAt),
    reviewedAt: doc.data().reviewedAt ? toDate(doc.data().reviewedAt) : undefined,
  })) as HoursSubmission[];
};

export const getUserSubmissions = async (userEmail: string, clubId?: string): Promise<HoursSubmission[]> => {
  let q;
  if (clubId) {
    q = query(
      collection(db, "submissions"),
      where("userEmail", "==", userEmail),
      where("clubId", "==", clubId)
    );
  } else {
    q = query(
      collection(db, "submissions"),
      where("userEmail", "==", userEmail)
    );
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    submittedAt: toDate(doc.data().submittedAt),
    reviewedAt: doc.data().reviewedAt ? toDate(doc.data().reviewedAt) : undefined,
  })) as HoursSubmission[];
};

export const createSubmission = async (data: Omit<HoursSubmission, 'id' | 'submittedAt' | 'status'>): Promise<HoursSubmission> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, "submissions"), {
    ...data,
    status: "pending",
    submittedAt: Timestamp.fromDate(now),
  });
  return {
    id: docRef.id,
    ...data,
    status: "pending",
    submittedAt: now,
  };
};

export const updateSubmission = async (submissionId: string, updates: Partial<HoursSubmission>): Promise<void> => {
  const docRef = doc(db, "submissions", submissionId);
  const updateData: any = { ...updates };
  if (updates.reviewedAt) {
    updateData.reviewedAt = Timestamp.fromDate(updates.reviewedAt);
  }
  await updateDoc(docRef, updateData);
};

export const deleteSubmission = async (submissionId: string): Promise<void> => {
  await deleteDoc(doc(db, "submissions", submissionId));
};

// ============ SERVICE REQUESTS ============

export const getAllServiceRequests = async (): Promise<ServiceRequest[]> => {
  const querySnapshot = await getDocs(collection(db, "serviceRequests"));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
    updatedAt: toDate(doc.data().updatedAt),
  })) as ServiceRequest[];
};

export const getOpenServiceRequests = async (): Promise<ServiceRequest[]> => {
  const q = query(collection(db, "serviceRequests"), where("status", "==", "open"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
    updatedAt: toDate(doc.data().updatedAt),
  })) as ServiceRequest[];
};

export const getMyServiceRequests = async (email: string): Promise<ServiceRequest[]> => {
  const q = query(collection(db, "serviceRequests"), where("creatorEmail", "==", email));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
    updatedAt: toDate(doc.data().updatedAt),
  })) as ServiceRequest[];
};

export const getServiceRequest = async (requestId: string): Promise<ServiceRequest | null> => {
  const docRef = doc(db, "serviceRequests", requestId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as ServiceRequest;
};

export const createServiceRequest = async (data: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<ServiceRequest> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, "serviceRequests"), {
    ...data,
    status: "open",
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return {
    id: docRef.id,
    ...data,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };
};

export const updateServiceRequest = async (requestId: string, updates: Partial<ServiceRequest>): Promise<void> => {
  const docRef = doc(db, "serviceRequests", requestId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

export const deleteServiceRequest = async (requestId: string): Promise<void> => {
  await deleteDoc(doc(db, "serviceRequests", requestId));
};

// ============ SERVICE REQUEST PARTICIPANTS ============

export const getRequestParticipants = async (requestId: string): Promise<ServiceRequestParticipant[]> => {
  const q = query(collection(db, "serviceRequestParticipants"), where("requestId", "==", requestId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    joinedAt: toDate(doc.data().joinedAt),
    approvedAt: doc.data().approvedAt ? toDate(doc.data().approvedAt) : undefined,
  })) as ServiceRequestParticipant[];
};

export const getUserParticipations = async (userEmail: string): Promise<ServiceRequestParticipant[]> => {
  const q = query(collection(db, "serviceRequestParticipants"), where("userEmail", "==", userEmail));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    joinedAt: toDate(doc.data().joinedAt),
    approvedAt: doc.data().approvedAt ? toDate(doc.data().approvedAt) : undefined,
  })) as ServiceRequestParticipant[];
};

export const joinServiceRequest = async (requestId: string, userEmail: string, userName: string): Promise<ServiceRequestParticipant> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, "serviceRequestParticipants"), {
    requestId,
    userEmail,
    userName,
    status: "joined",
    joinedAt: Timestamp.fromDate(now),
  });
  return {
    id: docRef.id,
    requestId,
    userEmail,
    userName,
    status: "joined",
    joinedAt: now,
  };
};

export const updateParticipant = async (
  participantId: string, 
  updates: Partial<ServiceRequestParticipant>,
  verifyCreator: { requestId: string }
): Promise<void> => {
  const authenticatedUser = getCurrentUser();
  if (!authenticatedUser?.email) {
    throw new Error("You must be logged in to perform this action");
  }
  const requestDoc = await getDoc(doc(db, "serviceRequests", verifyCreator.requestId));
  if (!requestDoc.exists()) {
    throw new Error("Service request not found");
  }
  const requestData = requestDoc.data();
  if (requestData.creatorEmail !== authenticatedUser.email) {
    throw new Error("Only the request creator can modify participants");
  }
  
  const docRef = doc(db, "serviceRequestParticipants", participantId);
  const updateData: any = { ...updates };
  if (updates.approvedAt) {
    updateData.approvedAt = Timestamp.fromDate(updates.approvedAt);
  }
  await updateDoc(docRef, updateData);
};

export const removeParticipant = async (
  participantId: string,
  verifyCreator: { requestId: string }
): Promise<void> => {
  const authenticatedUser = getCurrentUser();
  if (!authenticatedUser?.email) {
    throw new Error("You must be logged in to perform this action");
  }
  const requestDoc = await getDoc(doc(db, "serviceRequests", verifyCreator.requestId));
  if (!requestDoc.exists()) {
    throw new Error("Service request not found");
  }
  const requestData = requestDoc.data();
  if (requestData.creatorEmail !== authenticatedUser.email) {
    throw new Error("Only the request creator can remove participants");
  }
  
  await deleteDoc(doc(db, "serviceRequestParticipants", participantId));
};

// ============ ADMIN SETTINGS ============

export const getAdminSettings = async (): Promise<AdminSettings | null> => {
  const docRef = doc(db, "settings", "admin");
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return {
      id: 'admin',
      showStudentId: true,
      showGradeLevel: true,
      showEmail: true,
      showPhone: false,
      showGpa: true,
      decayRate: 1,
      maxDecay: 10,
      bonusMultiplier: 1.5,
      customFields: [],
      updatedAt: new Date(),
      updatedBy: '',
    };
  }
  const data = docSnap.data();
  return {
    id: docSnap.id,
    showStudentId: data.showStudentId ?? true,
    showGradeLevel: data.showGradeLevel ?? true,
    showEmail: data.showEmail ?? true,
    showPhone: data.showPhone ?? false,
    showGpa: data.showGpa ?? true,
    decayRate: data.decayRate ?? 1,
    maxDecay: data.maxDecay ?? 10,
    bonusMultiplier: data.bonusMultiplier ?? 1.5,
    customFields: data.customFields ?? [],
    updatedAt: toDate(data.updatedAt),
    updatedBy: data.updatedBy ?? '',
  };
};

export const updateAdminSettings = async (updates: Partial<AdminSettings>, updatedBy: string): Promise<void> => {
  const docRef = doc(db, "settings", "admin");
  const docSnap = await getDoc(docRef);
  const now = new Date();
  
  if (docSnap.exists()) {
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.fromDate(now),
      updatedBy,
    });
  } else {
    await setDoc(docRef, {
      showStudentId: true,
      showGradeLevel: true,
      showEmail: true,
      showPhone: false,
      showGpa: true,
      decayRate: 1,
      maxDecay: 10,
      bonusMultiplier: 1.5,
      customFields: [],
      ...updates,
      updatedAt: Timestamp.fromDate(now),
      updatedBy,
    });
  }
};

// ============ USER PROFILES ============

export const getUserProfile = async (email: string): Promise<UserProfile | null> => {
  const docRef = doc(db, "users", email);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    email: docSnap.id,
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as UserProfile;
};

export const createOrUpdateUserProfile = async (email: string, data: Partial<UserProfile>): Promise<void> => {
  const docRef = doc(db, "users", email);
  const docSnap = await getDoc(docRef);
  const now = new Date();
  
  if (docSnap.exists()) {
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.fromDate(now),
    });
  } else {
    await setDoc(docRef, {
      email,
      displayName: data.displayName || email.split('@')[0],
      profileComplete: data.profileComplete || false,
      userRole: data.userRole || 0,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      ...data,
    });
  }
};

// ============ LEADERBOARD ============

export const getLeaderboard = async (): Promise<Club[]> => {
  const clubs = await getClubs();
  return clubs.sort((a, b) => b.totalApprovedHours - a.totalApprovedHours);
};

// ============ STATS ============

export const getClubStats = async (clubId: string): Promise<{ totalHours: number; memberCount: number; pendingCount: number }> => {
  const [submissions, memberships] = await Promise.all([
    getClubSubmissions(clubId),
    getMemberships(clubId),
  ]);
  
  const approvedSubmissions = submissions.filter(s => s.status === "approved");
  const pendingSubmissions = submissions.filter(s => s.status === "pending");
  
  return {
    totalHours: approvedSubmissions.reduce((sum, s) => sum + s.hours, 0),
    memberCount: memberships.length,
    pendingCount: pendingSubmissions.length,
  };
};

export const getUserStats = async (userEmail: string, clubId: string): Promise<{ totalHours: number; approvedHours: number; pendingHours: number }> => {
  const submissions = await getUserSubmissions(userEmail, clubId);
  
  const approvedSubmissions = submissions.filter(s => s.status === "approved");
  const pendingSubmissions = submissions.filter(s => s.status === "pending");
  
  return {
    totalHours: submissions.reduce((sum, s) => sum + s.hours, 0),
    approvedHours: approvedSubmissions.reduce((sum, s) => sum + s.hours, 0),
    pendingHours: pendingSubmissions.reduce((sum, s) => sum + s.hours, 0),
  };
};

// ============ ADMIN FUNCTIONS ============

export const getAllSubmissions = async (): Promise<HoursSubmission[]> => {
  const querySnapshot = await getDocs(collection(db, "submissions"));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    submittedAt: toDate(doc.data().submittedAt),
    reviewedAt: doc.data().reviewedAt ? toDate(doc.data().reviewedAt) : undefined,
  })) as HoursSubmission[];
};

export const getAllUserProfiles = async (): Promise<UserProfile[]> => {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(doc => ({
    email: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
    updatedAt: toDate(doc.data().updatedAt),
  })) as UserProfile[];
};

export const getAdminProfiles = async (): Promise<UserProfile[]> => {
  const q = query(collection(db, "users"), where("userRole", "==", 1));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    email: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
    updatedAt: toDate(doc.data().updatedAt),
  })) as UserProfile[];
};

export const promoteToAdmin = async (email: string): Promise<void> => {
  const docRef = doc(db, "users", email);
  const docSnap = await getDoc(docRef);
  const now = new Date();
  
  if (docSnap.exists()) {
    await updateDoc(docRef, {
      userRole: 1,
      updatedAt: Timestamp.fromDate(now),
    });
  } else {
    await setDoc(docRef, {
      email,
      displayName: email.split('@')[0],
      profileComplete: false,
      userRole: 1,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });
  }
};

export const removeAdminRole = async (email: string): Promise<void> => {
  const docRef = doc(db, "users", email);
  await updateDoc(docRef, {
    userRole: 0,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

export const getAdminAssignment = async (adminEmail: string, skipEmails: string[] = []): Promise<UserProfile | null> => {
  const submissions = await getAllSubmissions();
  const pendingSubmissions = submissions.filter(s => s.status === "pending");
  
  if (pendingSubmissions.length === 0) return null;
  
  const userEmails = [...new Set(pendingSubmissions.map(s => s.userEmail))]
    .filter(email => !skipEmails.includes(email));
  
  for (const email of userEmails) {
    const profile = await getUserProfile(email);
    if (profile) return profile;
  }
  
  return null;
};

export const getPendingSubmissionsForUser = async (userEmail: string): Promise<HoursSubmission[]> => {
  const q = query(
    collection(db, "submissions"),
    where("userEmail", "==", userEmail),
    where("status", "==", "pending")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    submittedAt: toDate(doc.data().submittedAt),
    reviewedAt: doc.data().reviewedAt ? toDate(doc.data().reviewedAt) : undefined,
  })) as HoursSubmission[];
};

export const archiveYearData = async (schoolYear: string): Promise<void> => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const mayFirst = new Date(currentYear, 4, 1);
  const augFirst = new Date(currentYear, 7, 1);
  
  if (now < mayFirst || now > augFirst) {
    throw new Error("Archive operations are only allowed between May 1st and August 1st");
  }
  
  const submissions = await getAllSubmissions();
  const profiles = await getAllUserProfiles();
  
  const archiveRef = doc(db, "yearlyArchives", schoolYear);
  await setDoc(archiveRef, {
    schoolYear,
    submissions: submissions.map(s => ({ ...s })),
    profiles: profiles.map(p => ({ ...p })),
    archivedAt: Timestamp.fromDate(now),
  });
};

export const wipeDatabase = async (): Promise<void> => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const mayFirst = new Date(currentYear, 4, 1);
  const augFirst = new Date(currentYear, 7, 1);
  
  if (now < mayFirst || now > augFirst) {
    throw new Error("Database wipe is only allowed between May 1st and August 1st");
  }
  
  const batch = writeBatch(db);
  
  const submissionsSnapshot = await getDocs(collection(db, "submissions"));
  submissionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  
  await batch.commit();
};

export const removeDemoData = async (): Promise<void> => {
  const demoEmails = ["demo.student@gmail.com", "demouser2@gmail.com", "vabhiram20092@gmail.com"];
  const batch = writeBatch(db);
  
  for (const email of demoEmails) {
    const userDocRef = doc(db, "users", email);
    batch.delete(userDocRef);
  }
  
  const submissionsSnapshot = await getDocs(collection(db, "submissions"));
  submissionsSnapshot.docs.forEach(docSnap => {
    if (demoEmails.includes(docSnap.data().userEmail)) {
      batch.delete(docSnap.ref);
    }
  });
  
  await batch.commit();
};
