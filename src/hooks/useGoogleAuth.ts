import { useCallback, useEffect, useMemo, useState } from "react";
import { clearGoogleSelection, signInWithGoogle } from "../services/googleAuth";
import type { AuthSession, SyncStatus, UserProfile } from "../types/tasks";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export function useGoogleAuth() {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const raw = localStorage.getItem("tasko-session");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AuthSession;
      if (!parsed.isDemo && (!parsed.expiresAt || Date.now() > parsed.expiresAt)) {
        localStorage.removeItem("tasko-session");
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [status, setStatus] = useState<
    "idle" | "signing-in" | "authenticated" | "error"
  >(session ? "authenticated" : "idle");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [error, setError] = useState<string | null>(null);
  const [authExpired, setAuthExpired] = useState(false);

  useEffect(() => {
    if (session) {
      localStorage.setItem("tasko-session", JSON.stringify(session));
    } else {
      localStorage.removeItem("tasko-session");
    }
  }, [session]);

  const signIn = useCallback(async (forceConsent = false) => {
    if (!GOOGLE_CLIENT_ID) {
      setError("MISSING_GOOGLE_CLIENT_ID: Configure VITE_GOOGLE_CLIENT_ID in your .env file.");
      setStatus("error");
      return;
    }

    setStatus("signing-in");
    setError(null);
    setAuthExpired(false);

    try {
      const authSession = await signInWithGoogle(
        GOOGLE_CLIENT_ID,
        forceConsent ? { prompt: "consent select_account" } : undefined,
      );
      setSession(authSession);
      setStatus("authenticated");
      setSyncStatus("synced");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "AUTHENTICATION_ERROR";
      setError(message);
      setStatus("error");
    }
  }, []);

  const startDemoMode = useCallback(() => {
    const demoSession: AuthSession = {
      accessToken: "demo-sandbox-token",
      user: {
        name: "Neo Architect",
        email: "demo@tasks-ramascript.dev",
      },
      isDemo: true,
    };
    setSession(demoSession);
    setStatus("authenticated");
    setSyncStatus("synced");
    setError(null);
    setAuthExpired(false);
  }, []);

  const signOut = useCallback(() => {
    clearGoogleSelection();
    localStorage.removeItem("tasko-session");
    setSession(null);
    setStatus("idle");
    setSyncStatus("synced");
    setError(null);
    setAuthExpired(false);
  }, []);

  const handleAuthExpired = useCallback(() => {
    setAuthExpired(true);
    setSyncStatus("error");
    setError("Google session expired. Please reconnect your account.");
  }, []);

  const user = useMemo<UserProfile | undefined>(() => session?.user, [session]);

  return {
    session,
    user,
    status,
    syncStatus,
    error,
    authExpired,
    signIn,
    signOut,
    startDemoMode,
    setSyncStatus,
    handleAuthExpired,
    setAuthExpired,
  };
}

