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

vi.mock("@shared/auth/auth-store", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@shared/stats/use-user-stats", () => ({
  useUserStats: vi.fn(),
}));

import { decksApi } from "@shared/api/client";
import { useAuthStore } from "@shared/auth/auth-store";
import type { DeckModel, DeckStatsModel } from "@shared/api/types";
import { DashboardPage } from "./DashboardPage";
import { useUserStats } from "@shared/stats/use-user-stats";
const mockUseUserStats = vi.mocked(useUserStats);

const mockListDecks = vi.mocked(decksApi.listDecks);
const mockGetDeckStats = vi.mocked(decksApi.getDeckStats);
const mockUseAuthStore = vi.mocked(useAuthStore);

// ---- Fixtures ---------------------------------------------------------------

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
  newCards: 4,
  reviewedToday: 3,
  suspendedCards: 0,
};

// STATS_2 kept for potential future use but not referenced in current tests
const _STATS_2: DeckStatsModel = {
  deckId: "deck-002",
  totalNotes: 5,
  totalCards: 8,
  dueToday: 0,
  newCards: 8,
  reviewedToday: 0,
  suspendedCards: 0,
};
void _STATS_2;

// ---- Helpers ----------------------------------------------------------------

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

// ---- Default auth mock (Alice) -----------------------------------------------

type AuthStoreState = Parameters<typeof useAuthStore>[0] extends (
  state: infer S
) => unknown
  ? S
  : never;

function mockAuthAsAlice() {
  mockUseAuthStore.mockImplementation(
    (selector: (state: AuthStoreState) => unknown) =>
      selector({
        user: {
          id: "u1",
          email: "alice@example.com",
          displayName: "Alice Smith",
          roles: [],
          scopes: [],
        },
        accessToken: null,
        setAccessToken: vi.fn(),
        setUser: vi.fn(),
        clearAuth: vi.fn(),
      } as AuthStoreState),
  );
}

function mockAuthAsGuest() {
  mockUseAuthStore.mockImplementation(
    (selector: (state: AuthStoreState) => unknown) =>
      selector({
        user: null,
        accessToken: null,
        setAccessToken: vi.fn(),
        setUser: vi.fn(),
        clearAuth: vi.fn(),
      } as AuthStoreState),
  );
}

// ---- Tests ------------------------------------------------------------------

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no decks loading forever
    mockListDecks.mockReturnValue(new Promise(() => {}) as never);
    // Default auth: Alice
    mockAuthAsAlice();
    // Default: stats loading
    mockUseUserStats.mockReturnValue({ data: undefined, isPending: true, isError: false, isSuccess: false } as never);
  });

  it("renders the dashboard page container", () => {
    renderDashboard();
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });

  it("renders the greeting heading with firstName from auth store", () => {
    renderDashboard();
    const heading = screen.getByTestId("dashboard-heading");
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/Good morning, Alice/);
  });

  it("falls back to 'there' when no user", () => {
    mockAuthAsGuest();
    renderDashboard();
    const heading = screen.getByTestId("dashboard-heading");
    expect(heading).toHaveTextContent(/Good morning, there/);
  });

  it("renders a dashboard-deck-card for each non-archived deck", async () => {
    mockListDecks.mockResolvedValue({
      data: {
        items: [DECK_1, DECK_2],
        page: { page: 0, size: 10, totalElements: 2, totalPages: 1 },
      },
    } as never);
    mockGetDeckStats.mockResolvedValue({ data: STATS_1 } as never);

    renderDashboard();

    await waitFor(() => {
      const cards = screen.getAllByTestId("dashboard-deck-card");
      expect(cards).toHaveLength(2);
    });
  });

  it("renders decks-section-heading", () => {
    renderDashboard();
    expect(screen.getByTestId("decks-section-heading")).toBeInTheDocument();
  });

  it("shows empty state when there are no decks", async () => {
    mockListDecks.mockResolvedValue({
      data: {
        items: [],
        page: { page: 0, size: 10, totalElements: 0, totalPages: 0 },
      },
    } as never);

    renderDashboard();

    await waitFor(() => {
      expect(screen.queryByTestId("dashboard-deck-card")).not.toBeInTheDocument();
      expect(screen.getByText(/No decks yet/)).toBeInTheDocument();
    });
  });

  it("shows deck due count from stats when available", async () => {
    mockListDecks.mockResolvedValue({
      data: {
        items: [DECK_1],
        page: { page: 0, size: 10, totalElements: 1, totalPages: 1 },
      },
    } as never);
    mockGetDeckStats.mockResolvedValue({ data: STATS_1 } as never);

    renderDashboard();

    await waitFor(() => {
      const dueSpan = screen.getByTestId("deck-due-deck-001");
      expect(dueSpan).toHaveTextContent(/5/);
    });
  });

  it("shows real stats values when useUserStats resolves", async () => {
    mockUseUserStats.mockReturnValue({
      data: {
        dueToday: 7,
        newCards: 3,
        reviewedToday: 10,
        dayStreak: 5,
        retention30d: 0.92,
      },
      isPending: false,
      isError: false,
      isSuccess: true,
    } as never);
    mockListDecks.mockResolvedValue({
      data: {
        items: [],
        page: { page: 0, size: 10, totalElements: 0, totalPages: 0 },
      },
    } as never);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId("stat-due-today")).toHaveTextContent("7");
      expect(screen.getByTestId("stat-new-cards")).toHaveTextContent("3");
      expect(screen.getByTestId("stat-day-streak")).toHaveTextContent("5");
      expect(screen.getByTestId("stat-retention")).toHaveTextContent("92%");
    });
  });

  it("shows em-dash for retention when retention30d is absent", async () => {
    mockUseUserStats.mockReturnValue({
      data: {
        dueToday: 0,
        newCards: 0,
        reviewedToday: 0,
        dayStreak: 0,
      },
      isPending: false,
      isError: false,
      isSuccess: true,
    } as never);
    mockListDecks.mockResolvedValue({
      data: {
        items: [],
        page: { page: 0, size: 10, totalElements: 0, totalPages: 0 },
      },
    } as never);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId("stat-retention")).toHaveTextContent("—");
    });
  });
});
