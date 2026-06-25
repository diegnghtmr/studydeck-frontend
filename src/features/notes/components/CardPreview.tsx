/**
 * CardPreview — renders the prompt/answer pair for any card variant.
 *
 * Can work from a CardPreviewModel (from the preview endpoint) or from
 * a CardModel + NoteModel for locally-computed previews.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { cardsApi } from "@shared/api/client";
import { queryKeys } from "@shared/query/query-keys";
import type { CardModel, CardPreviewModel } from "@shared/api/types";
import { cn } from "@shared/lib/cn";
import { Card } from "@shared/ui/Card";
import { Badge } from "@shared/ui/Badge";
import { FieldLabel } from "@shared/ui/FieldLabel";

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
  const { t } = useTranslation("notes");
  const [revealed, setRevealed] = useState(false);
  const [showHover, setShowHover] = useState(false);

  return (
    <Card data-testid="card-preview-item">
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <Badge label={variant} tone="blue" />
        </div>

        {/* Front / Prompt */}
        <div className="mb-4">
          <FieldLabel className="mb-1.5">{t("preview.promptLabel")}</FieldLabel>
          <p
            className="text-[15px] leading-[1.5] break-words"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            {front}
          </p>
          {hint && (
            <p className="mt-1.5 text-[12px] italic break-words" style={{ color: "var(--color-ash)" }}>
              {t("preview.hintPrefix")}{hint}
            </p>
          )}
        </div>

        {/* Back / Answer (reveal on click) */}
        <div className="pt-4" style={{ borderTop: "1px dashed var(--color-stone-surface)" }}>
          <div className="flex items-center justify-between" style={{ minHeight: 28 }}>
            <FieldLabel>{t("preview.answerLabel")}</FieldLabel>
            {!revealed && (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                onMouseEnter={() => setShowHover(true)}
                onMouseLeave={() => setShowHover(false)}
                className="rounded-[8px] text-[13px] font-medium"
                style={{
                  padding: "5px 13px",
                  cursor: "pointer",
                  border: "none",
                  transition: "background 0.15s ease, color 0.15s ease",
                  backgroundColor: showHover ? "#ece9e4" : "#f6f4ef",
                  color: showHover ? "#121212" : "#474645",
                }}
              >
                {t("preview.showBtn")}
              </button>
            )}
          </div>
          <div
            className={cn(
              "mt-1.5 text-[15px] leading-[1.5] break-words transition-all",
              !revealed && "select-none blur-sm",
            )}
            style={{ color: "var(--color-graphite)" }}
            aria-hidden={!revealed}
          >
            {back}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---- CardPreview (main) -----------------------------------------------------

export function CardPreview({ card, fetchPreview = false }: CardPreviewProps) {
  const { t } = useTranslation("notes");
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
    <Card data-testid="card-preview-item">
      <div className="p-5">
        <div className="flex items-center gap-2">
          <Badge label={card.cardVariant} tone="blue" />
          {card.suspended && <Badge label={t("preview.suspended")} tone="amber" />}
        </div>
        <p className="mt-2.5 text-[13px]" style={{ color: "var(--color-ash)" }}>
          {t("preview.cardPosition", { number: card.position + 1 })}
        </p>
      </div>
    </Card>
  );
}
