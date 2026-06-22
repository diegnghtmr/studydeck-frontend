import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

// --- Mocks -------------------------------------------------------------------

vi.mock("@shared/api/client", () => ({
  ragApi: {
    ragChat: vi.fn(),
    ragSearch: vi.fn(),
  },
  aiApi: {
    generateFlashcards: vi.fn(),
    improveFlashcard: vi.fn(),
  },
  documentsApi: {
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    createDocument: vi.fn(),
    deleteDocument: vi.fn(),
    listDocumentChunks: vi.fn(),
  },
}));

import { ragApi, documentsApi } from "@shared/api/client";
import { RagChatPage } from "./RagChatPage";
import type { RagChatResponseModel, PagedDocumentModel } from "@shared/api/types";

const mockRagChat = vi.mocked(ragApi.ragChat);
const mockListDocuments = vi.mocked(documentsApi.listDocuments);

// ---- Sample data ------------------------------------------------------------

const PAGED_DOCUMENTS: PagedDocumentModel = {
  items: [],
  page: { page: 0, size: 1, totalElements: 7, totalPages: 7 },
};

const RAG_RESPONSE: RagChatResponseModel = {
  answer: "The mitochondria is the powerhouse of the cell.",
  citations: [
    {
      chunkId: "chunk-1",
      documentId: "doc-1",
      score: 0.95,
      content: "Mitochondria generate energy for the cell.",
    },
  ],
};

const RAG_RESPONSE_NO_CITATIONS: RagChatResponseModel = {
  answer: "I don't have specific information about that.",
  citations: [],
};

// ---- Test helpers -----------------------------------------------------------

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, null, createElement(RagChatPage))
    )
  );
}

// ---- Tests ------------------------------------------------------------------

describe("RagChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: resolve documents so the badge renders without breaking tests.
    mockListDocuments.mockResolvedValue({ data: PAGED_DOCUMENTS } as never);
  });

  it("renders the chat page with input", () => {
    renderPage();
    expect(screen.getByTestId("rag-chat-page")).toBeInTheDocument();
    expect(screen.getByTestId("chat-input")).toBeInTheDocument();
  });

  it("shows the header with title and subtitle", () => {
    renderPage();
    expect(screen.getByText("Ask your notes")).toBeInTheDocument();
    expect(screen.getByText("Answers grounded in your documents")).toBeInTheDocument();
  });

  it("shows the documents indexed badge", async () => {
    renderPage();
    expect(screen.getByTestId("documents-indexed-badge")).toBeInTheDocument();
    // Once the query resolves, show the real count.
    await waitFor(() => {
      expect(screen.getByText("7 documents indexed")).toBeInTheDocument();
    });
  });

  it("shows 'Documents' label in badge when count is unavailable", async () => {
    mockListDocuments.mockRejectedValueOnce(new Error("network error"));
    renderPage();
    // Immediately before resolution the badge still renders.
    expect(screen.getByTestId("documents-indexed-badge")).toBeInTheDocument();
  });

  it("shows empty state with instructions on first load", () => {
    renderPage();
    expect(screen.getByTestId("chat-empty-state")).toBeInTheDocument();
  });

  it("sends a message and renders AI answer", async () => {
    mockRagChat.mockResolvedValueOnce({ data: RAG_RESPONSE } as never);
    renderPage();

    fireEvent.change(screen.getByTestId("chat-input"), {
      target: { value: "What is mitochondria?" },
    });
    fireEvent.click(screen.getByTestId("chat-send-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("chat-answer")).toBeInTheDocument();
      expect(
        screen.getByText("The mitochondria is the powerhouse of the cell.")
      ).toBeInTheDocument();
    });
  });

  it("renders the user message bubble", async () => {
    mockRagChat.mockResolvedValueOnce({ data: RAG_RESPONSE } as never);
    renderPage();

    fireEvent.change(screen.getByTestId("chat-input"), {
      target: { value: "What is mitochondria?" },
    });
    fireEvent.click(screen.getByTestId("chat-send-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("chat-user-message")).toBeInTheDocument();
      expect(screen.getByText("What is mitochondria?")).toBeInTheDocument();
    });
  });

  it("renders source citation chips when response includes sources", async () => {
    mockRagChat.mockResolvedValueOnce({ data: RAG_RESPONSE } as never);
    renderPage();

    fireEvent.change(screen.getByTestId("chat-input"), {
      target: { value: "Tell me about mitochondria" },
    });
    fireEvent.click(screen.getByTestId("chat-send-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("citations-list")).toBeInTheDocument();
      // The citation content is truncated to 40 chars in the chip label.
      expect(screen.getByText(/Mitochondria generate energy/i)).toBeInTheDocument();
    });
  });

  it("does not render citations section when response has no citations", async () => {
    mockRagChat.mockResolvedValueOnce({ data: RAG_RESPONSE_NO_CITATIONS } as never);
    renderPage();

    fireEvent.change(screen.getByTestId("chat-input"), {
      target: { value: "Something unknown" },
    });
    fireEvent.click(screen.getByTestId("chat-send-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("chat-answer")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("citations-list")).not.toBeInTheDocument();
  });

  it("shows ProblemBanner on 503 AI provider not configured", async () => {
    const error = Object.assign(new Error("Service Unavailable"), {
      response: {
        status: 503,
        data: {
          type: "about:blank",
          title: "AI provider not configured",
          status: 503,
          detail: "No AI provider is configured.",
        },
      },
    });
    mockRagChat.mockRejectedValueOnce(error);
    renderPage();

    fireEvent.change(screen.getByTestId("chat-input"), {
      target: { value: "Hello?" },
    });
    fireEvent.click(screen.getByTestId("chat-send-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("problem-banner")).toBeInTheDocument();
      expect(screen.getByText(/AI provider not configured/i)).toBeInTheDocument();
    });
  });

  it("disables send button when input is empty", () => {
    renderPage();
    const sendBtn = screen.getByTestId("chat-send-btn");
    expect(sendBtn).toBeDisabled();
  });

  it("clears input after sending", async () => {
    mockRagChat.mockResolvedValueOnce({ data: RAG_RESPONSE } as never);
    renderPage();

    const input = screen.getByTestId("chat-input");
    fireEvent.change(input, { target: { value: "test question" } });
    fireEvent.click(screen.getByTestId("chat-send-btn"));

    await waitFor(() => {
      expect((input as HTMLTextAreaElement).value).toBe("");
    });
  });
});
