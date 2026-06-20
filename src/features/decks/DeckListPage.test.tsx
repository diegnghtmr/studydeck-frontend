import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeckListPage } from "./DeckListPage";
import type { DeckModel, PagedDeckModel } from "@shared/api/types";

// Mock the api client so no real network calls happen
vi.mock("@shared/api/client", () => ({
  decksApi: {
    listDecks: vi.fn(),
    createDeck: vi.fn(),
    getDeck: vi.fn(),
    patchDeck: vi.fn(),
    deleteDeck: vi.fn(),
  },
}));

import { decksApi } from "@shared/api/client";

const mockListDecks = vi.mocked(decksApi.listDecks);

const MOCK_DECKS: DeckModel[] = [
  {
    id: "1",
    title: "Cell Biology",
    description: "Study of cells",
    archived: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    title: "Spanish Vocabulary",
    archived: false,
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];

const MOCK_PAGED_DECKS: PagedDeckModel = {
  items: MOCK_DECKS,
  page: {
    page: 0,
    size: 20,
    totalElements: 2,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  },
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Prevent background refetch from interfering with tests
        staleTime: Infinity,
      },
    },
  });
}

function renderPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DeckListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DeckListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("shows loading skeleton while fetching", async () => {
      // Never resolves so we stay in loading state
      mockListDecks.mockReturnValue(new Promise(() => {}));
      renderPage();
      expect(screen.getByTestId("deck-list-loading")).toBeInTheDocument();
    });
  });

  describe("data state", () => {
    beforeEach(() => {
      mockListDecks.mockResolvedValue({ data: MOCK_PAGED_DECKS } as never);
    });

    it("renders the page container", async () => {
      renderPage();
      await waitFor(() => expect(screen.getByTestId("deck-list-page")).toBeInTheDocument());
    });

    it("renders deck cards after data loads", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getAllByTestId("deck-card")).toHaveLength(2),
      );
    });

    it("renders deck titles", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Cell Biology")).toBeInTheDocument();
        expect(screen.getByText("Spanish Vocabulary")).toBeInTheDocument();
      });
    });

    it("renders the 'New deck' CTA link", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByTestId("new-deck-cta")).toBeInTheDocument(),
      );
    });

    it("'New deck' CTA links to /decks/new", async () => {
      renderPage();
      await waitFor(() => {
        const cta = screen.getByTestId("new-deck-cta");
        expect(cta).toHaveAttribute("href", "/decks/new");
      });
    });

    it("renders a search input", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByRole("searchbox")).toBeInTheDocument(),
      );
    });
  });

  describe("empty state", () => {
    it("renders empty message when no decks", async () => {
      mockListDecks.mockResolvedValue({
        data: {
          items: [],
          page: { page: 0, size: 20, totalElements: 0, totalPages: 1 },
        },
      } as never);

      renderPage();
      await waitFor(() =>
        expect(screen.getByTestId("deck-list-empty")).toBeInTheDocument(),
      );
    });

    it("shows 'No decks yet' text in empty state", async () => {
      mockListDecks.mockResolvedValue({
        data: {
          items: [],
          page: { page: 0, size: 20, totalElements: 0, totalPages: 1 },
        },
      } as never);

      renderPage();
      await waitFor(() =>
        expect(screen.getByText(/no decks yet/i)).toBeInTheDocument(),
      );
    });
  });

  describe("error state", () => {
    it("shows ProblemBanner when API errors", async () => {
      const apiError = Object.assign(new Error("Server error"), {
        response: {
          status: 500,
          data: {
            type: "about:blank",
            title: "Internal Server Error",
            status: 500,
          },
        },
      });
      mockListDecks.mockRejectedValue(apiError);

      renderPage();
      await waitFor(() =>
        expect(screen.getByTestId("problem-banner")).toBeInTheDocument(),
      );
    });

    it("displays error title in banner", async () => {
      const apiError = Object.assign(new Error("Server error"), {
        response: {
          status: 500,
          data: {
            type: "about:blank",
            title: "Internal Server Error",
            status: 500,
          },
        },
      });
      mockListDecks.mockRejectedValue(apiError);

      renderPage();
      await waitFor(() =>
        expect(screen.getByText("Internal Server Error")).toBeInTheDocument(),
      );
    });
  });

  describe("filter: archived", () => {
    it("toggles the archived filter button", async () => {
      const user = userEvent.setup();
      mockListDecks.mockResolvedValue({ data: MOCK_PAGED_DECKS } as never);

      renderPage();
      await waitFor(() => screen.getByText("Show archived"));

      const filterBtn = screen.getByRole("button", { name: /show archived/i });
      expect(filterBtn).toHaveAttribute("aria-pressed", "false");

      await user.click(filterBtn);
      expect(filterBtn).toHaveAttribute("aria-pressed", "true");
    });
  });
});
