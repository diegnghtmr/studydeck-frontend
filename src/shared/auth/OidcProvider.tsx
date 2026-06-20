import { type ReactNode, useEffect } from "react";
import { AuthProvider, useAuth } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";
import { useNavigate } from "react-router";
import { oidcConfig, isOidcConfigured } from "./oidc-config";
import { useAuthStore } from "./auth-store";

interface TokenBridgeProps {
  children: ReactNode;
}

/**
 * Bridges the access token from react-oidc-context into the Zustand auth store
 * so the axios instance can read it without coupling to React context.
 */
function TokenBridge({ children }: TokenBridgeProps) {
  const auth = useAuth();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      setAccessToken(auth.user.access_token);
      const displayName =
        (auth.user.profile.name as string | undefined) ??
        (auth.user.profile.preferred_username as string | undefined);

      setUser({
        id: auth.user.profile.sub,
        email: (auth.user.profile.email as string | undefined) ?? "",
        ...(displayName !== undefined ? { displayName } : {}),
        roles: [],
        scopes: auth.user.scopes ?? [],
      });
    } else if (!auth.isLoading && !auth.isAuthenticated) {
      clearAuth();
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.user, setAccessToken, setUser, clearAuth]);

  return <>{children}</>;
}

interface OidcProviderProps {
  children: ReactNode;
}

/**
 * Wraps the app with AuthProvider from react-oidc-context when OIDC is configured.
 * Falls back to a no-op wrapper in dev/CI when env vars are absent.
 */
export function OidcProvider({ children }: OidcProviderProps) {
  if (!isOidcConfigured) {
    // Dev bypass: OIDC not configured — app still builds and runs.
    // DevAuthBypass injects a fake token from VITE_DEV_ACCESS_TOKEN if set.
    return <DevAuthBypass>{children}</DevAuthBypass>;
  }

  return (
    <AuthProvider
      authority={oidcConfig.authority}
      client_id={oidcConfig.clientId}
      redirect_uri={oidcConfig.redirectUri}
      scope={oidcConfig.scope}
      automaticSilentRenew
      userStore={new WebStorageStateStore({ store: window.localStorage })}
      onSigninCallback={() => {
        // Strip OIDC query params from URL after redirect
        window.history.replaceState({}, document.title, window.location.pathname);
      }}
    >
      <TokenBridge>{children}</TokenBridge>
    </AuthProvider>
  );
}

// ---------------------------------------------------------------------------
// Dev bypass: when OIDC env is not set, allow running the app unauthenticated
// or with a hard-coded token from VITE_DEV_ACCESS_TOKEN (never use in prod).
// ---------------------------------------------------------------------------

interface DevAuthBypassProps {
  children: ReactNode;
}

function DevAuthBypass({ children }: DevAuthBypassProps) {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  useEffect(() => {
    const devToken = import.meta.env["VITE_DEV_ACCESS_TOKEN"] as string | undefined;
    if (devToken) {
      console.warn(
        "[StudyDeck] DEV BYPASS: using VITE_DEV_ACCESS_TOKEN — do NOT use in production.",
      );
      setAccessToken(devToken);
    }
  }, [setAccessToken]);

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Callback page component — used by the /auth/callback route
// ---------------------------------------------------------------------------

export function OidcCallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isLoading && !auth.error) {
      navigate("/", { replace: true });
    }
  }, [auth.isLoading, auth.error, navigate]);

  if (auth.error) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p style={{ color: "var(--color-charcoal-primary)" }}>
            Authentication error: {auth.error.message}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p style={{ color: "var(--color-charcoal-primary)" }}>Completing sign-in…</p>
      </div>
    </main>
  );
}
