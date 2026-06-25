import { useAuth } from "react-oidc-context";
import { isOidcConfigured } from "@shared/auth/oidc-config";
import { Card } from "@shared/ui/Card";
import { PillButton } from "@shared/ui/PillButton";
import { BrandMark } from "@shared/ui/BrandMark";

// ---- Intent -----------------------------------------------------------------
// Who: A user arriving unauthenticated.
// Task: Sign in through the organization's SSO (or learn auth is unconfigured).
// Feel: Calm, trustworthy, branded — a single, obvious next step.

function IconLock() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function LoginPage() {
  const auth = useAuth();

  function handleLogin() {
    void auth.signinRedirect();
  }

  return (
    <main
      data-testid="login-page"
      className="flex min-h-screen items-center justify-center px-6"
    >
      <div className="sd-fade w-full max-w-[400px]">
        {/* Brand */}
        <div className="mb-7 flex justify-center">
          <BrandMark size="lg" />
        </div>

        <Card radius={18}>
          <div className="px-9 py-10 text-center">
            {isOidcConfigured ? (
              <>
                <h1
                  className="mb-2 text-[24px] font-semibold"
                  style={{ color: "var(--color-charcoal-primary)", letterSpacing: "-0.5px" }}
                >
                  Welcome back
                </h1>
                <p
                  className="mb-8 text-[15px] leading-[1.5]"
                  style={{ color: "var(--color-graphite)" }}
                >
                  Use your organization account to continue.
                </p>

                <PillButton
                  type="button"
                  variant="primary"
                  size="md"
                  data-testid="login-button"
                  onClick={handleLogin}
                  leadingIcon={<IconLock />}
                  className="w-full"
                >
                  Sign in with SSO
                </PillButton>

                <div
                  className="mt-7 flex items-center justify-center gap-2 border-t pt-5 text-[12.5px]"
                  style={{
                    borderColor: "var(--color-stone-surface)",
                    color: "var(--color-smoke)",
                  }}
                >
                  <span className="flex items-center" style={{ width: "13px", height: "13px" }}>
                    <IconLock />
                  </span>
                  Protected by single sign-on
                </div>
              </>
            ) : (
              <>
                <h1
                  className="mb-2 text-[24px] font-semibold"
                  style={{ color: "var(--color-charcoal-primary)", letterSpacing: "-0.5px" }}
                >
                  Authentication not configured
                </h1>
                <p
                  className="mb-6 text-[15px] leading-[1.5]"
                  style={{ color: "var(--color-graphite)" }}
                >
                  Set <code>VITE_OIDC_AUTHORITY</code>, <code>VITE_OIDC_CLIENT_ID</code>, and{" "}
                  <code>VITE_OIDC_REDIRECT_URI</code> to enable sign-in.
                </p>
                <div
                  className="rounded-[10px] px-4 py-3 text-[13px]"
                  style={{
                    backgroundColor: "var(--color-parchment-card)",
                    color: "var(--color-graphite)",
                  }}
                >
                  Dev mode — authentication bypassed
                </div>
              </>
            )}
          </div>
        </Card>

        <p
          className="mt-6 text-center text-[12.5px]"
          style={{ color: "var(--color-smoke)" }}
        >
          Trouble signing in? Contact your administrator.
        </p>
      </div>
    </main>
  );
}
