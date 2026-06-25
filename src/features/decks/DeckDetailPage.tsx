import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useDeck, useUpdateDeck, useArchiveDeck, useDeleteDeck } from "./hooks/use-decks";
import { useNotes } from "@features/notes/hooks/use-notes";
import { DeckStatsPanel } from "@features/review/components/DeckStatsPanel";
import { ExportButton } from "@features/import/ExportButton";
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { ConfirmDialog } from "@shared/ui/ConfirmDialog";
import { Breadcrumb } from "@shared/ui/Breadcrumb";
import { Card } from "@shared/ui/Card";
import { Badge } from "@shared/ui/Badge";
import { TagChip } from "@shared/ui/TagChip";
import { PillButton } from "@shared/ui/PillButton";
import { FIELD_CLASS } from "@shared/ui/field";
import { normalizeApiProblem } from "@shared/api/problem";
import { clozePlainText, parseCloze } from "@features/review/lib/render-cloze";
import { cn } from "@shared/lib/cn";
import type { ReactNode } from "react";
import type { NoteModel } from "@shared/api/types";

// ---- Helpers ----------------------------------------------------------------

function getNotePreviewText(note: { noteType: string; content: unknown }): string {
  const content = note.content as Record<string, unknown>;
  switch (note.noteType) {
    case "basic":
    case "reversed":
      return String(content.front ?? "");
    case "cloze":
      return clozePlainText(String(content.text ?? ""));
    case "multiple-choice":
      return String(content.question ?? "");
    case "free-text":
      return String(content.prompt ?? "");
    default:
      return "";
  }
}

/**
 * Renders a note's preview. For cloze notes the deletion answers are
 * highlighted (blue) so it's clear which words are the clozes.
 */
function renderNotePreview(note: NoteModel): ReactNode {
  if (note.noteType === "cloze") {
    const text = String((note.content as unknown as Record<string, unknown>).text ?? "");
    return parseCloze(text).map((seg, i) =>
      seg.isCloze ? (
        <span key={i} style={{ color: "#0090ff", fontWeight: 600 }}>
          {seg.text}
        </span>
      ) : (
        <span key={i}>{seg.text}</span>
      ),
    );
  }
  return getNotePreviewText(note);
}

// ---- NoteRow — a single note preview row in the deck's notes list -----------

function NoteRow({ note, deckId }: { note: NoteModel; deckId: string }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      to={`/decks/${deckId}/notes/${note.id}`}
      data-testid="note-list-item"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-center gap-3 rounded-[14px] px-5 py-3.5 no-underline"
      style={{
        backgroundColor: "#ffffff",
        boxShadow: hover
          ? "rgba(0,0,0,0.05) 0 6px 20px -8px, #ece9e4 0 0 0 1px inset"
          : "var(--shadow-subtle)",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        transition: "box-shadow 0.16s ease, transform 0.16s ease",
      }}
    >
      <Badge label={note.noteType} tone="blue" />
      <span
        className="min-w-0 flex-1 truncate text-[14px]"
        style={{ color: "var(--color-charcoal-primary)" }}
      >
        {renderNotePreview(note)}
      </span>
      {note.tags.length > 0 && (
        <div className="flex shrink-0 gap-1">
          {note.tags.slice(0, 2).map((tag) => (
            <TagChip key={tag} label={tag} />
          ))}
        </div>
      )}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={hover ? "var(--color-ash)" : "var(--color-fog)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0"
        style={{ transition: "stroke 0.16s ease" }}
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

// ---- Component --------------------------------------------------------------

/**
 * DeckDetailPage — /decks/:deckId
 *
 * Shows deck header, metadata, action buttons (rename, archive, delete),
 * and a notes-list placeholder section (F3 fills in the real list).
 */
export function DeckDetailPage() {
  const { t } = useTranslation("decks");
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const renameDeckSchema = useMemo(
    () =>
      z.object({
        title: z
          .string()
          .min(1, { error: t("detail.validation.nameRequired") })
          .max(120, { error: t("detail.validation.nameTooLong") }),
        description: z.string().max(1000).optional(),
      }),
    [t],
  );

  type RenameDeckForm = z.infer<typeof renameDeckSchema>;

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
        aria-label={t("detail.loadingAria")}
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
        <Breadcrumb
          items={[
            { label: t("detail.myDecks"), href: "/decks" },
            { label: deck.title },
          ]}
        />

        {/* Action error */}
        {actionError && (
          <ProblemBanner
            problem={actionError}
            className="mb-6"
            onDismiss={() => setActionError(null)}
          />
        )}

        {/* Deck header */}
        <Card className="mb-8" data-testid="deck-header">
          <div className="p-6">
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
                  className="mb-1.5 block text-[13px] font-medium"
                  style={{ color: "var(--color-charcoal-primary)" }}
                >
                  {t("detail.nameLabel")}
                </label>
                <input
                  id="rename-title"
                  type="text"
                  autoFocus
                  aria-required="true"
                  {...renameForm.register("title")}
                  className={cn("w-full text-[19px] font-semibold", FIELD_CLASS)}
                  style={{ color: "var(--color-charcoal-primary)" }}
                />
                {renameForm.formState.errors.title && (
                  <p
                    role="alert"
                    className="mt-1.5 text-[12px]"
                    style={{ color: "var(--color-coral-red)" }}
                  >
                    {renameForm.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="rename-description"
                  className="mb-1.5 block text-[13px] font-medium"
                  style={{ color: "var(--color-charcoal-primary)" }}
                >
                  {t("detail.descriptionLabel")}
                </label>
                <textarea
                  id="rename-description"
                  rows={2}
                  {...renameForm.register("description")}
                  className={cn("w-full text-[14px]", FIELD_CLASS)}
                  style={{ color: "var(--color-graphite)" }}
                />
              </div>

              <div className="flex gap-2">
                <PillButton
                  type="submit"
                  size="sm"
                  data-testid="rename-submit"
                  disabled={renameForm.formState.isSubmitting}
                >
                  {renameForm.formState.isSubmitting ? t("actions.saving") : t("actions.save")}
                </PillButton>
                <PillButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    renameForm.reset();
                    setIsRenaming(false);
                  }}
                >
                  {t("actions.cancel")}
                </PillButton>
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
                        <TagChip key={tag} label={tag} />
                      ))}
                    </div>
                  )}
                </div>

                {deck.archived && <Badge label={t("actions.archived")} tone="gray" />}
              </div>

              {/* Deck stats */}
              <DeckStatsPanel deckId={deckId ?? ""} />
            </div>
          )}

          {/* Action buttons — always visible. Constructive actions grouped
              left; the destructive Delete is isolated on the right. */}
          {!isRenaming && (
            <div
              className="mt-5 flex flex-wrap items-center justify-between gap-x-2 gap-y-3 border-t pt-5"
              style={{ borderColor: "var(--color-stone-surface)" }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <PillButton
                  href={`/review/${deckId}`}
                  size="sm"
                  data-testid="start-review-btn"
                >
                  {t("actions.startReview")}
                </PillButton>

                <PillButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  data-testid="rename-deck-btn"
                  onClick={() => setIsRenaming(true)}
                >
                  {t("actions.rename")}
                </PillButton>

                <PillButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  data-testid="archive-deck-btn"
                  onClick={() => setShowArchiveConfirm(true)}
                  disabled={deck.archived}
                >
                  {deck.archived ? t("actions.archived") : t("actions.archive")}
                </PillButton>

                <ExportButton deckId={deckId ?? ""} deckTitle={deck.title} />

                <PillButton
                  href={`/decks/${deckId}/import`}
                  size="sm"
                  variant="secondary"
                  data-testid="import-deck-btn"
                >
                  {t("actions.importJson")}
                </PillButton>
              </div>

              <PillButton
                type="button"
                size="sm"
                variant="ghost-danger"
                data-testid="delete-deck-btn"
                onClick={() => setShowDeleteConfirm(true)}
              >
                {t("actions.delete")}
              </PillButton>
            </div>
          )}
          </div>
        </Card>

        {/* Notes section */}
        <section aria-label={t("detail.notesHeading")} data-testid="notes-section">
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="text-[19px] font-semibold"
              style={{
                color: "var(--color-charcoal-primary)",
                letterSpacing: "-0.25px",
              }}
            >
              {t("detail.notesHeading")}
              {notesPage && notesPage.page.totalElements > 0 && (
                <span
                  className="ml-2 text-[15px] font-normal"
                  style={{ color: "var(--color-ash)" }}
                >
                  ({notesPage.page.totalElements})
                </span>
              )}
            </h2>

            <PillButton href={`/decks/${deckId}/notes/new`} size="sm" data-testid="new-note-btn">
              {t("detail.newNote")}
            </PillButton>
          </div>

          {!notesPage || notesPage.items.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center py-16 text-center">
                <p className="text-[15px]" style={{ color: "var(--color-ash)" }}>
                  {t("detail.noNotes")}
                </p>
                <PillButton
                  href={`/decks/${deckId}/notes/new`}
                  size="sm"
                  className="mt-3"
                >
                  {t("detail.createFirstNote")}
                </PillButton>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {notesPage.items.map((note) => (
                <NoteRow key={note.id} note={note} deckId={deckId ?? ""} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Dialogs */}
      <ConfirmDialog
        open={showArchiveConfirm}
        title={t("detail.archiveDialog.title")}
        description={t("detail.archiveDialog.description")}
        confirmLabel={t("detail.archiveDialog.confirm")}
        cancelLabel={t("detail.archiveDialog.cancel")}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setShowArchiveConfirm(false)}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        title={t("detail.deleteDialog.title")}
        description={t("detail.deleteDialog.description")}
        confirmLabel={t("detail.deleteDialog.confirm")}
        cancelLabel={t("detail.deleteDialog.cancel")}
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
