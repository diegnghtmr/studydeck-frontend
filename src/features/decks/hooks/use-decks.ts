import { useQuery } from "@tanstack/react-query";
import { decksApi } from "@shared/api/client";
import { queryKeys } from "@shared/query/query-keys";
import type { Deck, PagedDecks } from "@shared/api/generated/models";

interface UseDecksParams {
  page?: number;
  size?: number;
  sort?: string;
  archived?: boolean;
  search?: string;
}

/**
 * List decks with optional pagination/filtering.
 * F2 will consume this hook in the DeckListPage.
 */
export function useDecks(params: UseDecksParams = {}) {
  const { page = 0, size = 20, sort, archived, search } = params;

  return useQuery<PagedDecks>({
    queryKey: queryKeys.decks.list({
      page,
      size,
      ...(sort !== undefined ? { sort } : {}),
      ...(archived !== undefined ? { archived } : {}),
      ...(search !== undefined ? { search } : {}),
    }),
    queryFn: async () => {
      const response = await decksApi.listDecks(page, size, sort, archived, search);
      return response.data;
    },
  });
}

/**
 * Fetch a single deck by ID.
 * F2 will consume this hook in the DeckDetailPage.
 */
export function useDeck(deckId: string) {
  return useQuery<Deck>({
    queryKey: queryKeys.decks.detail(deckId),
    queryFn: async () => {
      const response = await decksApi.getDeck(deckId);
      return response.data;
    },
    enabled: Boolean(deckId),
  });
}
