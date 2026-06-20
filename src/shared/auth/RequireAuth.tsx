import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuthStore } from "./auth-store";
import { isOidcConfigured } from "./oidc-config";

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Guards a route: redirects to /login when the user is not authenticated.
 *
 * When OIDC is not configured (dev bypass), the guard is effectively disabled
 * so the app remains usable without an IdP running.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);

  // Dev bypass: no OIDC configured → allow all routes
  if (!isOidcConfigured) {
    return <>{children}</>;
  }

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
