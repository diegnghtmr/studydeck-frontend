/**
 * Typed query-key factory.
 *
 * Conventions:
 *  - Top-level keys are feature names (auth, decks, notes, cards, reviews).
 *  - Each factory returns a readonly tuple so TanStack Query can track invalidation correctly.
 *  - `all` keys cover every sub-key under that feature (used for broad invalidation).
 *
 * Usage:
 *   queryKeys.decks.list({ page: 0, size: 20 })  → ["decks", "list", { page: 0, size: 20 }]
 *   queryClient.invalidateQueries({ queryKey: queryKeys.decks.all })
 */

// Pagination params shared by list endpoints
interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
}

interface DeckListParams extends PaginationParams {
  archived?: boolean;
  search?: string;
}

interface NoteListParams extends PaginationParams {
  deckId?: string;
  noteType?: string;
  tag?: string;
  search?: string;
}

interface CardListParams extends PaginationParams {
  deckId?: string;
  suspended?: boolean;
}

export const queryKeys = {
  // ---- Auth ----
  auth: {
    all: ["auth"] as const,
    me: () => ["auth", "me"] as const,
  },

  // ---- Decks ----
  decks: {
    all: ["decks"] as const,
    list: (params?: DeckListParams) => ["decks", "list", params ?? {}] as const,
    detail: (deckId: string) => ["decks", "detail", deckId] as const,
    stats: (deckId: string) => ["decks", "stats", deckId] as const,
  },

  // ---- Notes ----
  notes: {
    all: ["notes"] as const,
    list: (params?: NoteListParams) => ["notes", "list", params ?? {}] as const,
    detail: (noteId: string) => ["notes", "detail", noteId] as const,
    cardsByNote: (noteId: string) => ["notes", "cards", noteId] as const,
  },

  // ---- Cards ----
  cards: {
    all: ["cards"] as const,
    list: (params?: CardListParams) => ["cards", "list", params ?? {}] as const,
    detail: (cardId: string) => ["cards", "detail", cardId] as const,
    due: (deckId?: string) => ["cards", "due", deckId ?? null] as const,
  },

  // ---- Reviews ----
  reviews: {
    all: ["reviews"] as const,
    sessions: (params?: PaginationParams) => ["reviews", "sessions", params ?? {}] as const,
    session: (sessionId: string) => ["reviews", "session", sessionId] as const,
    history: (params?: PaginationParams) => ["reviews", "history", params ?? {}] as const,
  },
} as const;
