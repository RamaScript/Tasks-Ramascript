import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  checkAndCleanUrlHash,
  clearGoogleSelection,
  signInWithGoogle,
  silentRefreshToken,
} from "../services/googleAuth";
import type { AuthSession, SyncStatus, UserProfile } from "../types/tasks";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const SESSION_STORAGE_KEY = "tasko-session";

export function useGoogleAuth() {
  const [session, setSession] = useState<AuthSession | null>(() => {
    // 1. Check if token returned in URL hash (and scrub URL immediately)
    const hashSession = checkAndCleanUrlHash();
    if (hashSession) {
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(hashSession));
      } catch {
        // ignore
      }
      return hashSession;
    }

    // 2. Read persistent session from localStorage
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AuthSession;
      // Do NOT delete session just because token is old!
      // Keep session in memory so user stays logged in.
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

  // Sync session state to localStorage
  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [session]);

  const isRefreshingRef = useRef(false);

  // Silent refresh helper that doesn't disturb the UI
  const trySilentRefresh = useCallback(async (): Promise<boolean> => {
    if (!GOOGLE_CLIENT_ID || isRefreshingRef.current) return false;
    if (!session || session.isDemo) return false;

    isRefreshingRef.current = true;
    try {
      const renewed = await silentRefreshToken(GOOGLE_CLIENT_ID);
      setSession(renewed);
      setAuthExpired(false);
      setError(null);
      isRefreshingRef.current = false;
      return true;
    } catch {
      isRefreshingRef.current = false;
      return false;
    }
  }, [session]);

  // Auto-refresh token in background before expiry (or upon load if expired)
  useEffect(() => {
    if (!session || session.isDemo || !GOOGLE_CLIENT_ID) return;

    const checkAndRefresh = async () => {
      const now = Date.now();
      const expiresAt = session.expiresAt ?? 0;
      // If expired or expiring within 5 minutes, refresh silently
      if (expiresAt > 0 && now >= expiresAt - 300000) {
        await trySilentRefresh();
      }
    };

    // Check immediately
    void checkAndRefresh();

    // Check periodically every 5 minutes
    const interval = window.setInterval(() => {
      void checkAndRefresh();
    }, 300000);

    return () => window.clearInterval(interval);
  }, [session, trySilentRefresh]);

  const signIn = useCallback(async (forceConsent = false) => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Please configure Google Client ID in your settings or .env.");
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
      let message = err instanceof Error ? err.message : "Authentication failed.";
      // Sanitize any raw tokens or technical credential strings
      message = message
        .replace(/ya29\.[a-zA-Z0-9_-]+/g, "")
        .replace(/access token/gi, "session")
        .replace(/Expected OAuth 2[^.]+/gi, "Google authentication required");
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
      expiresAt: Date.now() + 86400000 * 365, // 1 year for demo
    };
    setSession(demoSession);
    setStatus("authenticated");
    setSyncStatus("synced");
    setError(null);
    setAuthExpired(false);
  }, []);

  const signOut = useCallback(() => {
    clearGoogleSelection();
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
    setStatus("idle");
    setSyncStatus("synced");
    setError(null);
    setAuthExpired(false);
  }, []);

  const handleAuthExpired = useCallback(() => {
    // Attempt silent refresh first
    void trySilentRefresh().then((refreshed) => {
      if (!refreshed) {
        setAuthExpired(true);
        setSyncStatus("error");
        setError("Google session paused. Reconnect to resume sync.");
      }
    });
  }, [trySilentRefresh]);

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
