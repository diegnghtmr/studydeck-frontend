import { Link } from "react-router";
import { useDecks } from "./hooks/use-decks";
import { useDeckStats } from "@features/review/hooks/use-review";
import type { DeckModel } from "@shared/api/types";

// ---- DeckDueRow — renders a single deck's due count + CTA ------------------

function DeckDueRow({ deck }: { deck: DeckModel }) {
  const { data: stats } = useDeckStats(deck.id);

  const dueCount = stats?.dueToday ?? 0;

  return (
    <div
      className="flex items-center justify-between rounded-[10px] px-5 py-4"
      style={{
        backgroundColor: "var(--color-parchment-card)",
        boxShadow: "var(--shadow-subtle)",
      }}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <Link
          to={`/decks/${deck.id}`}
          className="truncate text-[15px] font-medium no-underline hover:opacity-80"
          style={{ color: "var(--color-charcoal-primary)" }}
        >
          {deck.title}
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span
          data-testid={`deck-due-${deck.id}`}
          className="rounded-[20px] px-2.5 py-0.5 text-[13px] font-medium"
          style={{
            backgroundColor:
              dueCount > 0
                ? "rgba(255, 62, 0, 0.1)"
                : "var(--color-stone-surface)",
            color:
              dueCount > 0
                ? "var(--color-ember-orange)"
                : "var(--color-ash)",
          }}
        >
          {dueCount} due
        </span>

        {dueCount > 0 && (
          <Link
            to={`/review/${deck.id}`}
            data-testid={`review-cta-${deck.id}`}
            className="rounded-[32px] px-4 py-1.5 text-[13px] font-medium text-white no-underline transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-ember-orange)" }}
          >
            Review
          </Link>
        )}
      </div>
    </div>
  );
}

// ---- DashboardPage ----------------------------------------------------------

export function DashboardPage() {
  const { data: decksPage } = useDecks({ size: 10 });

  const activeDecks = decksPage?.items.filter((d) => !d.archived) ?? [];

  return (
    <main data-testid="dashboard-page" className="mx-auto max-w-[1200px] px-6 py-12">
      {/* Section heading */}
      <section className="mb-12">
        <h1
          data-testid="dashboard-heading"
          className="text-[44px] font-semibold leading-[1.09]"
          style={{
            color: "var(--color-charcoal-primary)",
            letterSpacing: "-1.14px",
            fontFamily: "var(--font-inter)",
          }}
        >
          Welcome to{" "}
          <span style={{ color: "var(--color-ember-orange)" }}>StudyDeck</span>
        </h1>
        <p
          className="mt-4 max-w-[560px] text-[17px] leading-[1.47]"
          style={{
            color: "var(--color-graphite)",
            letterSpacing: "-0.22px",
          }}
        >
          Your AI-powered study companion. Create decks, review flashcards, and track your
          progress.
        </p>
      </section>

      {/* Quick actions */}
      <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Link
          to="/decks"
          data-testid="nav-decks-link"
          className="block no-underline"
        >
          <div
            className="rounded-[10px] p-8 transition-all duration-200 hover:opacity-90"
            style={{
              backgroundColor: "#ffffff",
              boxShadow: "var(--shadow-subtle)",
            }}
          >
            <h2
              className="mb-2 text-[19px] font-semibold"
              style={{ color: "var(--color-charcoal-primary)" }}
            >
              My Decks
            </h2>
            <p
              className="text-[15px] leading-[1.47]"
              style={{ color: "var(--color-graphite)" }}
            >
              Browse and manage your flashcard decks.
            </p>
          </div>
        </Link>

        <Link
          to="/review"
          className="block no-underline"
        >
          <div
            className="rounded-[10px] p-8 transition-all duration-200 hover:opacity-90"
            style={{
              backgroundColor: "var(--color-parchment-card)",
              boxShadow: "var(--shadow-subtle)",
            }}
          >
            <h2
              className="mb-2 text-[19px] font-semibold"
              style={{ color: "var(--color-charcoal-primary)" }}
            >
              Review
            </h2>
            <p
              className="text-[15px] leading-[1.47]"
              style={{ color: "var(--color-graphite)" }}
            >
              Start your daily review session.
            </p>
          </div>
        </Link>

        <div
          className="rounded-[10px] p-8"
          style={{
            backgroundColor: "var(--color-parchment-card)",
            boxShadow: "var(--shadow-subtle)",
          }}
        >
          <h2
            className="mb-2 text-[19px] font-semibold"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            AI Assistant
          </h2>
          <p
            className="text-[15px] leading-[1.47]"
            style={{ color: "var(--color-graphite)" }}
          >
            Generate cards from your documents.
          </p>
        </div>
      </section>

      {/* Due cards per deck */}
      {activeDecks.length > 0 && (
        <section aria-label="Due cards by deck">
          <h2
            className="mb-4 text-[19px] font-semibold"
            style={{
              color: "var(--color-charcoal-primary)",
              letterSpacing: "-0.25px",
            }}
          >
            Due today
          </h2>
          <div className="flex flex-col gap-2">
            {activeDecks.map((deck) => (
              <DeckDueRow key={deck.id} deck={deck} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
