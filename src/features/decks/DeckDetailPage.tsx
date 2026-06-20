import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDeck, useUpdateDeck, useArchiveDeck, useDeleteDeck } from "./hooks/use-decks";
import { useNotes } from "@features/notes/hooks/use-notes";
import { DeckStatsPanel } from "@features/review/components/DeckStatsPanel";
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { ConfirmDialog } from "@shared/ui/ConfirmDialog";
import { normalizeApiProblem } from "@shared/api/problem";
import { cn } from "@shared/lib/cn";

// ---- Rename form schema -----------------------------------------------------
const renameDeckSchema = z.object({
  title: z
    .string()
    .min(1, { error: "Deck name is required." })
    .max(120, { error: "Name must be 120 characters or fewer." }),
  description: z.string().max(1000).optional(),
});

type RenameDeckForm = z.infer<typeof renameDeckSchema>;

// ---- Helpers ----------------------------------------------------------------

function getNotePreviewText(note: { noteType: string; content: unknown }): string {
  const content = note.content as Record<string, unknown>;
  switch (note.noteType) {
    case "basic":
    case "reversed":
      return String(content.front ?? "");
    case "cloze":
      return String(content.text ?? "");
    case "multiple-choice":
      return String(content.question ?? "");
    case "free-text":
      return String(content.prompt ?? "");
    default:
      return "";
  }
}

// ---- Component --------------------------------------------------------------

/**
 * DeckDetailPage — /decks/:deckId
 *
 * Shows deck header, metadata, action buttons (rename, archive, delete),
 * and a notes-list placeholder section (F3 fills in the real list).
 */
export function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const { data: deck, isPending, isError, error } = useDeck(deckId ?? "");
  const { data: notesPage } = useNotes(deckId ?? "");
  const updateDeck = useUpdateDeck(deckId ?? "");
  const archiveDeck = useArchiveDeck(deckId ?? "");
  const deleteDeck = useDeleteDeck(deckId ?? "");

  const [isRenaming, setIsRenaming] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [actionError, setActionError] = useState<ReturnType<typeof normalizeApiProblem>>(null);

  const renameForm = useForm<RenameDeckForm>({
    resolver: zodResolver(renameDeckSchema),
    values: {
      title: deck?.title ?? "",
      description: deck?.description ?? "",
    },
  });

  // ---- Loading / Error ------------------------------------------------

  const problem = isError
    ? normalizeApiProblem(
        (error as { response?: { data?: unknown } })?.response?.data,
        (error as { response?: { status?: number } })?.response?.status ?? 500,
      )
    : null;

  if (isPending) {
    return (
      <main
        data-testid="deck-detail-loading"
        className="mx-auto max-w-[1200px] px-6 py-12"
        aria-busy="true"
        aria-label="Loading deck"
      >
        <div
          className="h-8 w-48 animate-pulse rounded-[10px]"
          style={{ backgroundColor: "var(--color-stone-surface)" }}
        />
        <div
          className="mt-4 h-4 w-96 animate-pulse rounded-[10px]"
          style={{ backgroundColor: "var(--color-stone-surface)" }}
        />
      </main>
    );
  }

  if (problem) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-12">
        <ProblemBanner problem={problem} />
      </main>
    );
  }

  if (!deck) return null;

  // ---- Handlers -------------------------------------------------------

  async function handleRenameSubmit(values: RenameDeckForm) {
    setActionError(null);
    const descriptionValue = values.description?.trim();
    const updatePayload = {
      title: values.title,
      ...(descriptionValue ? { description: descriptionValue } : {}),
    };
    try {
      await updateDeck.mutateAsync(updatePayload);
      setIsRenaming(false);
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setActionError(p ?? { type: "about:blank", title: "Update failed", status: 500 });
    }
  }

  async function handleArchiveConfirm() {
    setShowArchiveConfirm(false);
    setActionError(null);
    try {
      await archiveDeck.mutateAsync();
      navigate("/decks");
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setActionError(p ?? { type: "about:blank", title: "Archive failed", status: 500 });
    }
  }

  async function handleDeleteConfirm() {
    setShowDeleteConfirm(false);
    setActionError(null);
    try {
      await deleteDeck.mutateAsync();
      navigate("/decks");
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setActionError(p ?? { type: "about:blank", title: "Delete failed", status: 500 });
    }
  }

  // ---- Render ---------------------------------------------------------

  return (
    <>
      <main
        data-testid="deck-detail-page"
        className="mx-auto max-w-[1200px] px-6 py-12"
      >
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[13px]">
          <Link
            to="/decks"
            className="no-underline transition-opacity hover:opacity-70"
            style={{ color: "var(--color-ash)" }}
          >
            My Decks
          </Link>
          <span style={{ color: "var(--color-fog)" }} aria-hidden="true">/</span>
          <span
            className="max-w-[240px] truncate"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            {deck.title}
          </span>
        </nav>

        {/* Action error */}
        {actionError && (
          <ProblemBanner
            problem={actionError}
            className="mb-6"
            onDismiss={() => setActionError(null)}
          />
        )}

        {/* Deck header */}
        <div
          data-testid="deck-header"
          className="mb-8 rounded-[10px] p-6"
          style={{
            backgroundColor: "var(--color-parchment-card)",
            boxShadow: "var(--shadow-subtle)",
          }}
        >
          {isRenaming ? (
            /* Inline rename form */
            <form
              onSubmit={renameForm.handleSubmit(handleRenameSubmit)}
              data-testid="rename-form"
              className="space-y-3"
            >
              <div>
                <label
                  htmlFor="rename-title"
                  className="mb-1 block text-[12px] font-medium"
                  style={{ color: "var(--color-ash)" }}
                >
                  Deck name
                </label>
                <input
                  id="rename-title"
                  type="text"
                  autoFocus
                  aria-required="true"
                  {...renameForm.register("title")}
                  className="w-full rounded-[10px] border-0 px-4 py-2 text-[19px] font-semibold outline-none focus:ring-2"
                  style={{
                    backgroundColor: "var(--color-stone-surface)",
                    color: "var(--color-charcoal-primary)",
                  }}
                />
                {renameForm.formState.errors.title && (
                  <p
                    role="alert"
                    className="mt-1 text-[12px]"
                    style={{ color: "var(--color-coral-red)" }}
                  >
                    {renameForm.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="rename-description"
                  className="mb-1 block text-[12px] font-medium"
                  style={{ color: "var(--color-ash)" }}
                >
                  Description
                </label>
                <textarea
                  id="rename-description"
                  rows={2}
                  {...renameForm.register("description")}
                  className="w-full resize-none rounded-[10px] border-0 px-4 py-2 text-[14px] outline-none focus:ring-2"
                  style={{
                    backgroundColor: "var(--color-stone-surface)",
                    color: "var(--color-graphite)",
                  }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  data-testid="rename-submit"
                  disabled={renameForm.formState.isSubmitting}
                  className="rounded-[32px] px-4 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-midnight)" }}
                >
                  {renameForm.formState.isSubmitting ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    renameForm.reset();
                    setIsRenaming(false);
                  }}
                  className="rounded-[32px] px-4 py-1.5 text-[13px] font-medium"
                  style={{
                    backgroundColor: "var(--color-stone-surface)",
                    color: "var(--color-graphite)",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Deck info display */
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1
                    data-testid="deck-title"
                    className="text-[23px] font-semibold"
                    style={{
                      color: "var(--color-charcoal-primary)",
                      letterSpacing: "-0.44px",
                    }}
                  >
                    {deck.title}
                  </h1>
                  {deck.description && (
                    <p
                      data-testid="deck-description"
                      className="mt-2 text-[15px] leading-[1.47]"
                      style={{ color: "var(--color-graphite)" }}
                    >
                      {deck.description}
                    </p>
                  )}

                  {/* Tags */}
                  {deck.tags && deck.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {deck.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-[6px] px-2.5 py-0.5 text-[12px] font-medium"
                          style={{
                            backgroundColor: "var(--color-stone-surface)",
                            color: "var(--color-graphite)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {deck.archived && (
                  <span
                    className="shrink-0 rounded-[6px] px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: "var(--color-stone-surface)",
                      color: "var(--color-ash)",
                    }}
                  >
                    Archived
                  </span>
                )}
              </div>

              {/* Deck stats */}
              <DeckStatsPanel deckId={deckId ?? ""} />
            </div>
          )}

          {/* Action buttons — always visible */}
          {!isRenaming && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to={`/review/${deckId}`}
                data-testid="start-review-btn"
                className="rounded-[32px] px-4 py-1.5 text-[13px] font-medium text-white no-underline transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--color-ember-orange)" }}
              >
                Start review
              </Link>

              <button
                type="button"
                data-testid="rename-deck-btn"
                onClick={() => setIsRenaming(true)}
                className="rounded-[32px] px-4 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: "var(--color-stone-surface)",
                  color: "var(--color-graphite)",
                }}
              >
                Rename
              </button>

              <button
                type="button"
                data-testid="archive-deck-btn"
                onClick={() => setShowArchiveConfirm(true)}
                disabled={deck.archived}
                className={cn(
                  "rounded-[32px] px-4 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-80 disabled:opacity-40",
                )}
                style={{
                  backgroundColor: "var(--color-stone-surface)",
                  color: "var(--color-graphite)",
                }}
              >
                {deck.archived ? "Archived" : "Archive"}
              </button>

              <button
                type="button"
                data-testid="delete-deck-btn"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-[32px] px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: "var(--color-coral-red)" }}
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Notes section */}
        <section aria-label="Notes" data-testid="notes-section">
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="text-[19px] font-semibold"
              style={{
                color: "var(--color-charcoal-primary)",
                letterSpacing: "-0.25px",
              }}
            >
              Notes
              {notesPage && notesPage.page.totalElements > 0 && (
                <span
                  className="ml-2 text-[15px] font-normal"
                  style={{ color: "var(--color-ash)" }}
                >
                  ({notesPage.page.totalElements})
                </span>
              )}
            </h2>

            <Link
              to={`/decks/${deckId}/notes/new`}
              data-testid="new-note-btn"
              className="rounded-[32px] px-4 py-1.5 text-[13px] font-medium text-white no-underline transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--color-midnight)" }}
            >
              + New note
            </Link>
          </div>

          {!notesPage || notesPage.items.length === 0 ? (
            <div
              className="flex flex-col items-center py-16 text-center"
              style={{
                backgroundColor: "var(--color-parchment-card)",
                borderRadius: "10px",
                boxShadow: "var(--shadow-subtle)",
              }}
            >
              <p className="text-[15px]" style={{ color: "var(--color-ash)" }}>
                No notes yet.
              </p>
              <Link
                to={`/decks/${deckId}/notes/new`}
                className="mt-3 rounded-[32px] px-4 py-1.5 text-[13px] font-medium text-white no-underline transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--color-midnight)" }}
              >
                Create first note
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {notesPage.items.map((note) => (
                <Link
                  key={note.id}
                  to={`/decks/${deckId}/notes/${note.id}`}
                  data-testid="note-list-item"
                  className="flex items-center justify-between rounded-[10px] px-4 py-3 no-underline transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: "var(--color-parchment-card)",
                    boxShadow: "var(--shadow-subtle)",
                  }}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span
                      className="shrink-0 rounded-[6px] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide"
                      style={{
                        backgroundColor: "var(--color-stone-surface)",
                        color: "var(--color-ash)",
                      }}
                    >
                      {note.noteType}
                    </span>
                    <span
                      className="truncate text-[14px]"
                      style={{ color: "var(--color-charcoal-primary)" }}
                    >
                      {getNotePreviewText(note)}
                    </span>
                  </div>
                  {note.tags.length > 0 && (
                    <div className="ml-3 flex shrink-0 gap-1">
                      {note.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-[6px] px-2 py-0.5 text-[11px]"
                          style={{
                            backgroundColor: "var(--color-stone-surface)",
                            color: "var(--color-graphite)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Dialogs */}
      <ConfirmDialog
        open={showArchiveConfirm}
        title="Archive this deck?"
        description="Archived decks are hidden from the main list. You can unarchive them later."
        confirmLabel="Archive"
        cancelLabel="Keep"
        onConfirm={handleArchiveConfirm}
        onCancel={() => setShowArchiveConfirm(false)}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this deck?"
        description="This will permanently remove the deck and all its notes and cards. This action cannot be undone."
        confirmLabel="Delete forever"
        cancelLabel="Keep deck"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
