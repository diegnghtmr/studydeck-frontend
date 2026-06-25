import { useNavigate } from "react-router";
import { cn } from "@shared/lib/cn";
import { Badge } from "@shared/ui/Badge";
import { TagChip } from "@shared/ui/TagChip";
import type { DeckModel } from "@shared/api/types";

interface DeckCardProps {
  deck: DeckModel;
  className?: string;
}

/**
 * Compact card representing a single deck in the grid.
 * Clicking navigates to /decks/:deckId.
 *
 * Design: parchment-card background, inset stone border (--shadow-subtle),
 * radius-lg (10px). Due count and progress are placeholders for F3.
 */
export function DeckCard({ deck, className }: DeckCardProps) {
  const navigate = useNavigate();

  function handleClick() {
    navigate(`/decks/${deck.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open deck: ${deck.title}`}
      data-testid="deck-card"
      data-deck-id={deck.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "group cursor-pointer rounded-[10px] p-5 transition-opacity duration-150 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        className,
      )}
      style={{
        backgroundColor: "var(--color-parchment-card)",
        boxShadow: "var(--shadow-subtle)",
        outlineColor: "var(--color-ember-orange)",
      }}
    >
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3
          className="line-clamp-2 flex-1 text-[15px] font-semibold leading-[1.38]"
          style={{
            color: "var(--color-charcoal-primary)",
            letterSpacing: "-0.2px",
          }}
        >
          {deck.title}
        </h3>

        {deck.archived && <Badge label="Archived" tone="gray" />}
      </div>

      {/* Description */}
      {deck.description && (
        <p
          className="mb-4 line-clamp-2 text-[13px] leading-[1.5]"
          style={{ color: "var(--color-ash)" }}
        >
          {deck.description}
        </p>
      )}

      {/* Footer: stats placeholders */}
      <div className="flex items-center gap-4">
        <span
          className="flex items-center gap-1 text-[12px]"
          style={{ color: "var(--color-smoke)" }}
          aria-label="Cards due today (placeholder)"
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--color-ember-orange)" }}
            aria-hidden="true"
          />
          <span data-testid="deck-card-due">— due</span>
        </span>

        {deck.tags && deck.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {deck.tags.slice(0, 2).map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
            {deck.tags.length > 2 && (
              <span
                className="text-[11px]"
                style={{ color: "var(--color-ash)" }}
              >
                +{deck.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
