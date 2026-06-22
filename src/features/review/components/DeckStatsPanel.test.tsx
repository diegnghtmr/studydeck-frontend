import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";

vi.mock("@shared/api/client", () => ({
  decksApi: {
    getDeckStats: vi.fn(),
  },
}));

import { decksApi } from "@shared/api/client";
import type { DeckStatsModel } from "@shared/api/types";
import { DeckStatsPanel } from "./DeckStatsPanel";

const mockGetDeckStats = vi.mocked(decksApi.getDeckStats);

const DECK_ID = "deck-001";

const SAMPLE_STATS: DeckStatsModel = {
  deckId: DECK_ID,
  totalNotes: 42,
  totalCards: 85,
  dueToday: 12,
  newCards: 20,
  reviewedToday: 8,
  suspendedCards: 3,
  averageRetention30d: 0.87,
  againRate7d: 0.15,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("DeckStatsPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders skeleton while loading", () => {
    mockGetDeckStats.mockReturnValue(new Promise(() => {}) as never);

    render(<DeckStatsPanel deckId={DECK_ID} />, { wrapper: createWrapper() });
    expect(screen.getByTestId("deck-stats-loading")).toBeInTheDocument();
  });

  it("renders total cards count", async () => {
    mockGetDeckStats.mockResolvedValue({ data: SAMPLE_STATS } as never);

    render(<DeckStatsPanel deckId={DECK_ID} />, { wrapper: createWrapper() });

    const panel = await screen.findByTestId("deck-stats-panel");
    expect(panel).toBeInTheDocument();
    expect(screen.getByTestId("stat-total-cards")).toHaveTextContent("85");
  });

  it("renders due today count", async () => {
    mockGetDeckStats.mockResolvedValue({ data: SAMPLE_STATS } as never);

    render(<DeckStatsPanel deckId={DECK_ID} />, { wrapper: createWrapper() });
    await screen.findByTestId("deck-stats-panel");

    expect(screen.getByTestId("stat-due-today")).toHaveTextContent("12");
  });

  it("renders reviewed today count", async () => {
    mockGetDeckStats.mockResolvedValue({ data: SAMPLE_STATS } as never);

    render(<DeckStatsPanel deckId={DECK_ID} />, { wrapper: createWrapper() });
    await screen.findByTestId("deck-stats-panel");

    expect(screen.getByTestId("stat-reviewed-today")).toHaveTextContent("8");
  });

  it("renders retention bar when averageRetention30d is present", async () => {
    mockGetDeckStats.mockResolvedValue({ data: SAMPLE_STATS } as never);

    render(<DeckStatsPanel deckId={DECK_ID} />, { wrapper: createWrapper() });
    await screen.findByTestId("deck-stats-panel");

    expect(screen.getByTestId("retention-bar")).toBeInTheDocument();
    expect(screen.getByTestId("retention-value")).toHaveTextContent("87%");
  });

  it("does not render retention bar when averageRetention30d is absent", async () => {
    const statsNoRetention: DeckStatsModel = {
      deckId: DECK_ID,
      totalNotes: SAMPLE_STATS.totalNotes,
      totalCards: SAMPLE_STATS.totalCards,
      dueToday: SAMPLE_STATS.dueToday,
      newCards: SAMPLE_STATS.newCards,
      reviewedToday: SAMPLE_STATS.reviewedToday,
      suspendedCards: SAMPLE_STATS.suspendedCards,
    };
    mockGetDeckStats.mockResolvedValue({ data: statsNoRetention } as never);

    render(<DeckStatsPanel deckId={DECK_ID} />, { wrapper: createWrapper() });
    await screen.findByTestId("deck-stats-panel");

    expect(screen.queryByTestId("retention-bar")).not.toBeInTheDocument();
  });

  it("renders total notes count", async () => {
    mockGetDeckStats.mockResolvedValue({ data: SAMPLE_STATS } as never);

    render(<DeckStatsPanel deckId={DECK_ID} />, { wrapper: createWrapper() });
    await screen.findByTestId("deck-stats-panel");

    expect(screen.getByTestId("stat-total-notes")).toHaveTextContent("42");
  });
});
