import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User as FirebaseUser
} from "firebase/auth";

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
const googleProvider = new GoogleAuthProvider();

export interface User {
  email: string;
  name: string;
  photoURL?: string;
  uid?: string;
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
