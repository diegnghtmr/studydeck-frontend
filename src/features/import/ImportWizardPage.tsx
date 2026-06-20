import { useState } from "react";
import { Link } from "react-router";
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { normalizeApiProblem } from "@shared/api/problem";
import { cn } from "@shared/lib/cn";
import { flashcardImportV1Schema } from "./schemas/import-schemas";
import { useValidateImport, usePreviewImport, useExecuteImport } from "./hooks/use-import";
import type {
  FlashcardImportV1Model,
  ImportValidationResponseModel,
  ImportPreviewModel,
  ImportResultModel,
} from "@shared/api/types";

// ---- Wizard step machine ----------------------------------------------------

const WIZARD_STEP = {
  INPUT: 0,
  VALIDATE: 1,
  PREVIEW: 2,
  CONFIRM: 3,
} as const;

type WizardStep = (typeof WIZARD_STEP)[keyof typeof WIZARD_STEP];

const STEP_LABELS = ["Input", "Validate", "Preview", "Confirm"] as const;

// ---- Intent -----------------------------------------------------------------
// Who: A StudyDeck user who has an export JSON (from another tool or a manual file).
// Task: Import it as a new (or supplemented) deck without losing control.
// Feel: Deliberate, clear, warm — not a scary upload form.

// ---- Component --------------------------------------------------------------

export function ImportWizardPage() {
  const [step, setStep] = useState<WizardStep>(WIZARD_STEP.INPUT);
  const [rawJson, setRawJson] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedPayload, setParsedPayload] = useState<FlashcardImportV1Model | null>(null);
  const [validationResult, setValidationResult] = useState<ImportValidationResponseModel | null>(null);
  const [previewResult, setPreviewResult] = useState<ImportPreviewModel | null>(null);
  const [importResult, setImportResult] = useState<ImportResultModel | null>(null);
  const [apiError, setApiError] = useState<ReturnType<typeof normalizeApiProblem>>(null);

  const validateMutation = useValidateImport();
  const previewMutation = usePreviewImport();
  const executeMutation = useExecuteImport();

  // ---- File upload --------------------------------------------------------

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawJson(ev.target?.result as string ?? "");
      setParseError(null);
    };
    reader.readAsText(file);
  }

  // ---- Step transitions ---------------------------------------------------

  /**
   * Step 0 → 1: Parse JSON client-side, then call :validate
   */
  async function handleInputNext() {
    setParseError(null);
    setApiError(null);

    // 1. Parse
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      setParseError("Invalid JSON — please check your input.");
      return;
    }

    // 2. Client-side schema check
    const zodResult = flashcardImportV1Schema.safeParse(parsed);
    if (!zodResult.success) {
      const first = zodResult.error.issues[0];
      const field = first.path.join(".");
      const msg = first.message;
      setParseError(field ? `${field}: ${msg}` : msg);
      return;
    }

    setParsedPayload(zodResult.data as FlashcardImportV1Model);

    // 3. Server-side validate
    try {
      const result = await validateMutation.mutateAsync(zodResult.data as FlashcardImportV1Model);
      setValidationResult(result);
      setStep(WIZARD_STEP.VALIDATE);
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setApiError(p ?? { type: "about:blank", title: "Validation failed", status: 500 });
    }
  }

  /**
   * Step 1 → 2: Run :preview
   */
  async function handleValidateNext() {
    if (!parsedPayload) return;
    setApiError(null);

    try {
      const result = await previewMutation.mutateAsync(parsedPayload);
      setPreviewResult(result);
      setStep(WIZARD_STEP.PREVIEW);
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setApiError(p ?? { type: "about:blank", title: "Preview failed", status: 500 });
    }
  }

  /**
   * Step 2 → 3: Execute import
   */
  async function handlePreviewNext() {
    if (!parsedPayload) return;
    setApiError(null);

    try {
      const result = await executeMutation.mutateAsync(parsedPayload);
      setImportResult(result);
      setStep(WIZARD_STEP.CONFIRM);
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setApiError(p ?? { type: "about:blank", title: "Import failed", status: 500 });
    }
  }

  function handleBack() {
    setApiError(null);
    if (step > WIZARD_STEP.INPUT) {
      setStep((s) => (s - 1) as WizardStep);
    }
  }

  // ---- Next handler dispatch -----------------------------------------------

  async function handleNext() {
    switch (step) {
      case WIZARD_STEP.INPUT:
        await handleInputNext();
        break;
      case WIZARD_STEP.VALIDATE:
        await handleValidateNext();
        break;
      case WIZARD_STEP.PREVIEW:
        await handlePreviewNext();
        break;
    }
  }

  const isNextDisabled =
    step === WIZARD_STEP.VALIDATE && validationResult !== null && !validationResult.valid;

  const isLoading =
    validateMutation.isPending || previewMutation.isPending || executeMutation.isPending;

  // ---- Render -------------------------------------------------------------

  return (
    <main
      data-testid="import-wizard"
      className="mx-auto max-w-[800px] px-6 py-12"
    >
      {/* Page title */}
      <h1
        className="mb-2 text-[23px] font-semibold"
        style={{ color: "var(--color-charcoal-primary)", letterSpacing: "-0.44px" }}
      >
        Import Flashcards
      </h1>
      <p
        className="mb-8 text-[15px]"
        style={{ color: "var(--color-ash)" }}
      >
        Import a StudyDeck JSON file to create a new deck.
      </p>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-0">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold"
                style={{
                  backgroundColor:
                    i <= step
                      ? "var(--color-ember-orange)"
                      : "var(--color-stone-surface)",
                  color: i <= step ? "#fff" : "var(--color-ash)",
                }}
              >
                {i + 1}
              </span>
              <span
                className="text-[13px] font-medium"
                style={{
                  color: i === step ? "var(--color-charcoal-primary)" : "var(--color-ash)",
                }}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className="mx-3 h-px w-8"
                style={{ backgroundColor: "var(--color-fog)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* API error */}
      {apiError && (
        <ProblemBanner
          problem={apiError}
          className="mb-6"
          onDismiss={() => setApiError(null)}
        />
      )}

      {/* ---- Step 0: Input ---- */}
      {step === WIZARD_STEP.INPUT && (
        <div
          data-testid="step-input"
          className="rounded-[10px] p-6"
          style={{
            backgroundColor: "var(--color-parchment-card)",
            boxShadow: "var(--shadow-subtle)",
          }}
        >
          <h2
            className="mb-1 text-[19px] font-semibold"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            Paste JSON
          </h2>
          <p className="mb-4 text-[13px]" style={{ color: "var(--color-ash)" }}>
            Paste your StudyDeck export JSON below, or upload a <code>.json</code> file.
            Must include <code>schemaVersion: "1.0"</code>, a <code>deck</code> object, and a
            non-empty <code>notes</code> array.
          </p>

          {/* File upload */}
          <label
            className="mb-3 flex cursor-pointer items-center gap-2 text-[13px]"
            style={{ color: "var(--color-graphite)" }}
          >
            <input
              type="file"
              accept=".json,application/json"
              data-testid="file-input"
              className="sr-only"
              onChange={handleFileChange}
            />
            <span
              className="rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: "var(--color-stone-surface)",
                color: "var(--color-graphite)",
              }}
            >
              Choose file
            </span>
            <span style={{ color: "var(--color-ash)" }}>or paste below</span>
          </label>

          {/* Textarea */}
          <textarea
            data-testid="json-input"
            rows={16}
            value={rawJson}
            onChange={(e) => {
              setRawJson(e.target.value);
              setParseError(null);
            }}
            placeholder={`{\n  "schemaVersion": "1.0",\n  "deck": { "title": "My Deck" },\n  "notes": [\n    { "noteType": "basic", "front": "Q", "back": "A" }\n  ]\n}`}
            className="w-full resize-y rounded-[10px] border-0 px-4 py-3 font-mono text-[13px] leading-[1.6] outline-none focus:ring-2"
            style={{
              backgroundColor: "var(--color-stone-surface)",
              color: "var(--color-charcoal-primary)",
              minHeight: "220px",
            }}
          />

          {parseError && (
            <p
              role="alert"
              data-testid="parse-error"
              className="mt-2 text-[13px]"
              style={{ color: "var(--color-coral-red)" }}
            >
              {parseError}
            </p>
          )}
        </div>
      )}

      {/* ---- Step 1: Validate ---- */}
      {step === WIZARD_STEP.VALIDATE && validationResult && (
        <div
          data-testid="validation-result"
          className="rounded-[10px] p-6"
          style={{
            backgroundColor: "var(--color-parchment-card)",
            boxShadow: "var(--shadow-subtle)",
          }}
        >
          <div className="mb-4 flex items-center gap-3">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-[16px]"
              style={{
                backgroundColor: validationResult.valid
                  ? "var(--color-valid-green)"
                  : "var(--color-coral-red)",
                color: "#fff",
              }}
            >
              {validationResult.valid ? "✓" : "✕"}
            </span>
            <h2
              className="text-[19px] font-semibold"
              style={{ color: "var(--color-charcoal-primary)" }}
            >
              {validationResult.valid ? "Valid" : "Validation Failed"}
            </h2>
          </div>

          {validationResult.errors.length > 0 && (
            <ul className="mb-4 space-y-2">
              {validationResult.errors.map((err, i) => (
                <li
                  key={i}
                  className="rounded-[6px] px-3 py-2 text-[13px]"
                  style={{
                    backgroundColor: "var(--color-stone-surface)",
                    color: "var(--color-coral-red)",
                  }}
                >
                  {err.field && (
                    <span className="font-medium">{err.field}: </span>
                  )}
                  {err.message}
                </li>
              ))}
            </ul>
          )}

          {validationResult.warnings.length > 0 && (
            <ul className="mb-4 space-y-1">
              {validationResult.warnings.map((w, i) => (
                <li
                  key={i}
                  className="text-[13px]"
                  style={{ color: "var(--color-deep-amber)" }}
                >
                  ⚠ {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ---- Step 2: Preview ---- */}
      {step === WIZARD_STEP.PREVIEW && previewResult && (
        <div
          data-testid="preview-result"
          className="rounded-[10px] p-6"
          style={{
            backgroundColor: "var(--color-parchment-card)",
            boxShadow: "var(--shadow-subtle)",
          }}
        >
          <h2
            className="mb-4 text-[19px] font-semibold"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            Import Preview
          </h2>

          {/* Summary grid */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="Deck" value={previewResult.summary.deckTitle} />
            <StatTile label="Notes" value={String(previewResult.summary.totalNotes)} />
            <StatTile label="Cards" value={String(previewResult.summary.predictedCards)} />
            {previewResult.summary.duplicateCandidates !== undefined && (
              <StatTile
                label="Duplicate candidates"
                value={String(previewResult.summary.duplicateCandidates)}
                highlight={previewResult.summary.duplicateCandidates > 0}
              />
            )}
          </div>

          {/* Warnings */}
          {previewResult.warnings && previewResult.warnings.length > 0 && (
            <ul className="space-y-1">
              {previewResult.warnings.map((w, i) => (
                <li
                  key={i}
                  className="text-[13px]"
                  style={{ color: "var(--color-deep-amber)" }}
                >
                  ⚠ {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ---- Step 3: Confirm (result) ---- */}
      {step === WIZARD_STEP.CONFIRM && importResult && (
        <div
          data-testid="import-result"
          className="rounded-[10px] p-6"
          style={{
            backgroundColor: "var(--color-parchment-card)",
            boxShadow: "var(--shadow-subtle)",
          }}
        >
          <div className="mb-4 flex items-center gap-3">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-[16px]"
              style={{ backgroundColor: "var(--color-valid-green)", color: "#fff" }}
            >
              ✓
            </span>
            <h2
              className="text-[19px] font-semibold"
              style={{ color: "var(--color-charcoal-primary)" }}
            >
              Import complete
            </h2>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2">
            <StatTile label="Notes imported" value={String(importResult.importedNotes)} />
            <StatTile label="Cards created" value={String(importResult.importedCards)} />
          </div>

          {importResult.warnings && importResult.warnings.length > 0 && (
            <ul className="mb-4 space-y-1">
              {importResult.warnings.map((w, i) => (
                <li
                  key={i}
                  className="text-[13px]"
                  style={{ color: "var(--color-deep-amber)" }}
                >
                  ⚠ {w}
                </li>
              ))}
            </ul>
          )}

          <Link
            to={`/decks/${importResult.deckId}`}
            data-testid="view-deck-link"
            className="inline-block rounded-[32px] px-5 py-2 text-[13px] font-medium text-white no-underline transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-ember-orange)" }}
          >
            View deck
          </Link>
        </div>
      )}

      {/* ---- Footer actions ---- */}
      {step !== WIZARD_STEP.CONFIRM && (
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === WIZARD_STEP.INPUT}
            className={cn(
              "rounded-[32px] px-5 py-2 text-[13px] font-medium transition-opacity",
              step === WIZARD_STEP.INPUT && "opacity-0 pointer-events-none",
            )}
            style={{
              backgroundColor: "var(--color-stone-surface)",
              color: "var(--color-graphite)",
            }}
          >
            Back
          </button>

          <button
            type="button"
            data-testid="wizard-next-btn"
            onClick={handleNext}
            disabled={isNextDisabled || isLoading}
            className="rounded-[32px] px-5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--color-ember-orange)" }}
          >
            {isLoading
              ? "Working…"
              : step === WIZARD_STEP.PREVIEW
                ? "Import"
                : "Next"}
          </button>
        </div>
      )}
    </main>
  );
}

// ---- Sub-components ---------------------------------------------------------

interface StatTileProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function StatTile({ label, value, highlight = false }: StatTileProps) {
  return (
    <div
      className="rounded-[10px] px-4 py-3"
      style={{ backgroundColor: "var(--color-stone-surface)" }}
    >
      <p
        className="mb-0.5 text-[11px] font-medium uppercase tracking-wide"
        style={{ color: "var(--color-ash)" }}
      >
        {label}
      </p>
      <p
        className="text-[19px] font-semibold"
        style={{
          color: highlight ? "var(--color-ember-orange)" : "var(--color-charcoal-primary)",
        }}
      >
        {value}
      </p>
    </div>
  );
}
