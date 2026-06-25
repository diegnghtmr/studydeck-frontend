/**
 * NoteDetailPage — /decks/:deckId/notes/:noteId
 *
 * Shows note content, edit form (NoteEditor), delete (ConfirmDialog),
 * and derived cards using CardPreview.
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { ConfirmDialog } from "@shared/ui/ConfirmDialog";
import { Card } from "@shared/ui/Card";
import { Badge } from "@shared/ui/Badge";
import { Breadcrumb } from "@shared/ui/Breadcrumb";
import { FieldLabel } from "@shared/ui/FieldLabel";
import { PillButton } from "@shared/ui/PillButton";
import { normalizeApiProblem } from "@shared/api/problem";
import { useNote, useUpdateNote, useDeleteNote, useCardsForNote } from "./hooks/use-notes";
import { useDeck } from "@features/decks/hooks/use-decks";
import { NoteEditor } from "./components/NoteEditor";
import { CardPreview } from "./components/CardPreview";
import type { NoteFormValues } from "./schemas/note-schemas";

// ---- Helper — render note content as readable text --------------------------

function NoteContentDisplay({ note }: { note: { noteType: string; content: unknown } }) {
  const { t } = useTranslation("notes");
  const content = note.content as Record<string, unknown>;

  switch (note.noteType) {
    case "basic":
    case "reversed":
      return (
        <div className="space-y-4">
          <div>
            <FieldLabel className="mb-1.5">{t("fields.front")}</FieldLabel>
            <p className="text-[15px] leading-[1.5]" style={{ color: "var(--color-charcoal-primary)" }}>
              {String(content.front ?? "")}
            </p>
          </div>
          <div>
            <FieldLabel className="mb-1.5">{t("fields.back")}</FieldLabel>
            <p className="text-[15px] leading-[1.5]" style={{ color: "var(--color-graphite)" }}>
              {String(content.back ?? "")}
            </p>
          </div>
        </div>
      );

    case "cloze":
      return (
        <div>
          <FieldLabel className="mb-1.5">{t("fields.clozeText")}</FieldLabel>
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
                  <span className="text-[11px] font-medium">{t("display.correct")}</span>
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
            <FieldLabel className="mb-1.5">{t("fields.prompt")}</FieldLabel>
            <p className="text-[15px] leading-[1.5]" style={{ color: "var(--color-charcoal-primary)" }}>
              {String(content.prompt ?? "")}
            </p>
          </div>
          <div>
            <FieldLabel className="mb-1.5">{t("fields.expectedAnswer")}</FieldLabel>
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
  const { t } = useTranslation("notes");

  const { data: note, isPending, isError, error } = useNote(noteId ?? "");
  const { data: deck } = useDeck(deckId ?? "");
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
        aria-label={t("detail.loadingAria")}
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

  const noteTypeLabel = note.noteType.charAt(0).toUpperCase() + note.noteType.slice(1);

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
      setActionError(p ?? { type: "about:blank", title: t("detail.errors.updateFailed"), status: 500 });
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
      setActionError(p ?? { type: "about:blank", title: t("detail.errors.deleteFailed"), status: 500 });
    }
  }

  // ---- Render ---------------------------------------------------------

  return (
    <>
      <main data-testid="note-detail-page" className="mx-auto max-w-[720px] px-6 py-12">
        <Breadcrumb
          items={[
            { label: t("breadcrumb.myDecks"), href: "/decks" },
            { label: deck?.title ?? t("breadcrumb.deckFallback"), href: `/decks/${deckId}` },
            { label: t("breadcrumb.noteLabel", { type: noteTypeLabel }) },
          ]}
        />

        {actionError && (
          <ProblemBanner problem={actionError} className="mb-6" onDismiss={() => setActionError(null)} />
        )}

        {/* Note content card */}
        <Card className="mb-6">
          <div className="p-6">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge label={note.noteType} tone="blue" />
                {note.tags.map((tag) => (
                  <Badge key={tag} label={tag} tone="gray" />
                ))}
              </div>

              {!isEditing && (
                <div className="flex shrink-0 gap-2">
                  <PillButton
                    variant="secondary"
                    size="sm"
                    data-testid="edit-note-btn"
                    onClick={() => setIsEditing(true)}
                  >
                    {t("detail.editBtn")}
                  </PillButton>
                  <PillButton
                    variant="ghost-danger"
                    size="sm"
                    data-testid="delete-note-btn"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    {t("detail.deleteBtn")}
                  </PillButton>
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
        </Card>

        {/* Derived cards section */}
        <section data-testid="cards-section" aria-label={t("detail.derivedCardsAria")}>
          <h2
            className="mb-3 text-[19px] font-semibold"
            style={{ color: "var(--color-charcoal-primary)", letterSpacing: "-0.25px" }}
          >
            {t("detail.cardsHeading")}
          </h2>

          {!cards || cards.length === 0 ? (
            <Card>
              <div className="flex items-center justify-center py-10 text-center">
                <p className="text-[15px]" style={{ color: "var(--color-ash)" }}>
                  {t("detail.noCardsYet")}
                </p>
              </div>
            </Card>
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
        title={t("detail.confirmDelete.title")}
        description={t("detail.confirmDelete.description")}
        confirmLabel={t("detail.confirmDelete.confirm")}
        cancelLabel={t("detail.confirmDelete.cancel")}
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
