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

// ---- Document types ------------------------------------------------------------
// The generated Document type collapses to AuditFields only.
// We redeclare it here with all properties from the OpenAPI spec.

export interface DocumentModel {
  id: string;
  title: string;
  sourceType: "upload" | "pasted-text" | "url";
  mimeType?: string;
  originalFilename?: string;
  textContent?: string;
  externalUrl?: string;
  ingestStatus: "registered" | "pending" | "processing" | "completed" | "failed";
  chunkCount?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PagedDocumentModel {
  items: DocumentModel[];
  page: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
  };
}

export interface IngestJobModel {
  jobId: string;
  documentId: string;
  status: "registered" | "pending" | "processing" | "completed" | "failed";
}

export interface ChunkModel {
  id: string;
  documentId: string;
  ordinal: number;
  tokenCount?: number;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface PagedChunkModel {
  items: ChunkModel[];
  page: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
  };
}

// ---- RAG types -----------------------------------------------------------------

export interface RagSearchHitModel {
  chunkId: string;
  documentId: string;
  score: number;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface RagChatResponseModel {
  answer: string;
  citations: RagSearchHitModel[];
}

export interface RagChatMessageModel {
  role: "user" | "assistant";
  content: string;
  citations?: RagSearchHitModel[];
}

// ---- AI generate types ---------------------------------------------------------

export const GENERATE_DIFFICULTY = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
} as const;

export type GenerateDifficulty = (typeof GENERATE_DIFFICULTY)[keyof typeof GENERATE_DIFFICULTY];

export const GENERATE_SOURCE_TYPE = {
  TEXT: "text",
  DOCUMENT: "document",
  RAG_CONTEXT: "rag-context",
} as const;

export type GenerateSourceType = (typeof GENERATE_SOURCE_TYPE)[keyof typeof GENERATE_SOURCE_TYPE];

export interface GeneratedFlashcardDraftModel {
  noteType: string;
  tags?: string[];
  content: unknown;
  rationale?: string;
  source?: unknown;
}

export interface GenerateFlashcardsResponseModel {
  generated: GeneratedFlashcardDraftModel[];
  warnings?: string[];
}

export interface ImproveFlashcardResponseModel {
  noteType: string;
  content: unknown;
  explanation?: string;
}

// ---- Import / Export types -----------------------------------------------------

export const IMPORT_NOTE_TYPE = {
  BASIC: "basic",
  REVERSED: "reversed",
  CLOZE: "cloze",
  MULTIPLE_CHOICE: "multiple-choice",
  FREE_TEXT: "free-text",
} as const;

export type ImportNoteType = (typeof IMPORT_NOTE_TYPE)[keyof typeof IMPORT_NOTE_TYPE];

export interface ImportSourceModel {
  type?: string;
  reference?: string;
}

export interface ImportCommonModel {
  tags?: string[];
  source?: ImportSourceModel;
}

export interface ImportBasicNoteModel extends ImportCommonModel {
  noteType: "basic";
  front: string;
  back: string;
}

export interface ImportReversedNoteModel extends ImportCommonModel {
  noteType: "reversed";
  front: string;
  back: string;
}

export interface ImportClozeNoteModel extends ImportCommonModel {
  noteType: "cloze";
  text: string;
}

export interface ImportMultipleChoiceOptionModel {
  key: string;
  text: string;
}

export interface ImportMultipleChoiceNoteModel extends ImportCommonModel {
  noteType: "multiple-choice";
  question: string;
  options: ImportMultipleChoiceOptionModel[];
  correctOptionKeys: string[];
  explanation?: string;
}

export interface ImportFreeTextNoteModel extends ImportCommonModel {
  noteType: "free-text";
  prompt: string;
  expectedAnswer: string;
  gradingGuidance?: string;
}

export type ImportNoteModel =
  | ImportBasicNoteModel
  | ImportReversedNoteModel
  | ImportClozeNoteModel
  | ImportMultipleChoiceNoteModel
  | ImportFreeTextNoteModel;

export interface ImportDeckInfoModel {
  title: string;
  description?: string;
  tags?: string[];
}

export interface FlashcardImportV1Model {
  schemaVersion: "1.0";
  deck: ImportDeckInfoModel;
  notes: ImportNoteModel[];
}

// ---- Violation (from generated, redeclared for convenience) --------------------

export interface ImportViolation {
  field?: string;
  message: string;
}

// ---- API response types -------------------------------------------------------

export interface ImportValidationResponseModel {
  valid: boolean;
  errors: ImportViolation[];
  warnings: string[];
}

export interface ImportPreviewSummaryModel {
  deckTitle: string;
  totalNotes: number;
  predictedCards: number;
  duplicateCandidates?: number;
}

export interface ImportPreviewModel {
  valid: boolean;
  summary: ImportPreviewSummaryModel;
  normalizedPayload?: FlashcardImportV1Model;
  warnings?: string[];
}

export interface ImportResultModel {
  importId: string;
  deckId: string;
  importedNotes: number;
  importedCards: number;
  warnings?: string[];
}
