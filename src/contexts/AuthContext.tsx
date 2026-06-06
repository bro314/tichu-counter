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
  signInWithCredential,
  OAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { AppleSignIn, SignInScope } from '@capawesome/capacitor-apple-sign-in';
import { clearPlayerCache } from '../services/playerService';

export interface UserProfile {
  displayName: string;
  avatar: string;
  language: string;
  theme: string;
  createdAt: Date;
  isTestUser?: boolean;
  recentOpponentUids?: string[];
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  signInWithApple: () => Promise<User>;
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
      setLoading(true);
      try {
        if (firebaseUser) {
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
      } catch (error) {
        console.error("AuthContext: Error checking user auth/profile:", error);
        // Fallback: set user but set profile to null to avoid blocking loading
        setUser(firebaseUser);
        setProfile(null);
      } finally {
        setLoading(false);
      }
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
    if (Capacitor.isNativePlatform()) {
      await GoogleSignIn.initialize({
        clientId: '1017263787450-rqf7n7h7g740tiqqj3936psd7pd16p25.apps.googleusercontent.com',
      });
      const result = await GoogleSignIn.signIn();
      if (!result.idToken) {
        throw new Error('Google Sign-In failed: No ID token returned');
      }
      const credential = GoogleAuthProvider.credential(result.idToken);
      const cred = await signInWithCredential(auth, credential);
      return cred.user;
    } else {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    }
  };

  const signInWithApple = async () => {
    if (Capacitor.isNativePlatform()) {
      const res = await AppleSignIn.signIn({
        scopes: [SignInScope.Email, SignInScope.FullName],
      });
      
      if (!res.idToken) {
        throw new Error('Apple Sign-In failed: No ID token returned');
      }

      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: res.idToken,
      });
      const cred = await signInWithCredential(auth, credential);
      return cred.user;
    } else {
      const provider = new OAuthProvider('apple.com');
      const cred = await signInWithPopup(auth, provider);
      return cred.user;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
    clearPlayerCache();
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

    // Validate combination of displayName + avatar is unique across all users
    const cleanName = (updated.displayName || '').replace(/\s+/g, '').toLowerCase();
    const cleanAvatar = updated.avatar || '';

    const snapshot = await getDocs(collection(db, 'users'));
    const isDuplicate = snapshot.docs.some((docSnap) => {
      if (docSnap.id === user.uid) return false;
      const otherData = docSnap.data();
      const otherName = (otherData.displayName as string || '').replace(/\s+/g, '').toLowerCase();
      const otherAvatar = otherData.avatar as string || '';
      return otherName === cleanName && otherAvatar === cleanAvatar;
    });

    if (isDuplicate) {
      throw new Error('This combination of name and avatar is already taken by another player.');
    }

    await setDoc(ref, updated, { merge: true });
    setProfile(updated as UserProfile);
  };

  const deleteAccount = async () => {
    if (!user) throw new Error('Not authenticated');
    const ref = doc(db, 'users', user.uid);
    const userProfile = profile;

    try {
      await deleteDoc(ref);
    } catch (err) {
      console.warn('Failed to delete Firestore document:', err);
    }

    try {
      await deleteUser(user);
      setProfile(null);
      clearPlayerCache();
      localStorage.clear();
    } catch (err) {
      if (userProfile) {
        try {
          await setDoc(ref, userProfile);
        } catch (restoreErr) {
          console.error('Failed to restore Firestore document:', restoreErr);
        }
      }
      throw err;
    }
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
        signInWithApple,
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
