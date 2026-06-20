import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";

// Mock the API client
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

import { notesApi } from "@shared/api/client";
import type { NoteModel, CardModel } from "@shared/api/types";
import {
  useNotes,
  useNote,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useCardsForNote,
} from "./use-notes";

const mockListNotes = vi.mocked(notesApi.listNotes);
const mockGetNote = vi.mocked(notesApi.getNote);
const mockCreateNote = vi.mocked(notesApi.createNote);
const mockPatchNote = vi.mocked(notesApi.patchNote);
const mockDeleteNote = vi.mocked(notesApi.deleteNote);
const mockListCardsByNote = vi.mocked(notesApi.listCardsByNote);

const DECK_ID = "deck-001";
const NOTE_ID = "note-001";

const SAMPLE_NOTE: NoteModel = {
  id: NOTE_ID,
  deckId: DECK_ID,
  noteType: "basic",
  tags: [],
  content: { front: "Q", back: "A" },
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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useNotes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches notes for a deckId", async () => {
    mockListNotes.mockResolvedValue({
      data: { items: [SAMPLE_NOTE], page: { page: 0, size: 20, totalElements: 1, totalPages: 1 } },
    } as never);

    const { result } = renderHook(() => useNotes(DECK_ID), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListNotes).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      undefined,
      DECK_ID,
      undefined,
      undefined,
      undefined,
    );
  });
});

describe("useNote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches a single note by id", async () => {
    mockGetNote.mockResolvedValue({ data: SAMPLE_NOTE } as never);

    const { result } = renderHook(() => useNote(NOTE_ID), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetNote).toHaveBeenCalledWith(NOTE_ID);
  });
});

describe("useCreateNote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls notesApi.createNote with the request body", async () => {
    mockCreateNote.mockResolvedValue({ data: SAMPLE_NOTE } as never);

    const { result } = renderHook(() => useCreateNote(), { wrapper: createWrapper() });

    await result.current.mutateAsync({
      deckId: DECK_ID,
      noteType: "basic",
      content: { front: "Q", back: "A" },
    } as never);

    expect(mockCreateNote).toHaveBeenCalledTimes(1);
  });
});

describe("useUpdateNote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls notesApi.patchNote with the note id and body", async () => {
    mockPatchNote.mockResolvedValue({ data: SAMPLE_NOTE } as never);

    const { result } = renderHook(() => useUpdateNote(NOTE_ID), { wrapper: createWrapper() });

    await result.current.mutateAsync({ tags: ["updated"] });

    expect(mockPatchNote).toHaveBeenCalledWith(NOTE_ID, { tags: ["updated"] });
  });
});

describe("useDeleteNote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls notesApi.deleteNote with the note id", async () => {
    mockDeleteNote.mockResolvedValue({ data: undefined } as never);

    const { result } = renderHook(() => useDeleteNote(NOTE_ID), { wrapper: createWrapper() });

    await result.current.mutateAsync();

    expect(mockDeleteNote).toHaveBeenCalledWith(NOTE_ID);
  });
});

describe("useCardsForNote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches cards derived from a note", async () => {
    mockListCardsByNote.mockResolvedValue({
      data: { items: [SAMPLE_CARD] },
    } as never);

    const { result } = renderHook(() => useCardsForNote(NOTE_ID), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListCardsByNote).toHaveBeenCalledWith(NOTE_ID);
  });
});
