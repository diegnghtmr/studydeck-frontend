/**
 * CreateNotePage — /decks/:deckId/notes/new
 *
 * Manages form state directly (not via NoteEditor) so the card-count preview
 * can watch live values. On submit, calls useCreateNote and navigates to the
 * note detail page.
 */
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { normalizeApiProblem } from "@shared/api/problem";
import { useCreateNote } from "./hooks/use-notes";
import { cn } from "@shared/lib/cn";
import {
  noteFormSchema,
  estimateCardCount,
  NOTE_TYPE_DEFAULTS,
  NOTE_TYPES,
  type NoteFormValues,
  type NoteType,
} from "./schemas/note-schemas";

export function CreateNotePage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const createNote = useCreateNote();
  const [apiProblem, setApiProblem] = useState<ReturnType<typeof normalizeApiProblem>>(null);
  const [currentType, setCurrentType] = useState<NoteType>("basic");

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: NOTE_TYPE_DEFAULTS.basic,
  });

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting } } = form;

  // Watch values for the card-count preview
  const allValues = useWatch({ control }) as NoteFormValues;
  const cardCount = estimateCardCount({ ...NOTE_TYPE_DEFAULTS[currentType], ...allValues });

  const { fields: optionFields, append, remove } = useFieldArray({
    control,
    name: "content.options" as never,
  });

  const correctKeys = (watch("content.correctOptionKeys" as never) as string[]) ?? [];
  const optionKeys = ["A", "B", "C", "D", "E"] as const;

  function handleTypeChange(newType: NoteType) {
    setCurrentType(newType);
    reset(NOTE_TYPE_DEFAULTS[newType]);
  }

  function toggleCorrect(key: string) {
    if (correctKeys.includes(key)) {
      setValue("content.correctOptionKeys" as Parameters<typeof setValue>[0], correctKeys.filter((k) => k !== key));
    } else {
      setValue("content.correctOptionKeys" as Parameters<typeof setValue>[0], [...correctKeys, key]);
    }
  }

  if (!deckId) return null;

  const resolvedDeckId: string = deckId;

  async function onSubmit(values: NoteFormValues) {
    setApiProblem(null);
    try {
      const note = await createNote.mutateAsync({
        deckId: resolvedDeckId,
        noteType: values.noteType,
        content: values.content as never,
        ...(values.tags && values.tags.length > 0 ? { tags: values.tags } : {}),
      });
      navigate(`/decks/${deckId}/notes/${note.id}`);
    } catch (err) {
      const problem = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setApiProblem(
        problem ?? {
          type: "about:blank",
          title: "Something went wrong",
          status: 500,
          detail: "Could not create the note. Please try again.",
        },
      );
    }
  }

  const basicErrors = errors as { content?: { front?: { message?: string }; back?: { message?: string } } };
  const clozeErrors = errors as { content?: { text?: { message?: string } } };
  const mcqErrors = errors as {
    content?: {
      question?: { message?: string };
      options?: Array<{ text?: { message?: string } }>;
      correctOptionKeys?: { message?: string };
    };
  };
  const ftErrors = errors as {
    content?: { prompt?: { message?: string }; expectedAnswer?: { message?: string } };
  };

  return (
    <main data-testid="create-note-page" className="mx-auto max-w-[720px] px-6 py-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-[13px]">
        <Link to="/decks" className="no-underline transition-opacity hover:opacity-70" style={{ color: "var(--color-ash)" }}>
          My Decks
        </Link>
        <span style={{ color: "var(--color-fog)" }} aria-hidden="true">/</span>
        <Link to={`/decks/${deckId}`} className="no-underline transition-opacity hover:opacity-70" style={{ color: "var(--color-ash)" }}>
          Deck
        </Link>
        <span style={{ color: "var(--color-fog)" }} aria-hidden="true">/</span>
        <span style={{ color: "var(--color-charcoal-primary)" }}>New note</span>
      </nav>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[23px] font-semibold" style={{ color: "var(--color-charcoal-primary)", letterSpacing: "-0.44px" }}>
          Create a note
        </h1>

        {/* Live card-count preview */}
        <div
          data-testid="card-count-preview"
          className="inline-flex items-center gap-1.5 rounded-[32px] px-3 py-1.5"
          style={{ backgroundColor: "var(--color-stone-surface)", color: "var(--color-graphite)" }}
        >
          <span className="text-[19px] font-semibold" style={{ color: "var(--color-charcoal-primary)" }}>
            {cardCount}
          </span>
          <span className="text-[13px]">{cardCount === 1 ? "card" : "cards"} will be generated</span>
        </div>
      </div>

      {apiProblem && (
        <ProblemBanner problem={apiProblem} className="mb-6" onDismiss={() => setApiProblem(null)} />
      )}

      <div
        className="rounded-[10px] p-6"
        style={{ backgroundColor: "var(--color-parchment-card)", boxShadow: "var(--shadow-subtle)" }}
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Note type selector */}
          <fieldset className="mb-6 border-0 p-0">
            <label htmlFor="note-type" className="mb-1.5 block text-[13px] font-medium" style={{ color: "var(--color-charcoal-primary)" }}>
              Note type
            </label>
            <select
              id="note-type"
              aria-label="Note type"
              value={currentType}
              onChange={(e) => handleTypeChange(e.target.value as NoteType)}
              className="rounded-[10px] border-0 px-4 py-2.5 text-[14px] outline-none focus:ring-2"
              style={{ backgroundColor: "var(--color-stone-surface)", color: "var(--color-charcoal-primary)" }}
            >
              {NOTE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </fieldset>

          {/* Basic / Reversed */}
          {(currentType === "basic" || currentType === "reversed") && (
            <>
              <fieldset className="mb-5 border-0 p-0">
                <label htmlFor="note-front" className="mb-1.5 block text-[13px] font-medium" style={{ color: "var(--color-charcoal-primary)" }}>
                  Front <span aria-hidden="true" style={{ color: "var(--color-ember-orange)" }}>*</span>
                </label>
                <textarea id="note-front" rows={3} aria-required="true" aria-invalid={Boolean(basicErrors.content?.front)}
                  {...register("content.front" as Parameters<typeof register>[0])}
                  className="w-full resize-none rounded-[10px] border-0 px-4 py-2.5 text-[15px] outline-none focus:ring-2"
                  style={{ backgroundColor: "var(--color-stone-surface)", color: "var(--color-charcoal-primary)" }}
                />
                {basicErrors.content?.front && (
                  <p role="alert" className="mt-1.5 text-[12px]" style={{ color: "var(--color-coral-red)" }}>
                    {basicErrors.content.front.message}
                  </p>
                )}
              </fieldset>
              <fieldset className="mb-5 border-0 p-0">
                <label htmlFor="note-back" className="mb-1.5 block text-[13px] font-medium" style={{ color: "var(--color-charcoal-primary)" }}>
                  Back <span aria-hidden="true" style={{ color: "var(--color-ember-orange)" }}>*</span>
                </label>
                <textarea id="note-back" rows={4} aria-required="true" aria-invalid={Boolean(basicErrors.content?.back)}
                  {...register("content.back" as Parameters<typeof register>[0])}
                  className="w-full resize-none rounded-[10px] border-0 px-4 py-2.5 text-[15px] outline-none focus:ring-2"
                  style={{ backgroundColor: "var(--color-stone-surface)", color: "var(--color-charcoal-primary)" }}
                />
                {basicErrors.content?.back && (
                  <p role="alert" className="mt-1.5 text-[12px]" style={{ color: "var(--color-coral-red)" }}>
                    {basicErrors.content.back.message}
                  </p>
                )}
              </fieldset>
            </>
          )}

          {/* Cloze */}
          {currentType === "cloze" && (
            <fieldset className="mb-5 border-0 p-0">
              <label htmlFor="note-cloze-text" className="mb-1.5 block text-[13px] font-medium" style={{ color: "var(--color-charcoal-primary)" }}>
                Cloze Text <span aria-hidden="true" style={{ color: "var(--color-ember-orange)" }}>*</span>
              </label>
              <p className="mb-2 text-[12px]" style={{ color: "var(--color-ash)" }}>
                Wrap deletions in double braces: <code>{"{{c1::answer}}"}</code>, <code>{"{{c2::another}}"}</code>
              </p>
              <textarea id="note-cloze-text" rows={5} aria-required="true" aria-invalid={Boolean(clozeErrors.content?.text)}
                {...register("content.text" as Parameters<typeof register>[0])}
                className="w-full resize-none rounded-[10px] border-0 px-4 py-2.5 text-[15px] font-mono outline-none focus:ring-2"
                style={{ backgroundColor: "var(--color-stone-surface)", color: "var(--color-charcoal-primary)" }}
              />
              {clozeErrors.content?.text && (
                <p role="alert" className="mt-1.5 text-[12px]" style={{ color: "var(--color-coral-red)" }}>
                  {clozeErrors.content.text.message}
                </p>
              )}
            </fieldset>
          )}

          {/* Multiple Choice */}
          {currentType === "multiple-choice" && (
            <>
              <fieldset className="mb-5 border-0 p-0">
                <label htmlFor="note-question" className="mb-1.5 block text-[13px] font-medium" style={{ color: "var(--color-charcoal-primary)" }}>
                  Question <span aria-hidden="true" style={{ color: "var(--color-ember-orange)" }}>*</span>
                </label>
                <textarea id="note-question" rows={3} aria-required="true" aria-invalid={Boolean(mcqErrors.content?.question)}
                  {...register("content.question" as Parameters<typeof register>[0])}
                  className="w-full resize-none rounded-[10px] border-0 px-4 py-2.5 text-[15px] outline-none focus:ring-2"
                  style={{ backgroundColor: "var(--color-stone-surface)", color: "var(--color-charcoal-primary)" }}
                />
                {mcqErrors.content?.question && (
                  <p role="alert" className="mt-1.5 text-[12px]" style={{ color: "var(--color-coral-red)" }}>
                    {mcqErrors.content.question.message}
                  </p>
                )}
              </fieldset>
              <fieldset className="mb-5 border-0 p-0">
                <legend className="mb-2 text-[13px] font-medium" style={{ color: "var(--color-charcoal-primary)" }}>
                  Options <span className="text-[12px] font-normal" style={{ color: "var(--color-ash)" }}>(4–5, check correct)</span>
                </legend>
                <div className="flex flex-col gap-2">
                  {optionFields.map((field, index) => {
                    const key = optionKeys[index] ?? String(index);
                    const isCorrect = correctKeys.includes(key);
                    return (
                      <div key={field.id} className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-medium"
                          style={{ backgroundColor: isCorrect ? "var(--color-meadow-green)" : "var(--color-stone-surface)", color: isCorrect ? "#fff" : "var(--color-graphite)" }}>
                          {key}
                        </span>
                        <input type="checkbox" aria-label="Mark as correct" checked={isCorrect} onChange={() => toggleCorrect(key)} className="sr-only" id={`correct-${key}`} />
                        <label htmlFor={`correct-${key}`}
                          className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border text-[11px] font-bold"
                          style={{ borderColor: isCorrect ? "var(--color-meadow-green)" : "var(--color-fog)", backgroundColor: isCorrect ? "var(--color-meadow-green)" : "transparent", color: isCorrect ? "#fff" : "transparent" }}
                          title="Mark as correct">✓</label>
                        <input type="text" placeholder="Option text"
                          aria-label={`Option ${key} text`}
                          aria-invalid={Boolean(mcqErrors.content?.options?.[index]?.text)}
                          {...register(`content.options.${index}.text` as Parameters<typeof register>[0])}
                          className="flex-1 rounded-[10px] border-0 px-3 py-2 text-[14px] outline-none focus:ring-2"
                          style={{ backgroundColor: "var(--color-stone-surface)", color: "var(--color-charcoal-primary)" }}
                        />
                        <button type="button" aria-label="Remove option" disabled={optionFields.length <= 4}
                          onClick={() => remove(index)}
                          className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[18px] leading-none transition-opacity", optionFields.length <= 4 && "opacity-30 cursor-not-allowed")}
                          style={{ color: "var(--color-ash)" }}>&times;</button>
                      </div>
                    );
                  })}
                </div>
                {mcqErrors.content?.correctOptionKeys && (
                  <p role="alert" className="mt-2 text-[12px]" style={{ color: "var(--color-coral-red)" }}>
                    {mcqErrors.content.correctOptionKeys.message}
                  </p>
                )}
                <button type="button" aria-label="Add option" disabled={optionFields.length >= 5}
                  onClick={() => { const nextKey = optionKeys[optionFields.length]; append({ key: nextKey ?? String(optionFields.length), text: "" }); }}
                  className={cn("mt-3 rounded-[32px] px-4 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-80", optionFields.length >= 5 && "opacity-30 cursor-not-allowed")}
                  style={{ backgroundColor: "var(--color-stone-surface)", color: "var(--color-graphite)" }}>
                  + Add option
                </button>
              </fieldset>
            </>
          )}

          {/* Free Text */}
          {currentType === "free-text" && (
            <>
              <fieldset className="mb-5 border-0 p-0">
                <label htmlFor="note-prompt" className="mb-1.5 block text-[13px] font-medium" style={{ color: "var(--color-charcoal-primary)" }}>
                  Prompt <span aria-hidden="true" style={{ color: "var(--color-ember-orange)" }}>*</span>
                </label>
                <textarea id="note-prompt" rows={3} aria-required="true" aria-invalid={Boolean(ftErrors.content?.prompt)}
                  {...register("content.prompt" as Parameters<typeof register>[0])}
                  className="w-full resize-none rounded-[10px] border-0 px-4 py-2.5 text-[15px] outline-none focus:ring-2"
                  style={{ backgroundColor: "var(--color-stone-surface)", color: "var(--color-charcoal-primary)" }}
                />
                {ftErrors.content?.prompt && (
                  <p role="alert" className="mt-1.5 text-[12px]" style={{ color: "var(--color-coral-red)" }}>
                    {ftErrors.content.prompt.message}
                  </p>
                )}
              </fieldset>
              <fieldset className="mb-5 border-0 p-0">
                <label htmlFor="note-expected-answer" className="mb-1.5 block text-[13px] font-medium" style={{ color: "var(--color-charcoal-primary)" }}>
                  Expected Answer <span aria-hidden="true" style={{ color: "var(--color-ember-orange)" }}>*</span>
                </label>
                <textarea id="note-expected-answer" rows={4} aria-required="true" aria-invalid={Boolean(ftErrors.content?.expectedAnswer)}
                  {...register("content.expectedAnswer" as Parameters<typeof register>[0])}
                  className="w-full resize-none rounded-[10px] border-0 px-4 py-2.5 text-[15px] outline-none focus:ring-2"
                  style={{ backgroundColor: "var(--color-stone-surface)", color: "var(--color-charcoal-primary)" }}
                />
                {ftErrors.content?.expectedAnswer && (
                  <p role="alert" className="mt-1.5 text-[12px]" style={{ color: "var(--color-coral-red)" }}>
                    {ftErrors.content.expectedAnswer.message}
                  </p>
                )}
              </fieldset>
            </>
          )}

          {/* Actions */}
          <div className="mt-2 flex items-center gap-3">
            <button type="submit" disabled={isSubmitting}
              className="rounded-[32px] px-6 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-midnight)" }}>
              {isSubmitting ? "Saving…" : "Save"}
            </button>
            <Link to={`/decks/${deckId}`}
              className="rounded-[32px] px-5 py-2.5 text-[14px] font-medium no-underline transition-opacity hover:opacity-70"
              style={{ backgroundColor: "var(--color-stone-surface)", color: "var(--color-graphite)" }}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
