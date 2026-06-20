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
