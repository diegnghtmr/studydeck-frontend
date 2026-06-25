/**
 * NoteEditor — dynamic form whose fields switch by noteType.
 *
 * Accepts an optional `initialNote` for edit mode.
 * Calls `onSubmit` with the full NoteFormValues on success.
 */
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/lib/cn";
import { FIELD_CLASS } from "@shared/ui/field";
import { PillButton } from "@shared/ui/PillButton";
import type { NoteModel } from "@shared/api/types";
import {
  noteFormSchema,
  NOTE_TYPE_DEFAULTS,
  NOTE_TYPES,
  type NoteFormValues,
  type NoteType,
} from "../schemas/note-schemas";

// ---- Props ------------------------------------------------------------------

export interface NoteEditorProps {
  deckId: string;
  initialNoteType?: NoteType;
  initialNote?: NoteModel;
  onSubmit: (values: NoteFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

// ---- Field sections ---------------------------------------------------------

function BasicFields({
  register,
  errors,
}: {
  register: ReturnType<typeof useForm<NoteFormValues>>["register"];
  errors: ReturnType<typeof useForm<NoteFormValues>>["formState"]["errors"];
}) {
  const { t } = useTranslation("notes");
  const basicErrors = errors as {
    content?: { front?: { message?: string }; back?: { message?: string } };
  };
  return (
    <>
      <fieldset className="mb-5 border-0 p-0">
        <label
          htmlFor="note-front"
          className="mb-1.5 block text-[13px] font-medium"
          style={{ color: "var(--color-charcoal-primary)" }}
        >
          {t("fields.front")}{" "}
          <span aria-hidden="true" style={{ color: "var(--color-ember-orange)" }}>
            *
          </span>
        </label>
        <textarea
          id="note-front"
          rows={3}
          aria-required="true"
          aria-invalid={Boolean(basicErrors.content?.front)}
          {...register("content.front" as Parameters<typeof register>[0])}
          className={cn("w-full text-[15px]", FIELD_CLASS)}
          style={{ color: "var(--color-charcoal-primary)" }}
        />
        {basicErrors.content?.front && (
          <p role="alert" className="mt-1.5 text-[12px]" style={{ color: "var(--color-coral-red)" }}>
            {basicErrors.content.front.message}
          </p>
        )}
      </fieldset>

      <fieldset className="mb-5 border-0 p-0">
        <label
          htmlFor="note-back"
          className="mb-1.5 block text-[13px] font-medium"
          style={{ color: "var(--color-charcoal-primary)" }}
        >
          {t("fields.back")}{" "}
          <span aria-hidden="true" style={{ color: "var(--color-ember-orange)" }}>
            *
          </span>
        </label>
        <textarea
          id="note-back"
          rows={4}
          aria-required="true"
          aria-invalid={Boolean(basicErrors.content?.back)}
          {...register("content.back" as Parameters<typeof register>[0])}
          className={cn("w-full text-[15px]", FIELD_CLASS)}
          style={{ color: "var(--color-charcoal-primary)" }}
        />
        {basicErrors.content?.back && (
          <p role="alert" className="mt-1.5 text-[12px]" style={{ color: "var(--color-coral-red)" }}>
            {basicErrors.content.back.message}
          </p>
        )}
      </fieldset>
    </>
  );
}

function ClozeFields({
  register,
  errors,
}: {
  register: ReturnType<typeof useForm<NoteFormValues>>["register"];
  errors: ReturnType<typeof useForm<NoteFormValues>>["formState"]["errors"];
}) {
  const { t } = useTranslation("notes");
  const clozeErrors = errors as {
    content?: { text?: { message?: string } };
  };
  return (
    <fieldset className="mb-5 border-0 p-0">
      <label
        htmlFor="note-cloze-text"
        className="mb-1.5 block text-[13px] font-medium"
        style={{ color: "var(--color-charcoal-primary)" }}
      >
        {t("fields.clozeText")}{" "}
        <span aria-hidden="true" style={{ color: "var(--color-ember-orange)" }}>
          *
        </span>
      </label>
      <p className="mb-2 text-[12px]" style={{ color: "var(--color-ash)" }}>
        {t("fields.clozeHint")}
      </p>
      <textarea
        id="note-cloze-text"
        rows={5}
        aria-required="true"
        aria-invalid={Boolean(clozeErrors.content?.text)}
        {...register("content.text" as Parameters<typeof register>[0])}
        className={cn("w-full font-mono text-[15px]", FIELD_CLASS)}
        style={{
          backgroundColor: "var(--color-stone-surface)",
          color: "var(--color-charcoal-primary)",
        }}
      />
      {clozeErrors.content?.text && (
        <p role="alert" className="mt-1.5 text-[12px]" style={{ color: "var(--color-coral-red)" }}>
          {clozeErrors.content.text.message}
        </p>
      )}
    </fieldset>
  );
}

interface McqFieldsProps {
  control: ReturnType<typeof useForm<NoteFormValues>>["control"];
  register: ReturnType<typeof useForm<NoteFormValues>>["register"];
  errors: ReturnType<typeof useForm<NoteFormValues>>["formState"]["errors"];
  watch: ReturnType<typeof useForm<NoteFormValues>>["watch"];
  setValue: ReturnType<typeof useForm<NoteFormValues>>["setValue"];
}

function McqFields({ control, register, errors, watch, setValue }: McqFieldsProps) {
  const { t } = useTranslation("notes");
  const mcqErrors = errors as {
    content?: {
      question?: { message?: string };
      options?: Array<{ text?: { message?: string } }>;
      correctOptionKeys?: { message?: string };
    };
  };

  const { fields, append, remove } = useFieldArray({
    control,
    name: "content.options" as never,
  });

  const correctKeys = (watch("content.correctOptionKeys" as never) as string[]) ?? [];

  function toggleCorrect(key: string) {
    if (correctKeys.includes(key)) {
      setValue(
        "content.correctOptionKeys" as Parameters<typeof setValue>[0],
        correctKeys.filter((k) => k !== key),
      );
    } else {
      setValue(
        "content.correctOptionKeys" as Parameters<typeof setValue>[0],
        [...correctKeys, key],
      );
    }
  }

  const optionKeys = ["A", "B", "C", "D", "E"] as const;

  return (
    <>
      <fieldset className="mb-5 border-0 p-0">
        <label
          htmlFor="note-question"
          className="mb-1.5 block text-[13px] font-medium"
          style={{ color: "var(--color-charcoal-primary)" }}
        >
          {t("fields.question")}{" "}
          <span aria-hidden="true" style={{ color: "var(--color-ember-orange)" }}>
            *
          </span>
        </label>
        <textarea
          id="note-question"
          rows={3}
          aria-required="true"
          aria-invalid={Boolean(mcqErrors.content?.question)}
          {...register("content.question" as Parameters<typeof register>[0])}
          className={cn("w-full text-[15px]", FIELD_CLASS)}
          style={{ color: "var(--color-charcoal-primary)" }}
        />
        {mcqErrors.content?.question && (
          <p role="alert" className="mt-1.5 text-[12px]" style={{ color: "var(--color-coral-red)" }}>
            {mcqErrors.content.question.message}
          </p>
        )}
      </fieldset>

      <fieldset className="mb-5 border-0 p-0">
        <legend className="mb-2 text-[13px] font-medium" style={{ color: "var(--color-charcoal-primary)" }}>
          {t("fields.options")}{" "}
          <span className="text-[12px] font-normal" style={{ color: "var(--color-ash)" }}>
            {t("fields.optionsHintEditor")}
          </span>
        </legend>

        <div className="flex flex-col gap-2">
          {fields.map((field, index) => {
            const key = optionKeys[index] ?? String(index);
            const isCorrect = correctKeys.includes(key);
            return (
              <div key={field.id} className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-medium"
                  style={{
                    backgroundColor: isCorrect
                      ? "var(--color-meadow-green)"
                      : "var(--color-stone-surface)",
                    color: isCorrect ? "#fff" : "var(--color-graphite)",
                  }}
                >
                  {key}
                </span>

                <input
                  type="checkbox"
                  aria-label={t("fields.markAsCorrect")}
                  checked={isCorrect}
                  onChange={() => toggleCorrect(key)}
                  className="sr-only"
                  id={`correct-${key}`}
                />
                <label
                  htmlFor={`correct-${key}`}
                  className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border text-[11px] font-bold"
                  style={{
                    borderColor: isCorrect ? "var(--color-meadow-green)" : "var(--color-fog)",
                    backgroundColor: isCorrect ? "var(--color-meadow-green)" : "transparent",
                    color: isCorrect ? "#fff" : "transparent",
                  }}
                  title={t("fields.markAsCorrect")}
                >
                  ✓
                </label>

                <input
                  type="text"
                  placeholder={t("fields.optionPlaceholder")}
                  aria-label={t("fields.optionAria", { key })}
                  aria-invalid={Boolean(mcqErrors.content?.options?.[index]?.text)}
                  {...register(`content.options.${index}.text` as Parameters<typeof register>[0])}
                  className={cn("flex-1 text-[14px]", FIELD_CLASS)}
                  style={{ color: "var(--color-charcoal-primary)" }}
                />

                <button
                  type="button"
                  aria-label={t("fields.removeOption")}
                  disabled={fields.length <= 4}
                  onClick={() => remove(index)}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[18px] leading-none transition-opacity",
                    fields.length <= 4 && "opacity-30 cursor-not-allowed",
                  )}
                  style={{ color: "var(--color-ash)" }}
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>

        {mcqErrors.content?.correctOptionKeys && (
          <p role="alert" className="mt-2 text-[12px]" style={{ color: "var(--color-coral-red)" }}>
            {mcqErrors.content.correctOptionKeys.message}
          </p>
        )}

        <PillButton
          type="button"
          variant="secondary"
          size="sm"
          aria-label={t("fields.addOptionAria")}
          disabled={fields.length >= 5}
          className="mt-3"
          onClick={() => {
            const nextKey = optionKeys[fields.length];
            append({ key: nextKey ?? String(fields.length), text: "" });
          }}
        >
          {t("fields.addOption")}
        </PillButton>
      </fieldset>
    </>
  );
}

function FreeTextFields({
  register,
  errors,
}: {
  register: ReturnType<typeof useForm<NoteFormValues>>["register"];
  errors: ReturnType<typeof useForm<NoteFormValues>>["formState"]["errors"];
}) {
  const { t } = useTranslation("notes");
  const ftErrors = errors as {
    content?: {
      prompt?: { message?: string };
      expectedAnswer?: { message?: string };
      gradingGuidance?: { message?: string };
    };
  };
  return (
    <>
      <fieldset className="mb-5 border-0 p-0">
        <label
          htmlFor="note-prompt"
          className="mb-1.5 block text-[13px] font-medium"
          style={{ color: "var(--color-charcoal-primary)" }}
        >
          {t("fields.prompt")}{" "}
          <span aria-hidden="true" style={{ color: "var(--color-ember-orange)" }}>
            *
          </span>
        </label>
        <textarea
          id="note-prompt"
          rows={3}
          aria-required="true"
          aria-invalid={Boolean(ftErrors.content?.prompt)}
          {...register("content.prompt" as Parameters<typeof register>[0])}
          className={cn("w-full text-[15px]", FIELD_CLASS)}
          style={{ color: "var(--color-charcoal-primary)" }}
        />
        {ftErrors.content?.prompt && (
          <p role="alert" className="mt-1.5 text-[12px]" style={{ color: "var(--color-coral-red)" }}>
            {ftErrors.content.prompt.message}
          </p>
        )}
      </fieldset>

      <fieldset className="mb-5 border-0 p-0">
        <label
          htmlFor="note-expected-answer"
          className="mb-1.5 block text-[13px] font-medium"
          style={{ color: "var(--color-charcoal-primary)" }}
        >
          {t("fields.expectedAnswer")}{" "}
          <span aria-hidden="true" style={{ color: "var(--color-ember-orange)" }}>
            *
          </span>
        </label>
        <textarea
          id="note-expected-answer"
          rows={4}
          aria-required="true"
          aria-invalid={Boolean(ftErrors.content?.expectedAnswer)}
          {...register("content.expectedAnswer" as Parameters<typeof register>[0])}
          className={cn("w-full text-[15px]", FIELD_CLASS)}
          style={{ color: "var(--color-charcoal-primary)" }}
        />
        {ftErrors.content?.expectedAnswer && (
          <p role="alert" className="mt-1.5 text-[12px]" style={{ color: "var(--color-coral-red)" }}>
            {ftErrors.content.expectedAnswer.message}
          </p>
        )}
      </fieldset>

      <fieldset className="mb-5 border-0 p-0">
        <label
          htmlFor="note-grading-guidance"
          className="mb-1.5 block text-[13px] font-medium"
          style={{ color: "var(--color-charcoal-primary)" }}
        >
          {t("fields.gradingGuidance")}{" "}
          <span className="text-[12px] font-normal" style={{ color: "var(--color-ash)" }}>
            {t("fields.optionalHint")}
          </span>
        </label>
        <textarea
          id="note-grading-guidance"
          rows={2}
          {...register("content.gradingGuidance" as Parameters<typeof register>[0])}
          className={cn("w-full text-[15px]", FIELD_CLASS)}
          style={{ color: "var(--color-charcoal-primary)" }}
        />
      </fieldset>
    </>
  );
}

// ---- Build default values from an existing note ----------------------------

function buildDefaultsFromNote(note: NoteModel): NoteFormValues {
  const noteType = note.noteType as NoteType;
  const base = { noteType, tags: note.tags };

  switch (noteType) {
    case "basic":
    case "reversed": {
      const c = note.content as { front: string; back: string };
      return { ...base, noteType, content: { front: c.front ?? "", back: c.back ?? "" } };
    }
    case "cloze": {
      const c = note.content as { text: string };
      return { ...base, noteType, content: { text: c.text ?? "" } };
    }
    case "multiple-choice": {
      const c = note.content as {
        question: string;
        options: { key: string; text: string }[];
        correctOptionKeys: string[];
      };
      return {
        ...base,
        noteType,
        content: {
          question: c.question ?? "",
          options: c.options ?? [],
          correctOptionKeys: Array.isArray(c.correctOptionKeys)
            ? c.correctOptionKeys
            : [...(c.correctOptionKeys as unknown as Set<string>)],
        },
      };
    }
    case "free-text": {
      const c = note.content as {
        prompt: string;
        expectedAnswer: string;
        gradingGuidance?: string;
      };
      return {
        ...base,
        noteType,
        content: {
          prompt: c.prompt ?? "",
          expectedAnswer: c.expectedAnswer ?? "",
          ...(c.gradingGuidance !== undefined ? { gradingGuidance: c.gradingGuidance } : {}),
        },
      };
    }
    default:
      return NOTE_TYPE_DEFAULTS[noteType as NoteType] ?? NOTE_TYPE_DEFAULTS.basic;
  }
}

// ---- NoteEditor -------------------------------------------------------------

export function NoteEditor({
  initialNoteType = "basic",
  initialNote,
  onSubmit,
  isSubmitting: externalSubmitting = false,
  onCancel,
}: NoteEditorProps) {
  const { t } = useTranslation("notes");
  const startType: NoteType = (initialNote?.noteType as NoteType) ?? initialNoteType;
  const [currentType, setCurrentType] = useState<NoteType>(startType);

  // The note type is fixed once a note exists — editing it would change the
  // derived cards, and the type is already shown by the note's badge, so we
  // hide the selector entirely on edit.
  const isTypeLocked = Boolean(initialNote);

  const defaultValues: NoteFormValues = initialNote
    ? buildDefaultsFromNote(initialNote)
    : NOTE_TYPE_DEFAULTS[startType];

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting: formSubmitting },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues,
  });

  const isSubmitting = externalSubmitting || formSubmitting;

  function handleTypeChange(newType: NoteType) {
    setCurrentType(newType);
    reset(NOTE_TYPE_DEFAULTS[newType]);
  }

  async function handleFormSubmit(values: NoteFormValues) {
    await onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      {/* Note type selector — only when creating; on edit the type is fixed and
          already shown by the note's type badge, so we omit it to avoid redundancy. */}
      {!isTypeLocked && (
        <fieldset className="mb-6 border-0 p-0">
          <label
            htmlFor="note-type"
            className="mb-1.5 block text-[13px] font-medium"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            {t("fields.noteType")}
          </label>
          <select
            id="note-type"
            aria-label={t("fields.noteTypeAria")}
            value={currentType}
            onChange={(e) => handleTypeChange(e.target.value as NoteType)}
            className={cn("text-[14px]", FIELD_CLASS)}
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            {NOTE_TYPES.map((nt) => (
              <option key={nt.value} value={nt.value}>
                {nt.label}
              </option>
            ))}
          </select>
        </fieldset>
      )}

      {/* Dynamic content fields */}
      {(currentType === "basic") && (
        <BasicFields register={register} errors={errors} />
      )}
      {(currentType === "reversed") && (
        <BasicFields register={register} errors={errors} />
      )}
      {currentType === "cloze" && (
        <ClozeFields register={register} errors={errors} />
      )}
      {currentType === "multiple-choice" && (
        <McqFields
          control={control}
          register={register}
          errors={errors}
          watch={watch}
          setValue={setValue}
        />
      )}
      {currentType === "free-text" && (
        <FreeTextFields register={register} errors={errors} />
      )}

      {/* Actions */}
      <div className="mt-2 flex items-center gap-3">
        <PillButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("actions.saving") : t("actions.save")}
        </PillButton>

        {onCancel && (
          <PillButton type="button" variant="secondary" onClick={onCancel}>
            {t("actions.cancel")}
          </PillButton>
        )}
      </div>
    </form>
  );
}
