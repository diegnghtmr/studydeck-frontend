import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { FormEvent, KeyboardEvent } from "react";
import { useDecks, useCreateDeck, useUpdateDeck, useDeleteDeck } from "./hooks/use-decks";
import { useNotes, useCreateNote, useDeleteNote } from "@features/notes/hooks/use-notes";
import { getDeckColor } from "./lib/deck-color";
import { DeckIcon, DECK_GLYPHS, DECK_GLYPH_NAMES, DECK_COLORS } from "./DeckIcon";
import { notesApi } from "@shared/api/client";
import {
  PillButton,
  Badge,
  Card,
  FilterPill,
  ConfirmDialog,
  Toast,
  Dropdown,
} from "@shared/ui";
import type { DeckModel, NoteModel, PagedNoteModel } from "@shared/api/types";
import { FIELD_CLASS } from "@shared/ui/field";
import { cn } from "@shared/lib/cn";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type NoteDisplayValue =
  | { kind: "text"; front: string; back: string }
  | { kind: "cloze"; front: string }
  | { kind: "multipleChoice"; front: string; optionCount: number };

function getNoteDisplayValue(note: NoteModel): NoteDisplayValue {
  const c = note.content;
  switch (note.noteType) {
    case "basic":
    case "reversed":
      return {
        kind: "text",
        front: (c as { front: string; back: string }).front,
        back: (c as { front: string; back: string }).back,
      };
    case "cloze":
      return { kind: "cloze", front: (c as { text: string }).text };
    case "multiple-choice": {
      const mc = c as { question: string; options: { key: string; text: string }[] };
      return { kind: "multipleChoice", front: mc.question, optionCount: mc.options.length };
    }
    case "free-text": {
      const ft = c as { prompt: string; expectedAnswer: string };
      return { kind: "text", front: ft.prompt, back: ft.expectedAnswer };
    }
    default:
      return { kind: "text", front: "", back: "" };
  }
}

// Thin wrapper used in the search filter (needs plain strings, not keys)
function getNoteDisplayText(note: NoteModel): { front: string; back: string } {
  const val = getNoteDisplayValue(note);
  if (val.kind === "cloze") return { front: val.front, back: "" };
  if (val.kind === "multipleChoice") return { front: val.front, back: "" };
  return { front: val.front, back: val.back };
}

// ---------------------------------------------------------------------------
// useAllNotes — local hook (not exported)
// ---------------------------------------------------------------------------

function useAllNotes(deckIds: string[]) {
  const results = useQueries({
    queries: deckIds.map((deckId) => ({
      queryKey: ["notes", "list", { deckId }] as const,
      queryFn: async () => {
        const r = await notesApi.listNotes(0, 100, undefined, deckId);
        return r.data as unknown as PagedNoteModel;
      },
      enabled: deckIds.length > 0,
    })),
  });

  const allNotes = results.flatMap((r) => r.data?.items ?? []);
  const isLoading = results.some((r) => r.isPending);
  return { notes: allNotes, isLoading };
}

// ---------------------------------------------------------------------------
// NoteCardItem
// ---------------------------------------------------------------------------

interface NoteCardItemProps {
  note: NoteModel;
  decks: DeckModel[];
  onNavigate: (noteId: string, deckId: string) => void;
  onDeleteSuccess: () => void;
}

function NoteCardItem({ note, decks, onNavigate, onDeleteSuccess }: NoteCardItemProps) {
  const { t } = useTranslation("decks");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteMutation = useDeleteNote(note.id);
  const { color } = getDeckColor(note.deckId);
  const displayVal = getNoteDisplayValue(note);
  const front = displayVal.front;
  const back =
    displayVal.kind === "cloze"
      ? t("preview.clozeDeletion")
      : displayVal.kind === "multipleChoice"
      ? t("preview.optionsCount", { count: displayVal.optionCount })
      : displayVal.back;
  const deckTitle = decks.find((d) => d.id === note.deckId)?.title ?? t("cardItem.unknownDeck");

  const NOTE_TYPE_LABELS: Record<string, string> = {
    basic: t("cardTypes.basic"),
    reversed: t("cardTypes.reversed"),
    cloze: t("cardTypes.cloze"),
    "multiple-choice": t("cardTypes.multipleChoice"),
    "free-text": t("cardTypes.freeText"),
  };

  const noteLabel = NOTE_TYPE_LABELS[note.noteType] ?? note.noteType;

  async function handleDeleteConfirm() {
    try {
      await deleteMutation.mutateAsync();
      setConfirmOpen(false);
      onDeleteSuccess();
    } catch {
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={t("cardItem.openCard", { front })}
        data-testid="note-card"
        className="cursor-pointer"
        onClick={() => onNavigate(note.id, note.deckId)}
        onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onNavigate(note.id, note.deckId);
          }
        }}
      >
      <Card
        radius={14}
        className="p-[18px_20px] transition-transform hover:-translate-y-0.5"
      >
        {/* Top row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Badge label={noteLabel} tone="blue" />
          <button
            type="button"
            data-testid="delete-note-btn"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmOpen(true);
            }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#c6c6c6" }}
            aria-label={t("cardItem.deleteCard")}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 4h10M6 4V2h4v2M5 4l.5 9h5L11 4" />
            </svg>
          </button>
        </div>

        {/* Front text */}
        <p
          className="line-clamp-2"
          style={{ fontSize: 15, fontWeight: 500, color: "#343433", marginBottom: 4 }}
        >
          {front}
        </p>

        {/* Back text */}
        <p className="line-clamp-1" style={{ fontSize: 13, color: "#a7a7a7" }}>
          {back}
        </p>

        {/* Deck tag */}
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            color: "#c6c6c6",
          }}
        >
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              backgroundColor: color,
              flexShrink: 0,
            }}
          />
          <span>{deckTitle}</span>
        </div>
      </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t("cardDelete.title")}
        description={t("cardDelete.description")}
        confirmLabel={t("cardDelete.confirm")}
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// DeckRowItem
// ---------------------------------------------------------------------------

interface DeckRowItemProps {
  deck: DeckModel;
  isSelected: boolean;
  noteCount: number;
  onSelect: () => void;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}

function DeckRowItem({ deck, isSelected, noteCount, onSelect, onOpen, onRename, onDelete }: DeckRowItemProps) {
  const { t } = useTranslation("decks");

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  }

  return (
    <div
      data-testid="deck-row"
      className="group relative"
      role="button"
      tabIndex={0}
      aria-label={t("deckRow.selectDeck", { title: deck.title })}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 10px",
        borderRadius: 10,
        cursor: "pointer",
        backgroundColor: isSelected ? "#f6f4ef" : "transparent",
      }}
    >
      <DeckIcon deckId={deck.id} icon={deck.icon} color={deck.color} size={22} />
      <span
        style={{
          fontSize: 13.5,
          fontWeight: 500,
          color: "#343433",
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {deck.title}
      </span>
      <span
        style={{
          fontSize: 11,
          color: "#a7a7a7",
          backgroundColor: "#f2f0ed",
          borderRadius: 4,
          padding: "1px 6px",
          flexShrink: 0,
        }}
      >
        {noteCount}
      </span>

      {/* Icon buttons: visible on hover or keyboard focus-within */}
      <div
        className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 flex gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onOpen}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 2,
            color: "#a7a7a7",
          }}
          aria-label={t("deckRow.openDeckAria", { title: deck.title })}
          title={t("deckRow.openDeck")}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 3.5h6.5V10M12.5 3.5L4 12" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onRename}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 2,
            color: "#a7a7a7",
          }}
          aria-label={t("deckRow.renameDeck", { title: deck.title })}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5Z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 2,
            color: "#a7a7a7",
          }}
          aria-label={t("deckRow.deleteDeck", { title: deck.title })}
          className="hover:text-red-500"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 4h10M6 4V2h4v2M5 4l.5 9h5L11 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DeckDeleteAction
// ---------------------------------------------------------------------------

interface DeckDeleteActionProps {
  deckId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function DeckDeleteAction({ deckId, onSuccess, onCancel }: DeckDeleteActionProps) {
  const { t } = useTranslation("decks");
  const del = useDeleteDeck(deckId);

  async function handleConfirm() {
    try {
      await del.mutateAsync();
      onSuccess();
    } catch {
      onCancel();
    }
  }

  return (
    <ConfirmDialog
      open
      title={t("deckDelete.title")}
      description={t("deckDelete.description")}
      confirmLabel={t("deckDelete.confirm")}
      destructive
      onConfirm={handleConfirm}
      onCancel={onCancel}
    />
  );
}

// ---------------------------------------------------------------------------
// DeckModal
// ---------------------------------------------------------------------------

function AppearanceChip({
  selected,
  onClick,
  ariaLabel,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={selected}
      style={{
        width: 34,
        height: 34,
        borderRadius: 9,
        border: selected ? "1.5px solid #343433" : "1.5px solid #ece9e4",
        backgroundColor: selected ? "#f6f4ef" : "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

interface DeckModalProps {
  mode: "create" | "rename";
  deckId?: string;
  decks: DeckModel[];
  onSuccess: (newDeck?: DeckModel) => void;
  onCancel: () => void;
}

function DeckModal({ mode, deckId, decks, onSuccess, onCancel }: DeckModalProps) {
  const { t } = useTranslation("decks");
  const existing =
    mode === "rename" && deckId !== undefined
      ? decks.find((d) => d.id === deckId)
      : undefined;
  const [name, setName] = useState(existing?.title ?? "");
  // null = "Auto" (let the app derive a stable icon/color from the deck id).
  const [icon, setIcon] = useState<string | null>(existing?.icon ?? null);
  const [color, setColor] = useState<string | null>(existing?.color ?? null);
  const createDeck = useCreateDeck();
  const updateDeck = useUpdateDeck(deckId ?? "");
  const dialogRef = useRef<HTMLDivElement>(null);

  // Move focus into the dialog when it opens
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = dialog.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }, []);

  // Trap focus and handle Escape
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const appearance = {
      ...(icon !== null && { icon }),
      ...(color !== null && { color }),
    };
    try {
      if (mode === "create") {
        const newDeck = await createDeck.mutateAsync({ title: name.trim(), ...appearance });
        onSuccess(newDeck);
      } else {
        await updateDeck.mutateAsync({ title: name.trim(), ...appearance });
        onSuccess();
      }
    } catch {
      // Mutation error state is visible via createDeck.isError / updateDeck.isError.
      // Do not close the modal — let the user retry or cancel.
    }
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(18,18,18,0.34)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        overflowY: "auto",
      }}
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-modal-title"
        className="sd-pop"
        data-testid="deck-modal"
        style={{
          maxWidth: 440,
          width: "100%",
          background: "#fff",
          borderRadius: 18,
          padding: 32,
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="deck-modal-title" style={{ fontSize: 20, fontWeight: 600, color: "#343433", margin: "0 0 20px" }}>
          {mode === "create" ? t("deckModal.titleNew") : t("deckModal.titleRename")}
        </h2>
        <form onSubmit={handleSubmit}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              color: "#343433",
              marginBottom: 6,
            }}
          >
            {t("deckModal.nameLabel")}
          </label>
          <input
            data-testid="deck-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("deckModal.namePlaceholder")}
            className={cn(FIELD_CLASS, "w-full text-[14px]")}
            style={{ color: "#343433" }}
          />
          <p style={{ fontSize: 12, color: "#a7a7a7", margin: "6px 0 0" }}>
            {t("deckModal.nameHint")}
          </p>

          {/* Appearance: icon + color */}
          <fieldset style={{ border: "none", padding: 0, margin: "20px 0 0", minInlineSize: 0 }}>
            <legend
              style={{ fontSize: 13, fontWeight: 500, color: "#343433", padding: 0, marginBottom: 8 }}
            >
              {t("deckModal.iconLegend")}
            </legend>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <AppearanceChip
                selected={icon === null}
                onClick={() => setIcon(null)}
                ariaLabel={t("deckModal.iconAuto")}
              >
                <span style={{ fontSize: 11, color: "#848281" }}>{t("deckModal.iconAutoLabel")}</span>
              </AppearanceChip>
              {DECK_GLYPH_NAMES.map((glyphName) => {
                const selected = icon === glyphName;
                const accent = color ?? "#343433";
                return (
                  <AppearanceChip
                    key={glyphName}
                    selected={selected}
                    onClick={() => setIcon(glyphName)}
                    ariaLabel={t("deckModal.iconItem", { name: glyphName })}
                  >
                    <svg
                      width={18}
                      height={18}
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      style={{ color: selected ? accent : "#6b6a68" }}
                    >
                      <path
                        d={DECK_GLYPHS[glyphName]}
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </AppearanceChip>
                );
              })}
            </div>
          </fieldset>

          <fieldset style={{ border: "none", padding: 0, margin: "16px 0 0", minInlineSize: 0 }}>
            <legend
              style={{ fontSize: 13, fontWeight: 500, color: "#343433", padding: 0, marginBottom: 8 }}
            >
              {t("deckModal.colorLegend")}
            </legend>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <AppearanceChip
                selected={color === null}
                onClick={() => setColor(null)}
                ariaLabel={t("deckModal.colorAuto")}
              >
                <span style={{ fontSize: 11, color: "#848281" }}>{t("deckModal.colorAutoLabel")}</span>
              </AppearanceChip>
              {DECK_COLORS.map((c) => {
                const selected = color === c.color;
                return (
                  <AppearanceChip
                    key={c.color}
                    selected={selected}
                    onClick={() => setColor(c.color)}
                    ariaLabel={t("deckModal.colorItem", { color: c.color })}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        backgroundColor: c.color,
                        display: "inline-block",
                      }}
                    />
                  </AppearanceChip>
                );
              })}
            </div>
          </fieldset>

          {/* Live preview (rename only, where a deck id exists) */}
          {deckId !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
              <DeckIcon deckId={deckId} icon={icon} color={color} size={32} />
              <span style={{ fontSize: 12, color: "#a7a7a7" }}>{t("deckModal.preview")}</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
            <PillButton variant="secondary" onClick={onCancel} type="button">
              {t("actions.cancel")}
            </PillButton>
            <PillButton variant="primary" type="submit" data-testid="deck-modal-submit">
              {mode === "create" ? t("deckModal.submitCreate") : t("deckModal.submitSave")}
            </PillButton>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// CardModal
// ---------------------------------------------------------------------------

interface CardModalProps {
  decks: DeckModel[];
  selectedDeckId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function CardModal({ decks, selectedDeckId, onSuccess, onCancel }: CardModalProps) {
  const { t } = useTranslation("decks");
  const [deckId, setDeckId] = useState(selectedDeckId ?? (decks[0]?.id ?? ""));
  const [noteType, setNoteType] = useState<string>("basic");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [mcqOptions, setMcqOptions] = useState(["", "", "", ""]);
  const [mcqCorrect, setMcqCorrect] = useState<string>("A");

  const createNote = useCreateNote();
  const cardDialogRef = useRef<HTMLDivElement>(null);

  // Move focus into the dialog when it opens
  useEffect(() => {
    const dialog = cardDialogRef.current;
    if (!dialog) return;
    const focusable = dialog.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }, []);

  // Trap focus and handle Escape for CardModal
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = cardDialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const NOTE_TYPE_TABS = [
    { value: "basic", label: t("cardTypes.basic") },
    { value: "reversed", label: t("cardTypes.reversed") },
    { value: "cloze", label: t("cardTypes.cloze") },
    { value: "multiple-choice", label: t("cardTypes.multipleChoice") },
    { value: "free-text", label: t("cardTypes.freeText") },
  ];

  function getFrontLabel() {
    if (noteType === "cloze") return t("frontLabel.cloze");
    if (noteType === "multiple-choice") return t("frontLabel.question");
    if (noteType === "free-text") return t("frontLabel.prompt");
    return t("frontLabel.front");
  }

  function getFrontPlaceholder() {
    if (noteType === "cloze") return t("frontPlaceholder.cloze");
    if (noteType === "multiple-choice") return t("frontPlaceholder.question");
    if (noteType === "free-text") return t("frontPlaceholder.freeText");
    return t("frontPlaceholder.front");
  }

  function getBackLabel() {
    if (noteType === "free-text") return t("backLabel.expectedAnswer");
    return t("backLabel.back");
  }

  function getBackPlaceholder() {
    if (noteType === "free-text") return t("backPlaceholder.modelAnswer");
    return t("backPlaceholder.back");
  }

  function showBack() {
    return noteType === "basic" || noteType === "reversed" || noteType === "free-text";
  }

  // Count {{cN::…}} groups so the helper line mirrors the prototype.
  const clozeCount = (front.match(/\{\{c\d+::/g) ?? []).length;

  // Append a new cloze deletion stub with the next ordinal at the end of the text.
  function insertClozeDeletion() {
    const next = clozeCount + 1;
    setFront((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}{{c${next}::}}`);
  }

  function getPreviewTypeLabel() {
    return NOTE_TYPE_TABS.find((tab) => tab.value === noteType)?.label ?? "Card";
  }

  function buildContent(): Record<string, unknown> {
    switch (noteType) {
      case "basic":
      case "reversed":
        return { front, back };
      case "cloze":
        return { text: front };
      case "multiple-choice": {
        const optionKeys = ["A", "B", "C", "D"];
        return {
          question: front,
          options: optionKeys.map((k, i) => ({ key: k, text: mcqOptions[i] ?? "" })),
          correctOptionKeys: [mcqCorrect],
        };
      }
      case "free-text":
        return { prompt: front, expectedAnswer: back };
      default:
        return {};
    }
  }

  function getPreviewBack() {
    if (noteType === "cloze") return "";
    if (noteType === "multiple-choice") return mcqOptions.filter(Boolean).join(" / ");
    return back;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!deckId || !front.trim()) return;
    try {
      await createNote.mutateAsync({
        deckId,
        noteType: noteType as "basic" | "reversed" | "cloze" | "multiple-choice" | "free-text",
        content: buildContent() as never,
      });
      onSuccess();
    } catch {
      // Do not close — let the user retry or cancel.
    }
  }

  const OPTION_KEYS = ["A", "B", "C", "D"];

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(18,18,18,0.34)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        overflowY: "auto",
      }}
      onClick={onCancel}
    >
      <div
        ref={cardDialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-modal-title"
        className="sd-pop"
        data-testid="card-modal"
        style={{
          maxWidth: 620,
          width: "100%",
          background: "#fff",
          borderRadius: 20,
          boxShadow: "var(--shadow-lg)",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "22px 26px",
            borderBottom: "1px solid #f2f0ed",
          }}
        >
          <h2
            id="card-modal-title"
            style={{
              fontFamily: "var(--font-family)",
              fontSize: 22,
              fontWeight: 500,
              color: "#343433",
              letterSpacing: "-0.5px",
              margin: 0,
            }}
          >
            {t("cardModal.title")}
          </h2>
          <button
            type="button"
            aria-label={t("cardModal.closeAria")}
            data-testid="card-modal-close"
            onClick={onCancel}
            style={{ background: "none", border: "none", color: "#a7a7a7", cursor: "pointer", padding: 4, display: "flex", lineHeight: 0 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: "24px 26px" }}>
          {/* Deck picker */}
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "#848281",
                marginBottom: 7,
              }}
            >
              {t("cardModal.deckLabel")}
            </label>
            <Dropdown
              items={decks.map((d) => ({ value: d.id, label: d.title }))}
              value={deckId}
              placeholder={t("cardModal.deckSelectPlaceholder")}
              onSelect={setDeckId}
              searchable
              searchPlaceholder={t("search.decksPlaceholder")}
              data-testid="card-deck-picker"
            />
          </div>

          {/* Type tabs */}
          <div style={{ marginBottom: 20 }}>
            <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#848281", marginBottom: 9 }}>
              {t("cardModal.cardTypeLabel")}
            </span>
            <div className="flex gap-2 flex-wrap">
              {NOTE_TYPE_TABS.map((tab) => (
                <FilterPill
                  key={tab.value}
                  active={noteType === tab.value}
                  shape="rounded"
                  data-testid={`card-type-tab-${tab.value}`}
                  onClick={() => {
                    setNoteType(tab.value);
                    setFront("");
                    setBack("");
                  }}
                >
                  {tab.label}
                </FilterPill>
              ))}
            </div>
          </div>

          {/* Front / Cloze text / Question / Prompt */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#848281" }}>
                {getFrontLabel()}
              </label>
              {noteType === "cloze" && (
                <button
                  type="button"
                  data-testid="card-cloze-insert"
                  onClick={insertClozeDeletion}
                  style={{ background: "#f6f4ef", color: "#474645", border: "none", borderRadius: 7, padding: "5px 11px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                >
                  {t("cardModal.addCloze")}
                </button>
              )}
            </div>
            <textarea
              data-testid="card-front-input"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder={getFrontPlaceholder()}
              rows={3}
              className={cn(FIELD_CLASS, "w-full text-[14px]")}
              style={{ color: "#343433" }}
            />
            {noteType === "cloze" && (
              <p style={{ fontSize: 12.5, color: "#848281", margin: "8px 0 0" }}>
                {t("cardModal.clozeHint", { count: clozeCount })}
              </p>
            )}
          </div>

          {/* Back / Expected Answer */}
          {showBack() && (
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#848281",
                  marginBottom: 7,
                }}
              >
                {getBackLabel()}
              </label>
              <textarea
                data-testid="card-back-input"
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder={getBackPlaceholder()}
                rows={3}
                className={cn(FIELD_CLASS, "w-full text-[14px]")}
                style={{ color: "#343433" }}
              />
            </div>
          )}

          {/* MCQ options */}
          {noteType === "multiple-choice" && (
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#848281",
                  marginBottom: 9,
                }}
              >
                {t("cardModal.mcqOptionsLabel")}
              </label>
              {OPTION_KEYS.map((key, i) => (
                <div
                  key={key}
                  style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}
                >
                  <input
                    type="radio"
                    id={`mcq-option-${key}`}
                    name="mcq-correct"
                    value={key}
                    checked={mcqCorrect === key}
                    onChange={() => setMcqCorrect(key)}
                    style={{ flexShrink: 0 }}
                    aria-label={t("cardModal.mcqOptionAria", { key })}
                  />
                  <label
                    htmlFor={`mcq-option-${key}`}
                    style={{ fontSize: 13, fontWeight: 600, color: "#a7a7a7", width: 16, cursor: "pointer" }}
                  >
                    {key}
                  </label>
                  <input
                    type="text"
                    value={mcqOptions[i] ?? ""}
                    onChange={(e) => {
                      const next = [...mcqOptions];
                      next[i] = e.target.value;
                      setMcqOptions(next);
                    }}
                    placeholder={t("cardModal.mcqOptionPlaceholder", { key })}
                    className={cn(FIELD_CLASS, "flex-1 text-[14px]")}
                    style={{ color: "#343433" }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Live preview */}
          <div
            data-testid="card-preview"
            style={{ background: "#fbfaf9", borderRadius: 12, padding: 20, textAlign: "center", marginTop: 4 }}
          >
            <div style={{ marginBottom: 14 }}>
              <Badge label={getPreviewTypeLabel()} tone="blue" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.4, color: "#343433", overflowWrap: "anywhere" }}>
              {front !== "" ? front : "—"}
            </div>
            <div
              style={{
                borderTop: "1px dashed #e7e4df",
                paddingTop: 14,
                marginTop: 14,
                fontSize: 15,
                color: "#474645",
                lineHeight: 1.5,
                overflowWrap: "anywhere",
              }}
            >
              {getPreviewBack() !== "" ? getPreviewBack() : "—"}
            </div>
          </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "18px 26px",
              borderTop: "1px solid #f2f0ed",
            }}
          >
            <PillButton variant="primary" type="submit" data-testid="card-modal-submit">
              {t("cardModal.submitAdd")}
            </PillButton>
            <PillButton variant="secondary" onClick={onCancel} type="button">
              {t("actions.cancel")}
            </PillButton>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// DeckListPage — main export
// ---------------------------------------------------------------------------

export function DeckListPage() {
  const { t } = useTranslation("decks");
  const navigate = useNavigate();

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deckModalState, setDeckModalState] = useState<{
    open: boolean;
    mode: "create" | "rename";
    deckId?: string;
  } | null>(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [deleteDeckTarget, setDeleteDeckTarget] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: "" });

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timer on unmount to prevent setState after unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const TYPE_FILTER_OPTIONS = [
    { value: "all", label: t("typeFilter.allTypes") },
    { value: "basic", label: t("cardTypes.basic") },
    { value: "reversed", label: t("cardTypes.reversed") },
    { value: "cloze", label: t("cardTypes.cloze") },
    { value: "multiple-choice", label: t("cardTypes.multipleChoice") },
    { value: "free-text", label: t("cardTypes.freeText") },
  ];

  const { data: decksPage } = useDecks({ size: 100 });
  const decks = decksPage?.items ?? [];
  const deckIds = decks.map((d) => d.id);

  // Always load all notes so "All decks" badge count is always accurate
  const { notes: allDeckNotes, isLoading: allNotesLoading } = useAllNotes(deckIds);
  const { data: singleDeckData, isPending: singleLoading } = useNotes(
    selectedDeckId ?? "",
    { size: 100 },
  );

  const rawNotes = selectedDeckId === null ? allDeckNotes : (singleDeckData?.items ?? []);
  const notesLoading = selectedDeckId === null ? allNotesLoading : singleLoading;

  const filteredNotes = rawNotes
    .filter((n) => typeFilter === "all" || n.noteType === typeFilter)
    .filter((n) => {
      if (!searchQuery.trim()) return true;
      const text = getNoteDisplayText(n);
      const q = searchQuery.toLowerCase();
      return (
        text.front.toLowerCase().includes(q) || text.back.toLowerCase().includes(q)
      );
    });

  function showToast(message: string) {
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ visible: true, message });
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null;
      setToast({ visible: false, message: "" });
    }, 2500);
  }

  function handleDeckDeleteSuccess() {
    if (deleteDeckTarget !== null && deleteDeckTarget === selectedDeckId) {
      setSelectedDeckId(null);
    }
    setDeleteDeckTarget(null);
    showToast(t("toast.deckDeleted"));
  }

  return (
    <main
      data-testid="deck-list-page"
      className="sd-fade"
      style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 56px 96px" }}
    >
      {/* A. Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-family)",
              fontSize: 40,
              fontWeight: 500,
              letterSpacing: "-1.2px",
              color: "#343433",
              margin: 0,
            }}
          >
            {t("page.title")}
          </h1>
          <p style={{ fontSize: 15, color: "#848281", margin: "4px 0 0" }}>
            {t("page.subtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <PillButton
            variant="secondary"
            onClick={() => setDeckModalState({ open: true, mode: "create" })}
          >
            {t("actions.newDeck")}
          </PillButton>
          <PillButton
            variant="primary"
            data-testid="new-card-btn"
            onClick={() => setCardModalOpen(true)}
          >
            {t("actions.newCard")}
          </PillButton>
        </div>
      </div>

      {/* B. Two-column layout */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* B1: Left panel */}
        <div style={{ flex: "none", width: 240 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                color: "#a7a7a7",
                letterSpacing: ".4px",
              }}
            >
              {t("sidebar.decksLabel")}
            </span>
            <button
              type="button"
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: "none",
                background: "#f6f4ef",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                color: "#343433",
              }}
              onClick={() => setDeckModalState({ open: true, mode: "create" })}
            >
              +
            </button>
          </div>

          <Card radius={14} className="p-[6px]">
            {/* "All decks" row */}
            <div
              data-testid="all-decks-row"
              role="button"
              tabIndex={0}
              aria-label={t("sidebar.showAllDecks")}
              aria-pressed={selectedDeckId === null}
              onClick={() => setSelectedDeckId(null)}
              onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedDeckId(null);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 10px",
                borderRadius: 10,
                cursor: "pointer",
                backgroundColor: selectedDeckId === null ? "#f6f4ef" : "transparent",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  backgroundColor: "#f2f0ed",
                  color: "#a7a7a7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3l8.5 4.7L12 12.4 3.5 7.7 12 3ZM4 12l8 4.5 8-4.5M4 16.3l8 4.5 8-4.5"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span
                style={{ fontSize: 13.5, fontWeight: 500, color: "#343433", flex: 1 }}
              >
                {t("sidebar.allDecks")}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "#a7a7a7",
                  backgroundColor: "#f2f0ed",
                  borderRadius: 4,
                  padding: "1px 6px",
                }}
              >
                {allDeckNotes.length}
              </span>
            </div>

            <hr style={{ margin: "4px 0", border: "none", borderTop: "1px solid #f2f0ed" }} />

            {decks.map((deck) => (
              <DeckRowItem
                key={deck.id}
                deck={deck}
                isSelected={selectedDeckId === deck.id}
                noteCount={allDeckNotes.filter((n) => n.deckId === deck.id).length}
                onSelect={() => setSelectedDeckId(deck.id)}
                onOpen={() => navigate(`/decks/${deck.id}`)}
                onRename={() =>
                  setDeckModalState({ open: true, mode: "rename", deckId: deck.id })
                }
                onDelete={() => setDeleteDeckTarget(deck.id)}
              />
            ))}
          </Card>
        </div>

        {/* B2: Right panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Search bar */}
          <div
            className="flex items-center gap-2 px-3 py-2 mb-3"
            style={{
              background: "#ffffff",
              borderRadius: 10,
              boxShadow: "inset 0 0 0 1px #f2f0ed",
              overflow: "hidden",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <circle cx="7" cy="7" r="4.5" stroke="#a7a7a7" strokeWidth="1.5" />
              <path
                d="M10.5 10.5L13 13"
                stroke="#a7a7a7"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              data-testid="card-search"
              type="text"
              placeholder={t("search.cardsPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                flex: 1,
                fontSize: 14,
                color: "#343433",
                backgroundColor: "transparent",
              }}
            />
          </div>

          {/* Type filter pills */}
          <div className="flex gap-2 flex-wrap mb-4">
            {TYPE_FILTER_OPTIONS.map((opt) => (
              <FilterPill
                key={opt.value}
                active={typeFilter === opt.value}
                shape="rounded"
                data-testid={`type-filter-${opt.value}`}
                onClick={() => setTypeFilter(opt.value)}
              >
                {opt.label}
              </FilterPill>
            ))}
          </div>

          {/* Cards grid / loading / empty */}
          {notesLoading ? (
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}
            >
              {[0, 1, 2, 3].map((i) => (
                <Card
                  key={i}
                  radius={14}
                  className="p-[18px_20px] animate-pulse"
                  data-testid="cards-skeleton"
                >
                  <div
                    style={{
                      height: 16,
                      width: "60%",
                      borderRadius: 6,
                      backgroundColor: "var(--color-stone-surface)",
                      marginBottom: 8,
                    }}
                  />
                  <div
                    style={{
                      height: 12,
                      width: "40%",
                      borderRadius: 6,
                      backgroundColor: "var(--color-stone-surface)",
                    }}
                  />
                </Card>
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <Card
              recessed
              radius={14}
              className="p-[40px] text-center"
              data-testid="cards-empty"
            >
              <p style={{ fontSize: 14, color: "#a7a7a7" }}>{t("search.noCardsMatch")}</p>
            </Card>
          ) : (
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}
            >
              {filteredNotes.map((note) => (
                <NoteCardItem
                  key={note.id}
                  note={note}
                  decks={decks}
                  onNavigate={(noteId, deckId) =>
                    navigate(`/decks/${deckId}/notes/${noteId}`)
                  }
                  onDeleteSuccess={() => showToast(t("toast.cardDeleted"))}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {deckModalState?.open === true && (
        <DeckModal
          mode={deckModalState.mode}
          {...(deckModalState.deckId !== undefined
            ? { deckId: deckModalState.deckId }
            : {})}
          decks={decks}
          onSuccess={(newDeck) => {
            setDeckModalState(null);
            if (newDeck !== undefined) {
              showToast(t("toast.deckCreated"));
            } else {
              showToast(t("toast.deckRenamed"));
            }
          }}
          onCancel={() => setDeckModalState(null)}
        />
      )}

      {cardModalOpen && (
        <CardModal
          decks={decks}
          selectedDeckId={selectedDeckId}
          onSuccess={() => {
            setCardModalOpen(false);
            showToast(t("toast.cardAdded"));
          }}
          onCancel={() => setCardModalOpen(false)}
        />
      )}

      {deleteDeckTarget !== null && (
        <DeckDeleteAction
          deckId={deleteDeckTarget}
          onSuccess={handleDeckDeleteSuccess}
          onCancel={() => setDeleteDeckTarget(null)}
        />
      )}

      <Toast visible={toast.visible} message={toast.message} />
    </main>
  );
}
