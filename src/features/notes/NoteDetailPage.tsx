/**
 * NoteDetailPage — /decks/:deckId/notes/:noteId
 *
 * Shows note content, edit form (NoteEditor), delete (ConfirmDialog),
 * and derived cards using CardPreview.
 */
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { ConfirmDialog } from "@shared/ui/ConfirmDialog";
import { normalizeApiProblem } from "@shared/api/problem";
import { useNote, useUpdateNote, useDeleteNote, useCardsForNote } from "./hooks/use-notes";
import { NoteEditor } from "./components/NoteEditor";
import { CardPreview } from "./components/CardPreview";
import type { NoteFormValues } from "./schemas/note-schemas";

// ---- Helper — render note content as readable text --------------------------

function NoteContentDisplay({ note }: { note: { noteType: string; content: unknown } }) {
  const content = note.content as Record<string, unknown>;

  switch (note.noteType) {
    case "basic":
    case "reversed":
      return (
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-smoke)" }}>
              Front
            </p>
            <p className="text-[15px] leading-[1.5]" style={{ color: "var(--color-charcoal-primary)" }}>
              {String(content.front ?? "")}
            </p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-smoke)" }}>
              Back
            </p>
            <p className="text-[15px] leading-[1.5]" style={{ color: "var(--color-graphite)" }}>
              {String(content.back ?? "")}
            </p>
          </div>
        </div>
      );

    case "cloze":
      return (
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-smoke)" }}>
            Cloze Text
          </p>
          <p className="font-mono text-[14px] leading-[1.6]" style={{ color: "var(--color-charcoal-primary)" }}>
            {String(content.text ?? "")}
          </p>
        </div>
      );

    case "multiple-choice": {
      const options = (content.options as Array<{ key: string; text: string }>) ?? [];
      const correctKeys = Array.isArray(content.correctOptionKeys)
        ? (content.correctOptionKeys as string[])
        : [...(content.correctOptionKeys as Set<string>)];
      return (
        <div className="space-y-3">
          <p className="text-[15px] font-medium leading-[1.5]" style={{ color: "var(--color-charcoal-primary)" }}>
            {String(content.question ?? "")}
          </p>
          <ul className="space-y-1.5">
            {options.map((opt) => (
              <li
                key={opt.key}
                className="flex items-start gap-2 text-[14px]"
                style={{ color: correctKeys.includes(opt.key) ? "var(--color-meadow-green)" : "var(--color-graphite)" }}
              >
                <span className="font-semibold">{opt.key}.</span>
                <span>{opt.text}</span>
                {correctKeys.includes(opt.key) && (
                  <span className="text-[11px] font-medium">(correct)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case "free-text":
      return (
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-smoke)" }}>
              Prompt
            </p>
            <p className="text-[15px] leading-[1.5]" style={{ color: "var(--color-charcoal-primary)" }}>
              {String(content.prompt ?? "")}
            </p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-smoke)" }}>
              Expected Answer
            </p>
            <p className="text-[15px] leading-[1.5]" style={{ color: "var(--color-graphite)" }}>
              {String(content.expectedAnswer ?? "")}
            </p>
          </div>
        </div>
      );

    default:
      return (
        <pre className="text-[12px]" style={{ color: "var(--color-graphite)" }}>
          {JSON.stringify(content, null, 2)}
        </pre>
      );
  }
}

// ---- NoteDetailPage ---------------------------------------------------------

export function NoteDetailPage() {
  const { deckId, noteId } = useParams<{ deckId: string; noteId: string }>();
  const navigate = useNavigate();

  const { data: note, isPending, isError, error } = useNote(noteId ?? "");
  const { data: cards } = useCardsForNote(noteId ?? "");
  const updateNote = useUpdateNote(noteId ?? "");
  const deleteNote = useDeleteNote(noteId ?? "");

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState<ReturnType<typeof normalizeApiProblem>>(null);

  // ---- Loading / Error ------------------------------------------------

  if (isPending) {
    return (
      <main
        data-testid="note-detail-loading"
        className="mx-auto max-w-[720px] px-6 py-12"
        aria-busy="true"
        aria-label="Loading note"
      >
        <div className="h-8 w-48 animate-pulse rounded-[10px]" style={{ backgroundColor: "var(--color-stone-surface)" }} />
        <div className="mt-4 h-4 w-96 animate-pulse rounded-[10px]" style={{ backgroundColor: "var(--color-stone-surface)" }} />
      </main>
    );
  }

  const problem = isError
    ? normalizeApiProblem(
        (error as { response?: { data?: unknown } })?.response?.data,
        (error as { response?: { status?: number } })?.response?.status ?? 500,
      )
    : null;

  if (problem) {
    return (
      <main className="mx-auto max-w-[720px] px-6 py-12">
        <ProblemBanner problem={problem} />
      </main>
    );
  }

  if (!note) return null;

  // ---- Handlers -------------------------------------------------------

  async function handleUpdateSubmit(values: NoteFormValues) {
    setActionError(null);
    try {
      await updateNote.mutateAsync({
        content: values.content as never,
        ...(values.tags ? { tags: values.tags } : {}),
      });
      setIsEditing(false);
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setActionError(p ?? { type: "about:blank", title: "Update failed", status: 500 });
    }
  }

  async function handleDeleteConfirm() {
    setShowDeleteConfirm(false);
    setActionError(null);
    try {
      await deleteNote.mutateAsync();
      navigate(`/decks/${deckId}`);
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
      <main data-testid="note-detail-page" className="mx-auto max-w-[720px] px-6 py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[13px]">
          <Link to="/decks" className="no-underline transition-opacity hover:opacity-70" style={{ color: "var(--color-ash)" }}>
            My Decks
          </Link>
          <span style={{ color: "var(--color-fog)" }} aria-hidden="true">/</span>
          <Link to={`/decks/${deckId}`} className="no-underline transition-opacity hover:opacity-70" style={{ color: "var(--color-ash)" }}>
            Deck
          </Link>
          <span style={{ color: "var(--color-fog)" }} aria-hidden="true">/</span>
          <span className="max-w-[200px] truncate capitalize" style={{ color: "var(--color-charcoal-primary)" }}>
            {note.noteType} note
          </span>
        </nav>

        {actionError && (
          <ProblemBanner problem={actionError} className="mb-6" onDismiss={() => setActionError(null)} />
        )}

        {/* Note content card */}
        <div
          className="mb-6 rounded-[10px] p-6"
          style={{ backgroundColor: "var(--color-parchment-card)", boxShadow: "var(--shadow-subtle)" }}
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="rounded-[6px] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide"
                style={{ backgroundColor: "var(--color-stone-surface)", color: "var(--color-ash)" }}
              >
                {note.noteType}
              </span>
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-[6px] px-2 py-0.5 text-[11px]"
                  style={{ backgroundColor: "var(--color-stone-surface)", color: "var(--color-graphite)" }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {!isEditing && (
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="edit-note-btn"
                  onClick={() => setIsEditing(true)}
                  className="rounded-[32px] px-4 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "var(--color-stone-surface)", color: "var(--color-graphite)" }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  data-testid="delete-note-btn"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-[32px] px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "var(--color-coral-red)" }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <NoteEditor
              deckId={deckId ?? ""}
              initialNote={note}
              onSubmit={handleUpdateSubmit}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <NoteContentDisplay note={note} />
          )}
        </div>

        {/* Derived cards section */}
        <section data-testid="cards-section" aria-label="Derived cards">
          <h2
            className="mb-3 text-[19px] font-semibold"
            style={{ color: "var(--color-charcoal-primary)", letterSpacing: "-0.25px" }}
          >
            Cards
          </h2>

          {!cards || cards.length === 0 ? (
            <div
              className="flex items-center justify-center py-10 text-center"
              style={{ backgroundColor: "var(--color-parchment-card)", borderRadius: "10px", boxShadow: "var(--shadow-subtle)" }}
            >
              <p className="text-[15px]" style={{ color: "var(--color-ash)" }}>
                No cards generated yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {cards.map((card) => (
                <CardPreview key={card.id} card={card} fetchPreview />
              ))}
            </div>
          )}
        </section>
      </main>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this note?"
        description="This will permanently remove the note and all its derived cards. This action cannot be undone."
        confirmLabel="Delete note"
        cancelLabel="Keep note"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
