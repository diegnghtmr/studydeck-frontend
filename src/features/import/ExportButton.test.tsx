import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

// --- Mocks -------------------------------------------------------------------

vi.mock("@shared/api/client", () => ({
  importExportApi: {
    exportDeckJson: vi.fn(),
    validateFlashcardImport: vi.fn(),
    previewFlashcardImport: vi.fn(),
    importFlashcards: vi.fn(),
  },
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn().mockReturnValue("blob:mock-url");
const mockRevokeObjectURL = vi.fn();
Object.defineProperty(globalThis, "URL", {
  value: {
    ...globalThis.URL,
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
  writable: true,
});

import { importExportApi } from "@shared/api/client";
import { ExportButton } from "./ExportButton";

const mockExport = vi.mocked(importExportApi.exportDeckJson);

const DECK_ID = "deck-001";
const EXPORT_PAYLOAD = {
  schemaVersion: "1.0" as const,
  deck: { title: "Biology Deck" },
  notes: [
    { noteType: "basic" as const, front: "What is mitochondria?", back: "Powerhouse." },
  ],
};

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderExportBtn(qc: QueryClient) {
  return render(
    createElement(
      QueryClientProvider,
      { client: qc },
      createElement(ExportButton, { deckId: DECK_ID }),
    ),
  );
}

// ---- Tests ------------------------------------------------------------------

describe("ExportButton", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQC();
    vi.clearAllMocks();
  });

  it("renders an export button", () => {
    renderExportBtn(qc);
    expect(screen.getByTestId("export-deck-btn")).toBeInTheDocument();
    expect(screen.getByText(/export/i)).toBeInTheDocument();
  });

  it("calls exportDeckJson with deckId when clicked and triggers a download", async () => {
    mockExport.mockResolvedValue({ data: EXPORT_PAYLOAD, status: 200 } as never);

    const user = userEvent.setup();
    renderExportBtn(qc);

    // Mock the anchor click
    const clickSpy = vi.fn();
    const mockAnchor = { href: "", download: "", click: clickSpy, remove: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockImplementationOnce((tag: string) => {
      if (tag === "a") return mockAnchor;
      return document.createElement(tag);
    });

    await user.click(screen.getByTestId("export-deck-btn"));

    await waitFor(() => {
      expect(mockExport).toHaveBeenCalledWith(DECK_ID);
    });

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  it("shows loading state while exporting", async () => {
    // Never resolve — keeps in pending state
    mockExport.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup();
    renderExportBtn(qc);

    await user.click(screen.getByTestId("export-deck-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("export-deck-btn")).toBeDisabled();
    });
  });
});
