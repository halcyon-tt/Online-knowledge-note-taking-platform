"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getCurrentUser,
  signOut as apiSignOut,
} from "@/lib/api/auth";

export interface UserProfile {
  sub: number;
  email: string;
  username: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    const profile = await getCurrentUser();
    setUser(profile);
    setLoading(false);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const handleSignOut = async () => {
    await apiSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signOut: handleSignOut, refreshUser }}
    >
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
