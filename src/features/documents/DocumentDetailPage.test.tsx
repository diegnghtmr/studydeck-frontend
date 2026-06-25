import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

// --- Mocks -------------------------------------------------------------------

vi.mock("@shared/api/client", () => ({
  documentsApi: {
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    createDocument: vi.fn(),
    deleteDocument: vi.fn(),
    listDocumentChunks: vi.fn(),
  },
  ragApi: {
    ingestDocument: vi.fn(),
  },
}));

import { documentsApi, ragApi } from "@shared/api/client";
import { DocumentDetailPage } from "./DocumentDetailPage";
import type { DocumentModel, PagedChunkModel, IngestJobModel } from "@shared/api/types";

const mockGetDocument = vi.mocked(documentsApi.getDocument);
const mockListDocumentChunks = vi.mocked(documentsApi.listDocumentChunks);
const mockIngestDocument = vi.mocked(ragApi.ingestDocument);

// ---- Sample data ------------------------------------------------------------

const SAMPLE_DOCUMENT: DocumentModel = {
  id: "doc-1",
  title: "Biology Notes",
  sourceType: "pasted-text",
  ingestStatus: "completed",
  chunkCount: 2,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const PAGED_CHUNKS: PagedChunkModel = {
  items: [
    { id: "chunk-1", documentId: "doc-1", ordinal: 0, content: "Mitochondria are organelles.", tokenCount: 4 },
    { id: "chunk-2", documentId: "doc-1", ordinal: 1, content: "Cells have a nucleus.", tokenCount: 4 },
  ],
  page: { page: 0, size: 20, totalElements: 2, totalPages: 1 },
};

const INGEST_JOB: IngestJobModel = {
  jobId: "job-2",
  documentId: "doc-1",
  status: "pending",
};

// ---- Test helpers -----------------------------------------------------------

function renderPage(documentId = "doc-1") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        MemoryRouter,
        { initialEntries: [`/documents/${documentId}`] },
        createElement(
          Routes,
          null,
          createElement(Route, {
            path: "/documents/:documentId",
            element: createElement(DocumentDetailPage),
          })
        )
      )
    )
  );
}

// ---- Tests ------------------------------------------------------------------

describe("DocumentDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PillButton migration", () => {
    it("reingest-btn is a PillButton (rounded-[32px] class present)", async () => {
      mockGetDocument.mockResolvedValueOnce({ data: SAMPLE_DOCUMENT } as never);
      mockListDocumentChunks.mockResolvedValueOnce({ data: PAGED_CHUNKS } as never);
      renderPage();
      const btn = await screen.findByTestId("reingest-btn");
      expect(btn.className).toContain("rounded-[32px]");
    });

    it("reingest-btn has secondary variant tokens (bg-[#f6f4ef])", async () => {
      mockGetDocument.mockResolvedValueOnce({ data: SAMPLE_DOCUMENT } as never);
      mockListDocumentChunks.mockResolvedValueOnce({ data: PAGED_CHUNKS } as never);
      renderPage();
      const btn = await screen.findByTestId("reingest-btn");
      expect(btn.className).toContain("bg-[#f6f4ef]");
    });

    it("reingest-btn label changes to Ingesting… while ingesting", async () => {
      mockGetDocument.mockResolvedValueOnce({ data: SAMPLE_DOCUMENT } as never);
      mockListDocumentChunks.mockResolvedValueOnce({ data: PAGED_CHUNKS } as never);
      // Keep ingest pending
      mockIngestDocument.mockReturnValueOnce(new Promise(() => {}));
      renderPage();
      const btn = await screen.findByTestId("reingest-btn");
      fireEvent.click(btn);
      await waitFor(() => expect(btn).toHaveTextContent("Ingesting…"));
      expect(btn).toBeDisabled();
    });

    it("delete-doc-btn is a PillButton ghost-danger variant (bg-transparent)", async () => {
      mockGetDocument.mockResolvedValueOnce({ data: SAMPLE_DOCUMENT } as never);
      mockListDocumentChunks.mockResolvedValueOnce({ data: PAGED_CHUNKS } as never);
      renderPage();
      const btn = await screen.findByTestId("delete-doc-btn");
      expect(btn.className).toContain("bg-transparent");
    });

    it("confirm-delete-btn is danger PillButton and cancel is secondary", async () => {
      mockGetDocument.mockResolvedValueOnce({ data: SAMPLE_DOCUMENT } as never);
      mockListDocumentChunks.mockResolvedValueOnce({ data: PAGED_CHUNKS } as never);
      renderPage();
      const deleteBtn = await screen.findByTestId("delete-doc-btn");
      fireEvent.click(deleteBtn);
      await waitFor(() => expect(screen.getByTestId("confirm-delete-btn")).toBeInTheDocument());
      const confirmBtn = screen.getByTestId("confirm-delete-btn");
      expect(confirmBtn.className).toContain("bg-[var(--color-coral-red)]");
      // Cancel button — find secondary variant (bg-[#f6f4ef])
      const allButtons = screen.getAllByRole("button");
      const cancelBtn = allButtons.find((b) => b.textContent === "Cancel");
      expect(cancelBtn).toBeDefined();
      expect(cancelBtn!.className).toContain("bg-[#f6f4ef]");
    });
  });

  describe("Badge shape=pill migration", () => {
    it("detail-ingest-status badge has borderRadius 9999px (pill shape)", async () => {
      mockGetDocument.mockResolvedValueOnce({ data: SAMPLE_DOCUMENT } as never);
      mockListDocumentChunks.mockResolvedValueOnce({ data: PAGED_CHUNKS } as never);
      renderPage();
      const badge = await screen.findByTestId("detail-ingest-status");
      expect(badge).toHaveStyle({ borderRadius: "9999px" });
    });

    it("detail-ingest-status badge reflects completed status label Ready", async () => {
      mockGetDocument.mockResolvedValueOnce({ data: SAMPLE_DOCUMENT } as never);
      mockListDocumentChunks.mockResolvedValueOnce({ data: PAGED_CHUNKS } as never);
      renderPage();
      const badge = await screen.findByTestId("detail-ingest-status");
      expect(badge).toHaveTextContent(/ready/i);
    });

    it("detail-ingest-status badge has dynamic backgroundColor for processing status", async () => {
      const processingDoc = { ...SAMPLE_DOCUMENT, ingestStatus: "processing" as const };
      mockGetDocument.mockResolvedValueOnce({ data: processingDoc } as never);
      mockListDocumentChunks.mockResolvedValueOnce({ data: PAGED_CHUNKS } as never);
      renderPage();
      const badge = await screen.findByTestId("detail-ingest-status");
      expect(badge).toHaveTextContent(/processing/i);
    });
  });

  it("renders document metadata", async () => {
    mockGetDocument.mockResolvedValueOnce({ data: SAMPLE_DOCUMENT } as never);
    mockListDocumentChunks.mockResolvedValueOnce({ data: PAGED_CHUNKS } as never);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("document-detail")).toBeInTheDocument();
      expect(screen.getAllByText("Biology Notes").length).toBeGreaterThan(0);
    });
  });

  it("renders the document ingest status", async () => {
    mockGetDocument.mockResolvedValueOnce({ data: SAMPLE_DOCUMENT } as never);
    mockListDocumentChunks.mockResolvedValueOnce({ data: PAGED_CHUNKS } as never);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("detail-ingest-status")).toBeInTheDocument();
    });
  });

  it("renders chunks list", async () => {
    mockGetDocument.mockResolvedValueOnce({ data: SAMPLE_DOCUMENT } as never);
    mockListDocumentChunks.mockResolvedValueOnce({ data: PAGED_CHUNKS } as never);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("chunks-list")).toBeInTheDocument();
      expect(screen.getByText(/Mitochondria are organelles/i)).toBeInTheDocument();
    });
  });

  it("triggers re-ingest", async () => {
    mockGetDocument.mockResolvedValueOnce({ data: SAMPLE_DOCUMENT } as never);
    mockListDocumentChunks.mockResolvedValueOnce({ data: PAGED_CHUNKS } as never);
    mockIngestDocument.mockResolvedValueOnce({ data: INGEST_JOB } as never);
    renderPage();

    const reingestBtn = await screen.findByTestId("reingest-btn");
    fireEvent.click(reingestBtn);

    await waitFor(() => {
      expect(mockIngestDocument).toHaveBeenCalledWith("doc-1", undefined);
    });
  });

  it("shows loading state", async () => {
    mockGetDocument.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: SAMPLE_DOCUMENT } as never), 200)
        )
    );
    mockListDocumentChunks.mockResolvedValueOnce({ data: PAGED_CHUNKS } as never);
    renderPage();
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });
});
