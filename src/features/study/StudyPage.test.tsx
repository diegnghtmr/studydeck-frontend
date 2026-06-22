import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";

// Mock the API client
vi.mock("@shared/api/client", () => ({
  decksApi: {
    listDecks: vi.fn(),
    getDeckStats: vi.fn(),
  },
  reviewsApi: {},
  cardsApi: {},
}));

import { decksApi } from "@shared/api/client";
import { StudyPage } from "./StudyPage";

const mockListDecks = vi.mocked(decksApi.listDecks);

const MOCK_DECK_1 = {
  id: "deck-001",
  title: "French Vocabulary",
  archived: false,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const MOCK_DECK_2 = {
  id: "deck-002",
  title: "Spanish Grammar",
  archived: false,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const MOCK_DECKS_PAGE = {
  items: [MOCK_DECK_1, MOCK_DECK_2],
  page: { page: 0, size: 20, totalElements: 2, totalPages: 1 },
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function renderStudyPage() {
  const Wrapper = createWrapper();
  return render(
    <Wrapper>
      <MemoryRouter initialEntries={["/study"]}>
        <Routes>
          <Route path="/study" element={<StudyPage />} />
          <Route path="/review/:deckId" element={<div data-testid="review-page">Review</div>} />
          <Route path="/review" element={<div data-testid="review-all-page">Review All</div>} />
          <Route path="/decks" element={<div data-testid="decks-page">Decks</div>} />
        </Routes>
      </MemoryRouter>
    </Wrapper>,
  );
}

describe("StudyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(decksApi.getDeckStats).mockResolvedValue({
      data: { dueToday: 3, totalCards: 10, totalNotes: 5, reviewedToday: 2, suspendedCards: 0 },
    } as never);
  });

  it("renders heading and subtitle", async () => {
    mockListDecks.mockResolvedValue({ data: MOCK_DECKS_PAGE } as never);
    renderStudyPage();
    expect(screen.getByRole("heading", { name: /study/i })).toBeInTheDocument();
  });

  it("renders deck list after loading", async () => {
    mockListDecks.mockResolvedValue({ data: MOCK_DECKS_PAGE } as never);
    renderStudyPage();
    await waitFor(() => {
      expect(screen.getAllByTestId("study-deck-row")).toHaveLength(2);
    });
    expect(screen.getByText("French Vocabulary")).toBeInTheDocument();
    expect(screen.getByText("Spanish Grammar")).toBeInTheDocument();
  });

  it("navigates to /review/:deckId when a deck row is clicked", async () => {
    mockListDecks.mockResolvedValue({ data: MOCK_DECKS_PAGE } as never);
    renderStudyPage();
    await waitFor(() => expect(screen.getAllByTestId("study-deck-row")).toHaveLength(2));

    await userEvent.click(screen.getAllByTestId("study-deck-row")[0]);
    await waitFor(() => {
      expect(screen.getByTestId("review-page")).toBeInTheDocument();
    });
  });

  it("navigates to /review when 'Review all due' is clicked", async () => {
    mockListDecks.mockResolvedValue({ data: MOCK_DECKS_PAGE } as never);
    renderStudyPage();
    await waitFor(() => expect(screen.getAllByTestId("study-deck-row")).toHaveLength(2));

    const reviewAllBtn = screen.getByRole("button", { name: /review all due/i });
    await userEvent.click(reviewAllBtn);
    await waitFor(() => {
      expect(screen.getByTestId("review-all-page")).toBeInTheDocument();
    });
  });

  it("shows empty state when no decks", async () => {
    mockListDecks.mockResolvedValue({
      data: { items: [], page: { page: 0, size: 20, totalElements: 0, totalPages: 0 } },
    } as never);
    renderStudyPage();
    await waitFor(() => {
      expect(screen.getByText(/no decks/i)).toBeInTheDocument();
    });
  });
});
