import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { useAuth } from "react-oidc-context";
import { RequireAuth } from "./RequireAuth";
import { useAuthStore } from "./auth-store";

// Mock isOidcConfigured so we can test both branches
vi.mock("./oidc-config", () => ({
  isOidcConfigured: true,
  oidcConfig: {
    authority: "https://auth.example.com",
    clientId: "test-client",
    redirectUri: "http://localhost:5173/auth/callback",
    scope: "openid profile",
  },
}));

// Mock react-oidc-context's useAuth so we can drive the loading/auth state.
// Defaults to undefined (no provider), matching the in-app dev/test wiring.
vi.mock("react-oidc-context", () => ({
  useAuth: vi.fn(() => undefined),
}));

function renderWithRouter(
  initialPath: string,
  element: React.ReactNode,
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        <Route path="/protected" element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    // Reset auth store to unauthenticated state before each test
    useAuthStore.setState({ accessToken: null, user: null });
    // Default: no OIDC provider context (settled, unauthenticated)
    vi.mocked(useAuth).mockReturnValue(undefined as never);
  });

  describe("when unauthenticated (no access token)", () => {
    it("redirects to /login", () => {
      renderWithRouter(
        "/protected",
        <RequireAuth>
          <div data-testid="protected-content">Protected</div>
        </RequireAuth>,
      );

      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });

    it("does not render protected children", () => {
      renderWithRouter(
        "/protected",
        <RequireAuth>
          <div data-testid="secret">Top secret</div>
        </RequireAuth>,
      );

      expect(screen.queryByTestId("secret")).not.toBeInTheDocument();
    });
  });

  describe("when authenticated (access token present)", () => {
    beforeEach(() => {
      useAuthStore.setState({ accessToken: "eyJhbGci.fake.token" });
    });

    it("renders protected children", () => {
      renderWithRouter(
        "/protected",
        <RequireAuth>
          <div data-testid="protected-content">Protected</div>
        </RequireAuth>,
      );

      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
    });

    it("does not redirect to /login", () => {
      renderWithRouter(
        "/protected",
        <RequireAuth>
          <main data-testid="app">App content</main>
        </RequireAuth>,
      );

      expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
    });
  });

  describe("when OIDC is still initializing (post-reload rehydration)", () => {
    it("shows a loading state instead of redirecting to /login", () => {
      // Provider is loading: token not yet rehydrated from storage.
      vi.mocked(useAuth).mockReturnValue({ isLoading: true } as never);

      renderWithRouter(
        "/protected",
        <RequireAuth>
          <div data-testid="protected-content">Protected</div>
        </RequireAuth>,
      );

      expect(screen.getByTestId("auth-loading")).toBeInTheDocument();
      expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("waits for the token to bridge when authenticated but token not yet in store", () => {
      // OIDC settled and authenticated, but TokenBridge hasn't populated the store yet.
      vi.mocked(useAuth).mockReturnValue({ isLoading: false, isAuthenticated: true } as never);

      renderWithRouter(
        "/protected",
        <RequireAuth>
          <div data-testid="protected-content">Protected</div>
        </RequireAuth>,
      );

      expect(screen.getByTestId("auth-loading")).toBeInTheDocument();
      expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });
  });

  describe("token state transitions", () => {
    it("redirects when token is removed after being present", () => {
      useAuthStore.setState({ accessToken: "valid-token" });

      const { rerender } = renderWithRouter(
        "/protected",
        <RequireAuth>
          <div data-testid="content">Content</div>
        </RequireAuth>,
      );

      expect(screen.getByTestId("content")).toBeInTheDocument();

      // Simulate logout
      useAuthStore.setState({ accessToken: null });

      rerender(
        <MemoryRouter initialEntries={["/protected"]}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
            <Route
              path="/protected"
              element={
                <RequireAuth>
                  <div data-testid="content">Content</div>
                </RequireAuth>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.queryByTestId("content")).not.toBeInTheDocument();
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
  });
});
