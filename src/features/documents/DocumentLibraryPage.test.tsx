import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
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
import { DocumentLibraryPage } from "./DocumentLibraryPage";
import type { DocumentModel, PagedDocumentModel, IngestJobModel } from "@shared/api/types";

const mockListDocuments = vi.mocked(documentsApi.listDocuments);
const mockCreateDocument = vi.mocked(documentsApi.createDocument);
const mockIngestDocument = vi.mocked(ragApi.ingestDocument);

// ---- Sample data ------------------------------------------------------------

const SAMPLE_DOCUMENT: DocumentModel = {
  id: "doc-1",
  title: "Biology Notes",
  sourceType: "pasted-text",
  ingestStatus: "completed",
  chunkCount: 5,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const PAGED_EMPTY: PagedDocumentModel = {
  items: [],
  page: { page: 0, size: 20, totalElements: 0, totalPages: 0 },
};

const PAGED_WITH_DOC: PagedDocumentModel = {
  items: [SAMPLE_DOCUMENT],
  page: { page: 0, size: 20, totalElements: 1, totalPages: 1 },
};

const INGEST_JOB: IngestJobModel = {
  jobId: "job-1",
  documentId: "doc-1",
  status: "pending",
};

// ---- Test helpers -----------------------------------------------------------

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    createElement(QueryClientProvider, { client: queryClient },
      createElement(MemoryRouter, null,
        createElement(DocumentLibraryPage)
      )
    )
  );
}

// ---- Tests ------------------------------------------------------------------

describe("DocumentLibraryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page title", async () => {
    mockListDocuments.mockResolvedValueOnce({ data: PAGED_EMPTY } as never);
    renderPage();
    expect(screen.getByTestId("document-library")).toBeInTheDocument();
    expect(screen.getByText(/document library/i)).toBeInTheDocument();
  });

  it("shows empty state when no documents", async () => {
    mockListDocuments.mockResolvedValueOnce({ data: PAGED_EMPTY } as never);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
  });

  it("renders document list when documents exist", async () => {
    mockListDocuments.mockResolvedValueOnce({ data: PAGED_WITH_DOC } as never);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("document-list")).toBeInTheDocument();
      expect(screen.getByText("Biology Notes")).toBeInTheDocument();
    });
  });

  it("shows loading state", async () => {
    mockListDocuments.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: PAGED_EMPTY } as never), 200))
    );
    renderPage();
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });

  it("shows document ingest status badge", async () => {
    mockListDocuments.mockResolvedValueOnce({ data: PAGED_WITH_DOC } as never);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("ingest-status-doc-1")).toBeInTheDocument();
    });
  });

  it("allows creating a document via paste text form", async () => {
    mockListDocuments.mockResolvedValue({ data: PAGED_EMPTY } as never);
    mockCreateDocument.mockResolvedValueOnce({ data: SAMPLE_DOCUMENT } as never);
    mockIngestDocument.mockResolvedValueOnce({ data: INGEST_JOB } as never);

    renderPage();

    // Open create form
    const addBtn = await screen.findByTestId("add-document-btn");
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByTestId("create-document-form")).toBeInTheDocument();
    });

    // Fill in title and content
    fireEvent.change(screen.getByTestId("doc-title-input"), {
      target: { value: "New Doc" },
    });
    fireEvent.change(screen.getByTestId("doc-text-input"), {
      target: { value: "Some text content" },
    });

    // Submit
    fireEvent.click(screen.getByTestId("create-doc-submit"));

    await waitFor(() => {
      expect(mockCreateDocument).toHaveBeenCalledOnce();
    });
  });
});
