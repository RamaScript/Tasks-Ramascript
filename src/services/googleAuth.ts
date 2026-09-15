import type { AuthSession, UserProfile } from "../types/tasks";

const GOOGLE_SCRIPT_ID = "tasko-google-identity-script";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/tasks openid email profile";

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              expires_in?: string | number;
              scope?: string;
            }) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
        id?: {
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

async function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  if (window.google?.accounts?.oauth2) {
    return;
  }

  const existing = document.getElementById(GOOGLE_SCRIPT_ID);
  if (existing) {
    await new Promise<void>((resolve, reject) => {
      let waited = 0;
      const interval = window.setInterval(() => {
        waited += 100;
        if (window.google?.accounts?.oauth2) {
          window.clearInterval(interval);
          resolve();
        } else if (waited > 8000) {
          window.clearInterval(interval);
          reject(new Error("GOOGLE_IDENTITY_LOAD_TIMEOUT"));
        }
      }, 100);
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("GOOGLE_IDENTITY_SCRIPT_FAILED"));
    document.head.appendChild(script);
  });

  await new Promise<void>((resolve, reject) => {
    let waited = 0;
    const interval = window.setInterval(() => {
      waited += 50;
      if (window.google?.accounts?.oauth2) {
        window.clearInterval(interval);
        resolve();
      } else if (waited > 8000) {
        window.clearInterval(interval);
        reject(new Error("GOOGLE_IDENTITY_INIT_TIMEOUT"));
      }
    }, 50);
  });
}

async function fetchUserProfile(accessToken: string): Promise<UserProfile> {
  try {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      return { email: "Connected Google Account", name: "Google User" };
    }

    return (await response.json()) as UserProfile;
  } catch {
    return { email: "Connected Google Account", name: "Google User" };
  }
}

export interface SignInOptions {
  prompt?: string;
}

export async function signInWithGoogle(
  clientId: string,
  options?: SignInOptions,
): Promise<AuthSession> {
  if (!clientId) {
    throw new Error("MISSING_GOOGLE_CLIENT_ID");
  }

  await loadGoogleIdentityScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error("GOOGLE_IDENTITY_UNAVAILABLE");
  }

  const result = await new Promise<AuthSession>((resolve, reject) => {
    const wrappedCallback = async (response: {
      access_token?: string;
      error?: string;
      expires_in?: string | number;
      scope?: string;
    }) => {
      try {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? "GOOGLE_TOKEN_REQUEST_FAILED"));
          return;
        }

        // Verify tasks scope was granted
        if (response.scope && !response.scope.includes("tasks")) {
          reject(
            new Error(
              "INSUFFICIENT_SCOPE: You must grant permission to access Google Tasks in the Google consent screen.",
            ),
          );
          return;
        }

        const expiresIn =
          typeof response.expires_in === "string"
            ? parseInt(response.expires_in, 10)
            : (response.expires_in ?? 3600);
        // Set expiry buffer to 60s before actual expiry
        const expiresAt = Date.now() + Math.max(300, expiresIn - 60) * 1000;

        const user = await fetchUserProfile(response.access_token);
        resolve({ accessToken: response.access_token, user, expiresAt });
      } catch (error) {
        reject(error);
      }
    };

    const client = window.google!.accounts!.oauth2!.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPE,
      callback: wrappedCallback,
    });

    client.requestAccessToken(options?.prompt ? { prompt: options.prompt } : undefined);
  });

  return result;
}

export function clearGoogleSelection(): void {
  if (typeof window !== "undefined" && window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect();
  }
}
