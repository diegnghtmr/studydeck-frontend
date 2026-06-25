import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useCreateDeck } from "./hooks/use-decks";
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { Breadcrumb } from "@shared/ui/Breadcrumb";
import { PillButton } from "@shared/ui/PillButton";
import { normalizeApiProblem } from "@shared/api/problem";
import { cn } from "@shared/lib/cn";
import { fieldClass } from "@shared/ui/field";

// Static schema used only to derive the raw (pre-transform) form type for
// useForm; the runtime schema (with translated messages) is built per-render.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createDeckSchemaShape = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  visibility: z.enum(["private", "public"]),
});

type CreateDeckForm = z.input<typeof createDeckSchemaShape>;

// ---- Component --------------------------------------------------------------

/**
 * CreateDeckPage — /decks/new
 *
 * RHF + Zod form. On success: invalidates decks list, navigates to the new deck.
 */
export function CreateDeckPage() {
  const { t } = useTranslation("decks");
  const navigate = useNavigate();
  const createDeck = useCreateDeck();
  const [apiProblem, setApiProblem] = useState<ReturnType<typeof normalizeApiProblem>>(null);

  const createDeckSchema = useMemo(
    () =>
      z.object({
        title: z
          .string()
          .min(1, { error: t("create.validation.nameRequired") })
          .max(120, { error: t("create.validation.nameTooLong") }),
        description: z
          .string()
          .max(1000, { error: t("create.validation.descriptionTooLong") })
          .optional(),
        visibility: z.enum(["private", "public"]),
      }),
    [t],
  );

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
          title: t("create.error.title"),
          status: 500,
          detail: t("create.error.description"),
        },
      );
    }
  }

  return (
    <main
      data-testid="create-deck-page"
      className="mx-auto max-w-[600px] px-6 py-12"
    >
      <Breadcrumb
        className="mb-8"
        items={[{ label: t("create.breadcrumbMyDecks"), href: "/decks" }, { label: t("create.breadcrumbNew") }]}
      />

      <h1
        className="mb-8 text-[23px] font-semibold"
        style={{
          color: "var(--color-charcoal-primary)",
          letterSpacing: "-0.44px",
        }}
      >
        {t("create.heading")}
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
            {t("create.nameLabel")} <span aria-hidden="true" style={{ color: "var(--color-ember-orange)" }}>*</span>
          </label>
          <input
            id="deck-title"
            type="text"
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "deck-title-error" : undefined}
            placeholder={t("create.namePlaceholder")}
            {...register("title")}
            className={cn(fieldClass({ error: Boolean(errors.title) }), "w-full text-[15px]")}
            style={{ color: "var(--color-charcoal-primary)" }}
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
            {t("create.descriptionLabel")}{" "}
            <span className="text-[12px] font-normal" style={{ color: "var(--color-ash)" }}>
              {t("create.descriptionOptional")}
            </span>
          </label>
          <textarea
            id="deck-description"
            rows={3}
            placeholder={t("create.descriptionPlaceholder")}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? "deck-description-error" : undefined}
            {...register("description")}
            className={cn(fieldClass({ error: Boolean(errors.description) }), "w-full text-[15px]")}
            style={{ color: "var(--color-charcoal-primary)" }}
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
            {t("create.visibilityLegend")}
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
          <PillButton type="submit" data-testid="create-deck-submit" disabled={isSubmitting}>
            {isSubmitting ? t("actions.creating") : t("actions.create")}
          </PillButton>

          <PillButton href="/decks" variant="secondary">
            {t("actions.cancel")}
          </PillButton>
        </div>
      </form>
    </main>
  );
}
