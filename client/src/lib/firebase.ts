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
  yearlyApprovedHours: number;
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
  grantedByAdmin?: boolean;
  approvals?: string[];
  rejections?: string[];
  rejectionReasons?: { [adminEmail: string]: string };
  // Per-superclub approval state for affiliated submissions.
  // Key = superClubId. Independent of original sub-club approval.
  superClubStatus?: {
    [superClubId: string]: {
      status: 'pending' | 'approved' | 'rejected';
      approvals?: string[];
      rejections?: string[];
      rejectionReasons?: { [adminEmail: string]: string };
      hours?: number;
      approvedBy?: string;
      approvedAt?: any;
      rejectReason?: string;
    };
  };
}

export interface Affiliation {
  id: string;
  subClubId: string;
  subClubName: string;
  superClubId: string;
  superClubName: string;
  requestedBy: string; // email of admin who sent request
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  respondedAt?: Date;
  respondedBy?: string;
}

export interface ClubBookmark {
  id: string;
  userEmail: string;
  clubId: string;
  createdAt: Date;
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
  clubId?: string; // currently-active club (kept for back-compat)
  clubIds?: string[]; // every club the user has joined
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

// Strip undefined values from objects before writing to Firestore (Firestore rejects undefined)
const stripUndefined = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) result[k] = v;
  }
  return result;
};

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
  // Strip undefined values — Firestore rejects them
  const safeData: any = {};
  for (const [k, v] of Object.entries(clubData)) {
    if (v !== undefined) safeData[k] = v;
  }
  const docRef = await addDoc(collection(db, "clubs"), {
    ...safeData,
    totalApprovedHours: 0,
    yearlyApprovedHours: 0,
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
    yearlyApprovedHours: 0,
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

  const currentYear = new Date().getFullYear();
  const approvedDocs = allDocs.filter(d => d.data().status === "approved");

  const total = approvedDocs.reduce((sum, d) => sum + (d.data().hours || 0), 0);

  const yearly = approvedDocs
    .filter(d => {
      const dateStr = d.data().date;
      if (!dateStr) return false;
      const year = new Date(dateStr).getFullYear();
      return year === currentYear;
    })
    .reduce((sum, d) => sum + (d.data().hours || 0), 0);

  await updateDoc(doc(db, "clubs", clubId), {
    totalApprovedHours: total,
    yearlyApprovedHours: yearly,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

export const deleteClub = async (clubId: string): Promise<void> => {
  await deleteDoc(doc(db, "clubs", clubId));
};

// ============ MEMBERSHIPS ============

export const getMemberships = async (clubId: string): Promise<Membership[]> => {
  // Query both legacy single-club field and the multi-club array, then merge unique-by-email.
  const [aSnap, bSnap] = await Promise.all([
    getDocs(query(collection(db, "userProfiles"), where("clubId", "==", clubId))),
    getDocs(query(collection(db, "userProfiles"), where("clubIds", "array-contains", clubId))),
  ]);
  const seen = new Set<string>();
  const out: Membership[] = [];
  for (const docSnap of [...aSnap.docs, ...bSnap.docs]) {
    if (seen.has(docSnap.id)) continue;
    seen.add(docSnap.id);
    const d = docSnap.data();
    out.push({
      id: docSnap.id,
      clubId,
      userEmail: d.email,
      userName: d.goByFirstName || d.displayName || (d.email || '').split('@')[0],
      role: d.role || 'member',
      joinedAt: d.joinedAt ? toDate(d.joinedAt) : new Date(),
    });
  }
  return out;
};

// Returns every club this user has joined (active + others).
export const getUserMemberships = async (
  userEmail: string,
): Promise<{ membership: Membership; club: Club }[]> => {
  const q = query(collection(db, "userProfiles"), where("email", "==", userEmail));
  const snap = await getDocs(q);
  if (snap.empty) return [];
  const data = snap.docs[0].data();
  const ids = new Set<string>();
  if (Array.isArray(data.clubIds)) data.clubIds.forEach((id: string) => id && ids.add(id));
  if (data.clubId) ids.add(data.clubId);
  const out: { membership: Membership; club: Club }[] = [];
  for (const clubId of Array.from(ids)) {
    const club = await getClub(clubId);
    if (!club) continue;
    out.push({
      club,
      membership: {
        id: snap.docs[0].id,
        clubId,
        userEmail: data.email || userEmail,
        userName: data.goByFirstName || data.displayName || userEmail.split('@')[0],
        role: clubId === data.clubId ? (data.role || 'member') : 'member',
        joinedAt: data.joinedAt ? toDate(data.joinedAt) : new Date(),
      },
    });
  }
  // Active club (matching userProfile.clubId) sorted first
  out.sort((a, b) => {
    if (a.club.id === data.clubId) return -1;
    if (b.club.id === data.clubId) return 1;
    return a.club.name.localeCompare(b.club.name);
  });
  return out;
};

// Switch the active (current) club for a user without touching their memberships.
export const switchActiveClub = async (userEmail: string, clubId: string): Promise<void> => {
  const docRef = doc(db, "userProfiles", userEmail);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;
  const data = docSnap.data();
  const ids: string[] = Array.isArray(data.clubIds) ? data.clubIds.slice() : [];
  if (!ids.includes(clubId)) ids.push(clubId);
  await updateDoc(docRef, {
    clubId,
    clubIds: ids,
    updatedAt: Timestamp.fromDate(new Date()),
  });
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
    const existing = docSnap.data();
    const ids: string[] = Array.isArray(existing.clubIds) ? existing.clubIds.slice() : [];
    if (existing.clubId && !ids.includes(existing.clubId)) ids.push(existing.clubId);
    if (!ids.includes(data.clubId)) ids.push(data.clubId);
    await updateDoc(docRef, {
      clubId: data.clubId, // make this the active club
      clubIds: ids,
      role: data.role,
      joinedAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });
  } else {
    await setDoc(docRef, {
      email: data.userEmail,
      displayName: data.userName,
      clubId: data.clubId,
      clubIds: [data.clubId],
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
  if (querySnapshot.empty) return;
  const userProfileDoc = querySnapshot.docs[0];
  const data = userProfileDoc.data();
  const ids: string[] = Array.isArray(data.clubIds) ? data.clubIds.filter((id: string) => id !== clubId) : [];
  const newActive = data.clubId === clubId ? (ids[0] || null) : (data.clubId || null);
  await updateDoc(userProfileDoc.ref, {
    clubId: newActive,
    clubIds: ids,
    role: data.clubId === clubId ? null : data.role,
    joinedAt: data.clubId === clubId ? null : data.joinedAt,
    updatedAt: Timestamp.fromDate(new Date()),
  });
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
  const docRef = doc(db, "userProfiles", creatorEmail);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;
  const data = docSnap.data();
  if (data.clubId === clubId && data.role !== 'admin') {
    await updateDoc(docRef, { role: 'admin', updatedAt: Timestamp.fromDate(new Date()) });
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
  const updateData: any = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) updateData[k] = v;
  }
  if (updates.reviewedAt) {
    updateData.reviewedAt = Timestamp.fromDate(updates.reviewedAt);
  }
  await updateDoc(docRef, updateData);
};

export const deleteSubmission = async (submissionId: string): Promise<void> => {
  await deleteDoc(doc(db, "submissions", submissionId));
};

// Archive all of a user's submissions for a club when they leave, then delete them from live submissions
export const archiveUserSubmissionsOnLeave = async (userEmail: string, clubId: string, clubName: string): Promise<void> => {
  const submissions = await getUserSubmissions(userEmail, clubId);
  if (submissions.length === 0) return;

  const now = new Date();
  const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const archivePeriod = `Left ${clubName} – ${monthYear}`;

  const batch = writeBatch(db);
  for (const sub of submissions) {
    const archiveRef = doc(collection(db, "submissionArchive"));
    batch.set(archiveRef, {
      ...sub,
      clubName,
      archivePeriod,
      archivedAt: Timestamp.fromDate(now),
      submittedAt: sub.submittedAt ? Timestamp.fromDate(new Date(sub.submittedAt)) : Timestamp.fromDate(now),
      reviewedAt: sub.reviewedAt ? Timestamp.fromDate(new Date(sub.reviewedAt)) : null,
    });
    batch.delete(doc(db, "submissions", sub.id));
  }
  await batch.commit();
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
  // Read from new per-submission collection
  const newQ = query(collection(db, "submissionArchive"), where("clubId", "==", clubId));
  const newSnap = await getDocs(newQ);
  const newResults = newSnap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    submittedAt: d.data().submittedAt ? toDate(d.data().submittedAt) : new Date(),
    reviewedAt: d.data().reviewedAt ? toDate(d.data().reviewedAt) : undefined,
    archivedAt: d.data().archivedAt ? toDate(d.data().archivedAt) : undefined,
  })) as (HoursSubmission & { clubName?: string; archivePeriod?: string; archivedAt?: Date })[];

  // Also read from legacy yearlyArchives snapshots (each doc has a `submissions` array)
  const legacySnap = await getDocs(collection(db, "yearlyArchives"));
  const legacyResults: (HoursSubmission & { clubName?: string; archivePeriod?: string; archivedAt?: Date })[] = [];
  for (const archiveDoc of legacySnap.docs) {
    const data = archiveDoc.data();
    const period = data.schoolYear || archiveDoc.id;
    const archivedAt = data.archivedAt ? toDate(data.archivedAt) : undefined;
    const subs: any[] = data.submissions || [];
    for (const s of subs) {
      if (s.clubId === clubId || !s.clubId) {
        legacyResults.push({
          ...s,
          id: `${archiveDoc.id}_${s.id || s.userEmail}`,
          archivePeriod: period,
          archivedAt,
          submittedAt: s.submittedAt ? toDate(s.submittedAt) : new Date(),
          reviewedAt: s.reviewedAt ? toDate(s.reviewedAt) : undefined,
        });
      }
    }
  }

  // Merge — deduplicate by a stable key to avoid showing same submission twice
  const seen = new Set(newResults.map(r => `${r.userEmail}_${r.submittedAt?.getTime?.()}_${r.archivePeriod}`));
  const deduped = legacyResults.filter(r => {
    const key = `${r.userEmail}_${r.submittedAt?.getTime?.()}_${r.archivePeriod}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return [...newResults, ...deduped];
};

export const getAllUserArchivedSubmissions = async (userEmail: string): Promise<(HoursSubmission & { clubName?: string; archivePeriod?: string; archivedAt?: Date })[]> => {
  const q = query(collection(db, "submissionArchive"), where("userEmail", "==", userEmail));
  const snap = await getDocs(q);
  const newResults = snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    submittedAt: d.data().submittedAt ? toDate(d.data().submittedAt) : new Date(),
    reviewedAt: d.data().reviewedAt ? toDate(d.data().reviewedAt) : undefined,
    archivedAt: d.data().archivedAt ? toDate(d.data().archivedAt) : undefined,
  })) as (HoursSubmission & { clubName?: string; archivePeriod?: string; archivedAt?: Date })[];

  const legacySnap = await getDocs(collection(db, "yearlyArchives"));
  const legacyResults: (HoursSubmission & { clubName?: string; archivePeriod?: string; archivedAt?: Date })[] = [];
  for (const archiveDoc of legacySnap.docs) {
    const data = archiveDoc.data();
    const period = data.schoolYear || archiveDoc.id;
    const archivedAt = data.archivedAt ? toDate(data.archivedAt) : undefined;
    for (const s of (data.submissions || []) as any[]) {
      if (s.userEmail === userEmail) {
        legacyResults.push({
          ...s,
          id: `${archiveDoc.id}_${s.id || s.userEmail}_${s.date}`,
          archivePeriod: period,
          archivedAt,
          submittedAt: s.submittedAt ? toDate(s.submittedAt) : new Date(),
          reviewedAt: s.reviewedAt ? toDate(s.reviewedAt) : undefined,
        });
      }
    }
  }

  const seen = new Set(newResults.map(r => `${r.clubId}_${r.date}_${r.hours}_${r.archivePeriod}`));
  const deduped = legacyResults.filter(r => {
    const key = `${r.clubId}_${r.date}_${r.hours}_${r.archivePeriod}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return [...newResults, ...deduped];
};

export const getYearlyArchivePeriods = async (): Promise<{ id: string; schoolYear: string; archivedAt?: Date; submissionCount: number }[]> => {
  const snap = await getDocs(collection(db, "yearlyArchives"));
  return snap.docs.map(d => ({
    id: d.id,
    schoolYear: d.data().schoolYear || d.id,
    archivedAt: d.data().archivedAt ? toDate(d.data().archivedAt) : undefined,
    submissionCount: (d.data().submissions || []).length,
  }));
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
    archiveBatch.set(archiveDocRef, stripUndefined({
      ...rest,
      clubName: clubName || rest.clubName || '',
      archivePeriod: schoolYear,
      archivedAt: Timestamp.fromDate(now),
      submittedAt: s.submittedAt instanceof Date ? Timestamp.fromDate(s.submittedAt) : (s.submittedAt ?? null),
      reviewedAt: s.reviewedAt instanceof Date ? Timestamp.fromDate(s.reviewedAt) : (s.reviewedAt ?? null),
    }));
  }
  await archiveBatch.commit();

  // Also keep the yearlyArchives snapshot for admin reference
  const archiveRef = doc(db, "yearlyArchives", schoolYear);
  await setDoc(archiveRef, stripUndefined({
    schoolYear,
    submissions: clubSubmissions.map(s => stripUndefined({ ...s })),
    profiles: profiles.map(p => stripUndefined({ ...p })),
    archivedAt: Timestamp.fromDate(now),
  }));

  // Save master archive snapshot (global across all clubs)
  await saveMasterArchiveSnapshot(schoolYear, now, submissions);
};

export const saveMasterArchiveSnapshot = async (period: string, now: Date, allSubmissions: HoursSubmission[]): Promise<void> => {
  const clubs = await getClubs();
  const approvedSubs = allSubmissions.filter(s => s.status === 'approved');

  const clubSnapshots = clubs.map(club => {
    const clubSubs = approvedSubs.filter(s => s.clubId === club.id);
    const totalApprovedHours = club.totalApprovedHours;

    // Group by location to build territory circles
    const locationMap = new Map<string, { lat: number; lng: number; hours: number; locationName: string }>();
    for (const s of clubSubs) {
      if (!s.latitude || !s.longitude) continue;
      const key = `${Math.round(s.latitude * 1000) / 1000},${Math.round(s.longitude * 1000) / 1000}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, { lat: s.latitude, lng: s.longitude, hours: 0, locationName: typeof s.location === 'string' ? s.location : '' });
      }
      locationMap.get(key)!.hours += s.hours;
    }

    const circles = Array.from(locationMap.values()).map(c => {
      const radiusMiles = 4 + 16 * Math.min(1, Math.log10(c.hours + 1) / Math.log10(1000));
      return stripUndefined({ lat: c.lat, lng: c.lng, hours: c.hours, radiusMiles, locationName: c.locationName });
    });

    return stripUndefined({
      clubId: club.id,
      clubName: club.name,
      clubColor: club.color,
      totalApprovedHours,
      yearlyApprovedHours: club.yearlyApprovedHours || 0,
      latitude: club.latitude ?? null,
      longitude: club.longitude ?? null,
      circles,
    });
  });

  await setDoc(doc(db, "masterArchives", period), stripUndefined({
    period,
    archivedAt: Timestamp.fromDate(now),
    totalClubs: clubs.length,
    clubs: clubSnapshots,
  }));
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

// Full leave flow: archive submissions → remove membership → recalculate club hours
export const leaveClubWithArchive = async (userEmail: string, clubId: string, clubName: string): Promise<void> => {
  // 1. Archive all live submissions for this user+club, then delete them
  await archiveUserSubmissionsOnLeave(userEmail, clubId, clubName);

  // 2. Remove the membership
  await deleteMembershipByUserAndClub(userEmail, clubId);

  // 3. Recalculate club total hours now that this member's submissions are gone
  await recalculateClubHours(clubId);
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
  userEmail: string;
  userName: string;
  checkInTime?: Date;
  checkOutTime?: Date;
  minutesAttended?: number;
  hoursGranted?: number;
  grantStatus: 'pending' | 'granted';
  createdAt: Date;
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

export const getEventById = async (eventId: string): Promise<ClubEvent | null> => {
  const docSnap = await getDoc(doc(db, "events", eventId));
  if (!docSnap.exists()) return null;
  return toEvent(docSnap);
};

export const getClubEvents = async (clubId: string): Promise<ClubEvent[]> => {
  const q = query(collection(db, "events"), where("clubId", "==", clubId));
  const snap = await getDocs(q);
  return snap.docs.map(toEvent);
};

export const getAllOpenEvents = async (): Promise<ClubEvent[]> => {
  // Fetch all events and filter client-side: treat missing isOpen as open (true),
  // only exclude events explicitly set to false.
  const snap = await getDocs(collection(db, "events"));
  return snap.docs.map(toEvent).filter(e => e.isOpen !== false);
};

export const createEvent = async (data: Omit<ClubEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClubEvent> => {
  const now = new Date();
  // Default isOpen to true so new events are always visible on the map
  const dataWithDefaults = { isOpen: true, ...data };
  // Strip undefined values — Firestore rejects them
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(dataWithDefaults)) {
    if (v !== undefined) clean[k] = v;
  }
  const docRef = await addDoc(collection(db, "events"), {
    ...clean,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return { id: docRef.id, ...dataWithDefaults, createdAt: now, updatedAt: now };
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

export const checkInUser = async (eventId: string, eventName: string, userEmail: string, userName: string, clubId?: string, submittedHours?: number): Promise<EventAttendance> => {
  const now = new Date();
  // Check if already checked in
  const existing = await getEventAttendance(eventId);
  const existingRecord = existing.find(a => a.userEmail === userEmail);
  if (existingRecord) {
    // Update minutesAttended if new hours submitted
    if (submittedHours != null) {
      await updateDoc(doc(db, "eventAttendance", existingRecord.id), {
        minutesAttended: Math.round(submittedHours * 60),
      });
    }
    return existingRecord;
  }
  const minutesAttended = submittedHours != null ? Math.round(submittedHours * 60) : undefined;
  const docData: any = {
    eventId,
    eventName,
    userEmail,
    userName,
    clubId: clubId || null,
    checkInTime: Timestamp.fromDate(now),
    grantStatus: 'pending',
    createdAt: Timestamp.fromDate(now),
  };
  if (minutesAttended != null) docData.minutesAttended = minutesAttended;
  const docRef = await addDoc(collection(db, "eventAttendance"), docData);
  return { id: docRef.id, eventId, eventName, userEmail, userName, clubId, checkInTime: now, grantStatus: 'pending', createdAt: now, minutesAttended };
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

  if (clubId) {
    await recalculateClubHours(clubId);
  }
};

export const checkInByQR = async (eventId: string, eventName: string, userEmail: string, clubId?: string): Promise<{ success: boolean; message: string; record?: EventAttendance }> => {
  const existing = await getEventAttendance(eventId);
  const rec = existing.find(a => a.userEmail === userEmail);
  if (rec && !rec.checkOutTime) {
    return { success: false, message: `${userEmail} is already checked in` };
  }
  const profile = await getUserProfile(userEmail);
  const userName = profile ? [profile.goByFirstName, profile.lastName].filter(Boolean).join(' ') || userEmail : userEmail;
  const record = await checkInUser(eventId, eventName, userEmail, userName, clubId);
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

export const getActiveScanQRCheckIn = async (userEmail: string): Promise<{ eventId: string; eventName: string } | null> => {
  const snap = await getDocs(
    query(collection(db, "eventAttendance"), where("userEmail", "==", userEmail))
  );
  const active = snap.docs
    .map(d => ({ id: d.id, ...(d.data() as any) }))
    .filter((r: any) => !r.checkOutTime);
  for (const record of active) {
    const eventSnap = await getDoc(doc(db, "events", record.eventId));
    if (eventSnap.exists() && eventSnap.data().type === 'scan_qr' && eventSnap.data().isOpen !== false) {
      return { eventId: record.eventId, eventName: record.eventName || eventSnap.data().name };
    }
  }
  return null;
};


// ============ AFFILIATIONS ============

const toAffiliation = (docSnap: any): Affiliation => {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    subClubId: d.subClubId,
    subClubName: d.subClubName,
    superClubId: d.superClubId,
    superClubName: d.superClubName,
    requestedBy: d.requestedBy,
    status: d.status,
    requestedAt: toDate(d.requestedAt),
    respondedAt: d.respondedAt ? toDate(d.respondedAt) : undefined,
    respondedBy: d.respondedBy,
  };
};

// All outgoing requests this club sent (i.e. trying to become a sub-club of others)
export const getOutgoingAffiliations = async (subClubId: string): Promise<Affiliation[]> => {
  const snap = await getDocs(query(collection(db, "affiliations"), where("subClubId", "==", subClubId)));
  return snap.docs.map(toAffiliation);
};

// All incoming requests for this club (i.e. other clubs requesting THIS as super-club)
export const getIncomingAffiliations = async (superClubId: string): Promise<Affiliation[]> => {
  const snap = await getDocs(query(collection(db, "affiliations"), where("superClubId", "==", superClubId)));
  return snap.docs.map(toAffiliation);
};

export const requestAffiliation = async (
  subClubId: string,
  subClubName: string,
  superClubId: string,
  superClubName: string,
  requestedBy: string,
): Promise<Affiliation> => {
  // Prevent duplicates
  const existing = await getDocs(query(
    collection(db, "affiliations"),
    where("subClubId", "==", subClubId),
    where("superClubId", "==", superClubId),
  ));
  if (!existing.empty) {
    throw new Error("An affiliation request already exists between these clubs.");
  }
  if (subClubId === superClubId) {
    throw new Error("A club cannot affiliate with itself.");
  }
  const now = new Date();
  const docRef = await addDoc(collection(db, "affiliations"), {
    subClubId,
    subClubName,
    superClubId,
    superClubName,
    requestedBy,
    status: 'pending',
    requestedAt: Timestamp.fromDate(now),
  });
  return {
    id: docRef.id,
    subClubId, subClubName, superClubId, superClubName,
    requestedBy, status: 'pending', requestedAt: now,
  };
};

export const respondToAffiliation = async (
  affiliationId: string,
  status: 'approved' | 'rejected',
  respondedBy: string,
): Promise<void> => {
  await updateDoc(doc(db, "affiliations", affiliationId), {
    status,
    respondedAt: Timestamp.fromDate(new Date()),
    respondedBy,
  });
};

export const removeAffiliation = async (affiliationId: string): Promise<void> => {
  await deleteDoc(doc(db, "affiliations", affiliationId));
};

// All approved super-clubs that this sub-club feeds into.
export const getApprovedSuperClubs = async (subClubId: string): Promise<Affiliation[]> => {
  const all = await getOutgoingAffiliations(subClubId);
  return all.filter(a => a.status === 'approved');
};

// All approved sub-clubs feeding into this super-club.
export const getApprovedSubClubs = async (superClubId: string): Promise<Affiliation[]> => {
  const all = await getIncomingAffiliations(superClubId);
  return all.filter(a => a.status === 'approved');
};

// Returns submissions made in any approved sub-club of `superClubId`,
// filtered to ONLY include those whose user is also a member of the super-club
// (avoids cross-affiliation clashes).
export const getSuperClubFedSubmissions = async (superClubId: string): Promise<HoursSubmission[]> => {
  const subAffs = await getApprovedSubClubs(superClubId);
  if (subAffs.length === 0) return [];
  const superMembers = await getMemberships(superClubId);
  const memberEmails = new Set(superMembers.map(m => m.userEmail));

  const all: HoursSubmission[] = [];
  for (const aff of subAffs) {
    const subs = await getClubSubmissions(aff.subClubId);
    for (const s of subs) {
      // Only requirement: the volunteer is a member of both clubs.
      // Sub-club and super-club approve hours independently/in parallel.
      if (memberEmails.has(s.userEmail)) all.push(s);
    }
  }
  return all;
};

export const setSuperClubApprovalStatus = async (
  submissionId: string,
  superClubId: string,
  status: 'pending' | 'approved' | 'rejected',
  hours: number,
  approverEmail: string,
  rejectReason?: string,
): Promise<void> => {
  const docRef = doc(db, "submissions", submissionId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;
  const data = docSnap.data();
  const existing = data.superClubStatus || {};
  existing[superClubId] = {
    ...(existing[superClubId] || {}),
    status,
    hours,
    approvedBy: approverEmail,
    approvedAt: Timestamp.fromDate(new Date()),
    ...(rejectReason ? { rejectReason } : {}),
  };
  await updateDoc(docRef, { superClubStatus: existing });
};

// Records a super-club admin's review of a fed sub-club submission with
// threshold logic mirroring the regular approval flow. Returns whether the
// review finalized the super-club status.
export const recordSuperClubReview = async (
  submissionId: string,
  superClubId: string,
  reviewerEmail: string,
  decision: 'approved' | 'rejected',
  threshold: number,
  rejectReason?: string,
): Promise<{ finalized: boolean; status: 'pending' | 'approved' | 'rejected' }> => {
  const docRef = doc(db, "submissions", submissionId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return { finalized: false, status: 'pending' };
  const data = snap.data();
  const existing = (data.superClubStatus || {}) as Record<string, any>;
  const cur = existing[superClubId] || {
    status: 'pending',
    approvals: [],
    rejections: [],
    rejectionReasons: {},
  };
  const approvals: string[] = Array.isArray(cur.approvals) ? [...cur.approvals] : [];
  const rejections: string[] = Array.isArray(cur.rejections) ? [...cur.rejections] : [];
  const rejectionReasons: Record<string, string> = { ...(cur.rejectionReasons || {}) };

  if (decision === 'approved') {
    if (!approvals.includes(reviewerEmail)) approvals.push(reviewerEmail);
  } else {
    if (!rejections.includes(reviewerEmail)) rejections.push(reviewerEmail);
    if (rejectReason) rejectionReasons[reviewerEmail] = rejectReason;
  }

  let status: 'pending' | 'approved' | 'rejected' = cur.status || 'pending';
  let finalized = false;
  if (decision === 'approved' && approvals.length >= threshold) {
    status = 'approved';
    finalized = true;
  } else if (decision === 'rejected' && rejections.length >= threshold) {
    status = 'rejected';
    finalized = true;
  }

  const next: Record<string, any> = {
    status,
    approvals,
    rejections,
    rejectionReasons,
    hours: data.hours,
  };
  if (finalized && status === 'approved') {
    next.approvedBy = reviewerEmail;
    next.approvedAt = Timestamp.fromDate(new Date());
  }
  if (finalized && status === 'rejected') {
    next.rejectReason = Object.values(rejectionReasons).join(' | ');
  }
  existing[superClubId] = next;
  await updateDoc(docRef, { superClubStatus: existing });
  return { finalized, status };
};

// ============ CLUB BOOKMARKS ============

const toBookmark = (docSnap: any): ClubBookmark => {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    userEmail: d.userEmail,
    clubId: d.clubId,
    createdAt: toDate(d.createdAt),
  };
};

export const getUserBookmarks = async (userEmail: string): Promise<ClubBookmark[]> => {
  const snap = await getDocs(query(collection(db, "clubBookmarks"), where("userEmail", "==", userEmail)));
  return snap.docs.map(toBookmark);
};

export const addBookmark = async (userEmail: string, clubId: string): Promise<void> => {
  const existing = await getDocs(query(
    collection(db, "clubBookmarks"),
    where("userEmail", "==", userEmail),
    where("clubId", "==", clubId),
  ));
  if (!existing.empty) return;
  await addDoc(collection(db, "clubBookmarks"), {
    userEmail,
    clubId,
    createdAt: Timestamp.fromDate(new Date()),
  });
};

export const removeBookmark = async (userEmail: string, clubId: string): Promise<void> => {
  const snap = await getDocs(query(
    collection(db, "clubBookmarks"),
    where("userEmail", "==", userEmail),
    where("clubId", "==", clubId),
  ));
  for (const d of snap.docs) await deleteDoc(d.ref);
};

export const getAllApprovedAffiliations = async (): Promise<Affiliation[]> => {
  const snap = await getDocs(query(collection(db, "affiliations"), where("status", "==", "approved")));
  return snap.docs.map(toAffiliation);
};
