import type { ApiProblem } from "@shared/api/problem";
import { cn } from "@shared/lib/cn";

interface ProblemBannerProps {
  problem: ApiProblem;
  className?: string;
  onDismiss?: () => void;
}

const STATUS_STYLES = {
  client: {
    bg: "var(--color-parchment-card)",
    border: "var(--color-ember-orange)",
    color: "var(--color-charcoal-primary)",
    badge: "var(--color-ember-orange)",
  },
  server: {
    bg: "#fff0f0",
    border: "#d9534f",
    color: "var(--color-charcoal-primary)",
    badge: "#d9534f",
  },
  info: {
    bg: "var(--color-warm-canvas)",
    border: "var(--color-graphite)",
    color: "var(--color-charcoal-primary)",
    badge: "var(--color-graphite)",
  },
} as const;

function resolveStyle(status: number) {
  if (status >= 500) return STATUS_STYLES.server;
  if (status >= 400) return STATUS_STYLES.client;
  return STATUS_STYLES.info;
}

/**
 * Renders an RFC 9457 ApiProblem as a dismissible banner.
 * Styled with design tokens so it integrates with the StudyDeck theme.
 */
export function ProblemBanner({ problem, className, onDismiss }: ProblemBannerProps) {
  const style = resolveStyle(problem.status);

  return (
    <div
      role="alert"
      data-testid="problem-banner"
      className={cn("rounded-[10px] border-l-4 p-4", className)}
      style={{
        backgroundColor: style.bg,
        borderLeftColor: style.border,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Status badge + title */}
          <div className="mb-1 flex items-center gap-2">
            <span
              className="rounded px-2 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: style.badge }}
            >
              {problem.status}
            </span>
            <span
              className="text-[15px] font-semibold"
              style={{ color: style.color }}
            >
              {problem.title}
            </span>
          </div>

          {/* Detail */}
          {problem.detail && (
            <p
              className="text-[14px] leading-[1.5]"
              style={{ color: "var(--color-graphite)" }}
            >
              {problem.detail}
            </p>
          )}

          {/* Field violations */}
          {problem.violations && problem.violations.length > 0 && (
            <ul className="mt-2 space-y-1">
              {problem.violations.map((v, i) => (
                <li
                  key={i}
                  className="text-[13px]"
                  style={{ color: "var(--color-graphite)" }}
                >
                  <span className="font-medium">{v.field}</span>: {v.message}
                </li>
              ))}
            </ul>
          )}

          {/* Trace for debugging */}
          {problem.traceId && (
            <p
              className="mt-2 text-[11px] font-mono"
              style={{ color: "var(--color-ash)" }}
            >
              trace: {problem.traceId}
            </p>
          )}
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={onDismiss}
            className="shrink-0 text-[18px] leading-none"
            style={{ color: "var(--color-ash)" }}
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
