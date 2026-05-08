/**
 * useAuth hook — Manages Firebase authentication state and methods.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile
} from "firebase/auth";
import { auth } from "../config/firebase";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[AuthProvider] Initializing auth state listener...");
    
    // Fallback timeout in case Firebase auth hangs (e.g., due to async storage issues)
    const timeoutId = setTimeout(() => {
      console.warn("[AuthProvider] Auth listener timeout reached (10s). Forcing loading to false.");
      setLoading(false);
    }, 10000);

    const unsubscribe = onAuthStateChanged(
      auth, 
      (user) => {
        clearTimeout(timeoutId);
        console.log(`[AuthProvider] Auth state changed. User loaded: ${user ? user.uid : "none"}`);
        setCurrentUser(user);
        setLoading(false);
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error("[AuthProvider] Auth listener error:", error);
        setLoading(false);
      }
    );
    
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(res.user, { displayName });
    }
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
