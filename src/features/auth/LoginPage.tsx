import { useAuth } from "react-oidc-context";
import { isOidcConfigured } from "@shared/auth/oidc-config";

export function LoginPage() {
  const auth = useAuth();

  function handleLogin() {
    void auth.signinRedirect();
  }

  if (!isOidcConfigured) {
    return (
      <main
        data-testid="login-page"
        className="flex min-h-screen items-center justify-center"
      >
        <div className="rounded-[10px] p-10 text-center" style={{ backgroundColor: "#ffffff", boxShadow: "var(--shadow-subtle)" }}>
          <h1
            className="mb-4 text-[28px] font-semibold"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            Sign in to StudyDeck
          </h1>
          <p
            className="mb-6 text-[15px]"
            style={{ color: "var(--color-graphite)" }}
          >
            OIDC is not configured in this environment.
            Set <code>VITE_OIDC_AUTHORITY</code>, <code>VITE_OIDC_CLIENT_ID</code>, and{" "}
            <code>VITE_OIDC_REDIRECT_URI</code> to enable authentication.
          </p>
          <div
            className="rounded-md px-4 py-3 text-sm"
            style={{ backgroundColor: "var(--color-parchment-card)", color: "var(--color-graphite)" }}
          >
            Dev mode — authentication bypassed
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      data-testid="login-page"
      className="flex min-h-screen items-center justify-center"
    >
      <div
        className="rounded-[10px] p-10 text-center"
        style={{ backgroundColor: "#ffffff", boxShadow: "var(--shadow-subtle)" }}
      >
        <h1
          className="mb-4 text-[28px] font-semibold"
          style={{ color: "var(--color-charcoal-primary)" }}
        >
          Sign in to StudyDeck
        </h1>
        <p className="mb-8 text-[15px]" style={{ color: "var(--color-graphite)" }}>
          Use your organization account to continue.
        </p>
        <button
          type="button"
          data-testid="login-button"
          onClick={handleLogin}
          className="rounded-[32px] px-8 py-3 text-[15px] font-medium text-white transition-colors duration-200 hover:opacity-90"
          style={{ backgroundColor: "var(--color-midnight)" }}
        >
          Sign in with SSO
        </button>
      </div>
    </main>
  );
}
