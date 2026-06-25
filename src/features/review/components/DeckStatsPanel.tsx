/**
 * DeckStatsPanel — shows deck stats (totals, due, retention) as a compact panel.
 * Used on DeckDetailPage to replace the stats placeholder.
 */
import { useTranslation } from "react-i18next";
import { useDeckStats } from "@features/review/hooks/use-review";
import { FieldLabel } from "@shared/ui/FieldLabel";

interface DeckStatsPanelProps {
  deckId: string;
}

export function DeckStatsPanel({ deckId }: DeckStatsPanelProps) {
  const { t } = useTranslation("study");
  const { data: stats, isPending } = useDeckStats(deckId);

  if (isPending) {
    return (
      <div
        data-testid="deck-stats-loading"
        className="mt-4 grid grid-cols-3 gap-4 border-t pt-4 animate-pulse"
        style={{ borderColor: "var(--color-stone-surface)" }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div
              className="h-3 w-16 rounded mb-2"
              style={{ backgroundColor: "var(--color-stone-surface)" }}
            />
            <div
              className="h-5 w-10 rounded"
              style={{ backgroundColor: "var(--color-stone-surface)" }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const retentionPct =
    stats.averageRetention30d !== undefined
      ? Math.round(stats.averageRetention30d * 100)
      : undefined;

  return (
    <div data-testid="deck-stats-panel">
      {/* Core stats row */}
      <div
        className="mt-4 grid grid-cols-3 gap-4 border-t pt-4"
        style={{ borderColor: "var(--color-stone-surface)" }}
      >
        <div>
          <FieldLabel>{t("stats.notes")}</FieldLabel>
          <p
            data-testid="stat-total-notes"
            className="text-[19px] font-semibold"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            {stats.totalNotes}
          </p>
        </div>

        <div>
          <FieldLabel>{t("stats.cards")}</FieldLabel>
          <p
            data-testid="stat-total-cards"
            className="text-[19px] font-semibold"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            {stats.totalCards}
          </p>
        </div>

        <div>
          <FieldLabel>{t("stats.dueToday")}</FieldLabel>
          <p
            data-testid="stat-due-today"
            className="text-[19px] font-semibold"
            style={{
              color:
                stats.dueToday > 0
                  ? "var(--color-ember-orange)"
                  : "var(--color-charcoal-primary)",
            }}
          >
            {stats.dueToday}
          </p>
        </div>
      </div>

      {/* Secondary stats row */}
      <div
        className="mt-3 grid grid-cols-2 gap-4 border-t pt-3"
        style={{ borderColor: "var(--color-stone-surface)" }}
      >
        <div>
          <FieldLabel>{t("stats.reviewedToday")}</FieldLabel>
          <p
            data-testid="stat-reviewed-today"
            className="text-[17px] font-semibold"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            {stats.reviewedToday}
          </p>
        </div>

        <div>
          <FieldLabel>{t("stats.suspended")}</FieldLabel>
          <p
            data-testid="stat-suspended"
            className="text-[17px] font-semibold"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            {stats.suspendedCards}
          </p>
        </div>
      </div>

      {/* Retention bar (30-day average) */}
      {retentionPct !== undefined && (
        <div
          className="mt-4 border-t pt-4"
          style={{ borderColor: "var(--color-stone-surface)" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <FieldLabel>{t("stats.retention30d")}</FieldLabel>
            <p
              data-testid="retention-value"
              className="text-[12px] font-semibold"
              style={{ color: "var(--color-meadow-green)" }}
            >
              {retentionPct}%
            </p>
          </div>
          <div
            data-testid="retention-bar"
            className="overflow-hidden rounded-full"
            style={{ height: "6px", backgroundColor: "var(--color-stone-surface)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${retentionPct}%`,
                backgroundColor: "var(--color-meadow-green)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
