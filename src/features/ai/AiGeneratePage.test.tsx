import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ImproveFlashcardResponseModel } from "@shared/api/types";

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
const mockImproveFlashcard = vi.mocked(aiApi.improveFlashcard);
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

  it("shows the source input with an inline document attach option", () => {
    renderPage();
    // No more tabs — the textarea is always visible with an inline "Attach document" control.
    expect(screen.getByTestId("generate-text-input")).toBeInTheDocument();
    expect(screen.getByTestId("generate-attach-input")).toBeInTheDocument();
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
      expect(cardWrapper).toHaveStyle({ boxShadow: "#00ca48 0 0 0 2px inset" });
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

  // ---- Edit panel tests -------------------------------------------------------

  it("pencil button opens the inline edit panel for that card", async () => {
    mockGenerateFlashcards.mockResolvedValueOnce({ data: GENERATE_RESPONSE } as never);
    renderPage();

    fireEvent.change(screen.getByTestId("generate-text-input"), {
      target: { value: "Cell biology notes" },
    });
    fireEvent.click(screen.getByTestId("generate-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("proposed-cards")).toBeInTheDocument();
    });

    // Edit panel is not visible yet
    expect(screen.queryByTestId("card-front-input-0")).not.toBeInTheDocument();

    // Click the edit (pencil) button on card 0
    fireEvent.click(screen.getByTestId("edit-card-0"));

    // Edit panel is now visible
    expect(screen.getByTestId("card-front-input-0")).toBeInTheDocument();
    expect(screen.getByTestId("card-back-input-0")).toBeInTheDocument();
  });

  it("edit panel is prefilled with the current front/back content", async () => {
    mockGenerateFlashcards.mockResolvedValueOnce({ data: GENERATE_RESPONSE } as never);
    renderPage();

    fireEvent.change(screen.getByTestId("generate-text-input"), {
      target: { value: "Cell biology notes" },
    });
    fireEvent.click(screen.getByTestId("generate-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("proposed-cards")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("edit-card-0"));

    const frontInput = screen.getByTestId("card-front-input-0") as HTMLTextAreaElement;
    const backInput = screen.getByTestId("card-back-input-0") as HTMLTextAreaElement;

    expect(frontInput.value).toBe("What is photosynthesis?");
    expect(backInput.value).toBe("Converting sunlight to energy.");
  });

  it("cancel button closes the edit panel without saving changes", async () => {
    mockGenerateFlashcards.mockResolvedValueOnce({ data: GENERATE_RESPONSE } as never);
    renderPage();

    fireEvent.change(screen.getByTestId("generate-text-input"), {
      target: { value: "Cell biology notes" },
    });
    fireEvent.click(screen.getByTestId("generate-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("proposed-cards")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("edit-card-0"));

    // Change the front text
    fireEvent.change(screen.getByTestId("card-front-input-0"), {
      target: { value: "Modified front text" },
    });

    // Cancel
    fireEvent.click(screen.getByTestId("cancel-card-0"));

    // Panel is closed
    expect(screen.queryByTestId("card-front-input-0")).not.toBeInTheDocument();

    // The card still shows the original text
    expect(screen.getByText("What is photosynthesis?")).toBeInTheDocument();
  });

  it("save button applies edited front/back back to the proposal and closes panel", async () => {
    mockGenerateFlashcards.mockResolvedValueOnce({ data: GENERATE_RESPONSE } as never);
    renderPage();

    fireEvent.change(screen.getByTestId("generate-text-input"), {
      target: { value: "Cell biology notes" },
    });
    fireEvent.click(screen.getByTestId("generate-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("proposed-cards")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("edit-card-0"));

    // Edit both fields
    fireEvent.change(screen.getByTestId("card-front-input-0"), {
      target: { value: "Updated front" },
    });
    fireEvent.change(screen.getByTestId("card-back-input-0"), {
      target: { value: "Updated back" },
    });

    // Save
    fireEvent.click(screen.getByTestId("save-card-0"));

    // Panel closed, updated text is now shown in the card
    await waitFor(() => {
      expect(screen.queryByTestId("card-front-input-0")).not.toBeInTheDocument();
      expect(screen.getByText("Updated front")).toBeInTheDocument();
      expect(screen.getByText("Updated back")).toBeInTheDocument();
    });
  });

  it("clicking improve calls the improve API and updates the textareas with the response", async () => {
    mockGenerateFlashcards.mockResolvedValueOnce({ data: GENERATE_RESPONSE } as never);

    const IMPROVE_RESPONSE: ImproveFlashcardResponseModel = {
      noteType: "basic",
      content: { front: "Improved front", back: "Improved back" },
      explanation: "Made it clearer",
    };
    mockImproveFlashcard.mockResolvedValueOnce({ data: IMPROVE_RESPONSE } as never);

    renderPage();

    fireEvent.change(screen.getByTestId("generate-text-input"), {
      target: { value: "Cell biology notes" },
    });
    fireEvent.click(screen.getByTestId("generate-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("proposed-cards")).toBeInTheDocument();
    });

    // Open edit panel for card 0
    fireEvent.click(screen.getByTestId("edit-card-0"));

    // Click the Improve button
    fireEvent.click(screen.getByTestId("improve-card-0"));

    // Textareas should update with improved content
    await waitFor(() => {
      const frontInput = screen.getByTestId("card-front-input-0") as HTMLTextAreaElement;
      const backInput = screen.getByTestId("card-back-input-0") as HTMLTextAreaElement;
      expect(frontInput.value).toBe("Improved front");
      expect(backInput.value).toBe("Improved back");
    });

    expect(mockImproveFlashcard).toHaveBeenCalledOnce();
  });

  it("objective chips are rendered with the correct enum values", async () => {
    mockGenerateFlashcards.mockResolvedValueOnce({ data: GENERATE_RESPONSE } as never);
    renderPage();

    fireEvent.change(screen.getByTestId("generate-text-input"), {
      target: { value: "Cell biology notes" },
    });
    fireEvent.click(screen.getByTestId("generate-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("proposed-cards")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("edit-card-0"));

    // All 5 objective chips should be present
    expect(screen.getByTestId("improve-objective-clarity")).toBeInTheDocument();
    expect(screen.getByTestId("improve-objective-brevity")).toBeInTheDocument();
    expect(screen.getByTestId("improve-objective-memorability")).toBeInTheDocument();
    expect(screen.getByTestId("improve-objective-distractors")).toBeInTheDocument();
    expect(screen.getByTestId("improve-objective-active-recall")).toBeInTheDocument();
  });

  it("clicking a different card's pencil closes the first panel and opens the second", async () => {
    mockGenerateFlashcards.mockResolvedValueOnce({ data: GENERATE_RESPONSE } as never);
    renderPage();

    fireEvent.change(screen.getByTestId("generate-text-input"), {
      target: { value: "Cell biology notes" },
    });
    fireEvent.click(screen.getByTestId("generate-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("proposed-cards")).toBeInTheDocument();
    });

    // Open card 0
    fireEvent.click(screen.getByTestId("edit-card-0"));
    expect(screen.getByTestId("card-front-input-0")).toBeInTheDocument();

    // Open card 1 — card 0 should close
    fireEvent.click(screen.getByTestId("edit-card-1"));
    expect(screen.queryByTestId("card-front-input-0")).not.toBeInTheDocument();
    expect(screen.getByTestId("card-front-input-1")).toBeInTheDocument();
  });

  it("shows inline error message when improve API fails", async () => {
    mockGenerateFlashcards.mockResolvedValueOnce({ data: GENERATE_RESPONSE } as never);
    mockImproveFlashcard.mockRejectedValueOnce(
      Object.assign(new Error("Service Unavailable"), {
        response: {
          status: 503,
          data: {
            type: "about:blank",
            title: "AI provider not configured",
            status: 503,
          },
        },
      }),
    );

    renderPage();

    fireEvent.change(screen.getByTestId("generate-text-input"), {
      target: { value: "Cell biology notes" },
    });
    fireEvent.click(screen.getByTestId("generate-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("proposed-cards")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("edit-card-0"));
    fireEvent.click(screen.getByTestId("improve-card-0"));

    await waitFor(() => {
      expect(screen.getByText("AI provider not configured")).toBeInTheDocument();
    });
  });
});
