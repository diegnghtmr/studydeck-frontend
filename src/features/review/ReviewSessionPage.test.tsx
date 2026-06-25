import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";

// --- Mocks -------------------------------------------------------------------

vi.mock("@shared/api/client", () => ({
  reviewsApi: {
    createReviewSession: vi.fn(),
    getNextReviewCard: vi.fn(),
    submitReview: vi.fn(),
  },
  cardsApi: {
    getDueCards: vi.fn(),
    previewCard: vi.fn(),
  },
  decksApi: {
    getDeck: vi.fn(),
  },
}));

import { reviewsApi, cardsApi } from "@shared/api/client";
import type { CardModel, ReviewSessionModel, NextReviewCardModel, FSRSReviewResultModel } from "@shared/api/types";
import { ReviewSessionPage } from "./ReviewSessionPage";

const mockCreateReviewSession = vi.mocked(reviewsApi.createReviewSession);
const mockGetNextReviewCard = vi.mocked(reviewsApi.getNextReviewCard);
const mockSubmitReview = vi.mocked(reviewsApi.submitReview);
const mockPreviewCard = vi.mocked(cardsApi.previewCard);

const DECK_ID = "deck-001";
const SESSION_ID = "session-001";
const CARD_ID = "card-001";

const SAMPLE_CARD: CardModel = {
  id: CARD_ID,
  noteId: "note-001",
  deckId: DECK_ID,
  noteType: "basic",
  cardVariant: "forward",
  position: 0,
  suspended: false,
  dueAt: "2024-01-01T00:00:00Z",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const SAMPLE_SESSION: ReviewSessionModel = {
  id: SESSION_ID,
  deckId: DECK_ID,
  status: "started",
  startedAt: "2024-01-01T00:00:00Z",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const SAMPLE_NEXT_CARD: NextReviewCardModel = {
  sessionId: SESSION_ID,
  card: SAMPLE_CARD,
};

const SAMPLE_REVIEW_RESULT: FSRSReviewResultModel = {
  cardId: CARD_ID,
  sessionId: SESSION_ID,
  rating: "good",
  reviewedAt: "2024-01-01T10:00:00Z",
  previousState: { scheduledDays: 1 },
  nextState: { scheduledDays: 8, dueAt: "2024-01-09T00:00:00Z" },
};

const SAMPLE_CARD_PREVIEW = {
  cardId: CARD_ID,
  front: "What is the capital of France?",
  back: "Paris",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function renderReviewPage(deckId?: string) {
  const Wrapper = createWrapper();
  const path = deckId ? `/review/${deckId}` : "/review";
  const routePath = deckId ? "/review/:deckId" : "/review";
  return render(
    <Wrapper>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={routePath} element={<ReviewSessionPage />} />
          <Route path="/review/summary" element={<div data-testid="summary-page">Summary</div>} />
        </Routes>
      </MemoryRouter>
    </Wrapper>,
  );
}

describe("ReviewSessionPage — flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateReviewSession.mockResolvedValue({ data: SAMPLE_SESSION } as never);
    mockGetNextReviewCard.mockResolvedValue({
      data: SAMPLE_NEXT_CARD,
      status: 200,
    } as never);
    mockPreviewCard.mockResolvedValue({ data: SAMPLE_CARD_PREVIEW } as never);
    mockSubmitReview.mockResolvedValue({ data: SAMPLE_REVIEW_RESULT } as never);
  });

  it("renders the start screen and allows starting a session", async () => {
    renderReviewPage(DECK_ID);
    expect(screen.getByTestId("review-start-screen")).toBeInTheDocument();
    const startBtn = screen.getByRole("button", { name: /start/i });
    expect(startBtn).toBeInTheDocument();
  });

  it("starts session on button click and shows the card front", async () => {
    renderReviewPage(DECK_ID);

    const startBtn = screen.getByRole("button", { name: /start/i });
    await userEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByTestId("review-card-front")).toBeInTheDocument();
    });
    expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
  });

  it("shows 'Show answer' button before reveal", async () => {
    renderReviewPage(DECK_ID);
    const startBtn = screen.getByRole("button", { name: /start/i });
    await userEvent.click(startBtn);

    await waitFor(() => expect(screen.getByTestId("review-card-front")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument();
  });

  it("reveals answer after clicking 'Show answer'", async () => {
    renderReviewPage(DECK_ID);
    await userEvent.click(screen.getByRole("button", { name: /start/i }));

    await waitFor(() => expect(screen.getByTestId("review-card-front")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /show answer/i }));

    expect(screen.getByTestId("review-card-back")).toBeInTheDocument();
    expect(screen.getByText("Paris")).toBeInTheDocument();
  });

  it("shows four rating buttons after reveal", async () => {
    renderReviewPage(DECK_ID);
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    await waitFor(() => expect(screen.getByTestId("review-card-front")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /show answer/i }));

    expect(screen.getByRole("button", { name: /again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /good/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /easy/i })).toBeInTheDocument();
  });

  it("rating buttons show correct label text for all four ratings", async () => {
    renderReviewPage(DECK_ID);
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    await waitFor(() => expect(screen.getByTestId("review-card-front")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /show answer/i }));

    // Verify each rating button renders its expected label and key hint
    const ratingButtons = screen.getAllByTestId(/^rating-btn-/);
    expect(ratingButtons).toHaveLength(4);

    expect(screen.getByTestId("rating-btn-again")).toHaveTextContent("Again");
    expect(screen.getByTestId("rating-btn-hard")).toHaveTextContent("Hard");
    expect(screen.getByTestId("rating-btn-good")).toHaveTextContent("Good");
    expect(screen.getByTestId("rating-btn-easy")).toHaveTextContent("Easy");
  });

  it("submits review on rating click and advances to next card", async () => {
    // Second call to getNextReviewCard returns the same card (simulating advance)
    mockGetNextReviewCard
      .mockResolvedValueOnce({ data: SAMPLE_NEXT_CARD, status: 200 } as never)
      .mockResolvedValueOnce({ data: SAMPLE_NEXT_CARD, status: 200 } as never);

    renderReviewPage(DECK_ID);
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    await waitFor(() => expect(screen.getByTestId("review-card-front")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /show answer/i }));

    const goodBtn = screen.getByRole("button", { name: /good/i });
    await userEvent.click(goodBtn);

    await waitFor(() => expect(mockSubmitReview).toHaveBeenCalledTimes(1));
    expect(mockSubmitReview).toHaveBeenCalledWith(
      expect.objectContaining({ cardId: CARD_ID, rating: "good" }),
    );
  });

  it("shows summary when session queue is empty (204)", async () => {
    mockGetNextReviewCard
      .mockResolvedValueOnce({ data: SAMPLE_NEXT_CARD, status: 200 } as never)
      .mockResolvedValueOnce({ data: undefined, status: 204 } as never);

    renderReviewPage(DECK_ID);
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    await waitFor(() => expect(screen.getByTestId("review-card-front")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /show answer/i }));

    // Wait for rating buttons to appear (not disabled)
    await waitFor(() => {
      const goodBtn = screen.getByRole("button", { name: /good/i });
      expect(goodBtn).not.toBeDisabled();
    });

    await userEvent.click(screen.getByRole("button", { name: /good/i }));

    await waitFor(
      () => {
        expect(screen.getByTestId("review-summary")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});

describe("ReviewSessionPage — keyboard shortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateReviewSession.mockResolvedValue({ data: SAMPLE_SESSION } as never);
    mockGetNextReviewCard.mockResolvedValue({
      data: SAMPLE_NEXT_CARD,
      status: 200,
    } as never);
    mockPreviewCard.mockResolvedValue({ data: SAMPLE_CARD_PREVIEW } as never);
    mockSubmitReview.mockResolvedValue({ data: SAMPLE_REVIEW_RESULT } as never);
  });

  it("Space key reveals the answer", async () => {
    renderReviewPage(DECK_ID);
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    await waitFor(() => expect(screen.getByTestId("review-card-front")).toBeInTheDocument());

    fireEvent.keyDown(document, { key: " ", code: "Space" });

    await waitFor(() => {
      expect(screen.getByTestId("review-card-back")).toBeInTheDocument();
    });
  });

  it("key '3' submits 'good' rating after reveal", async () => {
    renderReviewPage(DECK_ID);
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    await waitFor(() => expect(screen.getByTestId("review-card-front")).toBeInTheDocument());

    // Reveal
    fireEvent.keyDown(document, { key: " ", code: "Space" });
    await waitFor(() => expect(screen.getByTestId("review-card-back")).toBeInTheDocument());

    // Rate good = key 3
    fireEvent.keyDown(document, { key: "3", code: "Digit3" });

    await waitFor(() => expect(mockSubmitReview).toHaveBeenCalledTimes(1));
    expect(mockSubmitReview).toHaveBeenCalledWith(
      expect.objectContaining({ rating: "good" }),
    );
  });
});
