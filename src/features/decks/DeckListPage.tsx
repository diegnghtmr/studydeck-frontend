import { useState } from "react";
import { Link } from "react-router";
import { useDecks } from "./hooks/use-decks";
import { DeckCard } from "./components/DeckCard";
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { normalizeApiProblem } from "@shared/api/problem";
import { cn } from "@shared/lib/cn";

const PAGE_SIZE = 20;

/**
 * DeckListPage — /decks
 *
 * Paginated, searchable grid of DeckCards.
 * Filter toggle for archived decks.
 * "New deck" CTA navigates to /decks/new.
 */
export function DeckListPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const useDecksParams = {
    page,
    size: PAGE_SIZE,
    ...(showArchived ? { archived: true as const } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  };
  const { data, isPending, isError, error } = useDecks(useDecksParams);

  const problem = isError
    ? normalizeApiProblem(
        (error as { response?: { data?: unknown } })?.response?.data,
        (error as { response?: { status?: number } })?.response?.status ?? 500,
      )
    : null;

  const decks = data?.items ?? [];
  const totalPages = data?.page.totalPages ?? 1;
  const hasNext = data?.page.hasNext ?? false;
  const hasPrev = data?.page.hasPrevious ?? false;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(0);
  }

  function handleArchivedToggle() {
    setShowArchived((v) => !v);
    setPage(0);
  }

  return (
    <main
      data-testid="deck-list-page"
      className="mx-auto max-w-[1200px] px-6 py-12"
    >
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            className="text-[23px] font-semibold"
            style={{
              color: "var(--color-charcoal-primary)",
              letterSpacing: "-0.44px",
            }}
          >
            My Decks
          </h1>
          <p
            className="mt-1 text-[15px]"
            style={{ color: "var(--color-ash)" }}
          >
            Organize your flashcard decks and track your progress.
          </p>
        </div>

        <Link
          to="/decks/new"
          data-testid="new-deck-cta"
          className="inline-flex items-center gap-2 rounded-[32px] px-5 py-2.5 text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--color-midnight)" }}
        >
          <span aria-hidden="true">+</span>
          New deck
        </Link>
      </div>

      {/* Controls: search + archived filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <span
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[14px]"
            style={{ color: "var(--color-ash)" }}
            aria-hidden="true"
          >
            ⌕
          </span>
          <input
            type="search"
            role="searchbox"
            placeholder="Search decks…"
            value={search}
            onChange={handleSearchChange}
            aria-label="Search decks"
            className="w-full rounded-[10px] border-0 py-2 pl-8 pr-4 text-[14px] outline-none focus:ring-2"
            style={{
              backgroundColor: "var(--color-stone-surface)",
              color: "var(--color-charcoal-primary)",
              // focus ring via style to keep token usage
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleArchivedToggle}
          aria-pressed={showArchived}
          className={cn(
            "rounded-[32px] px-4 py-2 text-[13px] font-medium transition-colors",
            showArchived
              ? "text-white"
              : "",
          )}
          style={{
            backgroundColor: showArchived
              ? "var(--color-graphite)"
              : "var(--color-stone-surface)",
            color: showArchived ? "white" : "var(--color-graphite)",
          }}
        >
          {showArchived ? "Showing archived" : "Show archived"}
        </button>
      </div>

      {/* Error state */}
      {problem && (
        <ProblemBanner
          problem={problem}
          className="mb-6"
        />
      )}

      {/* Loading state */}
      {isPending && (
        <div
          data-testid="deck-list-loading"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading decks"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[120px] animate-pulse rounded-[10px]"
              style={{ backgroundColor: "var(--color-stone-surface)" }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isPending && !isError && decks.length === 0 && (
        <div
          data-testid="deck-list-empty"
          className="flex flex-col items-center py-20 text-center"
        >
          <p
            className="text-[19px] font-semibold"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            {search ? "No decks match your search." : "No decks yet."}
          </p>
          <p
            className="mt-2 text-[15px]"
            style={{ color: "var(--color-ash)" }}
          >
            {search
              ? "Try a different term or clear the search."
              : "Create your first deck to get started."}
          </p>
          {!search && (
            <Link
              to="/decks/new"
              className="mt-6 inline-flex items-center gap-2 rounded-[32px] px-5 py-2.5 text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--color-midnight)" }}
            >
              + New deck
            </Link>
          )}
        </div>
      )}

      {/* Deck grid */}
      {!isPending && !isError && decks.length > 0 && (
        <>
          <div
            data-testid="deck-grid"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {decks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Deck pagination"
              className="mt-8 flex items-center justify-center gap-3"
            >
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={!hasPrev}
                aria-label="Previous page"
                className="rounded-[32px] px-4 py-2 text-[13px] font-medium transition-opacity disabled:opacity-40"
                style={{
                  backgroundColor: "var(--color-stone-surface)",
                  color: "var(--color-charcoal-primary)",
                }}
              >
                ← Prev
              </button>

              <span
                className="text-[13px]"
                style={{ color: "var(--color-ash)" }}
              >
                Page {page + 1} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext}
                aria-label="Next page"
                className="rounded-[32px] px-4 py-2 text-[13px] font-medium transition-opacity disabled:opacity-40"
                style={{
                  backgroundColor: "var(--color-stone-surface)",
                  color: "var(--color-charcoal-primary)",
                }}
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
