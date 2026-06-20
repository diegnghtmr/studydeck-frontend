import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateNotePage } from "./CreateNotePage";
import type { NoteModel } from "@shared/api/types";

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
    createNote: vi.fn(),
    listNotes: vi.fn(),
    getNote: vi.fn(),
    patchNote: vi.fn(),
    deleteNote: vi.fn(),
    listCardsByNote: vi.fn(),
  },
  cardsApi: {
    previewCard: vi.fn(),
  },
}));

import { notesApi } from "@shared/api/client";

const mockCreateNote = vi.mocked(notesApi.createNote);

const CREATED_NOTE: NoteModel = {
  id: "note-new",
  deckId: "deck-001",
  noteType: "basic",
  tags: [],
  content: { front: "Q", back: "A" },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderPage(deckId = "deck-001") {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/decks/${deckId}/notes/new`]}>
        <Routes>
          <Route path="/decks/:deckId/notes/new" element={<CreateNotePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CreateNotePage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the note editor", () => {
    renderPage();
    expect(screen.getByRole("combobox", { name: /note type/i })).toBeInTheDocument();
  });

  it("shows card-count preview for basic type: 1 card", () => {
    renderPage();
    expect(screen.getByTestId("card-count-preview")).toHaveTextContent("1");
  });

  it("shows card-count preview for reversed type: 2 cards", async () => {
    const user = userEvent.setup();
    renderPage();

    const typeSelect = screen.getByRole("combobox", { name: /note type/i });
    await user.selectOptions(typeSelect, "reversed");

    expect(screen.getByTestId("card-count-preview")).toHaveTextContent("2");
  });

  it("shows card-count preview for cloze type: counts distinct cN markers", async () => {
    const user = userEvent.setup();
    renderPage();

    const typeSelect = screen.getByRole("combobox", { name: /note type/i });
    await user.selectOptions(typeSelect, "cloze");

    // Use fireEvent.change to avoid userEvent special handling of { } characters
    const clozeInput = screen.getByLabelText(/cloze text/i);
    fireEvent.change(clozeInput, { target: { value: "{{c1::A}} and {{c2::B}}" } });

    await waitFor(() =>
      expect(screen.getByTestId("card-count-preview")).toHaveTextContent("2"),
    );
  });

  it("shows card-count preview for multiple-choice type: 1 card", async () => {
    const user = userEvent.setup();
    renderPage();

    const typeSelect = screen.getByRole("combobox", { name: /note type/i });
    await user.selectOptions(typeSelect, "multiple-choice");

    expect(screen.getByTestId("card-count-preview")).toHaveTextContent("1");
  });

  it("shows card-count preview for free-text type: 1 card", async () => {
    const user = userEvent.setup();
    renderPage();

    const typeSelect = screen.getByRole("combobox", { name: /note type/i });
    await user.selectOptions(typeSelect, "free-text");

    expect(screen.getByTestId("card-count-preview")).toHaveTextContent("1");
  });

  it("calls createNote and navigates on success", async () => {
    const user = userEvent.setup();
    mockCreateNote.mockResolvedValue({ data: CREATED_NOTE } as never);

    renderPage();

    await user.type(screen.getByLabelText(/front/i), "Question");
    await user.type(screen.getByLabelText(/back/i), "Answer");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(mockCreateNote).toHaveBeenCalledTimes(1));
    expect(mockCreateNote).toHaveBeenCalledWith(
      expect.objectContaining({
        deckId: "deck-001",
        noteType: "basic",
        content: expect.objectContaining({ front: "Question", back: "Answer" }),
      }),
    );
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(
        "/decks/deck-001/notes/note-new",
      ),
    );
  });
});
