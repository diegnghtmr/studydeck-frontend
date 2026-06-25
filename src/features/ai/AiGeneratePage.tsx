import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from 'react-i18next';
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { normalizeApiProblem } from "@shared/api/problem";
import { useGenerateFlashcards } from "./hooks/use-ai";
import { useValidateImport, usePreviewImport, useExecuteImport } from "@features/import/hooks/use-import";
import { useDecks } from "@features/decks/hooks/use-decks";
import { Card, Dropdown } from "@shared/ui";
import type { GeneratedFlashcardDraftModel } from "@shared/api/types";
import type { NoteType } from "@shared/api/generated/models/note-type";

// ---- Intent -----------------------------------------------------------------
// Who: A user who wants AI to generate flashcards from text or documents.
// Task: Paste text or pick a document → generate → review/approve proposals →
//       route through import so nothing is persisted without human sign-off.
// Feel: Deliberate, in-control, not magic — user always approves.

// ---- Icons ------------------------------------------------------------------

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="#ffbb26" aria-hidden="true">
      <path d="M7 1l1.5 4h4.5l-3.5 2.5 1.5 4L7 9l-3.5 2.5 1.5-4L1 5h4.5z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4v16h16v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 11-2.6-6.4M21 3v6h-6"/>
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.4 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3 3 0 014.24 4.24l-9.2 9.19a1 1 0 01-1.41-1.41l8.49-8.49" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function ChipCloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// ---- Type guards ------------------------------------------------------------

interface NoteContentBasic {
  front: string;
  back: string;
}

function isBasicContent(content: unknown): content is NoteContentBasic {
  return (
    typeof content === "object" &&
    content !== null &&
    "front" in content &&
    "back" in content &&
    typeof (content as NoteContentBasic).front === "string" &&
    typeof (content as NoteContentBasic).back === "string"
  );
}

// ---- Example topics ---------------------------------------------------------

const EXAMPLE_TOPICS = [
  "The Krebs cycle",
  "Spanish travel vocab",
  "Spring Boot annotations",
  "Photosynthesis",
] as const;

// ---- Card type options -------------------------------------------------------

const CARD_TYPES = [
  "Basic",
  "Basic & reversed",
  "Cloze",
  "Multiple choice",
  "Free text",
] as const;
type CardType = (typeof CARD_TYPES)[number];

// Maps UI label to API NoteType value
const CARD_TYPE_TO_NOTE_TYPE: Record<CardType, NoteType> = {
  "Basic": "basic",
  "Basic & reversed": "reversed",
  "Cloze": "cloze",
  "Multiple choice": "multiple-choice",
  "Free text": "free-text",
};

// ---- ExampleChip ------------------------------------------------------------

/** A clickable example-topic chip matching the prototype (soft pill + hover). */
function ExampleChip({ label, onClick }: { label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: "none",
        borderRadius: 32,
        padding: "6px 13px",
        fontSize: 12.5,
        fontWeight: 500,
        cursor: "pointer",
        transition: "background 0.15s ease, color 0.15s ease",
        background: hover ? "#ece9e4" : "#f6f4ef",
        color: hover ? "#121212" : "#474645",
      }}
    >
      {label}
    </button>
  );
}

// ---- ProposedCard component -------------------------------------------------

interface ProposedCardProps {
  draft: GeneratedFlashcardDraftModel;
  index: number;
  onDismiss: (index: number) => void;
  accepted: boolean;
  onAccept: () => void;
  editLabel: string;
  dismissLabel: string;
  acceptLabel: string;
}

function ProposedCard({ draft, index, onDismiss, accepted, onAccept, editLabel, dismissLabel, acceptLabel }: ProposedCardProps) {
  const content = isBasicContent(draft.content)
    ? draft.content
    : { front: JSON.stringify(draft.content), back: "" };

  const [editHover, setEditHover] = useState(false);
  const [rejectHover, setRejectHover] = useState(false);

  return (
    <div
      data-testid={`propose-card-${index}`}
      style={{
        background: "#fff",
        boxShadow: accepted
          ? "#00ca48 0 0 0 2px inset"
          : "#f2f0ed 0 0 0 1px inset",
        borderRadius: "14px",
        padding: "18px 20px",
        display: "flex",
        alignItems: "flex-start",
        gap: "16px",
        transition: "box-shadow 0.2s ease, opacity 0.2s ease",
      }}
    >
      {/* Type chip */}
      <span
        style={{
          flexShrink: 0,
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.3px",
          textTransform: "uppercase" as const,
          color: "#0090ff",
          background: "#eaf4ff",
          padding: "3px 7px",
          borderRadius: "5px",
          marginTop: "2px",
        }}
      >
        {draft.noteType}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "14px", fontWeight: 500, color: "#343433", marginBottom: "4px", lineHeight: 1.45 }}>
          {content.front}
        </p>
        {content.back && (
          <p style={{ fontSize: "13px", color: "#848281", lineHeight: 1.5, margin: 0 }}>
            {content.back}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "7px", flexShrink: 0 }}>
        {/* Edit */}
        <button
          type="button"
          aria-label={editLabel}
          onMouseEnter={() => setEditHover(true)}
          onMouseLeave={() => setEditHover(false)}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "none",
            background: "#fff",
            boxShadow: editHover ? "#0090ff 0 0 0 1.5px inset" : "#f2f0ed 0 0 0 1px inset",
            color: editHover ? "#0090ff" : "#a7a7a7",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "box-shadow 0.15s ease, color 0.15s ease",
          }}
        >
          <PencilIcon />
        </button>

        {/* Reject */}
        <button
          type="button"
          data-testid={`dismiss-card-${index}`}
          onClick={() => onDismiss(index)}
          aria-label={dismissLabel}
          onMouseEnter={() => setRejectHover(true)}
          onMouseLeave={() => setRejectHover(false)}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "none",
            background: "#fff",
            boxShadow: rejectHover ? "#ff3e00 0 0 0 1.5px inset" : "#f2f0ed 0 0 0 1px inset",
            color: rejectHover ? "#ff3e00" : "#a7a7a7",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "box-shadow 0.15s ease, color 0.15s ease",
          }}
        >
          <XIcon />
        </button>

        {/* Accept */}
        <button
          type="button"
          aria-label={acceptLabel}
          onClick={onAccept}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "none",
            background: accepted ? "#00ca48" : "#cfeede",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckIcon />
        </button>
      </div>
    </div>
  );
}

// ---- Main page --------------------------------------------------------------

export function AiGeneratePage() {
  const navigate = useNavigate();
  const { t } = useTranslation('ai');

  const [textContent, setTextContent] = useState("");
  const [attachedDocs, setAttachedDocs] = useState<{ name: string; content: string }[]>([]);
  const [proposedCards, setProposedCards] = useState<GeneratedFlashcardDraftModel[]>([]);
  const [showProposals, setShowProposals] = useState(false);
  const [apiError, setApiError] = useState<ReturnType<typeof normalizeApiProblem>>(null);
  const [approving, setApproving] = useState(false);

  // New UI-only local state
  const [cardType, setCardType] = useState<CardType>("Basic");
  const [cardCount, setCardCount] = useState(10);
  const [targetDeckId, setTargetDeckId] = useState<string | undefined>(undefined);
  const [acceptedIndices, setAcceptedIndices] = useState<Set<number>>(new Set());
  const [textareaFocused, setTextareaFocused] = useState(false);
  const [attachHover, setAttachHover] = useState(false);
  const [generateBtnHover, setGenerateBtnHover] = useState(false);
  const [regenerateHover, setRegenerateHover] = useState(false);
  const [addHover, setAddHover] = useState(false);

  const generateMutation = useGenerateFlashcards();
  const validateMutation = useValidateImport();
  const previewMutation = usePreviewImport();
  const executeMutation = useExecuteImport();

  // Deck list for the "Add to deck" dropdown — visual only
  const decksQuery = useDecks();
  const decks = decksQuery.data?.items ?? [];

  // ---- Handlers ---------------------------------------------------------------

  async function handleGenerate() {
    setApiError(null);
    setShowProposals(false);
    setAcceptedIndices(new Set());

    // Combine the typed notes with any attached documents into a single text source.
    const combinedSource = [
      textContent.trim(),
      ...attachedDocs.map((d) => `# ${d.name}\n${d.content}`),
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const response = await generateMutation.mutateAsync({
        source: {
          type: "text",
          content: combinedSource,
        },
        preferredTypes: [CARD_TYPE_TO_NOTE_TYPE[cardType]],
        maxItems: cardCount,
      });
      setProposedCards(response.generated);
      setShowProposals(true);
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setApiError(
        p ?? { type: "about:blank", title: t('generate.errors.generationFailed'), status: 500 },
      );
    }
  }

  async function handleAttachDocuments(files: FileList | null) {
    if (!files || files.length === 0) return;
    const read = await Promise.all(
      Array.from(files).map(async (f) => ({ name: f.name, content: await f.text() })),
    );
    setAttachedDocs((prev) => [...prev, ...read]);
  }

  function handleRemoveDoc(name: string) {
    setAttachedDocs((prev) => prev.filter((d) => d.name !== name));
  }

  function handleDismissCard(index: number) {
    setProposedCards((prev) => prev.filter((_, i) => i !== index));
    // Also remove from accepted set
    setAcceptedIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      // Re-map indices above the removed one
      const remapped = new Set<number>();
      next.forEach((i) => {
        if (i < index) remapped.add(i);
        else remapped.add(i - 1);
      });
      return remapped;
    });
  }

  function handleAcceptCard(index: number) {
    setAcceptedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  // ---- Approval: convert proposed cards to import format and route through import ----

  async function handleApproveAll() {
    if (acceptedIndices.size === 0) return;
    setApiError(null);
    setApproving(true);

    try {
      const notes = proposedCards
        .filter((_, i) => acceptedIndices.has(i))
        .map((draft) => {
          const content = isBasicContent(draft.content) ? draft.content : { front: "", back: "" };
          return {
            noteType: "basic" as const,
            front: content.front,
            back: content.back,
            tags: draft.tags ?? [],
          };
        });

      const importPayload = {
        schemaVersion: "1.0" as const,
        deck: { title: `AI Generated — ${new Date().toLocaleDateString()}` },
        notes,
      };

      // Validate → Preview → Execute (same flow as ImportWizardPage)
      // Note: targetDeckId is visual-only — the import chain always creates a new AI-named deck.
      await validateMutation.mutateAsync(importPayload as never);
      await previewMutation.mutateAsync(importPayload as never);
      const result = await executeMutation.mutateAsync(importPayload as never);
      navigate(`/decks/${result.deckId}`);
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setApiError(
        p ?? { type: "about:blank", title: t('generate.errors.importFailed'), status: 500 },
      );
    } finally {
      setApproving(false);
    }
  }

  async function handleAcceptAndImportAll() {
    if (proposedCards.length === 0) return;
    // Mark all as accepted, then run the import pipeline for all cards.
    const allIndices = new Set(proposedCards.map((_, i) => i));
    setAcceptedIndices(allIndices);
    setApiError(null);
    setApproving(true);

    try {
      const notes = proposedCards.map((draft) => {
        const content = isBasicContent(draft.content) ? draft.content : { front: "", back: "" };
        return {
          noteType: "basic" as const,
          front: content.front,
          back: content.back,
          tags: draft.tags ?? [],
        };
      });

      const importPayload = {
        schemaVersion: "1.0" as const,
        deck: { title: `AI Generated — ${new Date().toLocaleDateString()}` },
        notes,
      };

      await validateMutation.mutateAsync(importPayload as never);
      await previewMutation.mutateAsync(importPayload as never);
      const result = await executeMutation.mutateAsync(importPayload as never);
      navigate(`/decks/${result.deckId}`);
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setApiError(
        p ?? { type: "about:blank", title: t('generate.errors.importFailed'), status: 500 },
      );
    } finally {
      setApproving(false);
    }
  }

  const isGenerating = generateMutation.isPending;
  const canGenerate = textContent.trim().length > 0 || attachedDocs.length > 0;

  // ---- Translated card type labels -----------------------------------------

  const cardTypeLabels: Record<CardType, string> = {
    "Basic": t('generate.cardType.basic'),
    "Basic & reversed": t('generate.cardType.basicReversed'),
    "Cloze": t('generate.cardType.cloze'),
    "Multiple choice": t('generate.cardType.multipleChoice'),
    "Free text": t('generate.cardType.freeText'),
  };

  // ---- Translated example topic labels -------------------------------------

  const exampleTopicLabels: Record<typeof EXAMPLE_TOPICS[number], string> = {
    "The Krebs cycle": t('generate.examples.krebsCycle'),
    "Spanish travel vocab": t('generate.examples.spanishTravel'),
    "Spring Boot annotations": t('generate.examples.springBoot'),
    "Photosynthesis": t('generate.examples.photosynthesis'),
  };

  // ---- Render -----------------------------------------------------------------

  return (
    <main
      data-testid="ai-generate-page"
      className="sd-fade"
      style={{ maxWidth: 880, margin: "0 auto", padding: "48px 56px 80px" }}
    >
      {/* A. Header */}
      <div style={{ marginBottom: 32 }}>
        {/* AI badge pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            backgroundColor: "#f4ecff",
            color: "#9f4fff",
            borderRadius: 20,
            padding: "5px 11px",
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          <span aria-hidden="true">★</span>
          {t('generate.badge')}
        </div>

        <h1
          style={{
            fontFamily: "var(--font-family)",
            fontSize: 40,
            fontWeight: 500,
            color: "#343433",
            marginBottom: 8,
            lineHeight: 1.1,
          }}
        >
          {t('generate.heading')}
        </h1>

        <p style={{ fontSize: 15, color: "#848281" }}>
          {t('generate.subtitle')}
        </p>
      </div>

      {/* API error */}
      {apiError && (
        <ProblemBanner
          problem={apiError}
          className="mb-6"
          onDismiss={() => setApiError(null)}
        />
      )}

      {/* B. Composer Card */}
      <Card radius={16} className="px-8 py-[22px] mb-6">
        {/* Label */}
        <label
          htmlFor="generate-text"
          style={{ fontSize: 12, fontWeight: 500, color: "#848281", display: "block", marginBottom: 8 }}
        >
          {t('generate.sourceLabel')}
        </label>

        {/* Textarea */}
        <textarea
          id="generate-text"
          data-testid="generate-text-input"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder={t('generate.sourcePlaceholder')}
          onFocus={() => setTextareaFocused(true)}
          onBlur={() => setTextareaFocused(false)}
          style={{
            width: "100%",
            minHeight: 120,
            borderRadius: 12,
            border: "none",
            outline: "none",
            resize: "vertical",
            padding: 12,
            fontSize: 14,
            color: "var(--color-charcoal-primary)",
            fontFamily: "var(--font-inter)",
            boxSizing: "border-box",
            boxShadow: textareaFocused ? "#0090ff 0 0 0 1.5px inset" : "#e7e4df 0 0 0 1px inset",
            background: textareaFocused ? "#fff" : "var(--color-warm-canvas)",
          }}
        />

        {/* Attached document chips */}
        {attachedDocs.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {attachedDocs.map((doc) => (
              <span
                key={doc.name}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  background: "#eaf4ff",
                  color: "#0086fc",
                  borderRadius: 8,
                  padding: "5px 10px",
                  fontSize: 12.5,
                  fontWeight: 500,
                }}
              >
                <FileIcon />
                {doc.name}
                <button
                  type="button"
                  aria-label={t('generate.aria.removeAttachment', { filename: doc.name })}
                  onClick={() => handleRemoveDoc(doc.name)}
                  style={{ background: "none", border: "none", color: "#0086fc", cursor: "pointer", padding: 0, display: "flex" }}
                >
                  <ChipCloseIcon />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Attach document + example topic chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <label
            onMouseEnter={() => setAttachHover(true)}
            onMouseLeave={() => setAttachHover(false)}
            style={{
              position: "relative",
              overflow: "hidden",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#fff",
              color: attachHover ? "#121212" : "#474645",
              boxShadow: attachHover ? "#dcd9d4 0 0 0 1px inset" : "#e7e4df 0 0 0 1px inset",
              borderRadius: 32,
              padding: "6px 13px",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <AttachIcon />
            {t('generate.attachDocument')}
            <input
              type="file"
              accept=".txt,.md,.json,.csv,text/*"
              multiple
              data-testid="generate-attach-input"
              onChange={(e) => {
                void handleAttachDocuments(e.target.files);
                e.target.value = "";
              }}
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
            />
          </label>
          <span style={{ fontSize: 12, color: "#a7a7a7" }}>{t('generate.orTry')}</span>
          {EXAMPLE_TOPICS.map((topic) => (
            <ExampleChip key={topic} label={exampleTopicLabels[topic]} onClick={() => setTextContent(topic)} />
          ))}
        </div>

        {/* Settings — card type on its own row, then count + deck below */}
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #f2f0ed" }}>
          {/* Card type */}
          <div>
            <span
              style={{ fontSize: 12, fontWeight: 500, color: "#848281", display: "block", marginBottom: 8 }}
            >
              {t('generate.cardType.label')}
            </span>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {CARD_TYPES.map((type) => {
                const active = cardType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCardType(type)}
                    style={{
                      border: "none",
                      borderRadius: 32,
                      padding: "8px 15px",
                      fontSize: 13,
                      fontWeight: 500,
                      letterSpacing: "-0.16px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      background: active ? "#121212" : "#f6f4ef",
                      color: active ? "#fff" : "#474645",
                    }}
                  >
                    {cardTypeLabels[type]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* How many + Add to deck */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end", marginTop: 20 }}>
            <div style={{ flex: "none" }}>
              <span
                style={{ fontSize: 12, fontWeight: 500, color: "#848281", display: "block", marginBottom: 8 }}
              >
                {t('generate.howMany')}
              </span>
              <input
                type="number"
                value={cardCount}
                onChange={(e) => setCardCount(Number(e.target.value))}
                min={1}
                max={50}
                style={{
                  width: 84,
                  borderRadius: 10,
                  backgroundColor: "#fbfaf9",
                  boxShadow: "#e7e4df 0 0 0 1px inset",
                  border: "none",
                  padding: "9px 12px",
                  fontSize: 14,
                  color: "var(--color-charcoal-primary)",
                }}
              />
            </div>

            {/* Add to deck — visual only */}
            <div style={{ flex: "none", minWidth: 200 }}>
              <span
                style={{ fontSize: 12, fontWeight: 500, color: "#848281", display: "block", marginBottom: 8 }}
              >
                {t('generate.addToDeck.label')}
              </span>
              {/* Note: targetDeckId is visual-only. handleApproveAll always creates a new AI-named deck via the import chain. */}
              <Dropdown
                items={decks.map((d) => ({ value: d.id, label: d.title }))}
                {...(targetDeckId !== undefined ? { value: targetDeckId } : {})}
                placeholder={t('generate.addToDeck.placeholder')}
                onSelect={(v) => setTargetDeckId(v)}
                searchable
                searchPlaceholder={t('generate.addToDeck.searchPlaceholder')}
                data-testid="deck-dropdown"
              />
            </div>
          </div>
        </div>

        {/* Generate button row */}
        <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 20 }}>
          <button
            type="button"
            disabled={!canGenerate || isGenerating}
            onClick={handleGenerate}
            data-testid="generate-submit-btn"
            onMouseEnter={() => setGenerateBtnHover(true)}
            onMouseLeave={() => setGenerateBtnHover(false)}
            style={{
              background: generateBtnHover && (canGenerate && !isGenerating) ? "#343433" : "#121212",
              opacity: (!canGenerate || isGenerating) ? 0.5 : 1,
              color: "#fff",
              border: "none",
              borderRadius: "32px",
              padding: "13px 26px",
              fontSize: "14px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: (!canGenerate || isGenerating) ? "not-allowed" : "pointer",
              transition: "background 0.15s ease",
            }}
          >
            <StarIcon />
            {isGenerating ? t('generate.generatingBtn') : t('generate.generateBtn')}
          </button>
        </div>
      </Card>

      {/* Loading state */}
      {isGenerating && (
        <div style={{ marginTop: "24px" }}>
          {/* Status row */}
          <div style={{ display: "flex", alignItems: "center", gap: "11px", color: "#848281", marginBottom: "16px" }}>
            <div
              className="sd-spin"
              style={{
                width: "18px",
                height: "18px",
                border: "2.5px solid #ece9e4",
                borderTopColor: "#9f4fff",
                borderRadius: "50%",
              }}
            />
            <span style={{ fontSize: "14px" }}>{t('generate.draftingStatus')}</span>
          </div>
          {/* Skeleton cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {([0, 1, 2] as const).map((i) => (
              <div
                key={i}
                className="sd-pulse"
                style={{
                  background: "#fff",
                  boxShadow: "#f2f0ed 0 0 0 1px inset",
                  borderRadius: "14px",
                  padding: "18px 20px",
                  animationDelay: i === 0 ? "0s" : i === 1 ? "0.15s" : "0.3s",
                }}
              >
                <div style={{ width: "62%", height: "13px", borderRadius: "6px", background: "#ece9e4", marginBottom: "10px" }} />
                <div style={{ width: "84%", height: "11px", borderRadius: "6px", background: "#f2f0ed" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* C. Results section */}
      {showProposals && (
        <div data-testid="proposed-cards">
          {!isGenerating && (
            <>
              {/* Summary row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ fontSize: "14px", color: "#848281" }}>
                  {t('generate.summary', { count: proposedCards.length, accepted: acceptedIndices.size })}
                </div>
                <div style={{ flex: 1 }} />
                {/* Ghost "Accept all" secondary trigger */}
                <button
                  type="button"
                  onClick={handleAcceptAndImportAll}
                  disabled={approving || executeMutation.isPending}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0086fc",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    cursor: "pointer",
                    padding: "6px 4px",
                  }}
                >
                  {t('generate.acceptAll')}
                </button>
                {/* Regenerate */}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !canGenerate}
                  onMouseEnter={() => setRegenerateHover(true)}
                  onMouseLeave={() => setRegenerateHover(false)}
                  style={{
                    background: regenerateHover ? "#ece9e4" : "#f6f4ef",
                    color: "#121212",
                    border: "none",
                    borderRadius: "32px",
                    padding: "9px 18px",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    transition: "background 0.15s ease",
                  }}
                >
                  <RefreshIcon />
                  {t('generate.regenerate')}
                </button>
                {/* Primary CTA */}
                <button
                  type="button"
                  onClick={handleApproveAll}
                  disabled={approving || executeMutation.isPending || acceptedIndices.size === 0}
                  data-testid="approve-all-btn"
                  onMouseEnter={() => setAddHover(true)}
                  onMouseLeave={() => setAddHover(false)}
                  style={{
                    background: addHover ? "#343433" : "#121212",
                    color: "#fff",
                    border: "none",
                    borderRadius: "32px",
                    padding: "10px 20px",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    cursor: approving || executeMutation.isPending || acceptedIndices.size === 0 ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap" as const,
                    opacity: approving || executeMutation.isPending || acceptedIndices.size === 0 ? 0.5 : 1,
                    transition: "background 0.15s ease",
                  }}
                >
                  {approving ? t('generate.importingBtn') : t('generate.addToDeckBtn', { count: acceptedIndices.size })}
                </button>
              </div>

              {/* Empty state */}
              {proposedCards.length === 0 && (
                <Card radius={16} className="p-[22px]">
                  <p style={{ textAlign: "center", fontSize: 14, color: "#848281" }}>
                    {t('generate.allDismissed')}
                  </p>
                </Card>
              )}

              {/* Card list */}
              {proposedCards.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {proposedCards.map((draft, i) => (
                    <ProposedCard
                      key={i}
                      draft={draft}
                      index={i}
                      onDismiss={handleDismissCard}
                      accepted={acceptedIndices.has(i)}
                      onAccept={() => handleAcceptCard(i)}
                      editLabel={t('generate.aria.editCard')}
                      dismissLabel={t('generate.aria.dismissCard')}
                      acceptLabel={t('generate.aria.acceptCard')}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
