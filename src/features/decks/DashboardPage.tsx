import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useDecks } from "./hooks/use-decks";
import { useDeckStats } from "@features/review/hooks/use-review";
import { useAuthStore } from "@shared/auth/auth-store";
import { Card, ProgressBar } from "@shared/ui";
import { getDeckColor } from "./lib/deck-color";
import { DeckIcon } from "./DeckIcon";
import type { DeckModel } from "@shared/api/types";
import { useUserStats } from "@shared/stats/use-user-stats";

// ---- DashboardDeckCard -------------------------------------------------------

function DashboardDeckCard({ deck }: { deck: DeckModel }) {
  const { t } = useTranslation("dashboard");
  const { data: stats } = useDeckStats(deck.id);
  const { color } = getDeckColor(deck.id);
  const navigate = useNavigate();

  const dueCount = stats?.dueToday;
  const newCount = stats?.newCards;
  const totalCards = stats?.totalCards;
  // Deck progress = fraction of cards that have entered the review cycle (i.e. are no longer NEW).
  const progress =
    totalCards && totalCards > 0 && newCount !== undefined
      ? Math.min(1, Math.max(0, (totalCards - newCount) / totalCards))
      : 0;

  return (
    <article
      data-testid="dashboard-deck-card"
      data-deck-id={deck.id}
      role="button"
      tabIndex={0}
      aria-label={t("deckCard.openAria", { title: deck.title })}
      onClick={() => navigate(`/decks/${deck.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/decks/${deck.id}`);
        }
      }}
      className="group cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
      style={{
        backgroundColor: "#ffffff",
        boxShadow: "var(--shadow-subtle)",
        borderRadius: 16,
        padding: 22,
      }}
    >
      {/* Deck avatar: deterministic glyph in the deck color */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <DeckIcon deckId={deck.id} icon={deck.icon} color={deck.color} size={36} />
        <p style={{ fontSize: 15, fontWeight: 600, color: "#343433", margin: 0 }} className="line-clamp-1">
          {deck.title}
        </p>
      </div>

      {/* Progress bar */}
      <ProgressBar value={progress} color={color} height={5} data-testid={`deck-progress-${deck.id}`} />

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 12,
          fontSize: 12,
          color: "var(--color-ash)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "#ff3e00",
              display: "inline-block",
            }}
          />
          <span data-testid={`deck-due-${deck.id}`}>
            {dueCount !== undefined ? dueCount : "—"} {t("deckCard.dueSuffix")}
          </span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "#0090ff",
              display: "inline-block",
            }}
          />
          <span data-testid={`deck-new-${deck.id}`}>
            {newCount !== undefined ? newCount : "—"} {t("deckCard.newSuffix")}
          </span>
        </span>
        <span style={{ marginLeft: "auto" }}>
          {totalCards !== undefined ? totalCards : "—"} {t("deckCard.totalSuffix")}
        </span>
      </div>
    </article>
  );
}

// ---- Skeleton primitive -----------------------------------------------------

/**
 * A single shimmering placeholder bar. Used while data is loading so the UI never
 * flashes default/empty values (e.g. "No decks yet" or "0 decks") before the real
 * data arrives. `dark` adapts the tint for use on the dark "Up next" banner.
 */
function SkeletonBar({
  width = "100%",
  height = 12,
  radius = 6,
  dark = false,
}: {
  width?: number | string;
  height?: number;
  radius?: number;
  dark?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className="sd-pulse"
      style={{
        display: "block",
        width,
        height,
        borderRadius: radius,
        backgroundColor: dark ? "rgba(255,255,255,0.16)" : "var(--color-stone-surface)",
      }}
    />
  );
}

// ---- DashboardPage ----------------------------------------------------------

export function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const { data: decksPage, isPending } = useDecks({ size: 10 });
  const user = useAuthStore((s) => s.user);
  const { data: userStats, isPending: statsPending } = useUserStats();

  const firstName = user?.displayName?.split(" ")[0] ?? "there";
  const deckCount = decksPage?.page.totalElements ?? 0;
  const activeDecks = decksPage?.items.filter((d) => !d.archived) ?? [];
  const firstDeck = activeDecks[0] ?? null;

  const hours = new Date().getHours();
  const greetingKey =
    hours < 12 ? "greeting.morning" : hours < 18 ? "greeting.afternoon" : "greeting.evening";

  const today = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <main
      data-testid="dashboard-page"
      className="sd-fade mx-auto max-w-[1080px]"
      style={{ padding: "48px 56px 80px" }}
    >
      {/* A. Header block */}
      <p
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--color-ember-orange)",
          letterSpacing: "-0.1px",
          margin: 0,
        }}
      >
        {today}
      </p>
      <h1
        data-testid="dashboard-heading"
        style={{
          fontFamily: "var(--font-family)",
          fontWeight: 500,
          fontSize: 46,
          lineHeight: 1.05,
          letterSpacing: "-1.4px",
          color: "#343433",
          margin: "8px 0 0",
        }}
      >
        {t(greetingKey)}, {firstName}
      </h1>
      {isPending ? (
        <div style={{ margin: "12px 0 0" }} role="status" aria-label={t("loading.decksAria")}>
          <SkeletonBar width={240} height={16} />
        </div>
      ) : (
        <p style={{ fontSize: 16, color: "#848281", margin: "8px 0 0" }}>
          {t("subtitle.prefix")}{" "}
          <strong style={{ color: "#474645", fontWeight: 600 }}>
            {deckCount} {t("subtitle.deckWord", { count: deckCount })}
          </strong>{" "}
          {t("subtitle.suffix")}
        </p>
      )}

      {/* B. Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginTop: 36,
        }}
      >
        <Card radius={14} className="p-[22px]">
          <p style={{ fontSize: 12, fontWeight: 500, color: "#a7a7a7", margin: 0 }}>
            {t("stats.dueToday")}
          </p>
          <p
            data-testid="stat-due-today"
            style={{
              fontFamily: "var(--font-family)",
              fontSize: 34,
              fontWeight: 500,
              letterSpacing: "-1px",
              color: "var(--color-ember-orange)",
              margin: "8px 0 0",
            }}
          >
            {statsPending ? (
              <SkeletonBar width={56} height={30} radius={8} />
            ) : (
              (userStats?.dueToday ?? "—")
            )}
          </p>
        </Card>

        <Card radius={14} className="p-[22px]">
          <p style={{ fontSize: 12, fontWeight: 500, color: "#a7a7a7", margin: 0 }}>
            {t("stats.retention")}
          </p>
          <p
            data-testid="stat-retention"
            style={{
              fontFamily: "var(--font-family)",
              fontSize: 34,
              fontWeight: 500,
              letterSpacing: "-1px",
              color: "#00ca48",
              margin: "8px 0 0",
            }}
          >
            {statsPending ? (
              <SkeletonBar width={64} height={30} radius={8} />
            ) : userStats?.retention30d !== undefined ? (
              `${Math.round(userStats.retention30d * 100)}%`
            ) : (
              "—"
            )}
          </p>
        </Card>

        <Card radius={14} className="p-[22px]">
          <p style={{ fontSize: 12, fontWeight: 500, color: "#a7a7a7", margin: 0 }}>
            {t("stats.newCards")}
          </p>
          <p
            data-testid="stat-new-cards"
            style={{
              fontFamily: "var(--font-family)",
              fontSize: 34,
              fontWeight: 500,
              letterSpacing: "-1px",
              color: "#343433",
              margin: "8px 0 0",
            }}
          >
            {statsPending ? (
              <SkeletonBar width={56} height={30} radius={8} />
            ) : (
              (userStats?.newCards ?? "—")
            )}
          </p>
        </Card>

        <Card radius={14} className="p-[22px]">
          <p style={{ fontSize: 12, fontWeight: 500, color: "#a7a7a7", margin: 0 }}>
            {t("stats.dayStreak")}
          </p>
          <p
            data-testid="stat-day-streak"
            style={{
              fontFamily: "var(--font-family)",
              fontSize: 34,
              fontWeight: 500,
              letterSpacing: "-1px",
              color: "#343433",
              margin: "8px 0 0",
            }}
          >
            {statsPending ? (
              <SkeletonBar width={56} height={30} radius={8} />
            ) : (
              (userStats?.dayStreak ?? "—")
            )}
          </p>
        </Card>
      </div>

      {/* C. Up next banner */}
      <div
        style={{
          background: "#121212",
          borderRadius: 20,
          padding: "30px 34px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          boxShadow: "rgba(0,0,0,0.14) 0 8px 30px -10px",
          marginTop: 24,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "#ffbb26",
              letterSpacing: ".3px",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            {t("upNext.label")}
          </p>
          {isPending ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 2 }}
              role="status"
              aria-label={t("loading.nextDeckAria")}
            >
              <SkeletonBar width={180} height={22} radius={7} dark />
              <SkeletonBar width={120} height={13} radius={6} dark />
            </div>
          ) : firstDeck ? (
            <>
              <p
                style={{
                  fontFamily: "var(--font-family)",
                  fontSize: 26,
                  fontWeight: 500,
                  color: "#ffffff",
                  margin: 0,
                }}
              >
                {firstDeck.title}
              </p>
              <p style={{ fontSize: 14, color: "#a7a7a7", margin: 0 }}>
                {firstDeck.description ?? t("upNext.readyToReview")}
              </p>
            </>
          ) : (
            <>
              <p
                style={{
                  fontFamily: "var(--font-family)",
                  fontSize: 26,
                  fontWeight: 500,
                  color: "#ffffff",
                  margin: 0,
                }}
              >
                {t("upNext.noDecksTitle")}
              </p>
              <p style={{ fontSize: 14, color: "#a7a7a7", margin: 0 }}>
                {t("upNext.noDecksSubtitle")}
              </p>
            </>
          )}
        </div>

        {isPending ? (
          <SkeletonBar width={140} height={48} radius={32} dark />
        ) : (
          <Link
            to={firstDeck ? `/review/${firstDeck.id}` : "/decks/new"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#ffffff",
              color: "#121212",
              borderRadius: 32,
              padding: "14px 26px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {firstDeck ? t("upNext.startReview") : t("upNext.createDeck")}
          </Link>
        )}
      </div>

      {/* D. Decks section */}
      <div
        style={{
          marginTop: 48,
          marginBottom: 18,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <h2
          data-testid="decks-section-heading"
          style={{ fontSize: 19, fontWeight: 600, color: "#343433", margin: 0 }}
        >
          {t("decksSection.heading")}
        </h2>
        <Link
          to="/decks"
          style={{ fontSize: 14, color: "var(--color-ember-orange)", textDecoration: "none" }}
        >
          {t("decksSection.manageLink")}
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 18,
        }}
      >
        {isPending ? (
          <>
            {[0, 1, 2].map((i) => (
              <Card key={i} recessed radius={16} className="p-[22px] sd-pulse">
                <div
                  style={{
                    height: 36,
                    width: 36,
                    borderRadius: 11,
                    backgroundColor: "var(--color-stone-surface)",
                  }}
                />
                <div
                  style={{
                    height: 16,
                    width: "60%",
                    borderRadius: 6,
                    backgroundColor: "var(--color-stone-surface)",
                    marginTop: 12,
                  }}
                />
                <div
                  style={{
                    height: 7,
                    borderRadius: 7,
                    backgroundColor: "var(--color-stone-surface)",
                    marginTop: 16,
                  }}
                />
              </Card>
            ))}
          </>
        ) : activeDecks.length === 0 ? (
          <Card recessed radius={16} className="p-[22px] col-span-3 text-center">
            <p style={{ fontSize: 15, color: "var(--color-ash)", margin: 0 }}>
              {t("decksSection.noDecksYet")}{" "}
              <Link to="/decks/new" style={{ color: "var(--color-ember-orange)" }}>
                {t("decksSection.createOne")}
              </Link>
            </p>
          </Card>
        ) : (
          activeDecks.map((deck) => <DashboardDeckCard key={deck.id} deck={deck} />)
        )}
      </div>
    </main>
  );
}
