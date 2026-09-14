import { useCallback, useEffect, useMemo, useState } from "react";
import { clearGoogleSelection, signInWithGoogle } from "../services/googleAuth";
import type { AuthSession, SyncStatus, UserProfile } from "../types/tasks";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export function useGoogleAuth() {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const raw = localStorage.getItem("tasko-session");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState<
    "idle" | "signing-in" | "authenticated" | "error"
  >(session ? "authenticated" : "idle");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      localStorage.setItem("tasko-session", JSON.stringify(session));
    }
  }, [session]);

  const signIn = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      setError("MISSING_GOOGLE_CLIENT_ID");
      setStatus("error");
      return;
    }

    setStatus("signing-in");
    setError(null);

    try {
      const authSession = await signInWithGoogle(GOOGLE_CLIENT_ID);
      setSession(authSession);
      setSyncStatus("synced");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "AUTHENTICATION_ERROR";
      setError(message);
      setStatus("error");
    }
  }, []);

  const signOut = useCallback(() => {
    clearGoogleSelection();
    localStorage.removeItem("tasko-session");
    setSession(null);
    setStatus("idle");
    setSyncStatus("synced");
    setError(null);
  }, []);

  const user = useMemo<UserProfile | undefined>(() => session?.user, [session]);

  return {
    session,
    user,
    status,
    syncStatus,
    error,
    signIn,
    signOut,
    setSyncStatus,
  };
}
