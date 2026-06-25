import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "react-oidc-context";
import { useAuthStore } from "./auth-store";
import { isOidcConfigured } from "./oidc-config";

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Full-screen loading state shown while the OIDC provider settles. Keeping the
 * user here (instead of redirecting) is what prevents a signed-in user from being
 * bounced to /login on a hard page reload.
 */
function AuthLoadingScreen() {
  return (
    <main
      data-testid="auth-loading"
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "var(--color-warm-canvas)" }}
    >
      <div
        className="sd-spin"
        aria-label="Loading"
        role="status"
        style={{
          width: "28px",
          height: "28px",
          border: "2.5px solid #ece9e4",
          borderTopColor: "var(--color-charcoal-primary)",
          borderRadius: "50%",
        }}
      />
    </main>
  );
}

/**
 * Guards a route: redirects to /login when the user is not authenticated.
 *
 * When OIDC is not configured (dev bypass), the guard is effectively disabled
 * so the app remains usable without an IdP running.
 *
 * The access token lives only in memory, so after a full page reload it is null
 * until react-oidc-context rehydrates the session from storage (an async step).
 * We therefore wait for the provider to finish loading before deciding, and hold
 * the protected tree until the token is bridged so no request fires without it.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  // `useAuth` returns undefined when no AuthProvider is mounted (dev bypass / tests).
  const auth = useAuth();

  // Dev bypass: no OIDC configured → allow all routes.
  if (!isOidcConfigured) {
    return <>{children}</>;
  }

  // OIDC is still initializing — e.g. rehydrating the session from storage after a
  // full page reload. Deciding now would bounce an already-signed-in user to /login.
  if (auth?.isLoading) {
    return <AuthLoadingScreen />;
  }

  const isAuthenticated = Boolean(accessToken) || Boolean(auth?.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated per OIDC, but the token hasn't been bridged into the store yet.
  // Hold one tick so protected API requests never fire without a Bearer token.
  if (!accessToken) {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
}
