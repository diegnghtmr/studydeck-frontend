/**
 * Extended types that supplement the generated API models.
 *
 * The code generator emits Deck = AuditFields (allOf collapsed to the base only),
 * so we redeclare it here with all properties from the OpenAPI spec.
 * Import DeckModel from this file instead of the generated one.
 *
 * Same issue affects Note and Card — their generated types collapse to AuditFields.
 * We redeclare them here with all properties from the OpenAPI spec.
 */
import type { AuditFields } from "./generated/models/audit-fields";
import type { NoteType } from "./generated/models/note-type";

// ---- Deck types ----------------------------------------------------------------

export interface DeckModel extends AuditFields {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  archived: boolean;
  defaultDesiredRetention?: number;
}

export interface PagedDeckModel {
  items: DeckModel[];
  page: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
  };
}

// ---- Note content types --------------------------------------------------------

export interface BasicNoteContentModel {
  front: string;
  back: string;
}

export interface ReversedNoteContentModel {
  front: string;
  back: string;
}

export interface ClozeNoteContentModel {
  text: string;
}

export interface MultipleChoiceOptionModel {
  key: string;
  text: string;
}

export interface MultipleChoiceNoteContentModel {
  question: string;
  options: MultipleChoiceOptionModel[];
  correctOptionKeys: string[];
  explanation?: string;
}

export interface FreeTextNoteContentModel {
  prompt: string;
  expectedAnswer: string;
  gradingGuidance?: string;
}

export type NoteContentModel =
  | BasicNoteContentModel
  | ReversedNoteContentModel
  | ClozeNoteContentModel
  | MultipleChoiceNoteContentModel
  | FreeTextNoteContentModel;

// ---- Note model ----------------------------------------------------------------

export interface NoteModel extends AuditFields {
  id: string;
  deckId: string;
  noteType: NoteType;
  tags: string[];
  source?: unknown;
  content: NoteContentModel;
}

export interface PagedNoteModel {
  items: NoteModel[];
  page: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
  };
}

// ---- Card model ----------------------------------------------------------------

export interface CardModel extends AuditFields {
  id: string;
  noteId: string;
  deckId: string;
  noteType: NoteType;
  cardVariant: string;
  position: number;
  suspended: boolean;
  dueAt?: string;
  schedulerState?: unknown;
}

export interface CardPreviewModel {
  cardId: string;
  front: string;
  back: string;
  hint?: string;
}

// ---- Review types --------------------------------------------------------------

export const REVIEW_RATING = {
  AGAIN: "again",
  HARD: "hard",
  GOOD: "good",
  EASY: "easy",
} as const;

export type ReviewRating = (typeof REVIEW_RATING)[keyof typeof REVIEW_RATING];

export const REVIEW_SESSION_STATUS = {
  STARTED: "started",
  COMPLETED: "completed",
  ABANDONED: "abandoned",
} as const;

export type ReviewSessionStatus =
  (typeof REVIEW_SESSION_STATUS)[keyof typeof REVIEW_SESSION_STATUS];

export interface SchedulerStateModel {
  dueAt?: string;
  stability?: number;
  difficulty?: number;
  retrievability?: number;
  elapsedDays?: number;
  scheduledDays?: number;
  desiredRetention?: number;
}

export interface ReviewSessionModel extends AuditFields {
  id: string;
  deckId?: string;
  status: ReviewSessionStatus;
  startedAt: string;
  endedAt?: string;
  presentedCount?: number;
  answeredCount?: number;
}

export interface NextReviewCardModel {
  sessionId: string;
  card: CardModel;
}

export interface FSRSReviewResultModel {
  cardId: string;
  sessionId?: string;
  rating: ReviewRating;
  reviewedAt: string;
  previousState: SchedulerStateModel;
  nextState: SchedulerStateModel;
  historyEntryId?: string;
}

export interface ReviewSubmitPayload {
  sessionId?: string | undefined;
  cardId: string;
  rating: ReviewRating;
  responseTimeMs?: number | undefined;
  revealedAnswer?: boolean | undefined;
  clientPresentAt?: string | undefined;
}

export interface ReviewSessionCreatePayload {
  deckId?: string | undefined;
  maxCards?: number | undefined;
  includeLearning?: boolean | undefined;
}

export interface ReviewLogModel extends AuditFields {
  id: string;
  sessionId?: string;
  cardId: string;
  rating: ReviewRating;
  reviewedAt: string;
  responseTimeMs?: number;
  schedulerSnapshot?: FSRSReviewResultModel;
}

export interface PagedReviewLogModel {
  items: ReviewLogModel[];
  page: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
  };
}

// ---- DeckStats type ------------------------------------------------------------

export interface DeckStatsModel {
  deckId: string;
  totalNotes: number;
  totalCards: number;
  dueToday: number;
  reviewedToday: number;
  suspendedCards: number;
  againRate7d?: number | undefined;
  averageRetention30d?: number | undefined;
}

// ---- Due cards type ------------------------------------------------------------

export interface DueCardsModel {
  items: CardModel[];
}
