/**
 * Zod 4 schemas for note creation / editing.
 *
 * Each note type has its own content schema. The top-level form schema is a
 * discriminated union on `noteType` so the type system narrows the content
 * correctly per branch.
 */
import { z } from "zod";

// ---- Content schemas per type -----------------------------------------------

const basicContentSchema = z.object({
  front: z
    .string()
    .min(1, { error: "Front is required." })
    .max(1000, { error: "Front must be 1000 characters or fewer." }),
  back: z
    .string()
    .min(1, { error: "Back is required." })
    .max(5000, { error: "Back must be 5000 characters or fewer." }),
});

const reversedContentSchema = z.object({
  front: z
    .string()
    .min(1, { error: "Front is required." })
    .max(1000, { error: "Front must be 1000 characters or fewer." }),
  back: z
    .string()
    .min(1, { error: "Back is required." })
    .max(5000, { error: "Back must be 5000 characters or fewer." }),
});

const CLOZE_DELETION_PATTERN = /\{\{c[0-9]+::.+\}\}/;

const clozeContentSchema = z.object({
  text: z
    .string()
    .min(1, { error: "Cloze text is required." })
    .max(5000, { error: "Text must be 5000 characters or fewer." })
    .refine((val) => CLOZE_DELETION_PATTERN.test(val), {
      message: "Must contain at least one cloze deletion, e.g. {{c1::answer}}.",
    }),
});

const mcqOptionSchema = z.object({
  key: z.string().min(1),
  text: z.string().min(1, { error: "Option text is required." }),
});

const multipleChoiceContentSchema = z
  .object({
    question: z
      .string()
      .min(1, { error: "Question is required." })
      .max(2000, { error: "Question must be 2000 characters or fewer." }),
    options: z
      .array(mcqOptionSchema)
      .min(4, { error: "At least 4 options are required." })
      .max(5, { error: "At most 5 options are allowed." }),
    correctOptionKeys: z
      .array(z.string())
      .min(1, { error: "At least one correct option must be selected." }),
  })
  .superRefine((data, ctx) => {
    // Every correctOptionKey must reference an actual option key
    const optionKeys = new Set(data.options.map((o) => o.key));
    const invalidKeys = data.correctOptionKeys.filter((k) => !optionKeys.has(k));
    if (invalidKeys.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Correct option keys must reference valid option keys.",
        path: ["correctOptionKeys"],
      });
    }
  });

const freeTextContentSchema = z.object({
  prompt: z
    .string()
    .min(1, { error: "Prompt is required." })
    .max(2000, { error: "Prompt must be 2000 characters or fewer." }),
  expectedAnswer: z
    .string()
    .min(1, { error: "Expected answer is required." })
    .max(5000, { error: "Expected answer must be 5000 characters or fewer." }),
  gradingGuidance: z
    .string()
    .max(5000, { error: "Grading guidance must be 5000 characters or fewer." })
    .optional(),
});

// ---- Per-type form schemas (discriminated union) -----------------------------

const basicNoteFormSchema = z.object({
  noteType: z.literal("basic"),
  tags: z.array(z.string()).optional(),
  content: basicContentSchema,
});

const reversedNoteFormSchema = z.object({
  noteType: z.literal("reversed"),
  tags: z.array(z.string()).optional(),
  content: reversedContentSchema,
});

const clozeNoteFormSchema = z.object({
  noteType: z.literal("cloze"),
  tags: z.array(z.string()).optional(),
  content: clozeContentSchema,
});

const multipleChoiceNoteFormSchema = z.object({
  noteType: z.literal("multiple-choice"),
  tags: z.array(z.string()).optional(),
  content: multipleChoiceContentSchema,
});

const freeTextNoteFormSchema = z.object({
  noteType: z.literal("free-text"),
  tags: z.array(z.string()).optional(),
  content: freeTextContentSchema,
});

/**
 * Top-level discriminated union — the canonical schema for the note editor.
 * Discriminates on `noteType`.
 */
export const noteFormSchema = z.discriminatedUnion("noteType", [
  basicNoteFormSchema,
  reversedNoteFormSchema,
  clozeNoteFormSchema,
  multipleChoiceNoteFormSchema,
  freeTextNoteFormSchema,
]);

export type NoteFormValues = z.infer<typeof noteFormSchema>;
export type NoteType = NoteFormValues["noteType"];

// ---- Per-type default values ------------------------------------------------

export const NOTE_TYPE_DEFAULTS: Record<NoteType, NoteFormValues> = {
  basic: { noteType: "basic", content: { front: "", back: "" } },
  reversed: { noteType: "reversed", content: { front: "", back: "" } },
  cloze: { noteType: "cloze", content: { text: "" } },
  "multiple-choice": {
    noteType: "multiple-choice",
    content: {
      question: "",
      options: [
        { key: "A", text: "" },
        { key: "B", text: "" },
        { key: "C", text: "" },
        { key: "D", text: "" },
      ],
      correctOptionKeys: [],
    },
  },
  "free-text": {
    noteType: "free-text",
    content: { prompt: "", expectedAnswer: "" },
  },
};

// ---- Card count estimation (client-side mirror of generation rules) ----------

/**
 * Counts how many cards would be generated for given form values.
 * - basic → 1
 * - reversed → 2
 * - cloze → distinct cN indices (c1, c2, …)
 * - multiple-choice → 1
 * - free-text → 1
 */
export function estimateCardCount(values: NoteFormValues): number {
  switch (values.noteType) {
    case "basic":
      return 1;
    case "reversed":
      return 2;
    case "cloze": {
      const matches = values.content.text.matchAll(/\{\{c([0-9]+)::/g);
      const indices = new Set<string>();
      for (const m of matches) {
        indices.add(m[1]);
      }
      return Math.max(1, indices.size);
    }
    case "multiple-choice":
      return 1;
    case "free-text":
      return 1;
  }
}

export const NOTE_TYPES = [
  { value: "basic" as const, label: "Basic" },
  { value: "reversed" as const, label: "Reversed" },
  { value: "cloze" as const, label: "Cloze" },
  { value: "multiple-choice" as const, label: "Multiple Choice" },
  { value: "free-text" as const, label: "Free Text" },
];
