/**
 * ReviewSessionPage — /review and /review/:deckId
 *
 * State machine:
 *   idle → starting → reviewing:front → reviewing:revealed → submitting → (next card | done)
 *
 * Keyboard shortcuts:
 *   Space       → reveal answer (in :front state)
 *   1           → again (in :revealed state)
 *   2           → hard
 *   3           → good
 *   4           → easy
 */
import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useStartSession, useSubmitReview, useNextCard } from "./hooks/use-review";
import type { NextCardResult } from "./hooks/use-review";
import { queryKeys } from "@shared/query/query-keys";
import type { ReviewSessionModel, CardModel, ReviewRating, ReviewSessionCreatePayload } from "@shared/api/types";
import { REVIEW_RATING } from "@shared/api/types";
import { cardsApi, reviewsApi } from "@shared/api/client";
import { cn } from "@shared/lib/cn";

// ---- Review state machine ---------------------------------------------------

const REVIEW_STATE = {
  IDLE: "idle",
  STARTING: "starting",
  LOADING_CARD: "loading-card",
  FRONT: "front",
  REVEALED: "revealed",
  SUBMITTING: "submitting",
  DONE: "done",
} as const;

type ReviewState = (typeof REVIEW_STATE)[keyof typeof REVIEW_STATE];

// ---- Rating button labels + keyboard keys -----------------------------------

const RATINGS: Array<{ rating: ReviewRating; label: string; key: string; color: string }> = [
  { rating: REVIEW_RATING.AGAIN, label: "Again", key: "1", color: "var(--color-coral-red)" },
  { rating: REVIEW_RATING.HARD, label: "Hard", key: "2", color: "var(--color-sunburst-yellow)" },
  { rating: REVIEW_RATING.GOOD, label: "Good", key: "3", color: "var(--color-meadow-green)" },
  { rating: REVIEW_RATING.EASY, label: "Easy", key: "4", color: "var(--color-sky-blue)" },
];

// ---- Sub-components ---------------------------------------------------------

interface CardFrontPanelProps {
  card: CardModel;
  front: string;
  hint?: string | undefined;
  onReveal: () => void;
}

function CardFrontPanel({ card, front, hint, onReveal }: CardFrontPanelProps) {
  return (
    <div
      data-testid="review-card-front"
      className="flex flex-col gap-6"
    >
      {/* Card variant badge */}
      <div className="flex items-center gap-2">
        <span
          className="rounded-[6px] px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide"
          style={{
            backgroundColor: "var(--color-stone-surface)",
            color: "var(--color-ash)",
          }}
        >
          {card.cardVariant}
        </span>
      </div>

      {/* Front content */}
      <div
        className="rounded-[10px] p-8"
        style={{
          backgroundColor: "var(--color-parchment-card)",
          boxShadow: "var(--shadow-subtle)",
        }}
      >
        <p
          className="mb-1 text-[11px] font-medium uppercase tracking-wide"
          style={{ color: "var(--color-smoke)" }}
        >
          Prompt
        </p>
        <p
          className="mt-3 text-[19px] leading-[1.47]"
          style={{ color: "var(--color-charcoal-primary)" }}
        >
          {front}
        </p>
        {hint && (
          <p className="mt-3 text-[14px] italic" style={{ color: "var(--color-ash)" }}>
            Hint: {hint}
          </p>
        )}
      </div>

      {/* Show answer CTA */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onReveal}
          className="rounded-[32px] px-8 py-3 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--color-midnight)" }}
        >
          Show answer
          <span
            className="ml-2 rounded-[6px] px-1.5 py-0.5 text-[11px] font-normal"
            style={{
              backgroundColor: "rgba(255,255,255,0.18)",
            }}
          >
            Space
          </span>
        </button>
      </div>
    </div>
  );
}

interface CardRevealedPanelProps {
  card: CardModel;
  front: string;
  back: string;
  hint?: string | undefined;
  onRate: (rating: ReviewRating) => void;
  isSubmitting: boolean;
}

function CardRevealedPanel({ card, front, back, hint, onRate, isSubmitting }: CardRevealedPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Card variant badge */}
      <div className="flex items-center gap-2">
        <span
          className="rounded-[6px] px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide"
          style={{
            backgroundColor: "var(--color-stone-surface)",
            color: "var(--color-ash)",
          }}
        >
          {card.cardVariant}
        </span>
      </div>

      {/* Front + Answer */}
      <div
        className="rounded-[10px] p-8"
        style={{
          backgroundColor: "var(--color-parchment-card)",
          boxShadow: "var(--shadow-subtle)",
        }}
      >
        <div data-testid="review-card-front-text">
          <p
            className="mb-1 text-[11px] font-medium uppercase tracking-wide"
            style={{ color: "var(--color-smoke)" }}
          >
            Prompt
          </p>
          <p
            className="mt-2 text-[19px] leading-[1.47]"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            {front}
          </p>
          {hint && (
            <p className="mt-2 text-[14px] italic" style={{ color: "var(--color-ash)" }}>
              Hint: {hint}
            </p>
          )}
        </div>

        <div
          className="mt-6 border-t pt-6"
          style={{ borderColor: "var(--color-stone-surface)" }}
          data-testid="review-card-back"
        >
          <p
            className="mb-1 text-[11px] font-medium uppercase tracking-wide"
            style={{ color: "var(--color-smoke)" }}
          >
            Answer
          </p>
          <p
            className="mt-2 text-[19px] leading-[1.47]"
            style={{ color: "var(--color-graphite)" }}
          >
            {back}
          </p>
        </div>
      </div>

      {/* Rating buttons */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-[13px]" style={{ color: "var(--color-ash)" }}>
          How well did you remember?
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {RATINGS.map(({ rating, label, key, color }) => (
            <button
              key={rating}
              type="button"
              data-testid={`rating-btn-${rating}`}
              onClick={() => onRate(rating)}
              disabled={isSubmitting}
              className={cn(
                "flex flex-col items-center rounded-[10px] px-6 py-3 text-white transition-opacity hover:opacity-90 disabled:opacity-40",
                "min-w-[80px]",
              )}
              style={{ backgroundColor: color }}
            >
              <span className="text-[15px] font-semibold">{label}</span>
              <span className="mt-0.5 text-[11px] opacity-80">
                {key}
              </span>
            </button>
          ))}
        </div>
        <p className="text-[12px]" style={{ color: "var(--color-fog)" }}>
          Keys: 1=Again, 2=Hard, 3=Good, 4=Easy
        </p>
      </div>
    </div>
  );
}

interface ReviewSummaryProps {
  deckId?: string | undefined;
  reviewedCount: number;
  ratings: Record<ReviewRating, number>;
  startedAt: number;
}

function ReviewSummary({ deckId, reviewedCount, ratings, startedAt }: ReviewSummaryProps) {
  const elapsedMs = Date.now() - startedAt;
  const elapsedMin = Math.round(elapsedMs / 60000);

  const total = Object.values(ratings).reduce((sum, n) => sum + n, 0);
  const goodOrEasy = (ratings["good"] ?? 0) + (ratings["easy"] ?? 0);
  const accuracy = total > 0 ? Math.round((goodOrEasy / total) * 100) : 0;

  return (
    <div data-testid="review-summary" className="flex flex-col gap-8">
      <div className="text-center">
        <h2
          className="text-[28px] font-semibold"
          style={{ color: "var(--color-charcoal-primary)", letterSpacing: "-0.5px" }}
        >
          Session complete
        </h2>
        <p className="mt-2 text-[15px]" style={{ color: "var(--color-graphite)" }}>
          Great work — keep the streak going!
        </p>
      </div>

      {/* Stats grid */}
      <div
        className="grid grid-cols-2 gap-4 rounded-[10px] p-6 md:grid-cols-4"
        style={{
          backgroundColor: "var(--color-parchment-card)",
          boxShadow: "var(--shadow-subtle)",
        }}
      >
        {[
          { label: "Reviewed", value: reviewedCount },
          { label: "Accuracy", value: `${accuracy}%` },
          { label: "Time", value: `${elapsedMin}m` },
          { label: "Again", value: ratings["again"] ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p
              className="text-[23px] font-semibold"
              style={{ color: "var(--color-charcoal-primary)" }}
            >
              {value}
            </p>
            <p
              className="text-[12px] uppercase tracking-wide"
              style={{ color: "var(--color-smoke)" }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Rating breakdown */}
      <div
        className="rounded-[10px] p-6"
        style={{
          backgroundColor: "var(--color-parchment-card)",
          boxShadow: "var(--shadow-subtle)",
        }}
      >
        <p
          className="mb-4 text-[13px] font-medium uppercase tracking-wide"
          style={{ color: "var(--color-ash)" }}
        >
          Rating breakdown
        </p>
        <div className="flex flex-col gap-2">
          {RATINGS.map(({ rating, label, color }) => {
            const count = ratings[rating] ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={rating} className="flex items-center gap-3">
                <span
                  className="w-14 text-[13px] font-medium"
                  style={{ color: "var(--color-graphite)" }}
                >
                  {label}
                </span>
                <div className="flex-1 overflow-hidden rounded-full bg-gray-100" style={{ height: "6px" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
                <span
                  className="w-6 text-right text-[13px]"
                  style={{ color: "var(--color-ash)" }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex justify-center gap-3">
        {deckId && (
          <Link
            to={`/decks/${deckId}`}
            className="rounded-[32px] px-6 py-2.5 text-[14px] font-medium no-underline transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "var(--color-stone-surface)",
              color: "var(--color-graphite)",
            }}
          >
            Back to deck
          </Link>
        )}
        <Link
          to="/"
          className="rounded-[32px] px-6 py-2.5 text-[14px] font-medium text-white no-underline transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--color-midnight)" }}
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}

// ---- Start screen -----------------------------------------------------------

interface StartScreenProps {
  deckId?: string | undefined;
  onStart: () => void;
  isStarting: boolean;
}

function StartScreen({ deckId, onStart, isStarting }: StartScreenProps) {
  return (
    <div data-testid="review-start-screen" className="flex flex-col items-center gap-8 py-16 text-center">
      <div>
        <h1
          className="text-[28px] font-semibold"
          style={{ color: "var(--color-charcoal-primary)", letterSpacing: "-0.5px" }}
        >
          Ready to review?
        </h1>
        <p
          className="mt-3 text-[15px] leading-[1.47]"
          style={{ color: "var(--color-graphite)" }}
        >
          {deckId
            ? "Cards due for this deck will be shown in order."
            : "All your due cards across every deck."}
        </p>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={isStarting}
        className="rounded-[32px] px-10 py-3.5 text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: "var(--color-ember-orange)" }}
      >
        {isStarting ? "Starting…" : "Start session"}
      </button>
    </div>
  );
}

// ---- ReviewSessionPage (main) -----------------------------------------------

export function ReviewSessionPage() {
  const { deckId } = useParams<{ deckId: string }>();

  const [reviewState, setReviewState] = useState<ReviewState>(REVIEW_STATE.IDLE);
  const [session, setSession] = useState<ReviewSessionModel | null>(null);
  const [cardPreview, setCardPreview] = useState<{ front: string; back: string; hint?: string | undefined } | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [ratings, setRatings] = useState<Record<ReviewRating, number>>({
    again: 0, hard: 0, good: 0, easy: 0,
  });
  const [sessionStartedAt] = useState(() => Date.now());

  const queryClient = useQueryClient();
  const startSession = useStartSession();
  const submitReview = useSubmitReview();

  const sessionId = session?.id ?? "";
  const { data: nextCardData } = useNextCard(sessionId);

  const currentCard = nextCardData?.card;
  const sessionDone = nextCardData?.sessionDone ?? false;

  // Watch for session done
  useEffect(() => {
    if (sessionDone && reviewState !== REVIEW_STATE.IDLE && reviewState !== REVIEW_STATE.DONE) {
      setReviewState(REVIEW_STATE.DONE);
    }
  }, [sessionDone, reviewState]);

  // Fetch card preview when current card changes
  useEffect(() => {
    if (!currentCard) return;
    const cardId = currentCard.id;
    setCardPreview(null);

    cardsApi.previewCard(cardId).then((res) => {
      const data = res.data as unknown as { front: string; back: string; hint?: string };
      setCardPreview({ front: data.front, back: data.back, hint: data.hint });
      setReviewState(REVIEW_STATE.FRONT);
    }).catch(() => {
      // Fallback: show card with no content
      setCardPreview({ front: "", back: "" });
      setReviewState(REVIEW_STATE.FRONT);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCard?.id]);

  // ---- Handlers ------------------------------------------------------------

  async function handleStart() {
    setReviewState(REVIEW_STATE.STARTING);
    try {
      const payload: ReviewSessionCreatePayload = deckId ? { deckId } : {};
      const sess = await startSession.mutateAsync(payload);
      setSession(sess);
      setReviewState(REVIEW_STATE.LOADING_CARD);
    } catch {
      setReviewState(REVIEW_STATE.IDLE);
    }
  }

  function handleReveal() {
    setReviewState(REVIEW_STATE.REVEALED);
  }

  async function handleRate(rating: ReviewRating) {
    if (!currentCard || !session) return;
    setReviewState(REVIEW_STATE.SUBMITTING);

    try {
      await submitReview.mutateAsync({
        cardId: currentCard.id,
        sessionId: session.id,
        rating,
        revealedAnswer: true,
      });

      setReviewedCount((n) => n + 1);
      setRatings((prev) => ({ ...prev, [rating]: (prev[rating] ?? 0) + 1 }));

      // Fetch the next card directly (bypassing cache) to advance the session
      const nextResponse = await reviewsApi.getNextReviewCard(session.id);
      if (nextResponse.status === 204 || !nextResponse.data) {
        setReviewState(REVIEW_STATE.DONE);
      } else {
        // Update the query cache with the new card so the hook re-renders
        const nextData = nextResponse.data as unknown as { sessionId: string; card: CardModel };
        const nextKey = [...queryKeys.reviews.session(session.id), "next"];
        queryClient.setQueryData<NextCardResult>(nextKey, {
          card: nextData.card,
          sessionId: session.id,
          sessionDone: false,
        });
      }
    } catch {
      setReviewState(REVIEW_STATE.REVEALED);
    }
  }

  // ---- Keyboard shortcuts --------------------------------------------------
  // Refs hold current values so the single-registered event listener
  // always reads fresh state without re-registering on every render.

  const stateRef = useRef(reviewState);
  stateRef.current = reviewState;

  const currentCardRef = useRef(currentCard);
  currentCardRef.current = currentCard;

  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Ref to the current handleRate so we call the latest closure
  const handleRateRef = useRef(handleRate);
  handleRateRef.current = handleRate;

  const handleRevealRef = useRef(handleReveal);
  handleRevealRef.current = handleReveal;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const state = stateRef.current;

      if (state === REVIEW_STATE.FRONT && e.key === " ") {
        e.preventDefault();
        handleRevealRef.current();
      }

      if (state === REVIEW_STATE.REVEALED) {
        const keyMap: Record<string, ReviewRating> = {
          "1": "again",
          "2": "hard",
          "3": "good",
          "4": "easy",
        };
        if (keyMap[e.key]) {
          e.preventDefault();
          void handleRateRef.current(keyMap[e.key]);
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // ---- Render --------------------------------------------------------------

  const isIdle = reviewState === REVIEW_STATE.IDLE;
  const isStarting = reviewState === REVIEW_STATE.STARTING;
  const isFront = reviewState === REVIEW_STATE.FRONT;
  const isRevealed = reviewState === REVIEW_STATE.REVEALED;
  const isSubmitting = reviewState === REVIEW_STATE.SUBMITTING;
  const isDone = reviewState === REVIEW_STATE.DONE;

  return (
    <main
      data-testid="review-session-page"
      className="mx-auto max-w-[680px] px-6 py-12"
    >
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-[13px]">
        <Link
          to="/"
          className="no-underline transition-opacity hover:opacity-70"
          style={{ color: "var(--color-ash)" }}
        >
          Dashboard
        </Link>
        {deckId && (
          <>
            <span style={{ color: "var(--color-fog)" }}>/</span>
            <Link
              to={`/decks/${deckId}`}
              className="no-underline transition-opacity hover:opacity-70"
              style={{ color: "var(--color-ash)" }}
            >
              Deck
            </Link>
          </>
        )}
        <span style={{ color: "var(--color-fog)" }}>/</span>
        <span style={{ color: "var(--color-charcoal-primary)" }}>Review</span>
      </nav>

      {/* Progress bar — only during session */}
      {!isIdle && !isDone && (
        <div className="mb-8 flex items-center gap-3">
          <span className="text-[13px]" style={{ color: "var(--color-ash)" }}>
            {reviewedCount} reviewed
          </span>
          <div
            className="flex-1 overflow-hidden rounded-full"
            style={{ height: "4px", backgroundColor: "var(--color-stone-surface)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: reviewedCount > 0 ? "100%" : "0%",
                backgroundColor: "var(--color-ember-orange)",
              }}
            />
          </div>
        </div>
      )}

      {/* State views */}
      {(isIdle || isStarting) && (
        <StartScreen deckId={deckId} onStart={handleStart} isStarting={isStarting} />
      )}

      {(isFront || reviewState === REVIEW_STATE.LOADING_CARD) && currentCard && cardPreview && (
        <CardFrontPanel
          card={currentCard}
          front={cardPreview.front}
          hint={cardPreview.hint}
          onReveal={handleReveal}
        />
      )}

      {(isRevealed || isSubmitting) && currentCard && cardPreview && (
        <CardRevealedPanel
          card={currentCard}
          front={cardPreview.front}
          back={cardPreview.back}
          hint={cardPreview.hint}
          onRate={handleRate}
          isSubmitting={isSubmitting}
        />
      )}

      {isDone && (
        <ReviewSummary
          deckId={deckId}
          reviewedCount={reviewedCount}
          ratings={ratings}
          startedAt={sessionStartedAt}
        />
      )}
    </main>
  );
}
