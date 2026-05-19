import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  deleteUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface UserProfile {
  displayName: string;
  avatar: string;
  language: string;
  theme: string;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  hasCompletedOnboarding: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

const googleProvider = new GoogleAuthProvider();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        setUser(firebaseUser);
        // Try to fetch user profile
        const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as UserProfile);
        } else {
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
    localStorage.clear();
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('Not authenticated');
    const ref = doc(db, 'users', user.uid);
    const existing = profile || {
      displayName: user.displayName || 'Player',
      avatar: '🐉',
      language: 'en',
      theme: 'light',
      createdAt: Timestamp.now(),
    };
    const updated = { ...existing, ...data };
    await setDoc(ref, updated, { merge: true });
    setProfile(updated as UserProfile);
  };

  const deleteAccount = async () => {
    if (!user) throw new Error('Not authenticated');
    const ref = doc(db, 'users', user.uid);
    try {
      await deleteDoc(ref);
    } catch (err) {
      console.warn('Failed to delete Firestore document:', err);
    }
    await deleteUser(user);
    setProfile(null);
    localStorage.clear();
  };

  const hasCompletedOnboarding = profile !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        updateProfile,
        deleteAccount,
        hasCompletedOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
