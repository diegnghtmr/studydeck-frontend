// Public barrel for the API layer.
// Features import from here — never from generated/ directly.

export { axiosInstance } from "./axios-instance";
export { authApi, decksApi, notesApi, cardsApi, reviewsApi, documentsApi, ragApi, aiApi } from "./client";
export { normalizeApiProblem } from "./problem";
export type { ApiProblem, Violation } from "./problem";

// Re-export generated models for convenience
export type {
  AuthPrincipal,
  Deck,
  DeckCreateRequest,
  DeckPatchRequest,
  DeckStats,
  PagedDecks,
  Note,
  NoteCreateRequest,
  Card,
  PagedCards,
  Problem,
  PageMeta,
} from "./generated/models";
