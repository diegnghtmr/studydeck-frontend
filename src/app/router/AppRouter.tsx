import { BrowserRouter, Route, Routes } from "react-router";
import { NavBar } from "@shared/ui/NavBar";
import { RequireAuth } from "@shared/auth/RequireAuth";
import { OidcCallbackPage } from "@shared/auth/OidcProvider";
import { LoginPage } from "@features/auth/LoginPage";
import { DashboardPage } from "@features/decks/DashboardPage";
import { DeckListPage } from "@features/decks/DeckListPage";
import { CreateDeckPage } from "@features/decks/CreateDeckPage";
import { DeckDetailPage } from "@features/decks/DeckDetailPage";
import { CreateNotePage } from "@features/notes/CreateNotePage";
import { NoteDetailPage } from "@features/notes/NoteDetailPage";

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

          {/* Deck routes — order matters: /new before /:deckId */}
          <Route
            path="/decks"
            element={
              <RequireAuth>
                <DeckListPage />
              </RequireAuth>
            }
          />
          <Route
            path="/decks/new"
            element={
              <RequireAuth>
                <CreateDeckPage />
              </RequireAuth>
            }
          />
          <Route
            path="/decks/:deckId"
            element={
              <RequireAuth>
                <DeckDetailPage />
              </RequireAuth>
            }
          />

          {/* Note routes — /new before /:noteId */}
          <Route
            path="/decks/:deckId/notes/new"
            element={
              <RequireAuth>
                <CreateNotePage />
              </RequireAuth>
            }
          />
          <Route
            path="/decks/:deckId/notes/:noteId"
            element={
              <RequireAuth>
                <NoteDetailPage />
              </RequireAuth>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
