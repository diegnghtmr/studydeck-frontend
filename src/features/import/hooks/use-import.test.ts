import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";

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
  },
}));

import { importExportApi } from "@shared/api/client";
import type {
  FlashcardImportV1Model,
  ImportValidationResponseModel,
  ImportPreviewModel,
  ImportResultModel,
} from "@shared/api/types";
import {
  useValidateImport,
  usePreviewImport,
  useExecuteImport,
  useExportDeck,
} from "./use-import";

const mockValidate = vi.mocked(importExportApi.validateFlashcardImport);
const mockPreview = vi.mocked(importExportApi.previewFlashcardImport);
const mockImport = vi.mocked(importExportApi.importFlashcards);
const mockExport = vi.mocked(importExportApi.exportDeckJson);

// ---- Helpers ----------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children);
  };
}

// ---- Sample data ------------------------------------------------------------

const SAMPLE_PAYLOAD: FlashcardImportV1Model = {
  schemaVersion: "1.0",
  deck: { title: "Test Deck" },
  notes: [
    { noteType: "basic", front: "What is 2+2?", back: "4" },
  ],
};

const SAMPLE_VALIDATION_RESPONSE: ImportValidationResponseModel = {
  valid: true,
  errors: [],
  warnings: [],
};

const SAMPLE_PREVIEW: ImportPreviewModel = {
  valid: true,
  summary: {
    deckTitle: "Test Deck",
    totalNotes: 1,
    predictedCards: 1,
    duplicateCandidates: 0,
  },
  warnings: [],
};

const SAMPLE_IMPORT_RESULT: ImportResultModel = {
  importId: "imp-001",
  deckId: "deck-001",
  importedNotes: 1,
  importedCards: 1,
  warnings: [],
};

const DECK_ID = "deck-001";

// ---- Tests ------------------------------------------------------------------

describe("useValidateImport", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQueryClient();
    vi.clearAllMocks();
  });

  it("calls validateFlashcardImport with the payload and returns validation response", async () => {
    mockValidate.mockResolvedValue({
      data: SAMPLE_VALIDATION_RESPONSE,
      status: 200,
    } as never);

    const { result } = renderHook(() => useValidateImport(), {
      wrapper: wrapper(qc),
    });

    act(() => {
      result.current.mutate(SAMPLE_PAYLOAD);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockValidate).toHaveBeenCalledWith(expect.objectContaining({
      schemaVersion: "1.0",
    }));
    expect(result.current.data).toEqual(SAMPLE_VALIDATION_RESPONSE);
  });

  it("exposes isError when the API rejects", async () => {
    mockValidate.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useValidateImport(), {
      wrapper: wrapper(qc),
    });

    act(() => {
      result.current.mutate(SAMPLE_PAYLOAD);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isError).toBe(true);
  });
});

describe("usePreviewImport", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQueryClient();
    vi.clearAllMocks();
  });

  it("calls previewFlashcardImport and returns preview data", async () => {
    mockPreview.mockResolvedValue({
      data: SAMPLE_PREVIEW,
      status: 200,
    } as never);

    const { result } = renderHook(() => usePreviewImport(), {
      wrapper: wrapper(qc),
    });

    act(() => {
      result.current.mutate(SAMPLE_PAYLOAD);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPreview).toHaveBeenCalledWith(expect.objectContaining({
      schemaVersion: "1.0",
    }));
    expect(result.current.data).toEqual(SAMPLE_PREVIEW);
  });
});

describe("useExecuteImport", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQueryClient();
    vi.clearAllMocks();
  });

  it("calls importFlashcards and returns ImportResult", async () => {
    mockImport.mockResolvedValue({
      data: SAMPLE_IMPORT_RESULT,
      status: 201,
    } as never);

    const { result } = renderHook(() => useExecuteImport(), {
      wrapper: wrapper(qc),
    });

    act(() => {
      result.current.mutate(SAMPLE_PAYLOAD);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockImport).toHaveBeenCalledWith(expect.objectContaining({
      schemaVersion: "1.0",
    }));
    expect(result.current.data?.importedNotes).toBe(1);
  });

  it("invalidates notes, cards, and decks queries after successful import", async () => {
    mockImport.mockResolvedValue({
      data: SAMPLE_IMPORT_RESULT,
      status: 201,
    } as never);

    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useExecuteImport(), {
      wrapper: wrapper(qc),
    });

    act(() => {
      result.current.mutate(SAMPLE_PAYLOAD);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });
});

describe("useExportDeck", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQueryClient();
    vi.clearAllMocks();
  });

  it("calls exportDeckJson with the deckId", async () => {
    mockExport.mockResolvedValue({
      data: SAMPLE_PAYLOAD,
      status: 200,
    } as never);

    const { result } = renderHook(() => useExportDeck(), {
      wrapper: wrapper(qc),
    });

    act(() => {
      result.current.mutate(DECK_ID);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockExport).toHaveBeenCalledWith(DECK_ID);
    expect(result.current.data?.deck.title).toBe("Test Deck");
  });
});
