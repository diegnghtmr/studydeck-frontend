import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { Card } from "@shared/ui/Card";
import { PillButton } from "@shared/ui/PillButton";
import { Badge } from "@shared/ui/Badge";
import { Dropdown } from "@shared/ui/Dropdown";
import { Toast } from "@shared/ui/Toast";
import { Breadcrumb } from "@shared/ui/Breadcrumb";
import { normalizeApiProblem } from "@shared/api/problem";
import { flashcardImportV1Schema } from "./schemas/import-schemas";
import { useValidateImport, usePreviewImport, useExecuteImport } from "./hooks/use-import";
import { useDecks, useDeck } from "@features/decks/hooks/use-decks";
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

// ---- Small inline outline button (matches prototype row actions) ------------

function GhostButton({
  onClick,
  children,
  "data-testid": testId,
}: {
  onClick: () => void;
  children: ReactNode;
  "data-testid"?: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-testid={testId}
      style={{
        background: "#fff",
        color: hover ? "var(--color-charcoal-primary)" : "#474645",
        border: "none",
        boxShadow: `${hover ? "#dcd9d4" : "#e7e4df"} 0 0 0 1px inset`,
        borderRadius: "9px",
        padding: "7px 14px",
        fontSize: "13px",
        fontWeight: 500,
        letterSpacing: "-0.16px",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "box-shadow 0.15s ease, color 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}

// ---- Component --------------------------------------------------------------

export function ImportWizardPage() {
  const { deckId: paramDeckId } = useParams();
  const { t } = useTranslation("import");

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
  const [sampleBtnHover, setSampleBtnHover] = useState(false);
  const [browseHover, setBrowseHover] = useState(false);
  const [nextBtnHover, setNextBtnHover] = useState(false);

  const validateMutation = useValidateImport();
  const previewMutation = usePreviewImport();
  const executeMutation = useExecuteImport();
  const { data: decks } = useDecks();
  const { data: scopedDeck } = useDeck(paramDeckId ?? "");

  // When reached via /decks/:deckId/import the target deck is fixed to that
  // deck; the global /import route lets the user pick any deck.
  const isDeckScoped = Boolean(paramDeckId);
  const scopedDeckTitle = scopedDeck?.title ?? "this deck";

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
      setParseError(t("errors.invalidJson"));
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

    // 3. Server-side validate, then immediately preview when valid — this matches
    //    the prototype's single "Validate & preview" action (no bare "Valid" screen).
    try {
      const result = await validateMutation.mutateAsync(zodResult.data as FlashcardImportV1Model);
      setValidationResult(result);
      if (result.valid) {
        await runPreview(zodResult.data as FlashcardImportV1Model);
      } else {
        setStep(WIZARD_STEP.VALIDATE);
      }
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
  /** Runs :preview and shows the rich preview step (rows + selection). */
  async function runPreview(payload: FlashcardImportV1Model) {
    const result = await previewMutation.mutateAsync(payload);
    setPreviewResult(result);
    setSelectedRows(new Set(Array.from({ length: payload.notes.length }, (_, i) => i)));
    setStep(WIZARD_STEP.PREVIEW);
  }

  async function handleValidateNext() {
    if (!parsedPayload) return;
    setApiError(null);
    try {
      await runPreview(parsedPayload);
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
      <Toast visible={showToast} message={t("toast.importComplete")} data-testid="toast" />
      <main
        data-testid="import-wizard"
        className="sd-fade mx-auto"
        style={{ maxWidth: "1120px", padding: "48px 56px 80px" }}
      >
        {/* Header */}
        {isDeckScoped && (
          <Breadcrumb
            className="mb-4"
            items={[
              { label: t("breadcrumb.myDecks"), href: "/decks" },
              { label: scopedDeckTitle, href: `/decks/${paramDeckId}` },
              { label: t("breadcrumb.import") },
            ]}
          />
        )}
        <h1
          style={{
            fontFamily: "var(--font-family)",
            fontSize: "40px",
            color: "#343433",
            marginBottom: "8px",
            fontWeight: 500,
            letterSpacing: "-1.2px",
          }}
        >
          {isDeckScoped ? t("titleScoped", { deckTitle: scopedDeckTitle }) : t("titleGlobal")}
        </h1>
        <p style={{ fontSize: "15px", color: "#848281", marginBottom: "32px" }}>
          {isDeckScoped ? t("subtitleScoped") : t("subtitleGlobal")}
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
          <div style={{ background: "#fff", boxShadow: "#f2f0ed 0 0 0 1px inset", borderRadius: "16px", overflow: "hidden" }}>
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
                    fontFamily: "'SF Mono', ui-monospace, Menlo, monospace",
                    fontSize: "12.5px",
                    color: "#474645",
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
                    ? t("status.validated")
                    : validationResult?.valid === false
                      ? t("status.errorsFound")
                      : t("status.ready")}
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
                  onMouseEnter={() => setSampleBtnHover(true)}
                  onMouseLeave={() => setSampleBtnHover(false)}
                  style={{
                    flex: 1,
                    background: "#fff",
                    color: sampleBtnHover ? "#121212" : "#474645",
                    border: "none",
                    boxShadow: sampleBtnHover ? "#dcd9d4 0 0 0 1px inset" : "#e7e4df 0 0 0 1px inset",
                    borderRadius: "9px",
                    padding: "9px 14px",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {sampleLoaded ? t("actions.clear") : t("actions.loadSample")}
                </button>
                <label
                  onMouseEnter={() => setBrowseHover(true)}
                  onMouseLeave={() => setBrowseHover(false)}
                  style={{
                    flex: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    background: "#fff",
                    color: browseHover ? "#121212" : "#474645",
                    border: "none",
                    boxShadow: browseHover ? "#dcd9d4 0 0 0 1px inset" : "#e7e4df 0 0 0 1px inset",
                    borderRadius: "9px",
                    padding: "9px 14px",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    type="file"
                    accept=".json,application/json"
                    data-testid="file-input"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                  {t("actions.browse")}
                </label>
              </div>
              {/* Row 2 — primary action */}
              {step !== WIZARD_STEP.CONFIRM && (
                <button
                  type="button"
                  data-testid="wizard-next-btn"
                  disabled={isNextDisabled || isLoading}
                  onClick={handleNext}
                  onMouseEnter={() => setNextBtnHover(true)}
                  onMouseLeave={() => setNextBtnHover(false)}
                  style={{
                    width: "100%",
                    background: nextBtnHover && !(isNextDisabled || isLoading) ? "#343433" : "#121212",
                    color: "#fff",
                    border: "none",
                    borderRadius: "32px",
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    opacity: isNextDisabled || isLoading ? 0.6 : 1,
                  }}
                >
                  {isLoading && step === WIZARD_STEP.INPUT
                    ? t("actions.working")
                    : step === WIZARD_STEP.VALIDATE
                      ? t("actions.preview")
                      : step === WIZARD_STEP.PREVIEW
                        ? t("actions.approveAndImport")
                        : t("actions.validateAndPreview")}
                </button>
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
          </div>

          {/* RIGHT — Preview/Result panel */}
          <div>
            {/* Step 3 — Done state */}
            {step === WIZARD_STEP.CONFIRM && importResult !== null ? (
              <div
                data-testid="import-result"
                style={{
                  background: "#fff",
                  boxShadow: "#f2f0ed 0 0 0 1px inset",
                  borderRadius: "16px",
                  padding: "48px 24px",
                  textAlign: "center",
                  animation: "sdPop 0.35s ease both",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "#e6f9ed",
                    margin: "0 auto 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M4 10l4.5 4.5L16 6"
                      stroke="#00ca48"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-family)",
                    fontSize: "24px",
                    fontWeight: 500,
                    color: "#343433",
                    letterSpacing: "-0.6px",
                    marginBottom: "6px",
                  }}
                >
                  {t("result.cardsImported", { count: importResult.importedNotes })}
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#848281",
                    marginBottom: "22px",
                  }}
                >
                  {t("result.deckReady")}
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
                    {t("actions.viewDeck")}
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
                    {t("actions.importAnother")}
                  </PillButton>
                </div>
              </div>
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
                      {validationResult.valid ? t("validation.valid") : t("validation.failed")}
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
              <div data-testid="preview-result" style={{ animation: "sdFade 0.3s ease both" }}>
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
                    <div style={{ fontSize: "11.5px", color: "var(--color-ash)" }}>{t("preview.notes")}</div>
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
                      {t("preview.duplicate")}
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
                    <div style={{ fontSize: "11.5px", color: "var(--color-ash)" }}>{t("preview.error")}</div>
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
                    {t("preview.importInto")}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {isDeckScoped ? (
                      <div
                        data-testid="deck-locked"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "#fff",
                          boxShadow: "#e7e4df 0 0 0 1px inset",
                          borderRadius: "10px",
                          padding: "8px 12px",
                        }}
                      >
                        <span
                          className="flex shrink-0 items-center justify-center"
                          style={{
                            width: "22px",
                            height: "22px",
                            backgroundColor: "#121212",
                            borderRadius: "6px",
                            color: "#ff3e00",
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                              d="M12 3l8.5 4.7L12 12.4 3.5 7.7 12 3ZM4 12l8 4.5 8-4.5M4 16.3l8 4.5 8-4.5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "var(--color-charcoal-primary)",
                          }}
                        >
                          {scopedDeckTitle}
                        </span>
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--color-smoke)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                    ) : (
                      <Dropdown
                        items={
                          decks?.items.map((d) => ({ value: d.id, label: d.title })) ?? []
                        }
                        {...(selectedDeckId ? { value: selectedDeckId } : {})}
                        placeholder={t("preview.selectDeckPlaceholder")}
                        onSelect={setSelectedDeckId}
                        searchable
                        searchPlaceholder={t("preview.searchDecksPlaceholder")}
                        data-testid="deck-dropdown"
                      />
                    )}
                    <GhostButton
                      data-testid="select-all-rows"
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
                    >
                      {t("actions.selectAll")}
                    </GhostButton>
                    <GhostButton
                      data-testid="clear-rows"
                      onClick={() => setSelectedRows(new Set())}
                    >
                      {t("actions.clear")}
                    </GhostButton>
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
                      const badgeLabel = isDupe ? t("preview.badgeDuplicate") : t("preview.badgeNew");
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
                      {t("preview.selectedOf", { selected: selectedRows.size, total: parsedPayload?.notes.length ?? 0 })}
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
              <div style={{ background: "#f8f7f4", borderRadius: "16px", padding: "28px" }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#343433", marginBottom: "5px" }}>
                  {t("emptyState.title")}
                </p>
                <p style={{ fontSize: 13, color: "#848281", lineHeight: 1.55, marginBottom: "20px" }}>
                  {t("emptyState.description")}
                </p>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#a7a7a7", letterSpacing: "0.3px", textTransform: "uppercase" as const, marginBottom: "9px" }}>
                  {t("emptyState.expectedShape")}
                </p>
                <pre
                  style={{
                    background: "#fff",
                    boxShadow: "#f2f0ed 0 0 0 1px inset",
                    borderRadius: "10px",
                    padding: "15px",
                    fontFamily: "'SF Mono', ui-monospace, Menlo, monospace",
                    fontSize: 12,
                    lineHeight: 1.65,
                    color: "#474645",
                    whiteSpace: "pre-wrap" as const,
                    wordBreak: "break-word" as const,
                    margin: 0,
                  }}
                >{`{
  "schemaVersion": "1.0",
  "deck": "Spanish Vocabulary",
  "noteType": "Basic",
  "notes": [
    { "front": "…", "back": "…" }
  ]
}`}</pre>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
