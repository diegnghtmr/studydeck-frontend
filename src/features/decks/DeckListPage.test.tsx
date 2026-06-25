import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeckListPage } from "./DeckListPage";
import type { DeckModel, PagedDeckModel, NoteModel, PagedNoteModel } from "@shared/api/types";

// Mock BOTH apis
vi.mock("@shared/api/client", () => ({
  decksApi: {
    listDecks: vi.fn(),
    createDeck: vi.fn(),
    patchDeck: vi.fn(),
    deleteDeck: vi.fn(),
    getDeck: vi.fn(),
  },
  notesApi: {
    listNotes: vi.fn(),
    createNote: vi.fn(),
    deleteNote: vi.fn(),
    getNote: vi.fn(),
    listCardsByNote: vi.fn(),
    patchNote: vi.fn(),
  },
}));

import { decksApi, notesApi } from "@shared/api/client";

const mockListDecks = vi.mocked(decksApi.listDecks);
const mockListNotes = vi.mocked(notesApi.listNotes);
const mockCreateDeck = vi.mocked(decksApi.createDeck);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_DECKS: DeckModel[] = [
  {
    id: "deck-1",
    title: "Cell Biology",
    archived: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "deck-2",
    title: "Spanish Vocab",
    archived: false,
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];

const MOCK_NOTES: NoteModel[] = [
  {
    id: "note-1",
    deckId: "deck-1",
    noteType: "basic",
    tags: [],
    content: { front: "What is mitosis?", back: "Cell division" },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "note-2",
    deckId: "deck-1",
    noteType: "cloze",
    tags: [],
    content: { text: "{{c1::Photosynthesis}} converts light to energy" },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "note-3",
    deckId: "deck-2",
    noteType: "basic",
    tags: [],
    content: { front: "Hello in Spanish", back: "Hola" },
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];

const PAGED_DECKS: PagedDeckModel = {
  items: MOCK_DECKS,
  page: {
    page: 0,
    size: 100,
    totalElements: 2,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  },
};

function makePagedNotes(notes: NoteModel[]): PagedNoteModel {
  return {
    items: notes,
    page: { page: 0, size: 100, totalElements: notes.length, totalPages: 1 },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function renderPage() {
  const qc = createTestQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DeckListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DeckListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListDecks.mockResolvedValue({ data: PAGED_DECKS } as never);
    mockListNotes.mockImplementation((_page, _size, _sort, deckId) => {
      const notes = deckId
        ? MOCK_NOTES.filter((n) => n.deckId === deckId)
        : MOCK_NOTES;
      return Promise.resolve({ data: makePagedNotes(notes) } as never);
    });
    mockCreateDeck.mockResolvedValue({
      data: {
        id: "new-deck",
        title: "New Deck",
        archived: false,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    } as never);
  });

  it("renders the page heading 'Cards & Decks'", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("deck-list-page")).toBeInTheDocument(),
    );
    expect(screen.getByText("Cards & Decks")).toBeInTheDocument();
  });

  it("renders one deck row per deck", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("deck-row")).toHaveLength(2),
    );
    expect(screen.getAllByText("Cell Biology").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Spanish Vocab").length).toBeGreaterThan(0);
  });

  it("renders a note card per note when all decks selected", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("note-card")).toHaveLength(3),
    );
  });

  it("shows loading skeleton while notes are loading", async () => {
    mockListNotes.mockReturnValue(new Promise(() => {}));
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("cards-skeleton").length).toBeGreaterThan(0),
    );
  });

  it("shows empty state when no notes match", async () => {
    mockListNotes.mockResolvedValue({ data: makePagedNotes([]) } as never);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("cards-empty")).toBeInTheDocument(),
    );
  });

  it("type filter 'Basic' shows only basic notes", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("note-card")).toHaveLength(3),
    );
    const user = userEvent.setup();
    await user.click(screen.getByTestId("type-filter-basic"));
    await waitFor(() =>
      expect(screen.getAllByTestId("note-card")).toHaveLength(2),
    );
  });

  it("search input filters note cards by text", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("note-card")).toHaveLength(3),
    );
    const user = userEvent.setup();
    await user.type(screen.getByTestId("card-search"), "mitosis");
    await waitFor(() =>
      expect(screen.getAllByTestId("note-card")).toHaveLength(1),
    );
  });

  it("opening 'New deck' modal and submitting calls createDeck", async () => {
    renderPage();
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("New deck")).toBeInTheDocument());
    await user.click(screen.getAllByText("New deck")[0]);
    await waitFor(() =>
      expect(screen.getByTestId("deck-modal")).toBeInTheDocument(),
    );
    await user.type(screen.getByTestId("deck-name-input"), "My New Deck");
    await user.click(screen.getByTestId("deck-modal-submit"));
    await waitFor(() =>
      expect(mockCreateDeck).toHaveBeenCalledWith(
        expect.objectContaining({ title: "My New Deck" }),
      ),
    );
  });

  it("DeckModal closes on Escape key (a11y)", async () => {
    renderPage();
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("New deck")).toBeInTheDocument());
    await user.click(screen.getAllByText("New deck")[0]);
    await waitFor(() =>
      expect(screen.getByTestId("deck-modal")).toBeInTheDocument(),
    );
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByTestId("deck-modal")).not.toBeInTheDocument(),
    );
  });

  it("DeckModal has role=dialog and aria-labelledby (a11y)", async () => {
    renderPage();
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("New deck")).toBeInTheDocument());
    await user.click(screen.getAllByText("New deck")[0]);
    await waitFor(() =>
      expect(screen.getByTestId("deck-modal")).toBeInTheDocument(),
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "deck-modal-title");
  });

  describe("fieldClass migration — modal inputs", () => {
    it("DeckModal deck-name-input uses FIELD_CLASS tokens (bg-[#fbfaf9], ring-[#e7e4df])", async () => {
      renderPage();
      const user = userEvent.setup();
      await waitFor(() => expect(screen.getByText("New deck")).toBeInTheDocument());
      await user.click(screen.getAllByText("New deck")[0]);
      await waitFor(() => expect(screen.getByTestId("deck-modal")).toBeInTheDocument());
      const input = screen.getByTestId("deck-name-input");
      expect(input.className).toContain("bg-[#fbfaf9]");
      expect(input.className).toContain("ring-[#e7e4df]");
    });

    it("DeckModal deck-name-input has no inline border style", async () => {
      renderPage();
      const user = userEvent.setup();
      await waitFor(() => expect(screen.getByText("New deck")).toBeInTheDocument());
      await user.click(screen.getAllByText("New deck")[0]);
      await waitFor(() => expect(screen.getByTestId("deck-modal")).toBeInTheDocument());
      const input = screen.getByTestId("deck-name-input");
      expect((input as HTMLElement).style.border).toBeFalsy();
    });

    it("CardModal card-front-input uses FIELD_CLASS tokens", async () => {
      renderPage();
      const user = userEvent.setup();
      await waitFor(() => expect(screen.getByTestId("new-card-btn")).toBeInTheDocument());
      await user.click(screen.getByTestId("new-card-btn"));
      await waitFor(() => expect(screen.getByTestId("card-front-input")).toBeInTheDocument());
      const frontInput = screen.getByTestId("card-front-input");
      expect(frontInput.className).toContain("bg-[#fbfaf9]");
    });

    it("CardModal card-back-input uses FIELD_CLASS tokens", async () => {
      renderPage();
      const user = userEvent.setup();
      await waitFor(() => expect(screen.getByTestId("new-card-btn")).toBeInTheDocument());
      await user.click(screen.getByTestId("new-card-btn"));
      await waitFor(() => expect(screen.getByTestId("card-back-input")).toBeInTheDocument());
      const backInput = screen.getByTestId("card-back-input");
      expect(backInput.className).toContain("bg-[#fbfaf9]");
    });

    it("CardModal textareas are not vertically resizable (cannot shrink to clip text)", async () => {
      renderPage();
      const user = userEvent.setup();
      await waitFor(() => expect(screen.getByTestId("new-card-btn")).toBeInTheDocument());
      await user.click(screen.getByTestId("new-card-btn"));
      await waitFor(() => expect(screen.getByTestId("card-front-input")).toBeInTheDocument());
      for (const id of ["card-front-input", "card-back-input"]) {
        const ta = screen.getByTestId(id);
        expect(ta.className).toContain("resize-none");
        expect(ta.className).not.toContain("resize-y");
      }
    });
  });
});
