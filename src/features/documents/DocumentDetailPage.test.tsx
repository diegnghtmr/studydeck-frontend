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
