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
  logoUrl?: string;
  isPrivate: boolean;
  password?: string;
  inviteCode?: string;
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
  latitude?: number;
  longitude?: number;
  location?: string;
  logId?: string;
  logName?: string;
  eventId?: string;
  eventName?: string;
  partnershipId?: string;
  partnershipName?: string;
  grantedByAdmin?: boolean;
  grantedByPartnershipClub?: boolean;
  approvals?: string[];
  rejections?: string[];
  rejectionReasons?: { [adminEmail: string]: string };
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
  requireProofImage: boolean;
  approvalsRequired: number;
  rejectionsRequired: number;
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
  goByFirstName?: string;
  lastName?: string;
  personalEmailAddress?: string;
  cellPhoneNumber?: string;
  gpa?: string;
  artTeacherName?: string;
  artTeacherEmail?: string;
  phoneNumber?: string;
  clubId?: string;
  role?: string;
  joinedAt?: Date;
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
  if (currentUser !== null) {
    callback(currentUser);
  }
  
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
  
  const club = {
    id: docRef.id,
    ...clubData,
    totalApprovedHours: 0,
    bonusHours: 0,
    decayedHours: 0,
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
  };
  
  // Add creator as admin member
  await createMembership({
    clubId: club.id,
    userEmail: clubData.creatorEmail,
    userName: clubData.creatorEmail.split('@')[0],
    role: 'admin'
  });
  
  return club;
};

export const updateClub = async (clubId: string, updates: Partial<Club>): Promise<void> => {
  const docRef = doc(db, "clubs", clubId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

export const generateInviteCode = async (clubId: string): Promise<string> => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  await updateDoc(doc(db, "clubs", clubId), { inviteCode: code, updatedAt: Timestamp.fromDate(new Date()) });
  return code;
};

export const getClubByInviteCode = async (code: string): Promise<Club | null> => {
  const q = query(collection(db, "clubs"), where("inviteCode", "==", code));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return {
    id: d.id,
    ...data,
    lastActivityAt: toDate(data.lastActivityAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Club;
};

export const recalculateClubHours = async (clubId: string): Promise<void> => {
  // Get current member emails for this club (to catch legacy submissions with clubId="")
  const membershipsQ = query(collection(db, "userProfiles"), where("clubId", "==", clubId));
  const membershipsSnap = await getDocs(membershipsQ);
  const memberEmails = new Set(membershipsSnap.docs.map(d => d.data().email).filter(Boolean));

  // Query submissions with correct clubId
  const mainQ = query(collection(db, "submissions"), where("clubId", "==", clubId));
  const mainSnap = await getDocs(mainQ);

  // Also query submissions with empty clubId that belong to club members (legacy fix)
  const legacyQ = query(collection(db, "submissions"), where("clubId", "==", ""));
  const legacySnap = await getDocs(legacyQ);
  const legacyDocs = legacySnap.docs.filter(d => memberEmails.has(d.data().userEmail));

  // Merge and deduplicate
  const seen = new Set<string>();
  const allDocs = [...mainSnap.docs, ...legacyDocs].filter(d => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });

  const total = allDocs
    .filter(d => d.data().status === "approved")
    .reduce((sum, d) => sum + (d.data().hours || 0), 0);

  await updateDoc(doc(db, "clubs", clubId), {
    totalApprovedHours: total,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

export const deleteClub = async (clubId: string): Promise<void> => {
  await deleteDoc(doc(db, "clubs", clubId));
};

// ============ MEMBERSHIPS ============

export const getMemberships = async (clubId: string): Promise<Membership[]> => {
  const q = query(collection(db, "userProfiles"), where("clubId", "==", clubId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs
    .map(doc => ({
      id: doc.id,
      clubId: doc.data().clubId,
      userEmail: doc.data().email,
      userName: doc.data().goByFirstName || doc.data().displayName || doc.data().email.split('@')[0],
      role: doc.data().role || 'member',
      joinedAt: doc.data().joinedAt ? toDate(doc.data().joinedAt) : new Date(),
    })) as Membership[];
};

export const getUserMembership = async (userEmail: string): Promise<{ membership: Membership; club: Club } | null> => {
  const q = query(collection(db, "userProfiles"), where("email", "==", userEmail));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  
  const userProfileDoc = querySnapshot.docs[0];
  const data = userProfileDoc.data();
  if (!data.clubId) return null;
  
  const membership = {
    id: userProfileDoc.id,
    clubId: data.clubId,
    userEmail: data.email,
    userName: data.goByFirstName || data.displayName || userEmail.split('@')[0],
    role: data.role || 'member',
    joinedAt: data.joinedAt ? toDate(data.joinedAt) : new Date(),
  } as Membership;
  
  console.log('getUserMembership - retrieved membership:', membership);
  
  const club = await getClub(membership.clubId);
  if (!club) return null;
  
  return { membership, club };
};

export const createMembership = async (data: { clubId: string; userEmail: string; userName: string; role: string }): Promise<Membership> => {
  const now = new Date();
  const docRef = doc(db, "userProfiles", data.userEmail);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    await updateDoc(docRef, {
      clubId: data.clubId,
      role: data.role,
      joinedAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });
  } else {
    await setDoc(docRef, {
      email: data.userEmail,
      displayName: data.userName,
      clubId: data.clubId,
      role: data.role,
      joinedAt: Timestamp.fromDate(now),
      profileComplete: false,
      userRole: 0,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }, { merge: true });
  }
  
  return {
    id: data.userEmail,
    ...data,
    joinedAt: now,
  };
};

export const deleteMembership = async (membershipId: string): Promise<void> => {
  const q = query(collection(db, "userProfiles"), where("email", "==", membershipId));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const userProfileDoc = querySnapshot.docs[0];
    await updateDoc(userProfileDoc.ref, {
      clubId: null,
      role: null,
      joinedAt: null,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }
};

export const deleteMembershipByUserAndClub = async (userEmail: string, clubId: string): Promise<void> => {
  const q = query(collection(db, "userProfiles"), where("email", "==", userEmail));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const userProfileDoc = querySnapshot.docs[0];
    const data = userProfileDoc.data();
    if (data.clubId === clubId) {
      await updateDoc(userProfileDoc.ref, {
        clubId: null,
        role: null,
        joinedAt: null,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    }
  }
};

export const updateMembershipRole = async (membershipId: string, role: string): Promise<void> => {
  const q = query(collection(db, "userProfiles"), where("email", "==", membershipId));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const userProfileDoc = querySnapshot.docs[0];
    await updateDoc(userProfileDoc.ref, {
      role,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }
};

export const ensureClubCreatorIsAdmin = async (clubId: string, creatorEmail: string): Promise<void> => {
  const q = query(
    collection(db, "memberships"),
    where("userEmail", "==", creatorEmail),
    where("clubId", "==", clubId)
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const membershipDoc = querySnapshot.docs[0];
    if (membershipDoc.data().role !== 'admin') {
      await updateMembershipRole(membershipDoc.id, 'admin');
      console.log(`Updated ${creatorEmail} to admin for club ${clubId}`);
    }
  }
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

export const getUserSubmissions = async (userEmail: string, clubId: string): Promise<HoursSubmission[]> => {
  const q = query(
    collection(db, "submissions"),
    where("userEmail", "==", userEmail),
    where("clubId", "==", clubId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    submittedAt: toDate(doc.data().submittedAt),
    reviewedAt: doc.data().reviewedAt ? toDate(doc.data().reviewedAt) : undefined,
  })) as HoursSubmission[];
};

export const getUserSubmissionsAllClubs = async (userEmail: string): Promise<HoursSubmission[]> => {
  const q = query(
    collection(db, "submissions"),
    where("userEmail", "==", userEmail)
  );
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

// Archive submission to history when resetting data
export const archiveSubmission = async (submission: HoursSubmission, clubName: string, archivePeriod: string): Promise<void> => {
  const now = new Date();
  const archivedData = {
    ...submission,
    clubName,
    archivePeriod,
    archivedAt: Timestamp.fromDate(now),
  };
  await addDoc(collection(db, "submissionArchive"), archivedData);
};

export const getAllArchivedSubmissions = async (clubId: string): Promise<(HoursSubmission & { clubName?: string; archivePeriod?: string; archivedAt?: Date })[]> => {
  const q = query(collection(db, "submissionArchive"), where("clubId", "==", clubId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    submittedAt: doc.data().submittedAt ? toDate(doc.data().submittedAt) : new Date(),
    reviewedAt: doc.data().reviewedAt ? toDate(doc.data().reviewedAt) : undefined,
    archivedAt: doc.data().archivedAt ? toDate(doc.data().archivedAt) : undefined,
  })) as (HoursSubmission & { clubName?: string; archivePeriod?: string; archivedAt?: Date })[];
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
  const docRef = doc(db, "userProfiles", email);
  const docSnap = await getDoc(docRef);
  const altId = email.includes(',') ? email.replace(/,/g, '.') : email.replace(/\./g, ',');
  const altRef = doc(db, "userProfiles", altId);
  const altSnap = await getDoc(altRef);
  const primary = docSnap.exists() ? docSnap.data() : null;
  const alt = altSnap.exists() ? altSnap.data() : null;
  if (!primary && !alt) return null;
  const merged: any = {};
  for (const obj of [primary, alt]) {
    if (!obj) continue;
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined && v !== null && v !== '') merged[k] = v;
    }
  }
  return {
    email: email.replace(/,/g, '.'),
    ...merged,
    createdAt: toDate(merged.createdAt),
    updatedAt: toDate(merged.updatedAt),
  } as UserProfile;
};

export const createOrUpdateUserProfile = async (email: string, data: Partial<UserProfile>): Promise<void> => {
  const docRef = doc(db, "userProfiles", email);
  const docSnap = await getDoc(docRef);
  const now = new Date();
  
  if (docSnap.exists()) {
    await updateDoc(docRef, {
      ...data,
      email,
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
  const querySnapshot = await getDocs(collection(db, "userProfiles"));
  return querySnapshot.docs.map(doc => ({
    email: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
    updatedAt: toDate(doc.data().updatedAt),
  })) as UserProfile[];
};

export const getAdminProfiles = async (): Promise<UserProfile[]> => {
  const q = query(collection(db, "userProfiles"), where("userRole", "==", 1));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    email: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
    updatedAt: toDate(doc.data().updatedAt),
  })) as UserProfile[];
};

export const promoteToAdmin = async (email: string, clubId?: string): Promise<void> => {
  const now = new Date();
  const docRef = doc(db, "userProfiles", email);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    await updateDoc(docRef, {
      role: "admin",
      updatedAt: Timestamp.fromDate(now),
    });
  } else if (clubId) {
    // If user profile doesn't exist but clubId is provided, create it
    await setDoc(docRef, {
      email,
      displayName: email.split('@')[0],
      profileComplete: false,
      userRole: 0,
      clubId,
      role: "admin",
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }, { merge: true });
  }
};

export const removeAdminRole = async (email: string, clubId?: string): Promise<void> => {
  const now = new Date();
  
  // Update userProfile
  const q = query(collection(db, "userProfiles"), where("email", "==", email));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const userProfileDoc = querySnapshot.docs[0];
    await updateDoc(userProfileDoc.ref, {
      role: "member",
      updatedAt: Timestamp.fromDate(now),
    });
  }
};

export const getAdminAssignment = async (adminEmail: string, skipEmails: string[] = []): Promise<UserProfile | null> => {
  const submissions = await getAllSubmissions();
  const pendingSubmissions = submissions.filter(s => s.status === "pending");
  
  if (pendingSubmissions.length === 0) return null;
  
  const userEmails = Array.from(new Set(pendingSubmissions.map(s => s.userEmail)))
    .filter(email => !skipEmails.includes(email));
  
  for (const email of userEmails) {
    const profile = await getUserProfile(email);
    if (profile) return profile;
  }
  
  return null;
};

export const getAdminAssignmentForClub = async (clubId: string, adminEmail: string, skipEmails: string[] = []): Promise<UserProfile | null> => {
  const submissions = await getClubSubmissions(clubId);
  const pendingSubmissions = submissions.filter(s => s.status === "pending");
  
  if (pendingSubmissions.length === 0) return null;
  
  const userEmails = Array.from(new Set(pendingSubmissions.map(s => s.userEmail)))
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

export const getPendingSubmissionsForUserInClub = async (userEmail: string, clubId: string): Promise<HoursSubmission[]> => {
  const q = query(
    collection(db, "submissions"),
    where("userEmail", "==", userEmail),
    where("clubId", "==", clubId),
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

export const archiveYearData = async (schoolYear: string, clubId?: string, clubName?: string): Promise<void> => {
  const now = new Date();
  const submissions = await getAllSubmissions();
  const profiles = await getAllUserProfiles();

  // Filter submissions to this club if provided
  const clubSubmissions = clubId ? submissions.filter(s => s.clubId === clubId) : submissions;

  // Write each submission as an individual record to submissionArchive (what the history page reads)
  const archiveBatch = writeBatch(db);
  for (const s of clubSubmissions) {
    const archiveDocRef = doc(collection(db, "submissionArchive"));
    const { id: _id, ...rest } = s as any;
    archiveBatch.set(archiveDocRef, {
      ...rest,
      clubName: clubName || rest.clubName || '',
      archivePeriod: schoolYear,
      archivedAt: Timestamp.fromDate(now),
      submittedAt: s.submittedAt instanceof Date ? Timestamp.fromDate(s.submittedAt) : s.submittedAt,
      reviewedAt: s.reviewedAt instanceof Date ? Timestamp.fromDate(s.reviewedAt) : (s.reviewedAt ?? null),
    });
  }
  await archiveBatch.commit();

  // Also keep the yearlyArchives snapshot for admin reference
  const archiveRef = doc(db, "yearlyArchives", schoolYear);
  await setDoc(archiveRef, {
    schoolYear,
    submissions: clubSubmissions.map(s => ({ ...s })),
    profiles: profiles.map(p => ({ ...p })),
    archivedAt: Timestamp.fromDate(now),
  });
};

export const wipeDatabase = async (): Promise<void> => {
  const batch = writeBatch(db);
  
  const submissionsSnapshot = await getDocs(collection(db, "submissions"));
  submissionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

  const hoursLogsSnapshot = await getDocs(collection(db, "hoursLogs"));
  hoursLogsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

  const participantsSnapshot = await getDocs(collection(db, "serviceRequestParticipants"));
  participantsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  
  await batch.commit();
};

export const logClubLeave = async (userEmail: string, clubId: string, clubName: string): Promise<void> => {
  const now = new Date();
  await addDoc(collection(db, "clubLeaveHistory"), {
    userEmail,
    clubId,
    clubName,
    title: `${clubName} - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    leftAt: Timestamp.fromDate(now),
  });
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
export interface TerritoryCircle {
  id: string;
  clubId: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  hoursContributed: number;
  peopleCount: number;
  locationName?: string;
  isMainClubLocation: boolean;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============ EVENTS ============

export interface EventConditional {
  id: string;
  type: 'less' | 'exact' | 'more';
  thresholdHours: number;
  grantHours: number;
}

export interface ClubEvent {
  id: string;
  clubId?: string;
  partnershipId?: string;
  name: string;
  description?: string;
  type: 'password' | 'none' | 'scan_qr' | 'show_qr';
  password?: string;
  logId?: string;
  logName?: string;
  targetClubId?: string;
  isOpen?: boolean;
  conditionals: EventConditional[];
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventAttendance {
  id: string;
  eventId: string;
  eventName?: string;
  clubId?: string;
  partnershipId?: string;
  userEmail: string;
  userName: string;
  checkInTime?: Date;
  checkOutTime?: Date;
  minutesAttended?: number;
  hoursGranted?: number;
  grantStatus: 'pending' | 'granted';
  createdAt: Date;
}

// ============ PARTNERSHIPS ============

export interface Partnership {
  id: string;
  name: string;
  description?: string;
  ownerEmail: string;
  ownerName: string;
  orgType: 'business' | 'nonprofit' | 'school' | 'government' | 'other';
  requireApproval: boolean;
  latitude?: number;
  longitude?: number;
  address?: string;
  color: string;
  logoUrl?: string;
  affiliatedClubIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnershipAffiliation {
  id: string;
  partnershipId: string;
  partnershipName: string;
  clubId: string;
  clubName: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  respondedAt?: Date;
}

export const getTerritoryCircles = async (clubId: string): Promise<TerritoryCircle[]> => {
  try {
    const response = await fetch(`/api/clubs/${clubId}/territories`);
    if (!response.ok) throw new Error('Failed to fetch territories');
    return await response.json();
  } catch (error) {
    console.error('Error fetching territory circles:', error);
    return [];
  }
};

export const getAllTerritoryCircles = async (clubs: Club[]): Promise<(TerritoryCircle & { clubName: string; clubColor: string })[]> => {
  try {
    const allCircles: (TerritoryCircle & { clubName: string; clubColor: string })[] = [];
    
    for (const club of clubs) {
      const circles = await getTerritoryCircles(club.id);
      allCircles.push(...circles.map(c => ({
        ...c,
        clubName: club.name,
        clubColor: club.color,
      })));
    }
    
    return allCircles;
  } catch (error) {
    console.error('Error fetching all territory circles:', error);
    return [];
  }
};

export const updateTerritoryCircles = async (clubId: string): Promise<TerritoryCircle[]> => {
  try {
    const response = await fetch(`/api/clubs/${clubId}/territories/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to update territories');
    return await response.json();
  } catch (error) {
    console.error('Error updating territory circles:', error);
    return [];
  }
};

// ============ EVENTS FIRESTORE FUNCTIONS ============

const toEvent = (docSnap: any): ClubEvent => {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    ...d,
    conditionals: d.conditionals || [],
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  } as ClubEvent;
};

export const getClubEvents = async (clubId: string): Promise<ClubEvent[]> => {
  const q = query(collection(db, "events"), where("clubId", "==", clubId));
  const snap = await getDocs(q);
  return snap.docs.map(toEvent);
};

export const getPartnershipEvents = async (partnershipId: string): Promise<ClubEvent[]> => {
  const q = query(collection(db, "events"), where("partnershipId", "==", partnershipId));
  const snap = await getDocs(q);
  return snap.docs.map(toEvent);
};

export const createEvent = async (data: Omit<ClubEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClubEvent> => {
  const now = new Date();
  // Strip undefined values — Firestore rejects them
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }
  const docRef = await addDoc(collection(db, "events"), {
    ...clean,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return { id: docRef.id, ...data, createdAt: now, updatedAt: now };
};

export const updateEvent = async (eventId: string, updates: Partial<ClubEvent>): Promise<void> => {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) clean[k] = v;
  }
  await updateDoc(doc(db, "events", eventId), {
    ...clean,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  await deleteDoc(doc(db, "events", eventId));
};

// ============ EVENT ATTENDANCE ============

const toAttendance = (docSnap: any): EventAttendance => {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    ...d,
    checkInTime: d.checkInTime ? toDate(d.checkInTime) : undefined,
    checkOutTime: d.checkOutTime ? toDate(d.checkOutTime) : undefined,
    createdAt: toDate(d.createdAt),
  } as EventAttendance;
};

export const getEventAttendance = async (eventId: string): Promise<EventAttendance[]> => {
  const q = query(collection(db, "eventAttendance"), where("eventId", "==", eventId));
  const snap = await getDocs(q);
  return snap.docs.map(toAttendance);
};

export const checkInUser = async (eventId: string, eventName: string, userEmail: string, userName: string, clubId?: string, partnershipId?: string): Promise<EventAttendance> => {
  const now = new Date();
  // Check if already checked in
  const existing = await getEventAttendance(eventId);
  const existingRecord = existing.find(a => a.userEmail === userEmail);
  if (existingRecord) return existingRecord;
  const docRef = await addDoc(collection(db, "eventAttendance"), {
    eventId,
    eventName,
    userEmail,
    userName,
    clubId: clubId || null,
    partnershipId: partnershipId || null,
    checkInTime: Timestamp.fromDate(now),
    grantStatus: 'pending',
    createdAt: Timestamp.fromDate(now),
  });
  return { id: docRef.id, eventId, eventName, userEmail, userName, clubId, partnershipId, checkInTime: now, grantStatus: 'pending', createdAt: now };
};

export const checkOutUser = async (attendanceId: string): Promise<void> => {
  const now = new Date();
  const docRef = doc(db, "eventAttendance", attendanceId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;
  const data = docSnap.data();
  const checkIn = data.checkInTime ? toDate(data.checkInTime) : now;
  const minutesAttended = Math.round((now.getTime() - checkIn.getTime()) / 60000);
  await updateDoc(docRef, {
    checkOutTime: Timestamp.fromDate(now),
    minutesAttended,
  });
};

export const updateAttendanceHours = async (attendanceId: string, hoursGranted: number): Promise<void> => {
  await updateDoc(doc(db, "eventAttendance", attendanceId), {
    hoursGranted,
    grantStatus: 'granted',
  });
};

export const grantEventHours = async (
  eventId: string,
  eventName: string,
  attendanceRecords: EventAttendance[],
  defaultHours: number | null,
  conditionals: EventConditional[],
  clubId?: string,
  logId?: string,
  logName?: string,
  partnershipId?: string,
): Promise<void> => {
  const batch = writeBatch(db);
  const now = new Date();

  for (const record of attendanceRecords) {
    let hours = defaultHours;
    if (conditionals.length > 0 && record.minutesAttended != null) {
      const hoursAttended = record.minutesAttended / 60;
      for (const cond of conditionals) {
        if (cond.type === 'less' && hoursAttended < cond.thresholdHours) { hours = cond.grantHours; break; }
        if (cond.type === 'exact' && Math.abs(hoursAttended - cond.thresholdHours) < 0.1) { hours = cond.grantHours; break; }
        if (cond.type === 'more' && hoursAttended >= cond.thresholdHours) { hours = cond.grantHours; break; }
      }
    }
    if (hours == null || hours <= 0) continue;

    const resolvedClubId = clubId || record.clubId || null;

    const attendRef = doc(db, "eventAttendance", record.id);
    batch.update(attendRef, { hoursGranted: hours, grantStatus: 'granted' });

    const submissionRef = doc(collection(db, "submissions"));
    batch.set(submissionRef, {
      clubId: resolvedClubId,
      partnershipId: partnershipId || null,
      userEmail: record.userEmail,
      userName: record.userName,
      hours,
      description: `Event: ${eventName}`,
      activityName: eventName,
      date: now.toISOString().split('T')[0],
      status: 'approved',
      logId: logId || null,
      logName: logName || null,
      eventId,
      eventName,
      grantedByAdmin: true,
      submittedAt: Timestamp.fromDate(now),
      reviewedAt: Timestamp.fromDate(now),
      createdAt: now.toISOString(),
    });
  }

  await batch.commit();
};

export const grantPartnershipHoursAsPending = async (
  eventId: string,
  eventName: string,
  attendanceRecords: EventAttendance[],
  defaultHours: number | null,
  conditionals: EventConditional[],
  clubId: string,
  logId?: string,
  logName?: string,
  partnershipId?: string,
  partnershipName?: string,
): Promise<void> => {
  const batch = writeBatch(db);
  const now = new Date();

  for (const record of attendanceRecords) {
    let hours = defaultHours;
    if (conditionals.length > 0 && record.minutesAttended != null) {
      const hoursAttended = record.minutesAttended / 60;
      for (const cond of conditionals) {
        if (cond.type === 'less' && hoursAttended < cond.thresholdHours) { hours = cond.grantHours; break; }
        if (cond.type === 'exact' && Math.abs(hoursAttended - cond.thresholdHours) < 0.1) { hours = cond.grantHours; break; }
        if (cond.type === 'more' && hoursAttended >= cond.thresholdHours) { hours = cond.grantHours; break; }
      }
    }
    if (hours == null || hours <= 0) continue;

    const submissionRef = doc(collection(db, "submissions"));
    batch.set(submissionRef, {
      clubId,
      partnershipId: partnershipId || null,
      partnershipName: partnershipName || null,
      userEmail: record.userEmail,
      userName: record.userName,
      hours,
      description: `Partnership event: ${eventName}${record.minutesAttended != null ? ` (${Math.floor(record.minutesAttended / 60)}h ${record.minutesAttended % 60}m attended)` : ''}`,
      activityName: eventName,
      date: now.toISOString().split('T')[0],
      status: 'pending',
      logId: logId || null,
      logName: logName || null,
      eventId,
      eventName,
      grantedByPartnershipClub: true,
      submittedAt: Timestamp.fromDate(now),
      createdAt: now.toISOString(),
    });
  }

  await batch.commit();
};

export const checkInByQR = async (eventId: string, eventName: string, userEmail: string, clubId?: string, partnershipId?: string): Promise<{ success: boolean; message: string; record?: EventAttendance }> => {
  const existing = await getEventAttendance(eventId);
  const rec = existing.find(a => a.userEmail === userEmail);
  if (rec && !rec.checkOutTime) {
    return { success: false, message: `${userEmail} is already checked in` };
  }
  const profile = await getUserProfile(userEmail);
  const userName = profile ? [profile.goByFirstName, profile.lastName].filter(Boolean).join(' ') || userEmail : userEmail;
  const record = await checkInUser(eventId, eventName, userEmail, userName, clubId, partnershipId);
  return { success: true, message: `Checked in: ${userName}`, record };
};

export const checkOutByQR = async (eventId: string, userEmail: string): Promise<{ success: boolean; message: string }> => {
  const existing = await getEventAttendance(eventId);
  const rec = existing.find(a => a.userEmail === userEmail && !a.checkOutTime);
  if (!rec) return { success: false, message: `${userEmail} is not checked in` };
  await checkOutUser(rec.id);
  const profile = await getUserProfile(userEmail);
  const userName = profile ? [profile.goByFirstName, profile.lastName].filter(Boolean).join(' ') || userEmail : userEmail;
  return { success: true, message: `Checked out: ${userName}` };
};

// ============ PARTNERSHIPS FIRESTORE FUNCTIONS ============

const toPartnership = (docSnap: any): Partnership => {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    ...d,
    affiliatedClubIds: d.affiliatedClubIds || [],
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  } as Partnership;
};

export const getAllPartnerships = async (): Promise<Partnership[]> => {
  const snap = await getDocs(collection(db, "partnerships"));
  return snap.docs.map(toPartnership);
};

export const getPartnershipsByOwner = async (ownerEmail: string): Promise<Partnership[]> => {
  const q = query(collection(db, "partnerships"), where("ownerEmail", "==", ownerEmail));
  const snap = await getDocs(q);
  return snap.docs.map(toPartnership);
};

export const getPartnership = async (partnershipId: string): Promise<Partnership | null> => {
  const docSnap = await getDoc(doc(db, "partnerships", partnershipId));
  if (!docSnap.exists()) return null;
  return toPartnership(docSnap);
};

export const createPartnership = async (data: Omit<Partnership, 'id' | 'createdAt' | 'updatedAt' | 'affiliatedClubIds'>): Promise<Partnership> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, "partnerships"), {
    ...data,
    affiliatedClubIds: [],
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return { id: docRef.id, ...data, affiliatedClubIds: [], createdAt: now, updatedAt: now };
};

export const updatePartnership = async (partnershipId: string, updates: Partial<Partnership>): Promise<void> => {
  await updateDoc(doc(db, "partnerships", partnershipId), {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

export const deletePartnership = async (partnershipId: string): Promise<void> => {
  await deleteDoc(doc(db, "partnerships", partnershipId));
};

export const getPartnershipSubmissions = async (partnershipId: string): Promise<HoursSubmission[]> => {
  const q = query(collection(db, "submissions"), where("partnershipId", "==", partnershipId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    submittedAt: toDate(d.data().submittedAt),
    reviewedAt: d.data().reviewedAt ? toDate(d.data().reviewedAt) : undefined,
  })) as HoursSubmission[];
};

// ============ PARTNERSHIP AFFILIATIONS ============

const toAffiliation = (docSnap: any): PartnershipAffiliation => {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    ...d,
    requestedAt: toDate(d.requestedAt),
    respondedAt: d.respondedAt ? toDate(d.respondedAt) : undefined,
  } as PartnershipAffiliation;
};

export const getPartnershipAffiliations = async (partnershipId: string): Promise<PartnershipAffiliation[]> => {
  const q = query(collection(db, "partnershipAffiliations"), where("partnershipId", "==", partnershipId));
  const snap = await getDocs(q);
  return snap.docs.map(toAffiliation);
};

export const getClubAffiliations = async (clubId: string): Promise<PartnershipAffiliation[]> => {
  const q = query(collection(db, "partnershipAffiliations"), where("clubId", "==", clubId));
  const snap = await getDocs(q);
  return snap.docs.map(toAffiliation);
};

export const requestAffiliation = async (partnershipId: string, partnershipName: string, clubId: string, clubName: string, requestedBy: string): Promise<PartnershipAffiliation> => {
  const now = new Date();
  // Check if already exists
  const existing = await getPartnershipAffiliations(partnershipId);
  const already = existing.find(a => a.clubId === clubId);
  if (already) return already;
  const docRef = await addDoc(collection(db, "partnershipAffiliations"), {
    partnershipId, partnershipName, clubId, clubName, requestedBy,
    status: 'pending',
    requestedAt: Timestamp.fromDate(now),
  });
  return { id: docRef.id, partnershipId, partnershipName, clubId, clubName, requestedBy, status: 'pending', requestedAt: now };
};

export const respondToAffiliation = async (affiliationId: string, partnershipId: string, clubId: string, status: 'approved' | 'rejected'): Promise<void> => {
  const now = new Date();
  await updateDoc(doc(db, "partnershipAffiliations", affiliationId), {
    status,
    respondedAt: Timestamp.fromDate(now),
  });
  if (status === 'approved') {
    const partnershipDoc = await getDoc(doc(db, "partnerships", partnershipId));
    if (partnershipDoc.exists()) {
      const current: string[] = partnershipDoc.data().affiliatedClubIds || [];
      if (!current.includes(clubId)) {
        await updateDoc(doc(db, "partnerships", partnershipId), {
          affiliatedClubIds: [...current, clubId],
          updatedAt: Timestamp.fromDate(now),
        });
      }
    }
  }
};

export const removeAffiliation = async (affiliationId: string, partnershipId: string, clubId: string): Promise<void> => {
  await deleteDoc(doc(db, "partnershipAffiliations", affiliationId));
  const partnershipDoc = await getDoc(doc(db, "partnerships", partnershipId));
  if (partnershipDoc.exists()) {
    const current: string[] = partnershipDoc.data().affiliatedClubIds || [];
    await updateDoc(doc(db, "partnerships", partnershipId), {
      affiliatedClubIds: current.filter(id => id !== clubId),
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }
};