import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
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
