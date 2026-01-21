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
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface ServiceRequest {
  id: string;
  clubId: string;
  title: string;
  description: string;
  hoursOffered: number;
  createdBy: string;
  status: string;
  createdAt: Date;
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

export const getServiceRequests = async (clubId: string): Promise<ServiceRequest[]> => {
  const q = query(collection(db, "serviceRequests"), where("clubId", "==", clubId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
  })) as ServiceRequest[];
};

export const createServiceRequest = async (data: Omit<ServiceRequest, 'id' | 'createdAt' | 'status'>): Promise<ServiceRequest> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, "serviceRequests"), {
    ...data,
    status: "open",
    createdAt: Timestamp.fromDate(now),
  });
  return {
    id: docRef.id,
    ...data,
    status: "open",
    createdAt: now,
  };
};

export const updateServiceRequest = async (requestId: string, updates: Partial<ServiceRequest>): Promise<void> => {
  const docRef = doc(db, "serviceRequests", requestId);
  await updateDoc(docRef, updates);
};

export const deleteServiceRequest = async (requestId: string): Promise<void> => {
  await deleteDoc(doc(db, "serviceRequests", requestId));
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
