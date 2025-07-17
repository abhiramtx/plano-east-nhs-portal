// Google OAuth configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'demo-client-id';
const GOOGLE_OAUTH_URL = 'https://accounts.google.com/oauth/authorize';
const GOOGLE_SCOPE = 'openid email profile';

export interface User {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

// Simple auth state management
let currentUser: User | null = null;
let authListeners: ((user: User | null) => void)[] = [];

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  authListeners.push(callback);
  // Call immediately with current state
  callback(currentUser);
  
  // Return unsubscribe function
  return () => {
    authListeners = authListeners.filter(listener => listener !== callback);
  };
};

const notifyAuthListeners = (user: User | null) => {
  currentUser = user;
  authListeners.forEach(listener => listener(user));
};

export const signInWithGoogle = () => {
  // For demo purposes, simulate a successful sign-in
  const mockUser: User = {
    email: 'demo.user@gmail.com',
    name: 'Demo User',
    picture: 'https://images.unsplash.com/photo-1494790108755-2616b612b898?w=96&h=96&fit=crop&crop=face',
    sub: 'demo-user-' + Date.now()
  };
  
  // Simulate a brief loading delay
  setTimeout(() => {
    localStorage.setItem('user', JSON.stringify(mockUser));
    notifyAuthListeners(mockUser);
  }, 1000);
};

export const handleSignOut = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('oauth_state');
  notifyAuthListeners(null);
  return Promise.resolve();
};

export const getCurrentUser = (): User | null => {
  return currentUser;
};

// Initialize auth state from localStorage
export const initializeAuth = () => {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      notifyAuthListeners(user);
    } catch (error) {
      console.error('Failed to parse stored user:', error);
      localStorage.removeItem('user');
    }
  }
};

// Handle OAuth callback
export const handleOAuthCallback = async (code: string, state: string): Promise<User> => {
  const storedState = localStorage.getItem('oauth_state');
  if (state !== storedState) {
    throw new Error('Invalid state parameter');
  }
  
  // For demo purposes, we'll simulate a successful OAuth flow
  // In a real app, you'd exchange the code for tokens on your backend
  const mockUser: User = {
    email: 'demo@example.com',
    name: 'Demo User',
    picture: 'https://via.placeholder.com/96',
    sub: 'demo-user-id'
  };
  
  localStorage.setItem('user', JSON.stringify(mockUser));
  localStorage.removeItem('oauth_state');
  notifyAuthListeners(mockUser);
  
  return mockUser;
};
