/**
 * StudyPage — /study
 * Displays all active decks with due counts; clicking a row navigates to /review/:deckId.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useDecks } from "@features/decks/hooks/use-decks";
import { useDeckStats } from "@features/review/hooks/use-review";
import { getDeckColor } from "@features/decks/lib/deck-color";
import { DeckIcon } from "@features/decks/DeckIcon";
import { Badge, PillButton } from "@shared/ui";
import type { DeckModel } from "@shared/api/types";

// ---- DeckRow sub-component ---------------------------------------------------

function DeckRow({ deck }: { deck: DeckModel }) {
  const navigate = useNavigate();
  const { data: stats } = useDeckStats(deck.id);
  const { color } = getDeckColor(deck.id);
  const [hovered, setHovered] = useState(false);

  const dueToday = stats?.dueToday;

  function handleClick() {
    navigate(`/review/${deck.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(`/review/${deck.id}`);
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Study ${deck.title}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-testid="study-deck-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 20px",
        borderRadius: 14,
        backgroundColor: "#ffffff",
        boxShadow: "var(--shadow-subtle)",
        cursor: "pointer",
        marginBottom: 10,
        border: `1px solid ${hovered ? color : "transparent"}`,
        transition: "box-shadow 0.15s, border-color 0.15s",
        outline: "none",
      }}
    >
      {/* Deck avatar */}
      <DeckIcon deckId={deck.id} icon={deck.icon} color={deck.color} size={36} />

      {/* Title */}
      <span style={{ fontSize: 15, fontWeight: 600, color: "#343433", flex: 1 }}>
        {deck.title}
      </span>

      {/* Due badge */}
      {dueToday !== undefined && (
        <Badge
          label={dueToday > 0 ? `${dueToday} due` : "0 due"}
          tone={dueToday > 0 ? "red" : "gray"}
        />
      )}

      {/* Chevron */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M6 4l4 4-4 4" stroke="#a7a7a7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </article>
  );
}

// ---- StudyPage ---------------------------------------------------------------

export function StudyPage() {
  const navigate = useNavigate();
  const { data: decksPage, isPending } = useDecks({ archived: false });
  const activeDecks = decksPage?.items.filter((d) => !d.archived) ?? [];

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 32px" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 40 }}>
        <div>
          <h1
            style={{
              fontFamily: "var(--font-family)",
              fontSize: 40,
              fontWeight: 600,
              color: "#343433",
              letterSpacing: "-0.8px",
              margin: 0,
              marginBottom: 6,
            }}
          >
            Study
          </h1>
          <p style={{ fontSize: 15, color: "#848281", margin: 0 }}>
            Choose a deck to begin your review session.
          </p>
        </div>
        <PillButton variant="primary" onClick={() => navigate("/review")}>
          Review all due
        </PillButton>
      </div>

      {/* Loading skeleton */}
      {isPending && (
        <div>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: 68,
                borderRadius: 14,
                backgroundColor: "#f2f0ed",
                marginBottom: 10,
              }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isPending && activeDecks.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <p style={{ fontSize: 15, color: "#848281", marginBottom: 16 }}>
            No decks yet. Create one to get started.
          </p>
          <Link
            to="/decks"
            style={{
              fontSize: 15,
              color: "var(--color-ember-orange)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Go to decks →
          </Link>
        </div>
      )}

      {/* Deck list */}
      {!isPending && activeDecks.length > 0 && (
        <div>
          {activeDecks.map((deck) => (
            <DeckRow key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </main>
  );
}
