import { useState } from "react";
import { useNavigate } from "react-router";
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { normalizeApiProblem } from "@shared/api/problem";
import { useGenerateFlashcards } from "./hooks/use-ai";
import { useValidateImport, usePreviewImport, useExecuteImport } from "@features/import/hooks/use-import";
import { useDecks } from "@features/decks/hooks/use-decks";
import { Badge, Card, FilterPill, PillButton, Dropdown } from "@shared/ui";
import type { GeneratedFlashcardDraftModel } from "@shared/api/types";

// ---- Intent -----------------------------------------------------------------
// Who: A user who wants AI to generate flashcards from text or documents.
// Task: Paste text or pick a document → generate → review/approve proposals →
//       route through import so nothing is persisted without human sign-off.
// Feel: Deliberate, in-control, not magic — user always approves.

// ---- Source type tab --------------------------------------------------------

const SOURCE_TAB = {
  TEXT: "text",
  DOCUMENT: "document",
} as const;

type SourceTab = (typeof SOURCE_TAB)[keyof typeof SOURCE_TAB];

// ---- Icons ------------------------------------------------------------------

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      <path d="M7 1l1.5 4h4.5l-3.5 2.5 1.5 4L7 9l-3.5 2.5 1.5-4L1 5h4.5z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" />
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

const CARD_TYPES = ["Basic", "Cloze", "Multiple choice"] as const;
type CardType = (typeof CARD_TYPES)[number];

// ---- ProposedCard component -------------------------------------------------

interface ProposedCardProps {
  draft: GeneratedFlashcardDraftModel;
  index: number;
  onDismiss: (index: number) => void;
  accepted: boolean;
  onAccept: () => void;
}

function ProposedCard({ draft, index, onDismiss, accepted, onAccept }: ProposedCardProps) {
  const content = isBasicContent(draft.content)
    ? draft.content
    : { front: JSON.stringify(draft.content), back: "" };

  return (
    <div
      data-testid={`propose-card-${index}`}
      style={
        accepted
          ? { outline: "2px solid #00ca48", outlineOffset: "-2px", borderRadius: 16 }
          : {}
      }
    >
      <Card radius={16} className="p-[22px]">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          {/* Left: content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 8 }}>
              <Badge label={draft.noteType} tone="blue" />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#848281",
                    marginBottom: 2,
                  }}
                >
                  Front
                </p>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#343433", lineHeight: 1.5 }}>
                  {content.front}
                </p>
              </div>

              {content.back && (
                <div>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "#848281",
                      marginBottom: 2,
                    }}
                  >
                    Back
                  </p>
                  <p style={{ fontSize: 13, color: "#848281", lineHeight: 1.5 }}>
                    {content.back}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
            {/* Edit button — visual only */}
            <button
              type="button"
              aria-label="Edit card"
              style={{ color: "#848281", background: "none", border: "none", cursor: "pointer", padding: 4 }}
            >
              <PencilIcon />
            </button>

            {/* Accept button */}
            <button
              type="button"
              aria-label="Accept card"
              onClick={onAccept}
              style={{
                color: accepted ? "#00ca48" : "#848281",
                background: accepted ? "rgba(0,202,72,0.08)" : "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                borderRadius: 6,
                fontSize: 18,
                lineHeight: 1,
                fontWeight: 600,
              }}
            >
              ✓
            </button>

            {/* Dismiss button */}
            <button
              type="button"
              data-testid={`dismiss-card-${index}`}
              onClick={() => onDismiss(index)}
              aria-label="Dismiss card"
              style={{
                color: "#848281",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              &times;
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---- Loading skeleton -------------------------------------------------------

function CardSkeleton({ index: _index }: { index: number }) {
  return (
    <Card recessed radius={16} className="p-[22px] sd-pulse">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{ height: 16, width: "30%", borderRadius: 6, backgroundColor: "var(--color-fog)" }}
        />
        <div
          style={{ height: 14, width: "70%", borderRadius: 6, backgroundColor: "var(--color-fog)" }}
        />
        <div
          style={{ height: 14, width: "50%", borderRadius: 6, backgroundColor: "var(--color-fog)" }}
        />
      </div>
    </Card>
  );
}

// ---- Main page --------------------------------------------------------------

export function AiGeneratePage() {
  const navigate = useNavigate();

  const [sourceTab, setSourceTab] = useState<SourceTab>(SOURCE_TAB.TEXT);
  const [textContent, setTextContent] = useState("");
  const [proposedCards, setProposedCards] = useState<GeneratedFlashcardDraftModel[]>([]);
  const [showProposals, setShowProposals] = useState(false);
  const [apiError, setApiError] = useState<ReturnType<typeof normalizeApiProblem>>(null);
  const [approving, setApproving] = useState(false);

  // New UI-only local state
  const [cardType, setCardType] = useState<CardType>("Basic");
  const [cardCount, setCardCount] = useState(10);
  const [targetDeckId, setTargetDeckId] = useState<string | undefined>(undefined);
  const [acceptedIndices, setAcceptedIndices] = useState<Set<number>>(new Set());

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

    try {
      const response = await generateMutation.mutateAsync({
        source: {
          type: "text",
          content: textContent.trim(),
        },
      });
      setProposedCards(response.generated);
      setShowProposals(true);
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setApiError(
        p ?? { type: "about:blank", title: "Generation failed", status: 500 },
      );
    }
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
    if (proposedCards.length === 0) return;
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
        p ?? { type: "about:blank", title: "Import failed", status: 500 },
      );
    } finally {
      setApproving(false);
    }
  }

  const isGenerating = generateMutation.isPending;
  const canGenerate =
    sourceTab === SOURCE_TAB.TEXT
      ? textContent.trim().length > 0
      : false; // document source not implemented yet

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
          AI-assisted · you approve everything
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
          Generate flashcards
        </h1>

        <p style={{ fontSize: 15, color: "#848281" }}>
          Paste notes or a topic. The AI proposes cards; you approve every one.
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

      {/* Source tab switcher — above composer */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <FilterPill
          shape="pill"
          active={sourceTab === SOURCE_TAB.TEXT}
          onClick={() => setSourceTab(SOURCE_TAB.TEXT)}
          data-testid="source-text-tab"
        >
          Paste Text
        </FilterPill>
        <FilterPill
          shape="pill"
          active={sourceTab === SOURCE_TAB.DOCUMENT}
          onClick={() => setSourceTab(SOURCE_TAB.DOCUMENT)}
          data-testid="source-document-tab"
        >
          From Document
        </FilterPill>
      </div>

      {/* B. Composer Card */}
      <Card radius={16} className="p-[22px] mb-6">
        {sourceTab === SOURCE_TAB.TEXT && (
          <>
            {/* Label */}
            <label
              htmlFor="generate-text"
              style={{ fontSize: 12, fontWeight: 500, color: "#848281", display: "block", marginBottom: 8 }}
            >
              Source notes or topic
            </label>

            {/* Textarea */}
            <textarea
              id="generate-text"
              data-testid="generate-text-input"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste your notes, a topic, or a paragraph…"
              className="focus:ring-2"
              style={{
                width: "100%",
                minHeight: 120,
                borderRadius: 12,
                backgroundColor: "var(--color-warm-canvas)",
                border: "none",
                outline: "none",
                resize: "vertical",
                padding: 12,
                fontSize: 14,
                color: "var(--color-charcoal-primary)",
                fontFamily: "var(--font-inter)",
                boxSizing: "border-box",
              }}
            />

            {/* Example topic chips */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "#848281" }}>or try:</span>
              {EXAMPLE_TOPICS.map((topic) => (
                <FilterPill
                  key={topic}
                  shape="pill"
                  active={false}
                  onClick={() => setTextContent(topic)}
                >
                  {topic}
                </FilterPill>
              ))}
            </div>

            {/* Settings row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
              {/* Card type */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#848281" }}>Card type</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {CARD_TYPES.map((type) => (
                    <FilterPill
                      key={type}
                      shape="rounded"
                      active={cardType === type}
                      onClick={() => setCardType(type)}
                    >
                      {type}
                    </FilterPill>
                  ))}
                </div>
              </div>

              {/* How many */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#848281" }}>How many</label>
                <input
                  type="number"
                  value={cardCount}
                  onChange={(e) => setCardCount(Number(e.target.value))}
                  min={1}
                  max={50}
                  style={{
                    width: 84,
                    borderRadius: 8,
                    backgroundColor: "var(--color-stone-surface)",
                    border: "none",
                    padding: "6px 10px",
                    fontSize: 14,
                    color: "var(--color-charcoal-primary)",
                  }}
                />
              </div>

              {/* Add to deck — visual only */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#848281" }}>Add to deck</label>
                {/* Note: targetDeckId is visual-only. handleApproveAll always creates a new AI-named deck via the import chain. */}
                <Dropdown
                  items={decks.map((d) => ({ value: d.id, label: d.title }))}
                  {...(targetDeckId !== undefined ? { value: targetDeckId } : {})}
                  placeholder="New deck"
                  onSelect={(v) => setTargetDeckId(v)}
                  data-testid="deck-dropdown"
                />
              </div>
            </div>
          </>
        )}

        {/* Document source panel */}
        {sourceTab === SOURCE_TAB.DOCUMENT && (
          <div
            data-testid="document-source-panel"
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <p
              className="mb-2 text-[14px] font-medium"
              style={{ color: "var(--color-charcoal-primary)" }}
            >
              Document source
            </p>
            <p className="mb-4 max-w-[280px] text-[13px]" style={{ color: "var(--color-ash)" }}>
              Coming soon — use Paste Text for now.
            </p>
          </div>
        )}

        {/* Generate button row */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <PillButton
            variant="primary"
            leadingIcon={<StarIcon />}
            disabled={!canGenerate || isGenerating}
            onClick={handleGenerate}
            data-testid="generate-submit-btn"
          >
            {isGenerating ? "Generating…" : "Generate flashcards"}
          </PillButton>
        </div>
      </Card>

      {/* C. Results section */}
      {showProposals && (
        <div data-testid="proposed-cards">
          {/* Loading skeleton */}
          {isGenerating && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              {[0, 1, 2].map((i) => (
                <CardSkeleton key={i} index={i} />
              ))}
            </div>
          )}

          {!isGenerating && (
            <>
              {/* Summary row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#343433" }}>
                  {proposedCards.length} proposed
                </span>
                <div style={{ flex: 1 }} />
                {/* Ghost "Accept all" secondary trigger */}
                <PillButton
                  variant="secondary"
                  onClick={handleApproveAll}
                  disabled={approving || executeMutation.isPending}
                >
                  Accept all
                </PillButton>
                {/* Primary CTA */}
                <PillButton
                  variant="primary"
                  leadingIcon={<StarIcon />}
                  onClick={handleApproveAll}
                  disabled={approving || executeMutation.isPending || proposedCards.length === 0}
                  data-testid="approve-all-btn"
                >
                  {approving ? "Importing…" : `Add ${proposedCards.length} to deck`}
                </PillButton>
              </div>

              {/* Empty state */}
              {proposedCards.length === 0 && (
                <Card radius={16} className="p-[22px]">
                  <p style={{ textAlign: "center", fontSize: 14, color: "#848281" }}>
                    All cards dismissed. Try generating again.
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
