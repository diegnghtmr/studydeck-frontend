import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NoteDetailPage } from "./NoteDetailPage";
import type { NoteModel, CardModel } from "@shared/api/types";

const mockNavigate = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@shared/api/client", () => ({
  notesApi: {
    listNotes: vi.fn(),
    getNote: vi.fn(),
    createNote: vi.fn(),
    patchNote: vi.fn(),
    deleteNote: vi.fn(),
    listCardsByNote: vi.fn(),
  },
  cardsApi: {
    previewCard: vi.fn(),
  },
}));

import { notesApi, cardsApi } from "@shared/api/client";

const mockGetNote = vi.mocked(notesApi.getNote);
const mockDeleteNote = vi.mocked(notesApi.deleteNote);
const mockPatchNote = vi.mocked(notesApi.patchNote);
const mockListCardsByNote = vi.mocked(notesApi.listCardsByNote);
const mockPreviewCard = vi.mocked(cardsApi.previewCard);

const DECK_ID = "deck-001";
const NOTE_ID = "note-001";

const SAMPLE_NOTE: NoteModel = {
  id: NOTE_ID,
  deckId: DECK_ID,
  noteType: "basic",
  tags: [],
  content: { front: "What is mitosis?", back: "Cell division" },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const SAMPLE_CARD: CardModel = {
  id: "card-001",
  noteId: NOTE_ID,
  deckId: DECK_ID,
  noteType: "basic",
  cardVariant: "forward",
  position: 0,
  suspended: false,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
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
      <MemoryRouter initialEntries={[`/decks/${DECK_ID}/notes/${NOTE_ID}`]}>
        <Routes>
          <Route
            path="/decks/:deckId/notes/:noteId"
            element={<NoteDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("NoteDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNote.mockResolvedValue({ data: SAMPLE_NOTE } as never);
    mockListCardsByNote.mockResolvedValue({ data: { items: [SAMPLE_CARD] } } as never);
    mockPreviewCard.mockResolvedValue({
      data: { cardId: "card-001", front: "What is mitosis?", back: "Cell division" },
    } as never);
  });

  it("displays note content", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("What is mitosis?")).toBeInTheDocument(),
    );
    expect(screen.getByText("Cell division")).toBeInTheDocument();
  });

  it("shows loading state while note fetches", () => {
    mockGetNote.mockReturnValue(new Promise(() => {}) as never);
    renderPage();
    expect(screen.getByTestId("note-detail-loading")).toBeInTheDocument();
  });

  it("lists derived cards", async () => {
    renderPage();
    // Wait for both the section and the preview items to render
    await waitFor(() =>
      expect(screen.getAllByTestId("card-preview-item")).toHaveLength(1),
    );
  });

  it("opens confirm dialog on delete click", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId("delete-note-btn")).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("delete-note-btn"));
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("calls deleteNote and navigates on confirm delete", async () => {
    const user = userEvent.setup();
    mockDeleteNote.mockResolvedValue({ data: undefined } as never);

    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId("delete-note-btn")).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("delete-note-btn"));
    await user.click(screen.getByTestId("confirm-dialog-confirm"));

    await waitFor(() => expect(mockDeleteNote).toHaveBeenCalledWith(NOTE_ID));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(`/decks/${DECK_ID}`),
    );
  });

  it("renders the edit form when edit button is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId("edit-note-btn")).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("edit-note-btn"));

    // NoteEditor should be visible now
    expect(screen.getByLabelText(/front/i)).toBeInTheDocument();
  });

  it("calls patchNote when edit form is submitted", async () => {
    const user = userEvent.setup();
    mockPatchNote.mockResolvedValue({ data: SAMPLE_NOTE } as never);

    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId("edit-note-btn")).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("edit-note-btn"));

    // The form is pre-filled; just submit
    const frontInput = screen.getByLabelText(/front/i);
    await user.clear(frontInput);
    await user.type(frontInput, "Updated question?");

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(mockPatchNote).toHaveBeenCalledTimes(1));
    expect(mockPatchNote).toHaveBeenCalledWith(
      NOTE_ID,
      expect.objectContaining({
        content: expect.objectContaining({ front: "Updated question?" }),
      }),
    );
  });
});
