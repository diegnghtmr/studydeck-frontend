import { useState } from "react";
import type { ApiProblem } from "@shared/api/problem";
import { cn } from "@shared/lib/cn";

interface ProblemBannerProps {
  problem: ApiProblem;
  className?: string;
  onDismiss?: () => void;
}

type Tone = "error" | "warning" | "info";

const TONE_STYLES: Record<Tone, { tint: string; ring: string; accent: string }> = {
  error: { tint: "#fff7f4", ring: "#f7ddd4", accent: "#ff3e00" },
  warning: { tint: "#fffaf0", ring: "#f0e4c8", accent: "#d48f00" },
  info: { tint: "#f5faff", ring: "#dbeafe", accent: "#0090ff" },
};

function toneFor(status: number): Tone {
  if (status >= 500) return "error";
  if (status >= 400) return "warning";
  return "info";
}

/**
 * Maps a raw RFC 9457 problem to friendly, user-facing copy. Backend internals
 * (env var names, configuration hints, stack details) are never surfaced to the
 * end user — those belong in logs, not in the UI.
 */
function friendlyCopy(problem: ApiProblem): { title: string; detail?: string } {
  const raw = `${problem.title ?? ""} ${problem.detail ?? ""}`.toLowerCase();
  const mentionsAi =
    /\b(ai|chat|provider|openai|ollama|llm|embedding)\b/.test(raw) ||
    raw.includes("configured");

  if (problem.status >= 500) {
    if (mentionsAi) {
      return {
        title: "AI features are unavailable",
        detail:
          "AI-powered features aren't set up in this environment yet. Everything else works normally.",
      };
    }
    return {
      title: "Something went wrong",
      detail: "We hit a problem on our end. Please try again in a moment.",
    };
  }

  // 4xx and below: titles/details are user-facing and actionable — keep them.
  return {
    title: problem.title || "We couldn't complete that",
    ...(problem.detail ? { detail: problem.detail } : {}),
  };
}

function AlertIcon({ color }: { color: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/**
 * Renders an RFC 9457 ApiProblem as a soft, on-brand dismissible banner.
 * Uses the warm StudyDeck palette and friendly copy rather than a raw error dump.
 */
export function ProblemBanner({ problem, className, onDismiss }: ProblemBannerProps) {
  const tone = toneFor(problem.status);
  const s = TONE_STYLES[tone];
  const { title, detail } = friendlyCopy(problem);
  const [dismissHover, setDismissHover] = useState(false);

  return (
    <div
      role="alert"
      data-testid="problem-banner"
      className={cn("sd-fade flex items-start gap-3 rounded-[14px]", className)}
      style={{ padding: "14px 16px", backgroundColor: s.tint, boxShadow: `${s.ring} 0 0 0 1px inset` }}
    >
      {/* Status icon — aligned with the title's optical center */}
      <span className="flex shrink-0 items-center" style={{ marginTop: 2 }}>
        <AlertIcon color={s.accent} />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className="text-[15px] font-semibold"
          style={{ color: "var(--color-charcoal-primary)", margin: 0 }}
        >
          {title}
        </p>

        {detail && (
          <p
            className="text-[14px] leading-[1.5]"
            style={{ color: "var(--color-graphite)", margin: "4px 0 0" }}
          >
            {detail}
          </p>
        )}

        {/* Field-level validation messages (kept — they are user-actionable) */}
        {problem.violations && problem.violations.length > 0 && (
          <ul className="space-y-1" style={{ marginTop: 8 }}>
            {problem.violations.map((v, i) => (
              <li key={i} className="text-[13px]" style={{ color: "var(--color-graphite)" }}>
                <span className="font-medium">{v.field}</span>: {v.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss error"
          onClick={onDismiss}
          onMouseEnter={() => setDismissHover(true)}
          onMouseLeave={() => setDismissHover(false)}
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 28,
            height: 28,
            marginTop: -2,
            marginRight: -4,
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            transition: "background 0.15s ease, color 0.15s ease",
            background: dismissHover ? "rgba(18,18,18,0.06)" : "transparent",
            color: dismissHover ? "var(--color-charcoal-primary)" : "var(--color-ash)",
          }}
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}
