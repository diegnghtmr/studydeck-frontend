import { NavLink } from "react-router";
import { cn } from "@shared/lib/cn";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/decks", label: "Decks" },
  { to: "/documents", label: "Documents" },
  { to: "/rag/chat", label: "AI Chat" },
  { to: "/ai/generate", label: "AI Generate" },
] as const;

export function NavBar() {
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
            Log In
          </button>
          <button
            type="button"
            className="rounded-[32px] px-4 py-2 text-[14px] font-medium text-white transition-colors duration-200 hover:opacity-90"
            style={{ backgroundColor: "var(--color-midnight)" }}
          >
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
}
