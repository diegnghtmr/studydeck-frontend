import { BrowserRouter, Route, Routes } from "react-router";
import { NavBar } from "@shared/ui/NavBar";
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
          <Route path="/" element={<DashboardPage />} />
          <Route path="/decks" element={<DeckListPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
