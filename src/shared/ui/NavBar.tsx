import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/lib/cn";

export function NavBar() {
  const { t } = useTranslation("common");

  const NAV_LINKS: { to: string; label: string; end?: true }[] = [
    { to: "/", label: t("nav.dashboard"), end: true },
    { to: "/decks", label: t("nav.decks") },
    { to: "/documents", label: t("nav.documents") },
    { to: "/rag/chat", label: t("nav.aiChat") },
    { to: "/ai/generate", label: t("nav.aiGenerate") },
  ];

  return (
    <header
      data-testid="navbar"
      className="sticky top-0 z-50 h-16 w-full"
      style={{
        backgroundColor: "var(--color-warm-canvas)",
        boxShadow: "var(--shadow-nav)",
      }}
    >
      <div
        className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6"
      >
        {/* Logo / Brand */}
        <NavLink
          to="/"
          data-testid="brand-logo"
          className="flex items-center gap-2 text-[15px] font-medium no-underline"
          style={{ color: "var(--color-charcoal-primary)" }}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--color-ember-orange)" }}
            aria-hidden="true"
          >
            S
          </span>
          <span data-testid="brand-wordmark">StudyDeck</span>
        </NavLink>

        {/* Center nav links */}
        <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map(({ to, label, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "text-[14px] font-medium transition-colors duration-200 no-underline",
                  isActive
                    ? "text-ember-orange"
                    : "hover:text-ember-orange",
                )
              }
              style={({ isActive }) => ({
                color: isActive ? "var(--color-ember-orange)" : "var(--color-charcoal-primary)",
              })}
              {...rest}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-[32px] px-4 py-2 text-[14px] font-medium transition-colors duration-200"
            style={{
              backgroundColor: "var(--color-stone-surface)",
              color: "var(--color-midnight)",
            }}
          >
            {t("nav.logIn")}
          </button>
          <button
            type="button"
            className="rounded-[32px] px-4 py-2 text-[14px] font-medium text-white transition-colors duration-200 hover:opacity-90"
            style={{ backgroundColor: "var(--color-midnight)" }}
          >
            {t("nav.getStarted")}
          </button>
        </div>
      </div>
    </header>
  );
}
