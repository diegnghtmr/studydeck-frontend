/**
 * Client-side Zod 4 schema that mirrors the FlashcardImportV1 OpenAPI spec.
 * Used for early validation before hitting the API.
 * Server validation is still authoritative.
 */
import { z } from "zod";

// ---- Per-type note schemas ---------------------------------------------------

const importSourceSchema = z.object({
  type: z.string().optional(),
  reference: z.string().optional(),
});

const importCommonSchema = z.object({
  tags: z.array(z.string()).optional(),
  source: importSourceSchema.optional(),
});

const importBasicNoteSchema = importCommonSchema.extend({
  noteType: z.literal("basic"),
  front: z.string().min(1, { error: "Front is required." }),
  back: z.string().min(1, { error: "Back is required." }),
});

const importReversedNoteSchema = importCommonSchema.extend({
  noteType: z.literal("reversed"),
  front: z.string().min(1, { error: "Front is required." }),
  back: z.string().min(1, { error: "Back is required." }),
});

const CLOZE_DELETION_PATTERN = /\{\{c[0-9]+::.+\}\}/;

const importClozeNoteSchema = importCommonSchema.extend({
  noteType: z.literal("cloze"),
  text: z
    .string()
    .min(1, { error: "Cloze text is required." })
    .refine((val) => CLOZE_DELETION_PATTERN.test(val), {
      message: "Must contain at least one cloze deletion, e.g. {{c1::answer}}.",
    }),
});

const importMultipleChoiceOptionSchema = z.object({
  key: z.string().regex(/^[A-Z]$/, { error: "Key must be a single uppercase letter." }),
  text: z.string().min(1, { error: "Option text is required." }),
});

const importMultipleChoiceNoteSchema = importCommonSchema.extend({
  noteType: z.literal("multiple-choice"),
  question: z.string().min(1, { error: "Question is required." }),
  options: z
    .array(importMultipleChoiceOptionSchema)
    .min(4, { error: "At least 4 options are required." })
    .max(5, { error: "At most 5 options are allowed." }),
  correctOptionKeys: z
    .array(z.string().regex(/^[A-Z]$/))
    .min(1, { error: "At least one correct option must be specified." })
    .max(1, { error: "Exactly one correct option allowed." }),
  explanation: z.string().optional(),
});

const importFreeTextNoteSchema = importCommonSchema.extend({
  noteType: z.literal("free-text"),
  prompt: z.string().min(1, { error: "Prompt is required." }),
  expectedAnswer: z.string().min(1, { error: "Expected answer is required." }),
  gradingGuidance: z.string().optional(),
});

export const importNoteSchema = z.discriminatedUnion("noteType", [
  importBasicNoteSchema,
  importReversedNoteSchema,
  importClozeNoteSchema,
  importMultipleChoiceNoteSchema,
  importFreeTextNoteSchema,
]);

// ---- Top-level FlashcardImportV1 schema -------------------------------------

const importDeckInfoSchema = z.object({
  title: z
    .string()
    .min(1, { error: "Deck title is required." })
    .max(120, { error: "Title must be 120 characters or fewer." }),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
});

export const flashcardImportV1Schema = z.object({
  schemaVersion: z.literal("1.0", { error: 'schemaVersion must be "1.0".' }),
  deck: importDeckInfoSchema,
  notes: z
    .array(importNoteSchema)
    .min(1, { error: "At least one note is required." })
    .max(5000, { error: "Maximum 5000 notes per import." }),
});

export type FlashcardImportV1Input = z.infer<typeof flashcardImportV1Schema>;
export type ImportNoteInput = z.infer<typeof importNoteSchema>;
