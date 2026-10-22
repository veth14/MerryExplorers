"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { mutate } from "swr";

import { UserAccount } from "@/data/users";

type AuthContextType = {
  user: FirebaseUser | null;
  userProfile: UserAccount | null;
  loading: boolean;
  signIn: (email: string, pass: string, remember?: boolean) => Promise<void>;
  signOut: (redirectTo?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Attach a current Firebase ID token to same-origin API calls made from a
  // signed-in portal. Route handlers verify this token server-side.
  useEffect(() => {
    const nativeFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(
        typeof input === "string" || input instanceof URL ? input.toString() : input.url,
        window.location.origin
      );

      if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) {
        return nativeFetch(input, init);
      }

      await auth.authStateReady();
      const currentUser = auth.currentUser;
      if (!currentUser) return nativeFetch(input, init);

      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined)
      );
      headers.set("Authorization", `Bearer ${await currentUser.getIdToken()}`);

      return nativeFetch(input, { ...init, headers });
    };

    return () => {
      window.fetch = nativeFetch;
    };
  }, []);

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
        } catch {
          console.error("Failed to load user profile");
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
      
      // Update session cookie for middleware
      if (currUser) {
        const isRemembered = localStorage.getItem("rememberMe") === "true";
        const maxAge = isRemembered ? 2592000 : 86400; // 30 days or 1 day
        document.cookie = `session=active; path=/; max-age=${maxAge}`; // simple session marker
        // Role cookie is set during signIn, but we shouldn't wipe it on auth state change
        // unless there is no user
      } else {
        document.cookie = `session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string, remember: boolean = false) => {
    setLoading(true);
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      
      if (remember) {
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberMe");
      }
      
      const maxAge = remember ? 2592000 : 86400;
      document.cookie = `session=active; path=/; max-age=${maxAge}`;
      
      // Fetch role and redirect
      const roleRes = await fetch(`/api/auth/role?uid=${cred.user.uid}`);
      let role = "teacher"; // default
      if (roleRes.ok) {
        const data = await roleRes.json();
        if (data.role) role = data.role;
      }
      
      if (role === "admin") {
        document.cookie = `role=admin; path=/; max-age=${maxAge}`;
        router.push("/admin");
      } else if (role === "parent") {
        document.cookie = `role=parent; path=/; max-age=${maxAge}`;
        router.push("/parent/dashboard");
      } else if (role === "executive assistant" || role === "developer") {
        // Executive Assistants and Developers are employees first — they clock in like teachers
        // but can also access the admin panel.
        document.cookie = `role=${role}; path=/; max-age=${maxAge}`;
        router.push("/teacher");
      } else {
        document.cookie = `role=teacher; path=/; max-age=${maxAge}`;
        router.push("/teacher");
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (redirectTo?: string) => {
    const isParent =
      (typeof window !== "undefined" && window.location.pathname.startsWith("/parent")) ||
      (userProfile as any)?.role === "parent" ||
      (typeof document !== "undefined" && document.cookie.split("; ").some((c) => c.startsWith("role=parent")));

    const destination = redirectTo || (isParent ? "/parent/login" : "/login");

    await firebaseSignOut(auth);
    document.cookie = `session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    // Clear SWR in-memory cache to ensure zero data leakage between user sessions
    try {
      mutate(() => true, undefined, { revalidate: false });
    } catch { /* ignore */ }
    window.location.href = destination;
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
