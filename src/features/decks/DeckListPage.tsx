import { useState } from "react";
import { useNavigate } from "react-router";
import { useQueries } from "@tanstack/react-query";
import type { FormEvent } from "react";
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NOTE_TYPE_LABELS: Record<string, string> = {
  basic: "Basic",
  reversed: "Reversed",
  cloze: "Cloze",
  "multiple-choice": "Multiple choice",
  "free-text": "Free text",
};

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "basic", label: "Basic" },
  { value: "reversed", label: "Reversed" },
  { value: "cloze", label: "Cloze" },
  { value: "multiple-choice", label: "Multiple choice" },
  { value: "free-text", label: "Free text" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNoteDisplayText(note: NoteModel): { front: string; back: string } {
  const c = note.content;
  switch (note.noteType) {
    case "basic":
    case "reversed":
      return {
        front: (c as { front: string; back: string }).front,
        back: (c as { front: string; back: string }).back,
      };
    case "cloze":
      return { front: (c as { text: string }).text, back: "(cloze deletion)" };
    case "multiple-choice": {
      const mc = c as { question: string; options: { key: string; text: string }[] };
      return { front: mc.question, back: `${mc.options.length} options` };
    }
    case "free-text": {
      const ft = c as { prompt: string; expectedAnswer: string };
      return { front: ft.prompt, back: ft.expectedAnswer };
    }
    default:
      return { front: "", back: "" };
  }
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteMutation = useDeleteNote(note.id);
  const { color } = getDeckColor(note.deckId);
  const { front, back } = getNoteDisplayText(note);
  const deckTitle = decks.find((d) => d.id === note.deckId)?.title ?? "Unknown deck";
  const noteLabel = NOTE_TYPE_LABELS[note.noteType] ?? note.noteType;

  async function handleDeleteConfirm() {
    await deleteMutation.mutateAsync();
    setConfirmOpen(false);
    onDeleteSuccess();
  }

  return (
    <>
      <Card
        radius={14}
        className="p-[18px_20px] cursor-pointer transition-transform hover:-translate-y-0.5"
        data-testid="note-card"
        onClick={() => onNavigate(note.id, note.deckId)}
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
            aria-label="Delete card"
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

      <ConfirmDialog
        open={confirmOpen}
        title="Delete card?"
        description="This card will be permanently deleted."
        confirmLabel="Delete card"
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
  onRename: () => void;
  onDelete: () => void;
}

function DeckRowItem({ deck, isSelected, noteCount, onSelect, onRename, onDelete }: DeckRowItemProps) {
  return (
    <div
      data-testid="deck-row"
      className="group relative"
      onClick={onSelect}
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

      {/* Icon buttons: visible on hover */}
      <div
        className="opacity-0 group-hover:opacity-100 flex gap-1"
        onClick={(e) => e.stopPropagation()}
      >
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
          aria-label={`Rename ${deck.title}`}
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
          aria-label={`Delete ${deck.title}`}
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
  const del = useDeleteDeck(deckId);

  async function handleConfirm() {
    await del.mutateAsync();
    onSuccess();
  }

  return (
    <ConfirmDialog
      open
      title="Delete deck?"
      description="This will permanently delete the deck and all its cards. This cannot be undone."
      confirmLabel="Delete deck"
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const appearance = {
      ...(icon !== null && { icon }),
      ...(color !== null && { color }),
    };
    if (mode === "create") {
      const newDeck = await createDeck.mutateAsync({ title: name.trim(), ...appearance });
      onSuccess(newDeck);
    } else {
      await updateDeck.mutateAsync({ title: name.trim(), ...appearance });
      onSuccess();
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(18,18,18,0.34)",
        zIndex: 50,
      }}
      onClick={onCancel}
    >
      <div
        className="sd-pop"
        data-testid="deck-modal"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          maxWidth: 440,
          width: "100%",
          background: "#fff",
          borderRadius: 18,
          padding: 32,
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#343433", margin: "0 0 20px" }}>
          {mode === "create" ? "New deck" : "Rename deck"}
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
            Deck name
          </label>
          <input
            data-testid="deck-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Give your deck a clear, memorable name."
            style={{
              width: "100%",
              border: "1.5px solid #f2f0ed",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 14,
              color: "#343433",
              outline: "none",
              boxSizing: "border-box",
              backgroundColor: "#faf9f7",
            }}
          />
          <p style={{ fontSize: 12, color: "#a7a7a7", margin: "6px 0 0" }}>
            Give your deck a clear, memorable name.
          </p>

          {/* Appearance: icon + color */}
          <fieldset style={{ border: "none", padding: 0, margin: "20px 0 0", minInlineSize: 0 }}>
            <legend
              style={{ fontSize: 13, fontWeight: 500, color: "#343433", padding: 0, marginBottom: 8 }}
            >
              Icon
            </legend>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <AppearanceChip
                selected={icon === null}
                onClick={() => setIcon(null)}
                ariaLabel="Automatic icon"
              >
                <span style={{ fontSize: 11, color: "#848281" }}>Auto</span>
              </AppearanceChip>
              {DECK_GLYPH_NAMES.map((glyphName) => {
                const selected = icon === glyphName;
                const accent = color ?? "#343433";
                return (
                  <AppearanceChip
                    key={glyphName}
                    selected={selected}
                    onClick={() => setIcon(glyphName)}
                    ariaLabel={`Icon ${glyphName}`}
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
              Color
            </legend>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <AppearanceChip
                selected={color === null}
                onClick={() => setColor(null)}
                ariaLabel="Automatic color"
              >
                <span style={{ fontSize: 11, color: "#848281" }}>Auto</span>
              </AppearanceChip>
              {DECK_COLORS.map((c) => {
                const selected = color === c.color;
                return (
                  <AppearanceChip
                    key={c.color}
                    selected={selected}
                    onClick={() => setColor(c.color)}
                    ariaLabel={`Color ${c.color}`}
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
              <span style={{ fontSize: 12, color: "#a7a7a7" }}>Preview</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
            <PillButton variant="secondary" onClick={onCancel} type="button">
              Cancel
            </PillButton>
            <PillButton variant="primary" type="submit" data-testid="deck-modal-submit">
              {mode === "create" ? "Create deck" : "Save name"}
            </PillButton>
          </div>
        </form>
      </div>
    </div>
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
  const [deckId, setDeckId] = useState(selectedDeckId ?? (decks[0]?.id ?? ""));
  const [noteType, setNoteType] = useState<string>("basic");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [mcqOptions, setMcqOptions] = useState(["", "", "", ""]);
  const [mcqCorrect, setMcqCorrect] = useState<string>("A");

  const createNote = useCreateNote();

  const NOTE_TYPE_TABS = [
    { value: "basic", label: "Basic" },
    { value: "reversed", label: "Reversed" },
    { value: "cloze", label: "Cloze" },
    { value: "multiple-choice", label: "Multiple choice" },
    { value: "free-text", label: "Free text" },
  ];

  function getFrontLabel() {
    if (noteType === "cloze") return "Text";
    if (noteType === "multiple-choice") return "Question";
    if (noteType === "free-text") return "Prompt";
    return "Front";
  }

  function getBackLabel() {
    if (noteType === "free-text") return "Expected answer";
    return "Back";
  }

  function showBack() {
    return noteType === "basic" || noteType === "reversed" || noteType === "free-text";
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
    if (noteType === "cloze") return "(cloze deletion)";
    if (noteType === "multiple-choice") return mcqOptions.filter(Boolean).join(" / ");
    return back;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!deckId || !front.trim()) return;
    await createNote.mutateAsync({
      deckId,
      noteType: noteType as "basic" | "reversed" | "cloze" | "multiple-choice" | "free-text",
      content: buildContent() as never,
    });
    onSuccess();
  }

  const OPTION_KEYS = ["A", "B", "C", "D"];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(18,18,18,0.34)",
        zIndex: 50,
      }}
      onClick={onCancel}
    >
      <div
        className="sd-pop"
        data-testid="card-modal"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          maxWidth: 620,
          width: "100%",
          background: "#fff",
          borderRadius: 18,
          padding: 32,
          boxShadow: "var(--shadow-lg)",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#343433", margin: "0 0 20px" }}>
          Add a card
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Deck picker */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "#343433",
                marginBottom: 6,
              }}
            >
              Deck
            </label>
            <Dropdown
              items={decks.map((d) => ({ value: d.id, label: d.title }))}
              value={deckId}
              placeholder="Select a deck"
              onSelect={setDeckId}
              data-testid="card-deck-picker"
            />
          </div>

          {/* Type tabs */}
          <div className="flex gap-2 flex-wrap mb-4">
            {NOTE_TYPE_TABS.map((t) => (
              <FilterPill
                key={t.value}
                active={noteType === t.value}
                data-testid={`card-type-tab-${t.value}`}
                onClick={() => {
                  setNoteType(t.value);
                  setFront("");
                  setBack("");
                }}
              >
                {t.label}
              </FilterPill>
            ))}
          </div>

          {/* Front / Text / Question / Prompt */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "#343433",
                marginBottom: 6,
              }}
            >
              {getFrontLabel()}
            </label>
            <textarea
              data-testid="card-front-input"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                border: "1.5px solid #f2f0ed",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 14,
                color: "#343433",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                backgroundColor: "#faf9f7",
              }}
            />
            {noteType === "cloze" && (
              <p style={{ fontSize: 12, color: "#a7a7a7", margin: "4px 0 0" }}>
                {"Use {{c1::answer}} syntax"}
              </p>
            )}
          </div>

          {/* Back / Expected Answer */}
          {showBack() && (
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#343433",
                  marginBottom: 6,
                }}
              >
                {getBackLabel()}
              </label>
              <textarea
                data-testid="card-back-input"
                value={back}
                onChange={(e) => setBack(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  border: "1.5px solid #f2f0ed",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 14,
                  color: "#343433",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  backgroundColor: "#faf9f7",
                }}
              />
            </div>
          )}

          {/* MCQ options */}
          {noteType === "multiple-choice" && (
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#343433",
                  marginBottom: 8,
                }}
              >
                Options
              </label>
              {OPTION_KEYS.map((key, i) => (
                <div
                  key={key}
                  style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}
                >
                  <input
                    type="radio"
                    name="mcq-correct"
                    value={key}
                    checked={mcqCorrect === key}
                    onChange={() => setMcqCorrect(key)}
                    style={{ flexShrink: 0 }}
                  />
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: "#a7a7a7", width: 16 }}
                  >
                    {key}
                  </span>
                  <input
                    type="text"
                    value={mcqOptions[i] ?? ""}
                    onChange={(e) => {
                      const next = [...mcqOptions];
                      next[i] = e.target.value;
                      setMcqOptions(next);
                    }}
                    placeholder={`Option ${key}`}
                    style={{
                      flex: 1,
                      border: "1.5px solid #f2f0ed",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 14,
                      color: "#343433",
                      outline: "none",
                      backgroundColor: "#faf9f7",
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Live preview */}
          <Card recessed radius={12} className="p-[16px] mb-4" data-testid="card-preview">
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#a7a7a7",
                margin: "0 0 4px",
                textTransform: "uppercase",
                letterSpacing: ".4px",
              }}
            >
              Preview
            </p>
            <p style={{ fontSize: 14, color: "#343433", margin: "0 0 4px" }}>
              <span style={{ color: "#a7a7a7" }}>Front:</span>{" "}
              {front !== "" ? front : <em style={{ color: "#c6c6c6" }}>empty</em>}
            </p>
            <p style={{ fontSize: 13, color: "#a7a7a7", margin: 0 }}>
              <span>Back:</span>{" "}
              {getPreviewBack() !== "" ? getPreviewBack() : <em style={{ color: "#c6c6c6" }}>empty</em>}
            </p>
          </Card>

          {/* Footer */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <PillButton variant="secondary" onClick={onCancel} type="button">
              Cancel
            </PillButton>
            <PillButton variant="primary" type="submit" data-testid="card-modal-submit">
              Add card
            </PillButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DeckListPage — main export
// ---------------------------------------------------------------------------

export function DeckListPage() {
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

  const { data: decksPage } = useDecks({ size: 100 });
  const decks = decksPage?.items ?? [];
  const deckIds = decks.map((d) => d.id);

  const { notes: allDeckNotes, isLoading: allNotesLoading } = useAllNotes(
    selectedDeckId === null ? deckIds : [],
  );
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
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: "" }), 2500);
  }

  function handleDeckDeleteSuccess() {
    if (deleteDeckTarget !== null && deleteDeckTarget === selectedDeckId) {
      setSelectedDeckId(null);
    }
    setDeleteDeckTarget(null);
    showToast("Deck deleted.");
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
            Cards &amp; Decks
          </h1>
          <p style={{ fontSize: 15, color: "#848281", margin: "4px 0 0" }}>
            Browse and manage your flashcard decks and cards.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <PillButton
            variant="secondary"
            onClick={() => setDeckModalState({ open: true, mode: "create" })}
          >
            New deck
          </PillButton>
          <PillButton
            variant="primary"
            data-testid="new-card-btn"
            onClick={() => setCardModalOpen(true)}
          >
            New card
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
              DECKS
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
              onClick={() => setSelectedDeckId(null)}
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
                All decks
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
              placeholder="Search cards…"
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
              <p style={{ fontSize: 14, color: "#a7a7a7" }}>No cards match your search.</p>
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
                  onDeleteSuccess={() => showToast("Card deleted.")}
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
              showToast("Deck created.");
            } else {
              showToast("Deck renamed.");
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
            showToast("Card added.");
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
