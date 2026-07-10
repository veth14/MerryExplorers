"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

import { UserAccount } from "@/data/users";

type AuthContextType = {
  user: FirebaseUser | null;
  userProfile: UserAccount | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      setUser(currUser);
      
      if (currUser) {
        // Fetch MongoDB profile
        try {
          const res = await fetch(`/api/accounts/${currUser.uid}`);
          if (res.ok) {
            const profile = await res.json();
            setUserProfile(profile);
          }
        } catch (e) {
          console.error("Failed to load user profile");
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
      
      // Update session cookie for middleware
      if (currUser) {
        document.cookie = `session=active; path=/; max-age=86400`; // simple session marker
        // Role cookie is set during signIn, but we shouldn't wipe it on auth state change
        // unless there is no user
      } else {
        document.cookie = `session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      document.cookie = `session=active; path=/; max-age=86400`;
      
      // Fetch role and redirect
      const roleRes = await fetch(`/api/auth/role?uid=${cred.user.uid}`);
      let role = "teacher"; // default
      if (roleRes.ok) {
        const data = await roleRes.json();
        if (data.role) role = data.role;
      }
      
      if (role === "admin") {
        document.cookie = `role=admin; path=/; max-age=86400`;
        router.push("/admin");
      } else {
        document.cookie = `role=teacher; path=/; max-age=86400`;
        router.push("/teacher");
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    document.cookie = `session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
