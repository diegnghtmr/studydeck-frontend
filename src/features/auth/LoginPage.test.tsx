import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useAuth } from "react-oidc-context";
import { LoginPage } from "./LoginPage";

const mockState = vi.hoisted(() => ({ configured: true }));

vi.mock("react-oidc-context", () => ({
  useAuth: vi.fn(() => ({ signinRedirect: vi.fn() })),
}));

vi.mock("@shared/auth/oidc-config", () => ({
  get isOidcConfigured() {
    return mockState.configured;
  },
  oidcConfig: { authority: "https://auth.example.com", clientId: "spa", redirectUri: "cb", scope: "openid" },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    mockState.configured = true;
    vi.mocked(useAuth).mockReturnValue({ signinRedirect: vi.fn() } as never);
  });

  it("renders the branded sign-in card", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.getByText(/StudyDeck/)).toBeInTheDocument();
    expect(screen.getByTestId("login-button")).toHaveTextContent("Sign in with SSO");
  });

  it("starts the OIDC redirect when the SSO button is clicked", () => {
    const signinRedirect = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ signinRedirect } as never);

    render(<LoginPage />);
    fireEvent.click(screen.getByTestId("login-button"));

    expect(signinRedirect).toHaveBeenCalledOnce();
  });

  it("shows the not-configured message when OIDC is unset", () => {
    mockState.configured = false;

    render(<LoginPage />);
    expect(screen.getByText(/Authentication not configured/)).toBeInTheDocument();
    expect(screen.queryByTestId("login-button")).not.toBeInTheDocument();
  });
});
