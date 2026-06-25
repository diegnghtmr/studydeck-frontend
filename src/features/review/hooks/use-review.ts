import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cardsApi, reviewsApi, decksApi } from "@shared/api/client";
import { queryKeys } from "@shared/query/query-keys";
import type {
  ReviewSessionModel,
  NextReviewCardModel,
  FSRSReviewResultModel,
  ReviewSubmitPayload,
  ReviewSessionCreatePayload,
  DeckStatsModel,
  PagedReviewLogModel,
  CardModel,
} from "@shared/api/types";

// ---- Augmented return type for next-card query --------------------------------

/** Predicted days per rating returned by the backend alongside the next card. */
export interface CardPreviewIntervals {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface NextCardResult {
  card?: CardModel;
  sessionId: string;
  sessionDone: boolean;
  previewIntervals?: CardPreviewIntervals;
}

// ---- Queries -----------------------------------------------------------------

/**
 * Fetch due cards for a deck (or all decks when deckId is empty).
 */
export function useDueCards(deckId?: string, limit?: number) {
  return useQuery<CardModel[]>({
    queryKey: queryKeys.cards.due(deckId),
    queryFn: async () => {
      const response = await cardsApi.getDueCards(deckId || undefined, limit);
      const data = response.data as unknown as { items: CardModel[] };
      return data.items;
    },
    enabled: Boolean(deckId),
  });
}

/**
 * Fetch the next card to show in an active session.
 * Returns sessionDone=true when the server responds with 204 (empty queue).
 *
 * staleTime: Infinity — the session flow is driven by explicit refetches after
 * rating submission, not by automatic background re-fetching.
 */
/** Raw wire shape of the next-card response, including the optional preview intervals. */
interface NextReviewCardWire extends NextReviewCardModel {
  previewIntervals?: CardPreviewIntervals;
}

export function useNextCard(sessionId: string) {
  return useQuery<NextCardResult>({
    queryKey: [...queryKeys.reviews.session(sessionId), "next"],
    queryFn: async () => {
      const response = await reviewsApi.getNextReviewCard(sessionId);
      if (response.status === 204 || !response.data) {
        return { sessionId, sessionDone: true };
      }
      const data = response.data as unknown as NextReviewCardWire;
      return {
        card: data.card,
        sessionId,
        sessionDone: false,
        ...(data.previewIntervals !== undefined && { previewIntervals: data.previewIntervals }),
      };
    },
    enabled: Boolean(sessionId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Deck stats (totals, due counts, retention).
 */
export function useDeckStats(deckId: string) {
  return useQuery<DeckStatsModel>({
    queryKey: queryKeys.decks.stats(deckId),
    queryFn: async () => {
      const response = await decksApi.getDeckStats(deckId);
      return response.data as unknown as DeckStatsModel;
    },
    enabled: Boolean(deckId),
  });
}

/**
 * Review history with optional filters.
 */
export function useReviewHistory(params?: {
  deckId?: string;
  cardId?: string;
  page?: number;
  size?: number;
}) {
  const { deckId, cardId, page = 0, size = 20 } = params ?? {};

  return useQuery<PagedReviewLogModel>({
    queryKey: queryKeys.reviews.history({
      page,
      size,
      ...(deckId !== undefined ? { deckId } : {}),
      ...(cardId !== undefined ? { cardId } : {}),
    }),
    queryFn: async () => {
      const response = await reviewsApi.listReviewHistory(
        page,
        size,
        deckId,
        cardId,
      );
      return response.data as unknown as PagedReviewLogModel;
    },
  });
}

// ---- Mutations ---------------------------------------------------------------

/**
 * Start a new review session (optionally scoped to a deck).
 */
export function useStartSession() {
  const queryClient = useQueryClient();

  return useMutation<ReviewSessionModel, Error, ReviewSessionCreatePayload>({
    mutationFn: async (payload) => {
      // Cast to generated type — our payload is a strict subset
      const response = await reviewsApi.createReviewSession(
        payload as Parameters<typeof reviewsApi.createReviewSession>[0],
      );
      return response.data as unknown as ReviewSessionModel;
    },
    onSuccess: () => {
      // Invalidate session list only — NOT the per-session next-card query
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.sessions() });
    },
  });
}

/**
 * Submit a review rating for a card.
 * On success, invalidates the next-card query and due/stats caches.
 */
export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation<FSRSReviewResultModel, Error, ReviewSubmitPayload>({
    mutationFn: async (payload) => {
      // Cast to generated type — our payload is a strict subset
      const response = await reviewsApi.submitReview(
        payload as Parameters<typeof reviewsApi.submitReview>[0],
      );
      return response.data as unknown as FSRSReviewResultModel;
    },
    onSuccess: () => {
      // Invalidate due cards and deck stats so dashboard/deck pages update.
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
      // Invalidate user stats so the sidebar daily-goal widget and the dashboard
      // metrics (reviewedToday / dueToday / streak) reflect each review live —
      // the sidebar query is always mounted, so this refetches immediately.
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      // Invalidate review history only — NOT the per-session next-card query.
      // The component advances the session by calling getNextReviewCard directly
      // and managing state transitions itself.
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.history() });
    },
  });
}
