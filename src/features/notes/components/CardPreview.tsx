/**
 * CardPreview — renders the prompt/answer pair for any card variant.
 *
 * Can work from a CardPreviewModel (from the preview endpoint) or from
 * a CardModel + NoteModel for locally-computed previews.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cardsApi } from "@shared/api/client";
import { queryKeys } from "@shared/query/query-keys";
import type { CardModel, CardPreviewModel } from "@shared/api/types";
import { cn } from "@shared/lib/cn";

// ---- Props ------------------------------------------------------------------

interface CardPreviewProps {
  card: CardModel;
  /** If true, fetch the preview from the server instead of computing locally */
  fetchPreview?: boolean;
}

// ---- Sub-components ---------------------------------------------------------

function PreviewSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div
        className="h-4 w-1/3 rounded"
        style={{ backgroundColor: "var(--color-stone-surface)" }}
      />
      <div
        className="h-16 w-full rounded-[10px]"
        style={{ backgroundColor: "var(--color-stone-surface)" }}
      />
    </div>
  );
}

interface PreviewCardProps {
  front: string;
  back: string;
  hint?: string | undefined;
  variant: string;
}

function PreviewCard({ front, back, hint, variant }: PreviewCardProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      data-testid="card-preview-item"
      className="rounded-[10px] p-4"
      style={{
        backgroundColor: "var(--color-parchment-card)",
        boxShadow: "var(--shadow-subtle)",
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className="rounded-[6px] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide"
          style={{
            backgroundColor: "var(--color-stone-surface)",
            color: "var(--color-ash)",
          }}
        >
          {variant}
        </span>
      </div>

      {/* Front / Prompt */}
      <div className="mb-3">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-smoke)" }}>
          Prompt
        </p>
        <p
          className="text-[15px] leading-[1.5]"
          style={{ color: "var(--color-charcoal-primary)" }}
        >
          {front}
        </p>
        {hint && (
          <p className="mt-1 text-[12px] italic" style={{ color: "var(--color-ash)" }}>
            Hint: {hint}
          </p>
        )}
      </div>

      {/* Back / Answer (reveal on click) */}
      <div className="border-t pt-3" style={{ borderColor: "var(--color-stone-surface)" }}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-smoke)" }}>
            Answer
          </p>
          {!revealed && (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="rounded-[6px] px-2 py-0.5 text-[12px] transition-opacity hover:opacity-70"
              style={{
                backgroundColor: "var(--color-stone-surface)",
                color: "var(--color-graphite)",
              }}
            >
              Show
            </button>
          )}
        </div>
        <div
          className={cn(
            "mt-1 text-[15px] leading-[1.5] transition-all",
            !revealed && "select-none blur-sm",
          )}
          style={{ color: "var(--color-graphite)" }}
          aria-hidden={!revealed}
        >
          {back}
        </div>
      </div>
    </div>
  );
}

// ---- CardPreview (main) -----------------------------------------------------

export function CardPreview({ card, fetchPreview = false }: CardPreviewProps) {
  const { data: preview, isLoading } = useQuery<CardPreviewModel>({
    queryKey: [...queryKeys.cards.detail(card.id), "preview"],
    queryFn: async () => {
      const response = await cardsApi.previewCard(card.id);
      return response.data as unknown as CardPreviewModel;
    },
    enabled: fetchPreview,
  });

  if (fetchPreview && isLoading) {
    return <PreviewSkeleton />;
  }

  if (fetchPreview && preview) {
    return (
      <PreviewCard
        front={preview.front}
        back={preview.back}
        {...(preview.hint !== undefined ? { hint: preview.hint } : {})}
        variant={card.cardVariant}
      />
    );
  }

  // Local fallback — show variant label without real content
  return (
    <div
      data-testid="card-preview-item"
      className="rounded-[10px] p-4"
      style={{
        backgroundColor: "var(--color-parchment-card)",
        boxShadow: "var(--shadow-subtle)",
      }}
    >
      <span
        className="rounded-[6px] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide"
        style={{
          backgroundColor: "var(--color-stone-surface)",
          color: "var(--color-ash)",
        }}
      >
        {card.cardVariant}
      </span>
      <p className="mt-2 text-[13px]" style={{ color: "var(--color-ash)" }}>
        Card #{card.position + 1}
        {card.suspended && (
          <span className="ml-2 text-[11px]" style={{ color: "var(--color-ember-orange)" }}>
            suspended
          </span>
        )}
      </p>
    </div>
  );
}
