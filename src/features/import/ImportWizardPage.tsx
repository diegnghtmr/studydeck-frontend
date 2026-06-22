import { useState } from "react";
import { Link, useParams } from "react-router";
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { Card } from "@shared/ui/Card";
import { PillButton } from "@shared/ui/PillButton";
import { Badge } from "@shared/ui/Badge";
import { Dropdown } from "@shared/ui/Dropdown";
import { Toast } from "@shared/ui/Toast";
import { normalizeApiProblem } from "@shared/api/problem";
import { flashcardImportV1Schema } from "./schemas/import-schemas";
import { useValidateImport, usePreviewImport, useExecuteImport } from "./hooks/use-import";
import { useDecks } from "@features/decks/hooks/use-decks";
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

// ---- Sample JSON ------------------------------------------------------------

const SAMPLE_JSON = JSON.stringify(
  {
    schemaVersion: "1.0",
    deck: { title: "Sample Deck" },
    notes: [
      { noteType: "basic", front: "What is the capital of France?", back: "Paris" },
      { noteType: "basic", front: "What is 2 + 2?", back: "4" },
    ],
  },
  null,
  2,
);

// ---- Intent -----------------------------------------------------------------
// Who: A StudyDeck user who has an export JSON (from another tool or a manual file).
// Task: Import it as a new (or supplemented) deck without losing control.
// Feel: Deliberate, clear, warm — not a scary upload form.

// ---- Component --------------------------------------------------------------

export function ImportWizardPage() {
  const { deckId: paramDeckId } = useParams();

  // existing state
  const [step, setStep] = useState<WizardStep>(WIZARD_STEP.INPUT);
  const [rawJson, setRawJson] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedPayload, setParsedPayload] = useState<FlashcardImportV1Model | null>(null);
  const [validationResult, setValidationResult] = useState<ImportValidationResponseModel | null>(null);
  const [previewResult, setPreviewResult] = useState<ImportPreviewModel | null>(null);
  const [importResult, setImportResult] = useState<ImportResultModel | null>(null);
  const [apiError, setApiError] = useState<ReturnType<typeof normalizeApiProblem>>(null);

  // new state
  const [isDragging, setIsDragging] = useState(false);
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState(paramDeckId ?? "");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showToast, setShowToast] = useState(false);

  const validateMutation = useValidateImport();
  const previewMutation = usePreviewImport();
  const executeMutation = useExecuteImport();
  const { data: decks } = useDecks();

  const isLoading =
    validateMutation.isPending || previewMutation.isPending || executeMutation.isPending;

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

  // ---- Drag-and-drop handlers ---------------------------------------------

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawJson(ev.target?.result as string ?? "");
      setParseError(null);
    };
    reader.readAsText(file);
  }

  // ---- Load sample handler ------------------------------------------------

  function handleLoadSample() {
    if (sampleLoaded) {
      setRawJson("");
      setSampleLoaded(false);
    } else {
      setRawJson(SAMPLE_JSON);
      setSampleLoaded(true);
      setParseError(null);
    }
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
      setSelectedRows(
        new Set(Array.from({ length: parsedPayload.notes.length }, (_, i) => i)),
      );
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
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setApiError(p ?? { type: "about:blank", title: "Import failed", status: 500 });
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
    (step === WIZARD_STEP.VALIDATE && validationResult !== null && !validationResult.valid) ||
    (step === WIZARD_STEP.INPUT && isLoading);

  // ---- Render -------------------------------------------------------------

  return (
    <>
      <Toast visible={showToast} message="Import complete!" data-testid="toast" />
      <main
        data-testid="import-wizard"
        className="sd-fade mx-auto"
        style={{ maxWidth: "1120px", padding: "48px 56px 80px" }}
      >
        {/* Header */}
        <h1
          style={{
            fontFamily: "var(--font-family)",
            fontSize: "40px",
            color: "var(--color-charcoal-primary)",
            marginBottom: "8px",
            fontWeight: 700,
          }}
        >
          Import JSON
        </h1>
        <p style={{ fontSize: "15px", color: "#848281", marginBottom: "32px" }}>
          Paste or drop a deck.json file to import flashcards.
        </p>

        {/* API error */}
        {apiError && (
          <ProblemBanner
            problem={apiError}
            className="mb-6"
            onDismiss={() => setApiError(null)}
          />
        )}

        {/* Two-column grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.25fr",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* LEFT — Input panel */}
          <Card radius={16} className="overflow-hidden">
            {/* Header bar */}
            <div
              style={{
                padding: "13px 16px",
                borderBottom: "1px solid #f2f0ed",
                backgroundColor: "#fbfaf9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* File icon */}
                <svg width="14" height="16" viewBox="0 0 14 16" fill="none" aria-hidden="true">
                  <path d="M2 1.5h7l3 3v10H2V1.5z" stroke="#a7a7a7" strokeWidth="1.2" fill="none" />
                  <path d="M9 1.5V5h3.5" stroke="#a7a7a7" strokeWidth="1.2" />
                </svg>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "11px",
                    color: "var(--color-ash)",
                  }}
                >
                  deck.json
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor:
                      validationResult?.valid === true
                        ? "#00ca48"
                        : validationResult?.valid === false
                          ? "#ff3e00"
                          : "#a7a7a7",
                  }}
                />
                <span style={{ fontSize: "12px", color: "var(--color-ash)" }}>
                  {validationResult?.valid === true
                    ? "Validated"
                    : validationResult?.valid === false
                      ? "Errors found"
                      : "Ready"}
                </span>
              </div>
            </div>

            {/* Textarea drag zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{ backgroundColor: isDragging ? "#eaf4ff" : "#ffffff" }}
            >
              <textarea
                data-testid="json-input"
                value={rawJson}
                onChange={(e) => {
                  setRawJson(e.target.value);
                  setParseError(null);
                }}
                style={{
                  width: "100%",
                  height: "288px",
                  padding: "16px",
                  fontFamily: "'SF Mono', ui-monospace, Menlo, monospace",
                  fontSize: "12.5px",
                  lineHeight: "1.7",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  backgroundColor: "transparent",
                  color: "var(--color-charcoal-primary)",
                  boxSizing: "border-box",
                }}
                placeholder={'{\n  "schemaVersion": "1.0",\n  "deck": { "title": "..." },\n  "notes": [{ "noteType": "basic", ... }]\n}'}
              />
            </div>

            {/* Footer bar */}
            <div
              style={{
                padding: "13px 16px",
                borderTop: "1px solid #f2f0ed",
                backgroundColor: "#fbfaf9",
              }}
            >
              {/* Row 1 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={handleLoadSample}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e2dd",
                    borderRadius: "10px",
                    padding: "7px 14px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--color-graphite)",
                    cursor: "pointer",
                  }}
                >
                  {sampleLoaded ? "Clear" : "Load sample"}
                </button>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#ffffff",
                    border: "1px solid #e5e2dd",
                    borderRadius: "10px",
                    padding: "7px 14px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--color-graphite)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="file"
                    accept=".json,application/json"
                    data-testid="file-input"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                  Browse…
                </label>
              </div>
              {/* Row 2 — primary action */}
              {step !== WIZARD_STEP.CONFIRM && (
                <PillButton
                  data-testid="wizard-next-btn"
                  disabled={isNextDisabled || isLoading}
                  onClick={handleNext}
                >
                  {isLoading && step === WIZARD_STEP.INPUT
                    ? "Working…"
                    : step === WIZARD_STEP.VALIDATE
                      ? "Preview"
                      : step === WIZARD_STEP.PREVIEW
                        ? "Approve & import"
                        : "Validate & preview"}
                </PillButton>
              )}
            </div>

            {/* Parse error */}
            {parseError && (
              <p
                role="alert"
                data-testid="parse-error"
                style={{ fontSize: "12px", color: "var(--color-coral-red)", padding: "8px 16px" }}
              >
                {parseError}
              </p>
            )}
          </Card>

          {/* RIGHT — Preview/Result panel */}
          <div>
            {/* Step 3 — Done state */}
            {step === WIZARD_STEP.CONFIRM && importResult !== null ? (
              <Card radius={16} data-testid="import-result">
                <div style={{ padding: "32px", textAlign: "center" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: "#e6f9ed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path
                        d="M4 10l4.5 4.5L16 6"
                        stroke="#00ca48"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-family)",
                      fontSize: "24px",
                      color: "var(--color-charcoal-primary)",
                      fontWeight: 700,
                      marginBottom: "8px",
                    }}
                  >
                    {importResult.importedNotes} cards imported
                  </p>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "var(--color-ash)",
                      marginBottom: "24px",
                    }}
                  >
                    Your deck is ready to study.
                  </p>
                  <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <Link
                      to={`/decks/${importResult.deckId}`}
                      data-testid="view-deck-link"
                      style={{
                        display: "inline-block",
                        padding: "8px 20px",
                        backgroundColor: "var(--color-midnight)",
                        color: "#ffffff",
                        borderRadius: "32px",
                        textDecoration: "none",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      View deck
                    </Link>
                    <PillButton
                      variant="secondary"
                      onClick={() => {
                        setRawJson("");
                        setStep(WIZARD_STEP.INPUT);
                        setPreviewResult(null);
                        setImportResult(null);
                        setValidationResult(null);
                        setParsedPayload(null);
                        setParseError(null);
                        setApiError(null);
                        setSampleLoaded(false);
                        setSelectedRows(new Set());
                      }}
                    >
                      Import another
                    </PillButton>
                  </div>
                </div>
              </Card>
            ) : step === WIZARD_STEP.VALIDATE && validationResult !== null ? (
              /* Step 1 — Validation result */
              <Card radius={16} data-testid="validation-result">
                <div style={{ padding: "24px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: validationResult.valid
                          ? "var(--color-valid-green)"
                          : "var(--color-coral-red)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: "16px",
                      }}
                    >
                      {validationResult.valid ? "✓" : "✕"}
                    </div>
                    <h2
                      style={{
                        fontSize: "19px",
                        fontWeight: 600,
                        color: "var(--color-charcoal-primary)",
                      }}
                    >
                      {validationResult.valid ? "Valid" : "Validation Failed"}
                    </h2>
                  </div>
                  {validationResult.errors.length > 0 && (
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
                      {validationResult.errors.map((err, i) => (
                        <li
                          key={i}
                          style={{
                            borderRadius: "6px",
                            padding: "8px 12px",
                            backgroundColor: "var(--color-stone-surface)",
                            color: "var(--color-coral-red)",
                            fontSize: "13px",
                            marginBottom: "8px",
                          }}
                        >
                          {err.field && (
                            <span style={{ fontWeight: 500 }}>{err.field}: </span>
                          )}
                          {err.message}
                        </li>
                      ))}
                    </ul>
                  )}
                  {validationResult.warnings.length > 0 && (
                    <ul style={{ listStyle: "none", padding: 0 }}>
                      {validationResult.warnings.map((w, i) => (
                        <li
                          key={i}
                          style={{
                            fontSize: "13px",
                            color: "var(--color-deep-amber)",
                            marginBottom: "4px",
                          }}
                        >
                          ⚠ {w}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            ) : step === WIZARD_STEP.PREVIEW && previewResult !== null ? (
              /* Step 2 — Preview */
              <div data-testid="preview-result">
                {/* Stats row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "10px",
                    marginBottom: "16px",
                  }}
                >
                  {/* Valid stat */}
                  <div
                    style={{
                      backgroundColor: "#e6f9ed",
                      borderRadius: "12px",
                      padding: "16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "20px",
                        fontFamily: "var(--font-family)",
                        fontWeight: 700,
                        color: "var(--color-charcoal-primary)",
                      }}
                    >
                      {previewResult.summary.totalNotes}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--color-ash)" }}>Notes</div>
                  </div>
                  {/* Duplicate stat */}
                  <div
                    style={{
                      backgroundColor: "#fff6e0",
                      borderRadius: "12px",
                      padding: "16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "20px",
                        fontFamily: "var(--font-family)",
                        fontWeight: 700,
                        color: "var(--color-charcoal-primary)",
                      }}
                    >
                      {previewResult.summary.duplicateCandidates ?? "—"}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--color-ash)" }}>
                      Duplicate
                    </div>
                  </div>
                  {/* Error stat */}
                  <div
                    style={{
                      backgroundColor: "#fff0eb",
                      borderRadius: "12px",
                      padding: "16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "20px",
                        fontFamily: "var(--font-family)",
                        fontWeight: 700,
                        color: "var(--color-charcoal-primary)",
                      }}
                    >
                      {validationResult?.errors.length ?? 0}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--color-ash)" }}>Error</div>
                  </div>
                </div>

                {/* Import into row */}
                <div style={{ marginBottom: "16px" }}>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--color-graphite)",
                      marginBottom: "8px",
                    }}
                  >
                    Import into
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Dropdown
                      items={
                        decks?.items.map((d) => ({ value: d.id, label: d.title })) ?? []
                      }
                      {...(selectedDeckId ? { value: selectedDeckId } : {})}
                      placeholder="Select a deck…"
                      onSelect={setSelectedDeckId}
                      data-testid="deck-dropdown"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (parsedPayload) {
                          setSelectedRows(
                            new Set(
                              Array.from(
                                { length: parsedPayload.notes.length },
                                (_, i) => i,
                              ),
                            ),
                          );
                        }
                      }}
                      style={{
                        fontSize: "12px",
                        color: "#0090ff",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: 0,
                      }}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRows(new Set())}
                      style={{
                        fontSize: "12px",
                        color: "#0090ff",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: 0,
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Preview row list */}
                <Card radius={12}>
                  <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                    {parsedPayload?.notes.slice(0, 50).map((note, i) => {
                      const checked = selectedRows.has(i);
                      const dupes = previewResult.summary.duplicateCandidates ?? 0;
                      const totalNotes = previewResult.summary.totalNotes;
                      const isDupe = dupes > 0 && i >= totalNotes - dupes;
                      const badgeTone = isDupe ? "amber" : "green";
                      const badgeLabel = isDupe ? "Duplicate" : "New";
                      const frontText =
                        "front" in note
                          ? note.front
                          : "prompt" in note
                            ? (note as { prompt: string }).prompt
                            : "text" in note
                              ? (note as { text: string }).text
                              : "question" in note
                                ? (note as { question: string }).question
                                : "";
                      const backText = "back" in note ? note.back : "";

                      return (
                        <div
                          key={i}
                          onClick={() => {
                            const next = new Set(selectedRows);
                            if (checked) next.delete(i);
                            else next.add(i);
                            setSelectedRows(next);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 16px",
                            borderBottom:
                              i < (parsedPayload?.notes.length ?? 1) - 1
                                ? "1px solid #f2f0ed"
                                : "none",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            style={{
                              accentColor: "var(--color-midnight)",
                              cursor: "pointer",
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "var(--color-charcoal-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                margin: 0,
                              }}
                            >
                              {frontText}
                            </p>
                            {backText && (
                              <p
                                style={{
                                  fontSize: "12.5px",
                                  color: "#a7a7a7",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  margin: 0,
                                }}
                              >
                                {backText}
                              </p>
                            )}
                          </div>
                          <Badge tone={badgeTone} label={badgeLabel} />
                        </div>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      padding: "12px 16px",
                      borderTop: "1px solid #f2f0ed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "var(--color-ash)" }}>
                      {selectedRows.size} of {parsedPayload?.notes.length ?? 0} selected
                    </span>
                  </div>
                </Card>

                {/* Warnings */}
                {previewResult.warnings && previewResult.warnings.length > 0 && (
                  <ul style={{ listStyle: "none", padding: "12px 0 0", margin: 0 }}>
                    {previewResult.warnings.map((w, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: "13px",
                          color: "var(--color-deep-amber)",
                          marginBottom: "4px",
                        }}
                      >
                        ⚠ {w}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              /* Empty state */
              <Card recessed radius={16}>
                <div style={{ padding: "32px", textAlign: "center" }}>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "var(--color-ash)",
                      marginBottom: "8px",
                    }}
                  >
                    Preview appears here
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--color-ash)",
                      marginBottom: "16px",
                    }}
                  >
                    Paste JSON to see a preview of what will be imported.
                  </p>
                  <pre
                    style={{
                      backgroundColor: "var(--color-stone-surface)",
                      padding: "12px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontFamily: "monospace",
                      textAlign: "left",
                      margin: 0,
                      color: "var(--color-charcoal-primary)",
                    }}
                  >
                    {`{\n  "schemaVersion": "1.0",\n  "deck": { "title": "..." },\n  "notes": [{ "noteType": "basic", ... }]\n}`}
                  </pre>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
