import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateDeck } from "./hooks/use-decks";
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { normalizeApiProblem } from "@shared/api/problem";
import { cn } from "@shared/lib/cn";

// ---- Zod schema (Zod 4) -----------------------------------------------------
const createDeckSchema = z.object({
  title: z
    .string()
    .min(1, { error: "Deck name is required." })
    .max(120, { error: "Name must be 120 characters or fewer." }),
  description: z.string().max(1000, { error: "Description must be 1000 characters or fewer." }).optional(),
  visibility: z.enum(["private", "public"]),
});

// Use the input type so useForm gets the raw (pre-transform) shape
type CreateDeckForm = z.input<typeof createDeckSchema>;

// ---- Component --------------------------------------------------------------

/**
 * CreateDeckPage — /decks/new
 *
 * RHF + Zod form. On success: invalidates decks list, navigates to the new deck.
 */
export function CreateDeckPage() {
  const navigate = useNavigate();
  const createDeck = useCreateDeck();
  const [apiProblem, setApiProblem] = useState<ReturnType<typeof normalizeApiProblem>>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateDeckForm>({
    resolver: zodResolver(createDeckSchema),
    defaultValues: {
      title: "",
      description: "",
      visibility: "private",
    },
  });

  async function onSubmit(values: CreateDeckForm) {
    setApiProblem(null);

    const descriptionValue = values.description?.trim();
    const createPayload = {
      title: values.title,
      ...(descriptionValue ? { description: descriptionValue } : {}),
    };

    try {
      const deck = await createDeck.mutateAsync(createPayload);

      navigate(`/decks/${deck.id}`);
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
          detail: "Could not create the deck. Please try again.",
        },
      );
    }
  }

  return (
    <main
      data-testid="create-deck-page"
      className="mx-auto max-w-[600px] px-6 py-12"
    >
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-[13px]">
        <Link
          to="/decks"
          className="no-underline transition-opacity hover:opacity-70"
          style={{ color: "var(--color-ash)" }}
        >
          My Decks
        </Link>
        <span style={{ color: "var(--color-fog)" }} aria-hidden="true">/</span>
        <span style={{ color: "var(--color-charcoal-primary)" }}>New deck</span>
      </nav>

      <h1
        className="mb-8 text-[23px] font-semibold"
        style={{
          color: "var(--color-charcoal-primary)",
          letterSpacing: "-0.44px",
        }}
      >
        Create a deck
      </h1>

      {/* API error banner */}
      {apiProblem && (
        <ProblemBanner
          problem={apiProblem}
          className="mb-6"
          onDismiss={() => setApiProblem(null)}
        />
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        data-testid="create-deck-form"
      >
        {/* Deck name */}
        <fieldset className="mb-5 border-0 p-0">
          <label
            htmlFor="deck-title"
            className="mb-1.5 block text-[13px] font-medium"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            Deck name <span aria-hidden="true" style={{ color: "var(--color-ember-orange)" }}>*</span>
          </label>
          <input
            id="deck-title"
            type="text"
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "deck-title-error" : undefined}
            placeholder="e.g. Biology 101"
            {...register("title")}
            className={cn(
              "w-full rounded-[10px] border px-4 py-2.5 text-[15px] outline-none transition-colors focus:ring-2",
              errors.title ? "border-red-400" : "border-transparent",
            )}
            style={{
              backgroundColor: "var(--color-stone-surface)",
              color: "var(--color-charcoal-primary)",
            }}
          />
          {errors.title && (
            <p
              id="deck-title-error"
              role="alert"
              data-testid="title-error"
              className="mt-1.5 text-[12px]"
              style={{ color: "var(--color-coral-red)" }}
            >
              {errors.title.message}
            </p>
          )}
        </fieldset>

        {/* Description */}
        <fieldset className="mb-5 border-0 p-0">
          <label
            htmlFor="deck-description"
            className="mb-1.5 block text-[13px] font-medium"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            Description{" "}
            <span className="text-[12px] font-normal" style={{ color: "var(--color-ash)" }}>
              (optional)
            </span>
          </label>
          <textarea
            id="deck-description"
            rows={3}
            placeholder="What is this deck about?"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? "deck-description-error" : undefined}
            {...register("description")}
            className="w-full resize-none rounded-[10px] border-0 px-4 py-2.5 text-[15px] outline-none transition-colors focus:ring-2"
            style={{
              backgroundColor: "var(--color-stone-surface)",
              color: "var(--color-charcoal-primary)",
            }}
          />
          {errors.description && (
            <p
              id="deck-description-error"
              role="alert"
              data-testid="description-error"
              className="mt-1.5 text-[12px]"
              style={{ color: "var(--color-coral-red)" }}
            >
              {errors.description.message}
            </p>
          )}
        </fieldset>

        {/* Visibility */}
        <fieldset className="mb-8 border-0 p-0">
          <legend
            className="mb-1.5 block text-[13px] font-medium"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            Visibility
          </legend>
          <div className="flex gap-3">
            {(["private", "public"] as const).map((v) => (
              <label
                key={v}
                className="flex cursor-pointer items-center gap-2 text-[14px]"
                style={{ color: "var(--color-graphite)" }}
              >
                <input
                  type="radio"
                  value={v}
                  {...register("visibility")}
                  className="accent-ember-orange"
                />
                <span className="capitalize">{v}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            data-testid="create-deck-submit"
            disabled={isSubmitting}
            className="rounded-[32px] px-6 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--color-midnight)" }}
          >
            {isSubmitting ? "Creating…" : "Create deck"}
          </button>

          <Link
            to="/decks"
            className="rounded-[32px] px-5 py-2.5 text-[14px] font-medium no-underline transition-opacity hover:opacity-70"
            style={{
              backgroundColor: "var(--color-stone-surface)",
              color: "var(--color-graphite)",
            }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
