import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
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
import {
  useDocuments,
  useDocument,
  useCreateDocument,
  useDeleteDocument,
  useIngestDocument,
  useDocumentChunks,
} from "./use-documents";
import type { DocumentModel, PagedDocumentModel, IngestJobModel, PagedChunkModel } from "@shared/api/types";

const mockListDocuments = vi.mocked(documentsApi.listDocuments);
const mockGetDocument = vi.mocked(documentsApi.getDocument);
const mockCreateDocument = vi.mocked(documentsApi.createDocument);
const mockDeleteDocument = vi.mocked(documentsApi.deleteDocument);
const mockListDocumentChunks = vi.mocked(documentsApi.listDocumentChunks);
const mockIngestDocument = vi.mocked(ragApi.ingestDocument);

// ---- Sample data ------------------------------------------------------------

const SAMPLE_DOCUMENT: DocumentModel = {
  id: "doc-1",
  title: "Test Document",
  sourceType: "pasted-text",
  ingestStatus: "completed",
  chunkCount: 5,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const PAGED_DOCUMENTS: PagedDocumentModel = {
  items: [SAMPLE_DOCUMENT],
  page: { page: 0, size: 20, totalElements: 1, totalPages: 1 },
};

const INGEST_JOB: IngestJobModel = {
  jobId: "job-1",
  documentId: "doc-1",
  status: "pending",
};

const PAGED_CHUNKS: PagedChunkModel = {
  items: [
    { id: "chunk-1", documentId: "doc-1", ordinal: 0, content: "Chunk content A" },
    { id: "chunk-2", documentId: "doc-1", ordinal: 1, content: "Chunk content B" },
  ],
  page: { page: 0, size: 20, totalElements: 2, totalPages: 1 },
};

// ---- Test helpers -----------------------------------------------------------

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

// ---- Tests ------------------------------------------------------------------

describe("useDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls listDocuments and returns paged documents", async () => {
    mockListDocuments.mockResolvedValueOnce({ data: PAGED_DOCUMENTS } as never);

    const { result } = renderHook(() => useDocuments(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(PAGED_DOCUMENTS);
    expect(mockListDocuments).toHaveBeenCalledOnce();
  });
});

describe("useDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls getDocument with the provided ID", async () => {
    mockGetDocument.mockResolvedValueOnce({ data: SAMPLE_DOCUMENT } as never);

    const { result } = renderHook(() => useDocument("doc-1"), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(SAMPLE_DOCUMENT);
    expect(mockGetDocument).toHaveBeenCalledWith("doc-1");
  });

  it("does not fetch when no documentId is provided", () => {
    const { result } = renderHook(() => useDocument(""), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGetDocument).not.toHaveBeenCalled();
  });
});

describe("useCreateDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls createDocument and returns the new document", async () => {
    mockCreateDocument.mockResolvedValueOnce({ data: SAMPLE_DOCUMENT } as never);

    const { result } = renderHook(() => useCreateDocument(), { wrapper: makeWrapper() });

    await result.current.mutateAsync({
      title: "Test Document",
      sourceType: "pasted-text",
      textContent: "Hello world",
    });

    expect(mockCreateDocument).toHaveBeenCalledOnce();
  });
});

describe("useDeleteDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls deleteDocument with the document ID", async () => {
    mockDeleteDocument.mockResolvedValueOnce({ data: undefined } as never);

    const { result } = renderHook(() => useDeleteDocument("doc-1"), { wrapper: makeWrapper() });

    await result.current.mutateAsync();
    expect(mockDeleteDocument).toHaveBeenCalledWith("doc-1");
  });
});

describe("useIngestDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls ingestDocument and returns IngestJob", async () => {
    mockIngestDocument.mockResolvedValueOnce({ data: INGEST_JOB } as never);

    const { result } = renderHook(() => useIngestDocument("doc-1"), { wrapper: makeWrapper() });

    const job = await result.current.mutateAsync(undefined);
    expect(mockIngestDocument).toHaveBeenCalledWith("doc-1", undefined);
    expect(job).toEqual(INGEST_JOB);
  });
});

describe("useDocumentChunks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls listDocumentChunks and returns paged chunks", async () => {
    mockListDocumentChunks.mockResolvedValueOnce({ data: PAGED_CHUNKS } as never);

    const { result } = renderHook(() => useDocumentChunks("doc-1"), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(PAGED_CHUNKS);
    expect(mockListDocumentChunks).toHaveBeenCalledWith("doc-1");
  });
});
