import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";

// Mock the API client
vi.mock("@shared/api/client", () => ({
  cardsApi: {
    getDueCards: vi.fn(),
  },
  reviewsApi: {
    createReviewSession: vi.fn(),
    getNextReviewCard: vi.fn(),
    submitReview: vi.fn(),
    listReviewHistory: vi.fn(),
  },
  decksApi: {
    getDeckStats: vi.fn(),
  },
}));

import { cardsApi, reviewsApi, decksApi } from "@shared/api/client";
import type {
  ReviewSessionModel,
  NextReviewCardModel,
  FSRSReviewResultModel,
  DeckStatsModel,
  CardModel,
} from "@shared/api/types";
import {
  useDueCards,
  useStartSession,
  useNextCard,
  useSubmitReview,
  useReviewHistory,
  useDeckStats,
} from "./use-review";

const mockGetDueCards = vi.mocked(cardsApi.getDueCards);
const mockCreateReviewSession = vi.mocked(reviewsApi.createReviewSession);
const mockGetNextReviewCard = vi.mocked(reviewsApi.getNextReviewCard);
const mockSubmitReview = vi.mocked(reviewsApi.submitReview);
const mockListReviewHistory = vi.mocked(reviewsApi.listReviewHistory);
const mockGetDeckStats = vi.mocked(decksApi.getDeckStats);

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
  reviewedAt: "2024-01-01T00:00:00Z",
  previousState: { dueAt: "2024-01-01T00:00:00Z", scheduledDays: 1 },
  nextState: { dueAt: "2024-01-09T00:00:00Z", scheduledDays: 8 },
};

const SAMPLE_DECK_STATS: DeckStatsModel = {
  deckId: DECK_ID,
  totalNotes: 10,
  totalCards: 20,
  dueToday: 5,
  reviewedToday: 3,
  suspendedCards: 1,
  averageRetention30d: 0.88,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useDueCards", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches due cards for a deckId", async () => {
    mockGetDueCards.mockResolvedValue({
      data: { items: [SAMPLE_CARD] },
    } as never);

    const { result } = renderHook(() => useDueCards(DECK_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].id).toBe(CARD_ID);
  });

  it("is disabled when no deckId", () => {
    const { result } = renderHook(() => useDueCards(""), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useStartSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts a review session and returns session data", async () => {
    mockCreateReviewSession.mockResolvedValue({
      data: SAMPLE_SESSION,
    } as never);

    const { result } = renderHook(() => useStartSession(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const session = await result.current.mutateAsync({ deckId: DECK_ID });
      expect(session.id).toBe(SESSION_ID);
      expect(session.status).toBe("started");
    });

    expect(mockCreateReviewSession).toHaveBeenCalledWith({
      deckId: DECK_ID,
    });
  });
});

describe("useNextCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches the next card in a session", async () => {
    mockGetNextReviewCard.mockResolvedValue({
      data: SAMPLE_NEXT_CARD,
      status: 200,
    } as never);

    const { result } = renderHook(() => useNextCard(SESSION_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.card?.id).toBe(CARD_ID);
    expect(result.current.data?.sessionDone).toBe(false);
  });

  it("returns sessionDone=true when API returns 204", async () => {
    mockGetNextReviewCard.mockResolvedValue({
      data: undefined,
      status: 204,
    } as never);

    const { result } = renderHook(() => useNextCard(SESSION_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.sessionDone).toBe(true);
  });

  it("is disabled when no sessionId", () => {
    const { result } = renderHook(() => useNextCard(""), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useSubmitReview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits a review rating and returns FSRS result", async () => {
    mockSubmitReview.mockResolvedValue({
      data: SAMPLE_REVIEW_RESULT,
    } as never);

    const { result } = renderHook(() => useSubmitReview(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const res = await result.current.mutateAsync({
        cardId: CARD_ID,
        sessionId: SESSION_ID,
        rating: "good",
      });
      expect(res.cardId).toBe(CARD_ID);
      expect(res.nextState.scheduledDays).toBe(8);
    });
  });
});

describe("useReviewHistory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches paginated review history", async () => {
    mockListReviewHistory.mockResolvedValue({
      data: {
        items: [
          {
            id: "log-001",
            cardId: CARD_ID,
            rating: "good",
            reviewedAt: "2024-01-01T00:00:00Z",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        ],
        page: { page: 0, size: 20, totalElements: 1, totalPages: 1 },
      },
    } as never);

    const { result } = renderHook(() => useReviewHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
  });
});

describe("useDeckStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches deck stats for a given deckId", async () => {
    mockGetDeckStats.mockResolvedValue({
      data: SAMPLE_DECK_STATS,
    } as never);

    const { result } = renderHook(() => useDeckStats(DECK_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.dueToday).toBe(5);
    expect(result.current.data?.totalCards).toBe(20);
  });

  it("is disabled when no deckId", () => {
    const { result } = renderHook(() => useDeckStats(""), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
