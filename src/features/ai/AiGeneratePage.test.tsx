import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
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
  decksApi: {
    listDecks: vi.fn(),
    getDeck: vi.fn(),
  },
  importExportApi: {
    validateFlashcardImport: vi.fn(),
    previewFlashcardImport: vi.fn(),
    importFlashcards: vi.fn(),
    exportDeckJson: vi.fn(),
  },
}));

import { aiApi, decksApi } from "@shared/api/client";
import { AiGeneratePage } from "./AiGeneratePage";
import type { GenerateFlashcardsResponseModel } from "@shared/api/types";

const mockGenerateFlashcards = vi.mocked(aiApi.generateFlashcards);
const mockListDecks = vi.mocked(decksApi.listDecks);

// ---- Sample data ------------------------------------------------------------

const GENERATE_RESPONSE: GenerateFlashcardsResponseModel = {
  generated: [
    {
      noteType: "basic",
      content: { front: "What is photosynthesis?", back: "Converting sunlight to energy." },
      rationale: "Core concept",
    },
    {
      noteType: "basic",
      content: { front: "What is respiration?", back: "Breaking down glucose for energy." },
    },
  ],
  warnings: [],
};

// ---- Test helpers -----------------------------------------------------------

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  // Default decks mock — empty list for basic rendering
  mockListDecks.mockResolvedValue({
    data: { items: [], page: { totalElements: 0 } },
  } as never);

  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, null, createElement(AiGeneratePage))
    )
  );
}

// ---- Tests ------------------------------------------------------------------

describe("AiGeneratePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the AI generate page", () => {
    renderPage();
    expect(screen.getByTestId("ai-generate-page")).toBeInTheDocument();
  });

  it("shows a text source input option", () => {
    renderPage();
    expect(screen.getByTestId("source-text-tab")).toBeInTheDocument();
  });

  it("generates flashcard proposals from text input", async () => {
    mockGenerateFlashcards.mockResolvedValueOnce({ data: GENERATE_RESPONSE } as never);
    renderPage();

    // Input text content
    fireEvent.change(screen.getByTestId("generate-text-input"), {
      target: { value: "Photosynthesis is the process of converting sunlight to energy." },
    });

    // Submit
    fireEvent.click(screen.getByTestId("generate-submit-btn"));

    await waitFor(() => {
      expect(mockGenerateFlashcards).toHaveBeenCalledOnce();
      expect(screen.getByTestId("proposed-cards")).toBeInTheDocument();
    });
  });

  it("shows proposed cards in review/approve UI", async () => {
    mockGenerateFlashcards.mockResolvedValueOnce({ data: GENERATE_RESPONSE } as never);
    renderPage();

    fireEvent.change(screen.getByTestId("generate-text-input"), {
      target: { value: "Cell biology content here" },
    });
    fireEvent.click(screen.getByTestId("generate-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("proposed-cards")).toBeInTheDocument();
      expect(screen.getByText(/What is photosynthesis/i)).toBeInTheDocument();
      expect(screen.getByText(/What is respiration/i)).toBeInTheDocument();
    });
  });

  it("shows approve button to proceed with import", async () => {
    mockGenerateFlashcards.mockResolvedValueOnce({ data: GENERATE_RESPONSE } as never);
    renderPage();

    fireEvent.change(screen.getByTestId("generate-text-input"), {
      target: { value: "Cell biology notes" },
    });
    fireEvent.click(screen.getByTestId("generate-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("approve-all-btn")).toBeInTheDocument();
    });
  });

  it("allows dismissing individual proposed cards", async () => {
    mockGenerateFlashcards.mockResolvedValueOnce({ data: GENERATE_RESPONSE } as never);
    renderPage();

    fireEvent.change(screen.getByTestId("generate-text-input"), {
      target: { value: "Cell biology notes" },
    });
    fireEvent.click(screen.getByTestId("generate-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("proposed-cards")).toBeInTheDocument();
    });

    // Dismiss the first card
    const dismissBtns = screen.getAllByTestId(/dismiss-card-/);
    expect(dismissBtns.length).toBeGreaterThan(0);
    fireEvent.click(dismissBtns[0]);

    // After dismiss, one card should be removed
    await waitFor(() => {
      const remaining = screen.getAllByTestId(/propose-card-/);
      expect(remaining.length).toBe(1);
    });
  });

  it("disables generate button when no text content", () => {
    renderPage();
    expect(screen.getByTestId("generate-submit-btn")).toBeDisabled();
  });

  // ---- New tests for redesigned structure ------------------------------------

  it("renders AI badge pill with star and text", () => {
    renderPage();
    expect(screen.getByText(/AI-assisted/i)).toBeInTheDocument();
  });

  it("renders H1 with Fraunces title", () => {
    renderPage();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Generate flashcards");
  });

  it("example topic chips fill the textarea", () => {
    renderPage();
    const chip = screen.getByText("The Krebs cycle");
    fireEvent.click(chip);
    const textarea = screen.getByTestId("generate-text-input") as HTMLTextAreaElement;
    expect(textarea.value).toBe("The Krebs cycle");
  });

  it("accepting a card marks it visually", async () => {
    mockGenerateFlashcards.mockResolvedValueOnce({ data: GENERATE_RESPONSE } as never);
    renderPage();

    fireEvent.change(screen.getByTestId("generate-text-input"), {
      target: { value: "Cell biology notes" },
    });
    fireEvent.click(screen.getByTestId("generate-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("proposed-cards")).toBeInTheDocument();
    });

    // Click the accept button on the first card
    const acceptBtns = screen.getAllByRole("button", { name: /accept card/i });
    expect(acceptBtns.length).toBeGreaterThan(0);
    fireEvent.click(acceptBtns[0]);

    // The first card wrapper should now have the outline style
    await waitFor(() => {
      const cardWrapper = screen.getByTestId("propose-card-0");
      expect(cardWrapper).toHaveStyle({ outline: "2px solid #00ca48" });
    });
  });

  it("accepting then dismissing a card clears accept state and removes the card", async () => {
    mockGenerateFlashcards.mockResolvedValueOnce({ data: GENERATE_RESPONSE } as never);
    renderPage();

    fireEvent.change(screen.getByTestId("generate-text-input"), {
      target: { value: "Cell biology notes" },
    });
    fireEvent.click(screen.getByTestId("generate-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("proposed-cards")).toBeInTheDocument();
    });

    // Accept the first card
    const acceptBtns = screen.getAllByRole("button", { name: /accept card/i });
    fireEvent.click(acceptBtns[0]);

    // Now dismiss it
    const dismissBtns = screen.getAllByTestId(/dismiss-card-/);
    fireEvent.click(dismissBtns[0]);

    // Only 1 card should remain
    await waitFor(() => {
      const remaining = screen.getAllByTestId(/propose-card-/);
      expect(remaining.length).toBe(1);
    });
  });
});
