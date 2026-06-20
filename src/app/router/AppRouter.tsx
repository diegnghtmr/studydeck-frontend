import { BrowserRouter, Route, Routes } from "react-router";
import { NavBar } from "@shared/ui/NavBar";
import { RequireAuth } from "@shared/auth/RequireAuth";
import { OidcCallbackPage } from "@shared/auth/OidcProvider";
import { LoginPage } from "@features/auth/LoginPage";
import { DashboardPage } from "@features/decks/DashboardPage";
import { DeckListPage } from "@features/decks/DeckListPage";

function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1
          className="text-[44px] font-semibold"
          style={{ color: "var(--color-charcoal-primary)" }}
        >
          404
        </h1>
        <p style={{ color: "var(--color-ash)" }}>Page not found.</p>
      </div>
    </main>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <div
        className="min-h-screen"
        style={{ backgroundColor: "var(--color-warm-canvas)" }}
      >
        <NavBar />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<OidcCallbackPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/decks"
            element={
              <RequireAuth>
                <DeckListPage />
              </RequireAuth>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
