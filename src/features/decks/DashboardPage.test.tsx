import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";

vi.mock("@shared/api/client", () => ({
  decksApi: {
    listDecks: vi.fn(),
    getDeckStats: vi.fn(),
  },
}));

import { decksApi } from "@shared/api/client";
import type { DeckModel, DeckStatsModel } from "@shared/api/types";
import { DashboardPage } from "./DashboardPage";

const mockListDecks = vi.mocked(decksApi.listDecks);
const mockGetDeckStats = vi.mocked(decksApi.getDeckStats);

const DECK_1: DeckModel = {
  id: "deck-001",
  title: "Spanish Vocab",
  archived: false,
  tags: [],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const DECK_2: DeckModel = {
  id: "deck-002",
  title: "History",
  archived: false,
  tags: [],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const STATS_1: DeckStatsModel = {
  deckId: "deck-001",
  totalNotes: 10,
  totalCards: 20,
  dueToday: 5,
  reviewedToday: 3,
  suspendedCards: 0,
};

const STATS_2: DeckStatsModel = {
  deckId: "deck-002",
  totalNotes: 5,
  totalCards: 8,
  dueToday: 0,
  reviewedToday: 0,
  suspendedCards: 0,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function renderDashboard() {
  const Wrapper = createWrapper();
  return render(
    <Wrapper>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </Wrapper>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the dashboard page container", () => {
    mockListDecks.mockReturnValue(new Promise(() => {}) as never);
    renderDashboard();
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });

  it("renders the welcome heading with StudyDeck brand", () => {
    mockListDecks.mockReturnValue(new Promise(() => {}) as never);
    renderDashboard();
    const heading = screen.getByTestId("dashboard-heading");
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/studydeck/i);
  });

  it("renders a link to the Decks page", () => {
    mockListDecks.mockReturnValue(new Promise(() => {}) as never);
    renderDashboard();
    const decksLink = screen.getByTestId("nav-decks-link");
    expect(decksLink).toBeInTheDocument();
    expect(decksLink).toHaveAttribute("href", "/decks");
  });

  it("renders feature cards for key sections", () => {
    mockListDecks.mockReturnValue(new Promise(() => {}) as never);
    renderDashboard();
    expect(screen.getByRole("heading", { name: /my decks/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^review$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ai assistant/i })).toBeInTheDocument();
  });

  it("shows deck due counts when decks have due cards", async () => {
    mockListDecks.mockResolvedValue({
      data: {
        items: [DECK_1, DECK_2],
        page: { page: 0, size: 20, totalElements: 2, totalPages: 1 },
      },
    } as never);
    mockGetDeckStats
      .mockResolvedValueOnce({ data: STATS_1 } as never)
      .mockResolvedValueOnce({ data: STATS_2 } as never);

    renderDashboard();

    // Wait until stats are loaded and the due count shows "5"
    const dueItem = await screen.findByTestId(`deck-due-deck-001`);
    expect(dueItem).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId(`deck-due-deck-001`)).toHaveTextContent(/5/));
  });

  it("shows a 'Start reviewing' CTA for decks with due cards", async () => {
    mockListDecks.mockResolvedValue({
      data: {
        items: [DECK_1],
        page: { page: 0, size: 20, totalElements: 1, totalPages: 1 },
      },
    } as never);
    mockGetDeckStats.mockResolvedValue({ data: STATS_1 } as never);

    renderDashboard();

    const reviewCta = await screen.findByTestId(`review-cta-deck-001`);
    expect(reviewCta).toBeInTheDocument();
    expect(reviewCta).toHaveAttribute("href", `/review/deck-001`);
  });

  it("does not show CTA for decks with zero due cards", async () => {
    mockListDecks.mockResolvedValue({
      data: {
        items: [DECK_2],
        page: { page: 0, size: 20, totalElements: 1, totalPages: 1 },
      },
    } as never);
    mockGetDeckStats.mockResolvedValue({ data: STATS_2 } as never);

    renderDashboard();

    // Wait for deck stats to load
    const dueItem = await screen.findByTestId(`deck-due-deck-002`);
    expect(dueItem).toHaveTextContent("0");
    expect(screen.queryByTestId(`review-cta-deck-002`)).not.toBeInTheDocument();
  });
});
