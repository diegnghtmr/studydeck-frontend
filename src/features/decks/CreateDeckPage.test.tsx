import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateDeckPage } from "./CreateDeckPage";
import type { DeckModel } from "@shared/api/types";

// Mock navigation
const mockNavigate = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the API client
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

const mockCreateDeck = vi.mocked(decksApi.createDeck);

const CREATED_DECK: DeckModel = {
  id: "new-deck-id",
  title: "Biology 101",
  archived: false,
  createdAt: "2024-06-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/decks/new"]}>
        <CreateDeckPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CreateDeckPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form", () => {
    renderPage();
    expect(screen.getByTestId("create-deck-form")).toBeInTheDocument();
  });

  it("renders the deck name input", () => {
    renderPage();
    expect(screen.getByLabelText(/deck name/i)).toBeInTheDocument();
  });

  it("renders the description textarea", () => {
    renderPage();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    renderPage();
    expect(screen.getByTestId("create-deck-submit")).toBeInTheDocument();
  });

  describe("form validation", () => {
    it("shows required error when submitting empty name", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByTestId("create-deck-submit"));

      await waitFor(() =>
        expect(screen.getByTestId("title-error")).toBeInTheDocument(),
      );
      expect(screen.getByTestId("title-error")).toHaveTextContent(
        /deck name is required/i,
      );
    });

    it("does NOT call the API when name is empty", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByTestId("create-deck-submit"));

      await waitFor(() => screen.getByTestId("title-error"));
      expect(mockCreateDeck).not.toHaveBeenCalled();
    });

    it("does not show error when name is provided", async () => {
      const user = userEvent.setup();
      mockCreateDeck.mockResolvedValue({ data: CREATED_DECK } as never);

      renderPage();

      await user.type(screen.getByLabelText(/deck name/i), "Biology 101");
      await user.click(screen.getByTestId("create-deck-submit"));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
      expect(screen.queryByTestId("title-error")).not.toBeInTheDocument();
    });
  });

  describe("successful submission", () => {
    beforeEach(() => {
      mockCreateDeck.mockResolvedValue({ data: CREATED_DECK } as never);
    });

    it("calls createDeck with the correct title", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText(/deck name/i), "Biology 101");
      await user.click(screen.getByTestId("create-deck-submit"));

      await waitFor(() => expect(mockCreateDeck).toHaveBeenCalledTimes(1));
      expect(mockCreateDeck).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Biology 101" }),
      );
    });

    it("navigates to the new deck after successful creation", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText(/deck name/i), "Biology 101");
      await user.click(screen.getByTestId("create-deck-submit"));

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith("/decks/new-deck-id"),
      );
    });

    it("includes description in the request when provided", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText(/deck name/i), "Biology 101");
      await user.type(
        screen.getByLabelText(/description/i),
        "Intro to cell biology",
      );
      await user.click(screen.getByTestId("create-deck-submit"));

      await waitFor(() => expect(mockCreateDeck).toHaveBeenCalledTimes(1));
      expect(mockCreateDeck).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Biology 101",
          description: "Intro to cell biology",
        }),
      );
    });
  });

  describe("API error handling", () => {
    it("shows ProblemBanner on API failure", async () => {
      const user = userEvent.setup();
      const apiError = Object.assign(new Error("conflict"), {
        response: {
          status: 409,
          data: {
            type: "about:blank",
            title: "Conflict",
            status: 409,
            detail: "A deck with this name already exists.",
          },
        },
      });
      mockCreateDeck.mockRejectedValue(apiError);

      renderPage();

      await user.type(screen.getByLabelText(/deck name/i), "Duplicate");
      await user.click(screen.getByTestId("create-deck-submit"));

      await waitFor(() =>
        expect(screen.getByTestId("problem-banner")).toBeInTheDocument(),
      );
    });
  });
});
