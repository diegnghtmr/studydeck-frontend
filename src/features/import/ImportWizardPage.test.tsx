import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

// --- Mocks -------------------------------------------------------------------

vi.mock("@shared/api/client", () => ({
  importExportApi: {
    validateFlashcardImport: vi.fn(),
    previewFlashcardImport: vi.fn(),
    importFlashcards: vi.fn(),
    exportDeckJson: vi.fn(),
  },
  decksApi: {
    listDecks: vi.fn(),
    getDeck: vi.fn(),
  },
}));

import { importExportApi, decksApi } from "@shared/api/client";
import type {
  ImportValidationResponseModel,
  ImportPreviewModel,
  ImportResultModel,
} from "@shared/api/types";
import { ImportWizardPage } from "./ImportWizardPage";

const mockValidate = vi.mocked(importExportApi.validateFlashcardImport);
const mockPreview = vi.mocked(importExportApi.previewFlashcardImport);
const mockImport = vi.mocked(importExportApi.importFlashcards);

// ---- Sample data ------------------------------------------------------------

// Note: userEvent.type does not handle { and } (treats as key modifiers).
// We use fireEvent.change for JSON textarea input.

const VALID_JSON = JSON.stringify({
  schemaVersion: "1.0",
  deck: { title: "Biology Deck" },
  notes: [
    { noteType: "basic", front: "What is mitochondria?", back: "The powerhouse of the cell." },
    { noteType: "basic", front: "What is a nucleus?", back: "Controls the cell." },
  ],
});

const INVALID_JSON = "not valid json at all";

const SCHEMA_ERROR_JSON = JSON.stringify({
  schemaVersion: "2.0",
  deck: { title: "Deck" },
  notes: [{ noteType: "basic", front: "Q", back: "A" }],
});

const VALIDATION_VALID: ImportValidationResponseModel = {
  valid: true,
  errors: [],
  warnings: [],
};

const VALIDATION_INVALID: ImportValidationResponseModel = {
  valid: false,
  errors: [{ field: "notes[0].front", message: "Front is required." }],
  warnings: [],
};

const PREVIEW_RESULT: ImportPreviewModel = {
  valid: true,
  summary: {
    deckTitle: "Biology Deck",
    totalNotes: 2,
    predictedCards: 2,
    duplicateCandidates: 1,
  },
  warnings: ["Note 2 may be a duplicate."],
};

const IMPORT_RESULT: ImportResultModel = {
  importId: "imp-001",
  deckId: "deck-001",
  importedNotes: 2,
  importedCards: 2,
  warnings: [],
};

// ---- Helpers ----------------------------------------------------------------

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderWizard(qc: QueryClient) {
  return render(
    createElement(
      QueryClientProvider,
      { client: qc },
      createElement(MemoryRouter, null, createElement(ImportWizardPage)),
    ),
  );
}

function setJsonInput(value: string) {
  const textarea = screen.getByTestId("json-input");
  fireEvent.change(textarea, { target: { value } });
}

// ---- Tests ------------------------------------------------------------------

describe("ImportWizardPage — Step 1: Input", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQC();
    vi.clearAllMocks();
  });

  it("renders the import wizard with a textarea and JSON hints", () => {
    renderWizard(qc);
    expect(screen.getByTestId("import-wizard")).toBeInTheDocument();
    expect(screen.getByTestId("json-input")).toBeInTheDocument();
    expect(screen.getByText(/paste a versioned payload/i)).toBeInTheDocument();
  });

  it("shows a client-side error for invalid JSON without calling the API", async () => {
    const user = userEvent.setup();
    renderWizard(qc);

    setJsonInput(INVALID_JSON);

    const nextBtn = screen.getByTestId("wizard-next-btn");
    await user.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/invalid json/i)).toBeInTheDocument();
    });

    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("shows a client-side schema error for wrong schemaVersion", async () => {
    const user = userEvent.setup();
    renderWizard(qc);

    setJsonInput(SCHEMA_ERROR_JSON);

    const nextBtn = screen.getByTestId("wizard-next-btn");
    await user.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByTestId("parse-error")).toBeInTheDocument();
    });

    expect(screen.getByTestId("parse-error").textContent).toMatch(/schemaVersion/i);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("accepts a file upload and populates the textarea", async () => {
    renderWizard(qc);

    const file = new File([VALID_JSON], "deck.json", { type: "application/json" });
    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const textarea = screen.getByTestId("json-input") as HTMLTextAreaElement;
      expect(textarea.value).toBe(VALID_JSON);
    });
  });
});

describe("ImportWizardPage — Step 2: Validate", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQC();
    vi.clearAllMocks();
  });

  it("goes straight to the preview when valid (combined validate & preview)", async () => {
    mockValidate.mockResolvedValue({ data: VALIDATION_VALID, status: 200 } as never);
    mockPreview.mockResolvedValue({ data: PREVIEW_RESULT, status: 200 } as never);

    const user = userEvent.setup();
    renderWizard(qc);

    setJsonInput(VALID_JSON);

    await user.click(screen.getByTestId("wizard-next-btn"));

    // No bare "Valid" screen — the rich preview is shown directly, like the prototype.
    await waitFor(() => {
      expect(screen.getByTestId("preview-result")).toBeInTheDocument();
    });
    expect(mockPreview).toHaveBeenCalled();
  });

  it("shows validation errors returned by the API and blocks progress", async () => {
    mockValidate.mockResolvedValue({ data: VALIDATION_INVALID, status: 200 } as never);

    const user = userEvent.setup();
    renderWizard(qc);

    setJsonInput(VALID_JSON);

    await user.click(screen.getByTestId("wizard-next-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("validation-result")).toBeInTheDocument();
    });

    expect(screen.getByText(/front is required/i)).toBeInTheDocument();

    // Next button should be disabled when validation failed
    const nextBtn = screen.queryByTestId("wizard-next-btn");
    if (nextBtn) {
      expect(nextBtn).toBeDisabled();
    }
  });
});

describe("ImportWizardPage — Step 3: Preview", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQC();
    vi.clearAllMocks();
  });

  async function advanceToPreview(user: ReturnType<typeof userEvent.setup>) {
    mockValidate.mockResolvedValue({ data: VALIDATION_VALID, status: 200 } as never);
    mockPreview.mockResolvedValue({ data: PREVIEW_RESULT, status: 200 } as never);

    setJsonInput(VALID_JSON);

    // One action: "Validate & preview" runs both and shows the preview.
    await user.click(screen.getByTestId("wizard-next-btn"));
    await waitFor(() => expect(screen.getByTestId("preview-result")).toBeInTheDocument());
  }

  it("shows the preview summary (totalNotes, predictedCards, duplicateCandidates)", async () => {
    const user = userEvent.setup();
    renderWizard(qc);
    await advanceToPreview(user);

    // totalNotes and predictedCards are both 2 — check the label exists
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getAllByText(/duplicate/i).length).toBeGreaterThan(0);
  });

  it("shows a warning message from preview", async () => {
    const user = userEvent.setup();
    renderWizard(qc);
    await advanceToPreview(user);

    expect(screen.getByText(/may be a duplicate/i)).toBeInTheDocument();
  });
});

describe("ImportWizardPage — Step 4: Confirm", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQC();
    vi.clearAllMocks();
  });

  async function advanceToConfirm(user: ReturnType<typeof userEvent.setup>) {
    mockValidate.mockResolvedValue({ data: VALIDATION_VALID, status: 200 } as never);
    mockPreview.mockResolvedValue({ data: PREVIEW_RESULT, status: 200 } as never);
    mockImport.mockResolvedValue({ data: IMPORT_RESULT, status: 201 } as never);

    setJsonInput(VALID_JSON);

    // Validate & preview (combined)
    await user.click(screen.getByTestId("wizard-next-btn"));
    await waitFor(() => expect(screen.getByTestId("preview-result")).toBeInTheDocument());

    // Approve & import
    await user.click(screen.getByTestId("wizard-next-btn"));
    await waitFor(() => expect(screen.getByTestId("import-result")).toBeInTheDocument());
  }

  it("shows import summary with created notes count", async () => {
    const user = userEvent.setup();
    renderWizard(qc);
    await advanceToConfirm(user);

    expect(screen.getByText(/imported/i)).toBeInTheDocument();
  });

  it("shows a link to the imported deck", async () => {
    const user = userEvent.setup();
    renderWizard(qc);
    await advanceToConfirm(user);

    const deckLink = screen.getByTestId("view-deck-link");
    expect(deckLink).toBeInTheDocument();
    expect(deckLink).toHaveAttribute("href", "/decks/deck-001");
  });
});

describe("ImportWizardPage — New UI features", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQC();
    vi.clearAllMocks();
  });

  it("drag-and-drop a file populates the textarea", async () => {
    renderWizard(qc);

    // The drag zone is the wrapper div around the textarea
    const textarea = screen.getByTestId("json-input");

    const file = new File([VALID_JSON], "deck.json", { type: "application/json" });

    // Create a DataTransfer mock
    const dataTransfer = {
      files: [file],
      items: [],
      types: [],
    };

    fireEvent.dragOver(textarea.parentElement!, { dataTransfer });
    fireEvent.drop(textarea.parentElement!, { dataTransfer });

    await waitFor(() => {
      const ta = screen.getByTestId("json-input") as HTMLTextAreaElement;
      expect(ta.value).toBe(VALID_JSON);
    });
  });

  it("Load sample button fills the textarea with valid JSON", async () => {
    const user = userEvent.setup();
    renderWizard(qc);

    const loadSampleBtn = screen.getByText("Load sample");
    await user.click(loadSampleBtn);

    await waitFor(() => {
      const ta = screen.getByTestId("json-input") as HTMLTextAreaElement;
      expect(ta.value).toContain("schemaVersion");
      expect(ta.value).toContain("Sample Deck");
    });
  });

  it("Clear button resets the textarea", async () => {
    const user = userEvent.setup();
    renderWizard(qc);

    // Load sample first
    const loadSampleBtn = screen.getByText("Load sample");
    await user.click(loadSampleBtn);

    // Now it should show "Clear"
    const clearBtn = await screen.findByText("Clear");
    await user.click(clearBtn);

    const ta = screen.getByTestId("json-input") as HTMLTextAreaElement;
    expect(ta.value).toBe("");
  });

  it("Toast appears after successful import and auto-hides", async () => {
    mockValidate.mockResolvedValue({ data: VALIDATION_VALID, status: 200 } as never);
    mockPreview.mockResolvedValue({ data: PREVIEW_RESULT, status: 200 } as never);
    mockImport.mockResolvedValue({ data: IMPORT_RESULT, status: 201 } as never);

    vi.useFakeTimers({ shouldAdvanceTime: true });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWizard(qc);

    setJsonInput(VALID_JSON);

    await user.click(screen.getByTestId("wizard-next-btn"));
    await waitFor(() => expect(screen.getByTestId("preview-result")).toBeInTheDocument());

    await user.click(screen.getByTestId("wizard-next-btn"));
    await waitFor(() => expect(screen.getByTestId("import-result")).toBeInTheDocument());

    // Toast should be visible immediately after import
    expect(screen.getByTestId("toast")).toBeInTheDocument();

    // Advance timers by 3.1s so the auto-hide fires
    act(() => {
      vi.advanceTimersByTime(3100);
    });

    await waitFor(() => {
      expect(screen.queryByTestId("toast")).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  }, 15000);

  it("Import into dropdown renders deck options", async () => {
    vi.mocked(decksApi.listDecks).mockResolvedValue({
      data: {
        items: [
          { id: "d1", title: "Biology Deck", archived: false },
          { id: "d2", title: "Math Deck", archived: false },
        ],
        page: { page: 0, size: 20, totalElements: 2, totalPages: 1 },
      },
      status: 200,
    } as never);

    mockValidate.mockResolvedValue({ data: VALIDATION_VALID, status: 200 } as never);
    mockPreview.mockResolvedValue({ data: PREVIEW_RESULT, status: 200 } as never);

    const user = userEvent.setup();
    renderWizard(qc);

    setJsonInput(VALID_JSON);

    // Validate & preview (combined) → preview shown directly
    await user.click(screen.getByTestId("wizard-next-btn"));
    await waitFor(() => expect(screen.getByTestId("preview-result")).toBeInTheDocument());

    // Click dropdown to open it
    const dropdownTrigger = screen.getByTestId("deck-dropdown-trigger");
    await user.click(dropdownTrigger);

    await waitFor(() => {
      expect(screen.getByText("Biology Deck")).toBeInTheDocument();
      expect(screen.getByText("Math Deck")).toBeInTheDocument();
    });
  });
});

describe("ImportWizardPage — deck-scoped (/decks/:deckId/import)", () => {
  let qc: QueryClient;

  function renderScopedWizard(deckId = "deck-123") {
    return render(
      createElement(
        QueryClientProvider,
        { client: qc },
        createElement(
          MemoryRouter,
          { initialEntries: [`/decks/${deckId}/import`] },
          createElement(
            Routes,
            null,
            createElement(Route, {
              path: "/decks/:deckId/import",
              element: createElement(ImportWizardPage),
            }),
          ),
        ),
      ),
    );
  }

  beforeEach(() => {
    qc = makeQC();
    vi.clearAllMocks();
    vi.mocked(decksApi.getDeck).mockResolvedValue({
      data: { id: "deck-123", title: "Spanish Vocabulary", archived: false },
      status: 200,
    } as never);
    vi.mocked(decksApi.listDecks).mockResolvedValue({
      data: { items: [], page: { page: 0, size: 20, totalElements: 0, totalPages: 0 } },
      status: 200,
    } as never);
  });

  it("shows the deck breadcrumb and a contextual title", async () => {
    renderScopedWizard();

    await waitFor(() => {
      expect(screen.getByText("Import into Spanish Vocabulary")).toBeInTheDocument();
    });
    expect(screen.getByText("My Decks")).toBeInTheDocument();
  });

  it("locks the target deck (no editable dropdown) in the preview step", async () => {
    mockValidate.mockResolvedValue({ data: VALIDATION_VALID, status: 200 } as never);
    mockPreview.mockResolvedValue({ data: PREVIEW_RESULT, status: 200 } as never);

    const user = userEvent.setup();
    renderScopedWizard();

    setJsonInput(VALID_JSON);
    await user.click(screen.getByTestId("wizard-next-btn"));
    await waitFor(() => expect(screen.getByTestId("preview-result")).toBeInTheDocument());

    expect(screen.getByTestId("deck-locked")).toHaveTextContent("Spanish Vocabulary");
    expect(screen.queryByTestId("deck-dropdown")).not.toBeInTheDocument();
  });
});
