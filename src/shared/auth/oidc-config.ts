/**
 * OIDC configuration driven by Vite env variables.
 *
 * Required env vars (set in .env.local or Docker):
 *   VITE_OIDC_AUTHORITY   — e.g. https://auth.studydeck.ai
 *   VITE_OIDC_CLIENT_ID   — public client ID (no secret for SPAs)
 *   VITE_OIDC_REDIRECT_URI — e.g. http://localhost:5173/auth/callback
 *
 * Optional:
 *   VITE_OIDC_SCOPE — space-separated scopes; defaults to openid profile email study.read
 */

export interface OidcEnvConfig {
  authority: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

const OIDC_ENV = {
  AUTHORITY: import.meta.env["VITE_OIDC_AUTHORITY"] as string | undefined,
  CLIENT_ID: import.meta.env["VITE_OIDC_CLIENT_ID"] as string | undefined,
  REDIRECT_URI: import.meta.env["VITE_OIDC_REDIRECT_URI"] as string | undefined,
  SCOPE: import.meta.env["VITE_OIDC_SCOPE"] as string | undefined,
} as const;

export const isOidcConfigured =
  Boolean(OIDC_ENV.AUTHORITY) &&
  Boolean(OIDC_ENV.CLIENT_ID) &&
  Boolean(OIDC_ENV.REDIRECT_URI);

export const oidcConfig: OidcEnvConfig = {
  authority: OIDC_ENV.AUTHORITY ?? "",
  clientId: OIDC_ENV.CLIENT_ID ?? "",
  redirectUri: OIDC_ENV.REDIRECT_URI ?? "",
  scope: OIDC_ENV.SCOPE ?? "openid profile email study.read",
};
