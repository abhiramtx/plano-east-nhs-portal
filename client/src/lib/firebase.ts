// Google OAuth configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// TypeScript declarations for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export interface User {
  email: string;
  name: string;
  photoURL?: string;
  sub?: string;
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

// Load Google Identity Services API
const loadGoogleAPI = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.google && window.google.accounts) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

export const signInWithGoogle = async () => {
  if (!GOOGLE_CLIENT_ID) {
    console.error('Google Client ID not configured');
    return;
  }

  await loadGoogleAPI();

  // Initialize Google OAuth
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
  });

  // Trigger the sign-in popup
  window.google.accounts.id.prompt();
};

const handleCredentialResponse = (response: any) => {
  try {
    // Decode the JWT token to get user info
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    
    const user: User = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      sub: payload.sub
    };

    localStorage.setItem('user', JSON.stringify(user));
    notifyAuthListeners(user);
  } catch (error) {
    console.error('Failed to process Google sign-in:', error);
  }
};

// Mock sign-in function for demo
export const signInWithMockUser = (email?: string) => {
  const isSecondUser = email === 'demouser2@gmail.com';
  
  const mockUser: User = {
    email: isSecondUser ? 'demouser2@gmail.com' : 'demo.student@gmail.com',
    name: isSecondUser ? 'Jane Smith' : 'Demo Student',
    picture: isSecondUser 
      ? 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&crop=face'
      : 'https://images.unsplash.com/photo-1494790108755-2616b612b898?w=96&h=96&fit=crop&crop=face',
    sub: isSecondUser ? 'demo-user-456' : 'demo-user-123'
  };

  localStorage.setItem('user', JSON.stringify(mockUser));
  notifyAuthListeners(mockUser);
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

// Auth object for compatibility with older Firebase patterns
export const auth = {
  onAuthStateChanged: (callback: (user: any) => void) => {
    return onAuthStateChanged(callback);
  },
  signOut: handleSignOut
};
