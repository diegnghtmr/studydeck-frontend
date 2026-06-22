import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { decksApi } from "@shared/api/client";
import { queryKeys } from "@shared/query/query-keys";
import type { DeckModel, PagedDeckModel } from "@shared/api/types";
import type { DeckCreateRequest, DeckPatchRequest } from "@shared/api/generated/models";

export interface UseDecksParams {
  page?: number;
  size?: number;
  sort?: string;
  archived?: boolean;
  search?: string;
}

// ---- Queries ----------------------------------------------------------------

/**
 * List decks with optional pagination / filtering.
 */
export function useDecks(params: UseDecksParams = {}) {
  const { page = 0, size = 20, sort, archived, search } = params;

  return useQuery<PagedDeckModel>({
    queryKey: queryKeys.decks.list({
      page,
      size,
      ...(sort !== undefined ? { sort } : {}),
      ...(archived !== undefined ? { archived } : {}),
      ...(search !== undefined ? { search } : {}),
    }),
    queryFn: async () => {
      const response = await decksApi.listDecks(page, size, sort, archived, search);
      return response.data as unknown as PagedDeckModel;
    },
  });
}

/**
 * Fetch a single deck by ID.
 */
export function useDeck(deckId: string) {
  return useQuery<DeckModel>({
    queryKey: queryKeys.decks.detail(deckId),
    queryFn: async () => {
      const response = await decksApi.getDeck(deckId);
      return response.data as unknown as DeckModel;
    },
    enabled: Boolean(deckId),
  });
}

// ---- Mutations --------------------------------------------------------------

/**
 * Create a new deck and invalidate the list.
 * Returns the created DeckModel so callers can navigate to it.
 */
export function useCreateDeck() {
  const queryClient = useQueryClient();

  return useMutation<DeckModel, Error, DeckCreateRequest>({
    mutationFn: async (body) => {
      const response = await decksApi.createDeck(body);
      return response.data as unknown as DeckModel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
    },
  });
}

/**
 * Patch a deck (rename, description, tags, retention).
 * Invalidates both the detail and list caches.
 */
export function useUpdateDeck(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation<DeckModel, Error, DeckPatchRequest>({
    mutationFn: async (body) => {
      const response = await decksApi.patchDeck(deckId, body);
      return response.data as unknown as DeckModel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.decks.detail(deckId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
    },
  });
}

/**
 * Archive (soft-delete) a deck. Sets archived=true via PATCH.
 */
export function useArchiveDeck(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation<DeckModel, Error, void>({
    mutationFn: async () => {
      const response = await decksApi.patchDeck(deckId, { archived: true });
      return response.data as unknown as DeckModel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
    },
  });
}

/**
 * Hard-delete a deck. Invalidates the list.
 */
export function useDeleteDeck(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await decksApi.deleteDeck(deckId, true);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.decks.detail(deckId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
      // The deleted deck's notes are cached per-deck; drop them so sidebar counts don't go stale.
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
  });
}
