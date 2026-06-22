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
import { useParams, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useStartSession, useSubmitReview, useNextCard } from "./hooks/use-review";
import type { NextCardResult } from "./hooks/use-review";
import { queryKeys } from "@shared/query/query-keys";
import type { ReviewSessionModel, CardModel, ReviewRating, ReviewSessionCreatePayload } from "@shared/api/types";
import { REVIEW_RATING } from "@shared/api/types";
import { cardsApi, reviewsApi } from "@shared/api/client";
import { useDeck } from "@features/decks/hooks/use-decks";
import { DeckIcon } from "@features/decks/DeckIcon";
import { Badge, PillButton, ProgressBar } from "@shared/ui";

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

// ---- Rating config ----------------------------------------------------------

const RATINGS: Array<{ rating: ReviewRating; label: string; key: string; color: string }> = [
  { rating: REVIEW_RATING.AGAIN, label: "Again", key: "1", color: "#ff3e00" },
  { rating: REVIEW_RATING.HARD,  label: "Hard",  key: "2", color: "#d48f00" },
  { rating: REVIEW_RATING.GOOD,  label: "Good",  key: "3", color: "#343433" },
  { rating: REVIEW_RATING.EASY,  label: "Easy",  key: "4", color: "#00ca48" },
];

// ---- Sub-components ---------------------------------------------------------

interface StartScreenProps {
  deckId?: string | undefined;
  onStart: () => void;
  isStarting: boolean;
}

function StartScreen({ deckId, onStart, isStarting }: StartScreenProps) {
  return (
    <div
      data-testid="review-start-screen"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "80px 32px",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-family)",
          fontSize: 34,
          fontWeight: 600,
          color: "#343433",
          letterSpacing: "-0.6px",
          margin: 0,
          marginBottom: 12,
        }}
      >
        Ready to review?
      </h1>
      <p style={{ fontSize: 15, color: "#848281", margin: 0, marginBottom: 36 }}>
        {deckId
          ? "Cards due for this deck will be shown in order."
          : "All your due cards across every deck."}
      </p>
      <button
        type="button"
        onClick={onStart}
        disabled={isStarting}
        style={{
          borderRadius: 32,
          padding: "14px 40px",
          fontSize: 17,
          fontWeight: 600,
          color: "#ffffff",
          backgroundColor: "#ff5c00",
          border: "none",
          cursor: isStarting ? "not-allowed" : "pointer",
          opacity: isStarting ? 0.6 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {isStarting ? "Starting…" : "Start session"}
      </button>
    </div>
  );
}

// ---- DeckTopBar -------------------------------------------------------------

interface DeckTopBarProps {
  deckId?: string | undefined;
  reviewedCount: number;
  onClose: () => void;
}

function DeckTopBar({ deckId, reviewedCount, onClose }: DeckTopBarProps) {
  const { data: deckData } = useDeck(deckId ?? "");

  const deckTitle = deckData?.title ?? (deckId ? "Loading…" : "All decks");

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 32px",
        borderBottom: "1px solid #f2f0ed",
        flexShrink: 0,
        backgroundColor: "#ffffff",
      }}
    >
      {/* Left: deck avatar + title + FSRS badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {deckId ? (
          <DeckIcon
            deckId={deckId}
            icon={deckData?.icon}
            color={deckData?.color}
            size={24}
          />
        ) : (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              backgroundColor: "#f2f0ed",
              color: "#a7a7a7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3l8.5 4.7L12 12.4 3.5 7.7 12 3ZM4 12l8 4.5 8-4.5M4 16.3l8 4.5 8-4.5"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        <span style={{ fontSize: 15, fontWeight: 600, color: "#343433" }}>
          {deckTitle}
        </span>
        <Badge label="FSRS scheduler" tone="gray" />
      </div>

      {/* Right: card counter + close */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 13, color: "#a7a7a7" }}>
          Card {reviewedCount + 1}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close session"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "none",
            backgroundColor: "#f2f0ed",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            color: "#343433",
          }}
        >
          ×
        </button>
      </div>
    </header>
  );
}

// ---- CardFrontPanel ---------------------------------------------------------

interface CardFrontPanelProps {
  card: CardModel;
  front: string;
  hint?: string | undefined;
  onReveal: () => void;
}

function CardFrontPanel({ card, front, hint, onReveal }: CardFrontPanelProps) {
  return (
    <div data-testid="review-card-front">
      {/* Flash card */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 20,
          padding: 44,
          boxShadow: "var(--shadow-subtle)",
          textAlign: "center",
        }}
      >
        <Badge label={card.cardVariant} tone="blue" />
        <p
          style={{
            fontSize: 25,
            fontWeight: 500,
            color: "#343433",
            marginTop: 20,
            marginBottom: 0,
            lineHeight: 1.4,
          }}
        >
          {front}
        </p>
        {hint && (
          <p style={{ fontSize: 14, color: "#848281", marginTop: 12, fontStyle: "italic" }}>
            {hint}
          </p>
        )}
      </div>

      {/* Show answer CTA */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
        <button
          type="button"
          onClick={onReveal}
          style={{
            backgroundColor: "#121212",
            color: "#ffffff",
            borderRadius: 32,
            padding: "14px 32px",
            fontSize: 15,
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Show answer
          <span
            style={{
              fontSize: 11,
              backgroundColor: "rgba(255,255,255,0.18)",
              borderRadius: 6,
              padding: "2px 6px",
            }}
          >
            Space
          </span>
        </button>
      </div>
    </div>
  );
}

// ---- CardRevealedPanel ------------------------------------------------------

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
    <div className="sd-fade">
      {/* Card */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 20,
          boxShadow: "var(--shadow-subtle)",
          overflow: "hidden",
        }}
      >
        {/* Question section */}
        <div
          style={{
            padding: 44,
            textAlign: "center",
            borderBottom: "1px dashed #e8e4df",
          }}
        >
          <Badge label={card.cardVariant} tone="blue" />
          <p
            data-testid="review-card-front-text"
            style={{
              fontSize: 25,
              fontWeight: 500,
              color: "#343433",
              marginTop: 20,
              marginBottom: 0,
              lineHeight: 1.4,
            }}
          >
            {front}
          </p>
          {hint && (
            <p style={{ fontSize: 14, color: "#848281", marginTop: 12, fontStyle: "italic" }}>
              {hint}
            </p>
          )}
        </div>

        {/* Answer section */}
        <div data-testid="review-card-back" style={{ padding: "32px 44px" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "#a7a7a7",
              marginBottom: 12,
              marginTop: 0,
              textTransform: "uppercase",
            }}
          >
            ANSWER
          </p>
          <p style={{ fontSize: 20, color: "#474645", margin: 0, lineHeight: 1.5 }}>
            {back}
          </p>
        </div>
      </div>

      {/* Rating grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginTop: 28,
        }}
      >
        {RATINGS.map(({ rating, label, key, color }) => (
          <RatingButton
            key={rating}
            rating={rating}
            label={label}
            keyHint={key}
            color={color}
            onRate={onRate}
            isSubmitting={isSubmitting}
          />
        ))}
      </div>
    </div>
  );
}

// ---- RatingButton -----------------------------------------------------------

interface RatingButtonProps {
  rating: ReviewRating;
  label: string;
  keyHint: string;
  color: string;
  onRate: (rating: ReviewRating) => void;
  isSubmitting: boolean;
}

function RatingButton({ rating, label, keyHint, color, onRate, isSubmitting }: RatingButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      data-testid={`rating-btn-${rating}`}
      onClick={() => onRate(rating)}
      disabled={isSubmitting}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 14,
        border: `1px solid ${hovered ? color : "#e8e4df"}`,
        backgroundColor: "#ffffff",
        padding: "14px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        cursor: isSubmitting ? "not-allowed" : "pointer",
        transition: "all 0.12s",
        opacity: isSubmitting ? 0.4 : 1,
        boxShadow: hovered ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color }}>{label}</span>
      <span style={{ fontSize: 11, color: "#a7a7a7" }}>{keyHint}</span>
    </button>
  );
}

// ---- ReviewSummary ----------------------------------------------------------

interface ReviewSummaryProps {
  deckId?: string | undefined;
  reviewedCount: number;
  ratings: Record<ReviewRating, number>;
  onStudyAgain: () => void;
}

function ReviewSummary({ reviewedCount, ratings, onStudyAgain }: ReviewSummaryProps) {
  const navigate = useNavigate();

  return (
    <div
      data-testid="review-summary"
      className="sd-pop"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        maxWidth: 440,
        margin: "80px auto",
      }}
    >
      {/* Success circle */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          backgroundColor: "#e6f9ed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path
            d="M6 14l6 6 10-12"
            stroke="#00ca48"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2
        style={{
          fontFamily: "var(--font-family)",
          fontSize: 34,
          fontWeight: 600,
          color: "#343433",
          marginTop: 24,
          marginBottom: 0,
          textAlign: "center",
        }}
      >
        All done
      </h2>
      <p style={{ fontSize: 15, color: "#848281", marginTop: 8, textAlign: "center" }}>
        Great work — keep the streak going!
      </p>

      {/* Stat tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
          marginTop: 32,
          width: "100%",
        }}
      >
        {[
          { label: "Reviewed", value: reviewedCount },
          { label: "Again", value: ratings["again"] ?? 0 },
          { label: "Good", value: ratings["good"] ?? 0 },
          { label: "Easy", value: ratings["easy"] ?? 0 },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              backgroundColor: "#f6f4ef",
              borderRadius: 12,
              padding: 16,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 24, fontWeight: 600, color: "#343433", margin: 0 }}>
              {value}
            </p>
            <p
              style={{
                fontSize: 12,
                color: "#a7a7a7",
                marginTop: 4,
                marginBottom: 0,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
        <PillButton variant="secondary" onClick={() => navigate("/")}>
          Back to dashboard
        </PillButton>
        <PillButton variant="primary" onClick={onStudyAgain}>
          Study again
        </PillButton>
      </div>
    </div>
  );
}

// ---- ReviewSessionPage (main) -----------------------------------------------

export function ReviewSessionPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [reviewState, setReviewState] = useState<ReviewState>(REVIEW_STATE.IDLE);
  const [session, setSession] = useState<ReviewSessionModel | null>(null);
  const [cardPreview, setCardPreview] = useState<{ front: string; back: string; hint?: string | undefined } | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [ratings, setRatings] = useState<Record<ReviewRating, number>>({
    again: 0, hard: 0, good: 0, easy: 0,
  });

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

      const nextResponse = await reviewsApi.getNextReviewCard(session.id);
      if (nextResponse.status === 204 || !nextResponse.data) {
        setReviewState(REVIEW_STATE.DONE);
      } else {
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

  function handleStudyAgain() {
    setSession(null);
    setCardPreview(null);
    setReviewedCount(0);
    setRatings({ again: 0, hard: 0, good: 0, easy: 0 });
    setReviewState(REVIEW_STATE.IDLE);
  }

  // ---- Keyboard shortcuts --------------------------------------------------

  const stateRef = useRef(reviewState);
  stateRef.current = reviewState;

  const currentCardRef = useRef(currentCard);
  currentCardRef.current = currentCard;

  const sessionRef = useRef(session);
  sessionRef.current = session;

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

  // ---- Render state booleans -----------------------------------------------

  const isIdle = reviewState === REVIEW_STATE.IDLE;
  const isStarting = reviewState === REVIEW_STATE.STARTING;
  const isFront = reviewState === REVIEW_STATE.FRONT;
  const isRevealed = reviewState === REVIEW_STATE.REVEALED;
  const isSubmitting = reviewState === REVIEW_STATE.SUBMITTING;
  const isDone = reviewState === REVIEW_STATE.DONE;
  const isActiveSession = !isIdle && !isDone;

  // ---- Render --------------------------------------------------------------

  return (
    <div
      data-testid="review-session-page"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fafaf9",
      }}
    >
      {/* Top bar — shown during active session and done state (not on idle start screen) */}
      {!isIdle && (
        <DeckTopBar
          deckId={deckId}
          reviewedCount={reviewedCount}
          onClose={() => navigate("/")}
        />
      )}

      {/* Progress bar — only during active session */}
      {isActiveSession && (
        <ProgressBar value={0} color="#00ca48" height={3} />
      )}

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Idle / Starting: full-height start screen */}
        {(isIdle || isStarting) && (
          <StartScreen deckId={deckId} onStart={handleStart} isStarting={isStarting} />
        )}

        {/* Active card area */}
        {(isFront || reviewState === REVIEW_STATE.LOADING_CARD || isRevealed || isSubmitting) && (
          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              padding: "56px 32px",
              overflowY: "auto",
            }}
          >
            <div style={{ width: "100%", maxWidth: 680 }}>
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
            </div>
          </div>
        )}

        {/* Done: summary */}
        {isDone && (
          <ReviewSummary
            deckId={deckId}
            reviewedCount={reviewedCount}
            ratings={ratings}
            onStudyAgain={handleStudyAgain}
          />
        )}
      </div>
    </div>
  );
}
