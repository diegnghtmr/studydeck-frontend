import { BrowserRouter, Route, Routes } from "react-router";
import { AppShell } from "@shared/ui/AppShell";
import { RequireAuth } from "@shared/auth/RequireAuth";
import { OidcCallbackPage } from "@shared/auth/OidcProvider";
import { LoginPage } from "@features/auth/LoginPage";
import { DashboardPage } from "@features/decks/DashboardPage";
import { DeckListPage } from "@features/decks/DeckListPage";
import { CreateDeckPage } from "@features/decks/CreateDeckPage";
import { DeckDetailPage } from "@features/decks/DeckDetailPage";
import { CreateNotePage } from "@features/notes/CreateNotePage";
import { NoteDetailPage } from "@features/notes/NoteDetailPage";
import { ReviewSessionPage } from "@features/review/ReviewSessionPage";
import { ImportWizardPage } from "@features/import/ImportWizardPage";
import { DocumentLibraryPage } from "@features/documents/DocumentLibraryPage";
import { DocumentDetailPage } from "@features/documents/DocumentDetailPage";
import { RagChatPage } from "@features/ai/RagChatPage";
import { AiGeneratePage } from "@features/ai/AiGeneratePage";
import { StudyPage } from "@features/study/StudyPage";
import { SettingsPage } from "@features/settings/SettingsPage";

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
      <Routes>
        {/* Public routes — outside the shell */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<OidcCallbackPage />} />

        {/* Protected routes — inside the shell */}
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<DashboardPage />} />

          {/* Study */}
          <Route path="/study" element={<StudyPage />} />

          {/* Deck routes — order: /new before /:deckId */}
          <Route path="/decks" element={<DeckListPage />} />
          <Route path="/decks/new" element={<CreateDeckPage />} />
          <Route path="/decks/:deckId" element={<DeckDetailPage />} />

          {/* Note routes — /new before /:noteId */}
          <Route path="/decks/:deckId/notes/new" element={<CreateNotePage />} />
          <Route path="/decks/:deckId/notes/:noteId" element={<NoteDetailPage />} />

          {/* Review routes */}
          <Route path="/review" element={<ReviewSessionPage />} />
          <Route path="/review/:deckId" element={<ReviewSessionPage />} />

          {/* Import routes */}
          <Route path="/import" element={<ImportWizardPage />} />
          <Route path="/decks/:deckId/import" element={<ImportWizardPage />} />

          {/* Document routes */}
          <Route path="/documents" element={<DocumentLibraryPage />} />
          <Route path="/documents/:documentId" element={<DocumentDetailPage />} />

          {/* RAG Chat */}
          <Route path="/rag/chat" element={<RagChatPage />} />

          {/* AI Generate */}
          <Route path="/ai/generate" element={<AiGeneratePage />} />

          {/* Settings */}
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
