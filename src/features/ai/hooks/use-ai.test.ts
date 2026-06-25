import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

// --- Mocks -------------------------------------------------------------------

vi.mock("@shared/api/client", () => ({
  aiApi: {
    generateFlashcards: vi.fn(),
    improveFlashcard: vi.fn(),
  },
  ragApi: {
    ragChat: vi.fn(),
    ragSearch: vi.fn(),
  },
}));

import { aiApi, ragApi } from "@shared/api/client";
import {
  useGenerateFlashcards,
  useImproveFlashcard,
  useRagChat,
} from "./use-ai";
import type {
  GenerateFlashcardsResponseModel,
  ImproveFlashcardResponseModel,
  RagChatResponseModel,
} from "@shared/api/types";

const mockGenerate = vi.mocked(aiApi.generateFlashcards);
const mockImprove = vi.mocked(aiApi.improveFlashcard);
const mockRagChat = vi.mocked(ragApi.ragChat);

// ---- Sample data ------------------------------------------------------------

const GENERATE_RESPONSE: GenerateFlashcardsResponseModel = {
  generated: [
    {
      noteType: "basic",
      content: { front: "Q1", back: "A1" },
      rationale: "Key concept",
    },
    {
      noteType: "basic",
      content: { front: "Q2", back: "A2" },
    },
  ],
  warnings: [],
};

const IMPROVE_RESPONSE: ImproveFlashcardResponseModel = {
  noteType: "basic",
  content: { front: "Improved Q", back: "Improved A" },
  explanation: "Made it clearer",
};

const RAG_CHAT_RESPONSE: RagChatResponseModel = {
  answer: "The mitochondria is the powerhouse of the cell.",
  citations: [
    {
      chunkId: "chunk-1",
      documentId: "doc-1",
      score: 0.95,
      content: "Source chunk text",
    },
  ],
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

describe("useGenerateFlashcards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls generateFlashcards and returns proposed drafts", async () => {
    mockGenerate.mockResolvedValueOnce({ data: GENERATE_RESPONSE } as never);

    const { result } = renderHook(() => useGenerateFlashcards(), { wrapper: makeWrapper() });

    const response = await result.current.mutateAsync({
      source: { type: "text", content: "Cell biology notes" },
    });

    expect(mockGenerate).toHaveBeenCalledOnce();
    expect(response.generated).toHaveLength(2);
    expect(response.generated[0].noteType).toBe("basic");
  });

  it("does NOT include providerOverride in the request body", async () => {
    mockGenerate.mockResolvedValueOnce({ data: GENERATE_RESPONSE } as never);

    const { result } = renderHook(() => useGenerateFlashcards(), { wrapper: makeWrapper() });

    await result.current.mutateAsync({
      source: { type: "text", content: "Cell biology notes" },
    });

    expect(mockGenerate).toHaveBeenCalledOnce();
    const calledWith = mockGenerate.mock.calls[0]![0] as unknown as Record<string, unknown>;
    expect(calledWith).not.toHaveProperty("providerOverride");
  });
});

describe("useImproveFlashcard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls improveFlashcard and returns improved content", async () => {
    mockImprove.mockResolvedValueOnce({ data: IMPROVE_RESPONSE } as never);

    const { result } = renderHook(() => useImproveFlashcard(), { wrapper: makeWrapper() });

    const response = await result.current.mutateAsync({
      noteType: "basic" as never,
      content: { front: "Q", back: "A" } as never,
      objective: "clarity" as never,
    });

    expect(mockImprove).toHaveBeenCalledOnce();
    expect(response.explanation).toBe("Made it clearer");
  });

  it("does NOT include providerOverride in the request body", async () => {
    mockImprove.mockResolvedValueOnce({ data: IMPROVE_RESPONSE } as never);

    const { result } = renderHook(() => useImproveFlashcard(), { wrapper: makeWrapper() });

    await result.current.mutateAsync({
      noteType: "basic" as never,
      content: { front: "Q", back: "A" } as never,
      objective: "clarity" as never,
    });

    expect(mockImprove).toHaveBeenCalledOnce();
    const calledWith = mockImprove.mock.calls[0]![0] as unknown as Record<string, unknown>;
    expect(calledWith).not.toHaveProperty("providerOverride");
  });
});

describe("useRagChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls ragChat and returns answer with citations", async () => {
    mockRagChat.mockResolvedValueOnce({ data: RAG_CHAT_RESPONSE } as never);

    const { result } = renderHook(() => useRagChat(), { wrapper: makeWrapper() });

    const response = await result.current.mutateAsync({
      message: "What is mitochondria?",
    });

    expect(mockRagChat).toHaveBeenCalledOnce();
    expect(response.answer).toContain("mitochondria");
    expect(response.citations).toHaveLength(1);
    expect(response.citations[0].chunkId).toBe("chunk-1");
  });

  it("propagates errors for 503 AI provider not configured", async () => {
    const error = Object.assign(new Error("Service Unavailable"), {
      response: {
        status: 503,
        data: {
          type: "about:blank",
          title: "AI provider not configured",
          status: 503,
          detail: "No AI provider is configured for this instance.",
        },
      },
    });
    mockRagChat.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useRagChat(), { wrapper: makeWrapper() });

    await expect(result.current.mutateAsync({ message: "Hello?" })).rejects.toThrow();
    expect(result.current.error).toBeDefined();
  });

  it("does NOT include providerOverride in the request body", async () => {
    mockRagChat.mockResolvedValueOnce({ data: RAG_CHAT_RESPONSE } as never);

    const { result } = renderHook(() => useRagChat(), { wrapper: makeWrapper() });

    await result.current.mutateAsync({ message: "What is mitochondria?" });

    expect(mockRagChat).toHaveBeenCalledOnce();
    const calledWith = mockRagChat.mock.calls[0]![0] as unknown as Record<string, unknown>;
    expect(calledWith).not.toHaveProperty("providerOverride");
  });
});
