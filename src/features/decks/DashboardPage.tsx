import { Link } from "react-router";

export function DashboardPage() {
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
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Link
          to="/decks"
          data-testid="nav-decks-link"
          className="block no-underline"
        >
          <div
            className="rounded-[10px] p-8 transition-all duration-200"
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

        <div
          className="rounded-[10px] p-8"
          style={{
            backgroundColor: "var(--color-parchment-card)",
            borderRadius: "12px",
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

        <div
          className="rounded-[10px] p-8"
          style={{
            backgroundColor: "var(--color-parchment-card)",
            borderRadius: "12px",
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
    </main>
  );
}
