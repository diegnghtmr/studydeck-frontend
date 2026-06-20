import { useState } from "react";
import { useNavigate } from "react-router";
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { normalizeApiProblem } from "@shared/api/problem";
import { cn } from "@shared/lib/cn";
import { useGenerateFlashcards } from "./hooks/use-ai";
import { useValidateImport, usePreviewImport, useExecuteImport } from "@features/import/hooks/use-import";
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

// ---- Proposed card component ------------------------------------------------

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

interface ProposedCardProps {
  draft: GeneratedFlashcardDraftModel;
  index: number;
  onDismiss: (index: number) => void;
}

function ProposedCard({ draft, index, onDismiss }: ProposedCardProps) {
  const content = isBasicContent(draft.content)
    ? draft.content
    : { front: JSON.stringify(draft.content), back: "" };

  return (
    <div
      data-testid={`propose-card-${index}`}
      className="rounded-[10px] p-4"
      style={{
        backgroundColor: "var(--color-parchment-card)",
        boxShadow: "var(--shadow-subtle)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
              style={{
                backgroundColor: "var(--color-stone-surface)",
                color: "var(--color-graphite)",
              }}
            >
              {draft.noteType}
            </span>
            {draft.rationale && (
              <span className="truncate text-[11px] italic" style={{ color: "var(--color-ash)" }}>
                {draft.rationale}
              </span>
            )}
          </div>

          <div className="mt-2 space-y-2">
            <div>
              <p
                className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-ash)" }}
              >
                Front
              </p>
              <p
                className="text-[14px] leading-[1.5]"
                style={{ color: "var(--color-charcoal-primary)" }}
              >
                {content.front}
              </p>
            </div>
            {content.back && (
              <div>
                <p
                  className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-ash)" }}
                >
                  Back
                </p>
                <p
                  className="text-[14px] leading-[1.5]"
                  style={{ color: "var(--color-graphite)" }}
                >
                  {content.back}
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          data-testid={`dismiss-card-${index}`}
          onClick={() => onDismiss(index)}
          aria-label="Dismiss card"
          className="shrink-0 text-[18px] leading-none transition-opacity hover:opacity-60"
          style={{ color: "var(--color-ash)" }}
        >
          &times;
        </button>
      </div>
    </div>
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

  const generateMutation = useGenerateFlashcards();
  const validateMutation = useValidateImport();
  const previewMutation = usePreviewImport();
  const executeMutation = useExecuteImport();

  async function handleGenerate() {
    setApiError(null);
    setShowProposals(false);

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
        p ?? { type: "about:blank", title: "Generation failed", status: 500 }
      );
    }
  }

  function handleDismissCard(index: number) {
    setProposedCards((prev) => prev.filter((_, i) => i !== index));
  }

  // ---- Approval: convert proposed cards to import format and route through import ----

  async function handleApproveAll() {
    if (proposedCards.length === 0) return;
    setApiError(null);
    setApproving(true);

    try {
      // Convert proposed cards to FlashcardImportV1 format
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
        p ?? { type: "about:blank", title: "Import failed", status: 500 }
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

  return (
    <main
      data-testid="ai-generate-page"
      className="mx-auto max-w-[800px] px-6 py-12"
    >
      {/* Header */}
      <div className="mb-8">
        <h1
          className="mb-1 text-[23px] font-semibold"
          style={{ color: "var(--color-charcoal-primary)", letterSpacing: "-0.44px" }}
        >
          AI Generate
        </h1>
        <p className="text-[15px]" style={{ color: "var(--color-ash)" }}>
          Generate flashcard proposals from text or your documents. You approve every card before it is saved.
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

      {/* Source selector card */}
      <div
        className="mb-6 rounded-[10px] p-6"
        style={{
          backgroundColor: "var(--color-parchment-card)",
          boxShadow: "var(--shadow-subtle)",
        }}
      >
        {/* Tab switcher */}
        <div className="mb-6 flex gap-2">
          <button
            type="button"
            data-testid="source-text-tab"
            onClick={() => setSourceTab(SOURCE_TAB.TEXT)}
            className={cn(
              "rounded-[32px] px-4 py-1.5 text-[13px] font-medium transition-colors",
            )}
            style={{
              backgroundColor:
                sourceTab === SOURCE_TAB.TEXT
                  ? "var(--color-ember-orange)"
                  : "var(--color-stone-surface)",
              color:
                sourceTab === SOURCE_TAB.TEXT
                  ? "#fff"
                  : "var(--color-graphite)",
            }}
          >
            Paste Text
          </button>
          <button
            type="button"
            data-testid="source-document-tab"
            onClick={() => setSourceTab(SOURCE_TAB.DOCUMENT)}
            className={cn(
              "rounded-[32px] px-4 py-1.5 text-[13px] font-medium transition-colors",
            )}
            style={{
              backgroundColor:
                sourceTab === SOURCE_TAB.DOCUMENT
                  ? "var(--color-ember-orange)"
                  : "var(--color-stone-surface)",
              color:
                sourceTab === SOURCE_TAB.DOCUMENT
                  ? "#fff"
                  : "var(--color-graphite)",
            }}
          >
            From Document
          </button>
        </div>

        {/* Text source panel */}
        {sourceTab === SOURCE_TAB.TEXT && (
          <div>
            <label
              htmlFor="generate-text"
              className="mb-1 block text-[13px] font-medium"
              style={{ color: "var(--color-graphite)" }}
            >
              Source text
            </label>
            <textarea
              id="generate-text"
              data-testid="generate-text-input"
              rows={10}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste your study material here. The AI will generate flashcard proposals that you can review and approve."
              className="w-full resize-y rounded-[8px] border-0 px-3 py-2 text-[14px] leading-[1.6] outline-none focus:ring-2"
              style={{
                backgroundColor: "var(--color-stone-surface)",
                color: "var(--color-charcoal-primary)",
                minHeight: "180px",
              }}
            />
          </div>
        )}

        {/* Document source panel */}
        {sourceTab === SOURCE_TAB.DOCUMENT && (
          <div
            className="flex flex-col items-center justify-center py-12 text-center"
            data-testid="document-source-panel"
          >
            <p
              className="mb-2 text-[14px] font-medium"
              style={{ color: "var(--color-charcoal-primary)" }}
            >
              Document source
            </p>
            <p className="mb-4 max-w-[280px] text-[13px]" style={{ color: "var(--color-ash)" }}>
              Select a document from your library to generate flashcards from its content.
            </p>
            <p className="text-[13px]" style={{ color: "var(--color-ash)" }}>
              Coming soon — use Paste Text for now.
            </p>
          </div>
        )}

        {/* Generate button */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            data-testid="generate-submit-btn"
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="rounded-[32px] px-5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--color-ember-orange)" }}
          >
            {isGenerating ? "Generating…" : "Generate Flashcards"}
          </button>
        </div>
      </div>

      {/* Proposals section */}
      {showProposals && (
        <div data-testid="proposed-cards">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2
                className="text-[19px] font-semibold"
                style={{ color: "var(--color-charcoal-primary)" }}
              >
                Proposed Cards
              </h2>
              <p className="text-[13px]" style={{ color: "var(--color-ash)" }}>
                {proposedCards.length} card{proposedCards.length !== 1 ? "s" : ""} proposed.
                Dismiss any you don't want, then approve.
              </p>
            </div>

            {proposedCards.length > 0 && (
              <button
                type="button"
                data-testid="approve-all-btn"
                onClick={handleApproveAll}
                disabled={approving || executeMutation.isPending}
                className="shrink-0 rounded-[32px] px-5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "var(--color-ember-orange)" }}
              >
                {approving ? "Importing…" : `Approve All (${proposedCards.length})`}
              </button>
            )}
          </div>

          {proposedCards.length === 0 && (
            <div
              className="rounded-[10px] p-8 text-center"
              style={{ backgroundColor: "var(--color-parchment-card)" }}
            >
              <p className="text-[14px]" style={{ color: "var(--color-ash)" }}>
                All proposals dismissed. Generate again if you'd like new suggestions.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {proposedCards.map((draft, i) => (
              <ProposedCard
                key={i}
                draft={draft}
                index={i}
                onDismiss={handleDismissCard}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
