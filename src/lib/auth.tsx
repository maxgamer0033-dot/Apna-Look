"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Role = "customer" | "retailer";

export interface AuthState {
  token: string | null;
  role: Role | null;
  user: any | null;          // retailer or customer document
  isLoading: boolean;        // true while Convex validation is in flight
  isLoggedIn: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string) => void;
  logout: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem("apnalook_session_token"); } catch { return null; }
}

function storeToken(token: string) {
  try { localStorage.setItem("apnalook_session_token", token); } catch {}
}

function clearToken() {
  try {
    localStorage.removeItem("apnalook_session_token");
    localStorage.removeItem("apnalook_currentPage");
    localStorage.removeItem("apnalook_scannedRetailerId");
  } catch {}
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);

  // Read token from localStorage after mount (SSR-safe)
  useEffect(() => {
    setToken(getStoredToken());
    setTokenLoaded(true);
  }, []);

  // Validate token against Convex — skipped until token is loaded
  const sessionData = useQuery(
    api.auth.validate,
    tokenLoaded && token ? { token } : "skip"
  );

  const logoutMutation = useMutation(api.auth.logout);

  const login = useCallback((newToken: string) => {
    storeToken(newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try { await logoutMutation({ token }); } catch {}
    }
    clearToken();
    setToken(null);
  }, [token, logoutMutation]);

  // Derive auth state from Convex response
  const isLoading = !tokenLoaded || (!!token && sessionData === undefined);

  let role: Role | null = null;
  let user: any = null;

  if (sessionData && sessionData !== null) {
    role = sessionData.role as Role;
    user = sessionData.role === "retailer" ? sessionData.retailer : sessionData.customer;
  }

  const isLoggedIn = !isLoading && !!sessionData && sessionData !== null;

  return (
    <AuthContext.Provider value={{ token, role, user, isLoading, isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
