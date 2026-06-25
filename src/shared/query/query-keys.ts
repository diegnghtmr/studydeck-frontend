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

interface ReviewHistoryParams extends PaginationParams {
  deckId?: string;
  cardId?: string;
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
    history: (params?: ReviewHistoryParams) => ["reviews", "history", params ?? {}] as const,
  },

  // ---- Imports ----
  imports: {
    all: ["imports"] as const,
    validate: () => ["imports", "validate"] as const,
    preview: () => ["imports", "preview"] as const,
  },

  // ---- Exports ----
  exports: {
    all: ["exports"] as const,
    deck: (deckId: string) => ["exports", "deck", deckId] as const,
  },

  // ---- Documents ----
  documents: {
    all: ["documents"] as const,
    list: (params?: PaginationParams) => ["documents", "list", params ?? {}] as const,
    detail: (documentId: string) => ["documents", "detail", documentId] as const,
    chunks: (documentId: string, params?: PaginationParams) =>
      ["documents", "chunks", documentId, params ?? {}] as const,
    ingestJob: (documentId: string) => ["documents", "ingest-job", documentId] as const,
  },

  // ---- RAG ----
  rag: {
    all: ["rag"] as const,
    search: () => ["rag", "search"] as const,
  },

  // ---- AI ----
  ai: {
    all: ["ai"] as const,
    generate: () => ["ai", "generate"] as const,
  },

  // ---- Stats ----
  stats: {
    all: ["stats"] as const,
    user: () => ["stats", "user"] as const,
  },
} as const;
