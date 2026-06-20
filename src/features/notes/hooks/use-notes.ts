import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notesApi } from "@shared/api/client";
import { queryKeys } from "@shared/query/query-keys";
import type { NoteModel, PagedNoteModel, CardModel } from "@shared/api/types";
import type { NoteType } from "@shared/api/generated/models/note-type";
import type { NotePatchRequest } from "@shared/api/generated/models/note-patch-request";

// ---- Shared params -----------------------------------------------------------

export interface UseNotesParams {
  page?: number;
  size?: number;
  sort?: string;
  noteType?: NoteType;
  tag?: string;
  search?: string;
}

// ---- Queries ----------------------------------------------------------------

/**
 * List notes belonging to a specific deck.
 */
export function useNotes(deckId: string, params: UseNotesParams = {}) {
  const { page = 0, size = 20, sort, noteType, tag, search } = params;

  return useQuery<PagedNoteModel>({
    queryKey: queryKeys.notes.list({ deckId, page, size }),
    queryFn: async () => {
      const response = await notesApi.listNotes(
        page,
        size,
        sort,
        deckId,
        noteType,
        tag,
        search,
      );
      return response.data as unknown as PagedNoteModel;
    },
    enabled: Boolean(deckId),
  });
}

/**
 * Fetch a single note by ID.
 */
export function useNote(noteId: string) {
  return useQuery<NoteModel>({
    queryKey: queryKeys.notes.detail(noteId),
    queryFn: async () => {
      const response = await notesApi.getNote(noteId);
      return response.data as unknown as NoteModel;
    },
    enabled: Boolean(noteId),
  });
}

/**
 * List cards derived from a note.
 */
export function useCardsForNote(noteId: string) {
  return useQuery<CardModel[]>({
    queryKey: queryKeys.notes.cardsByNote(noteId),
    queryFn: async () => {
      const response = await notesApi.listCardsByNote(noteId);
      const data = response.data as unknown as { items: CardModel[] };
      return data.items;
    },
    enabled: Boolean(noteId),
  });
}

// ---- Mutations --------------------------------------------------------------

/**
 * Create a new note. Invalidates the notes list for the deck.
 */
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation<NoteModel, Error, Parameters<typeof notesApi.createNote>[0]>({
    mutationFn: async (body) => {
      const response = await notesApi.createNote(body);
      return response.data as unknown as NoteModel;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.notes.list({ deckId: data.deckId }),
      });
    },
  });
}

/**
 * Update note tags or content. Invalidates the note detail and the list.
 */
export function useUpdateNote(noteId: string) {
  const queryClient = useQueryClient();

  return useMutation<NoteModel, Error, NotePatchRequest>({
    mutationFn: async (body) => {
      const response = await notesApi.patchNote(noteId, body);
      return response.data as unknown as NoteModel;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.detail(noteId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.notes.list({ deckId: data.deckId }),
      });
      // Cards may change when content changes
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.cardsByNote(noteId) });
    },
  });
}

/**
 * Delete a note and its derived cards. Navigates the caller back to the deck.
 */
export function useDeleteNote(noteId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await notesApi.deleteNote(noteId);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.notes.detail(noteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.all });
    },
  });
}
