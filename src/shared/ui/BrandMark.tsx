import { cn } from "@shared/lib/cn";

export type BrandMarkSize = "sm" | "lg";

// Size presets: "sm" matches the sidebar header, "lg" is for standalone
// surfaces like the login screen where the brand is the focal point.
const SIZE: Record<BrandMarkSize, { mark: number; icon: number; radius: number; word: number; gap: number }> = {
  sm: { mark: 30, icon: 17, radius: 8, word: 16, gap: 8 },
  lg: { mark: 48, icon: 26, radius: 14, word: 24, gap: 12 },
};

interface BrandMarkProps {
  size?: BrandMarkSize;
  /** Optional test id forwarded to the wordmark text. */
  wordmarkTestId?: string;
  className?: string;
}

/**
 * StudyDeck brand lockup — layered-deck glyph in a charcoal tile plus the
 * "StudyDeck." wordmark (orange period). Shared so the mark stays identical
 * across the sidebar, login, and any future standalone surface.
 */
export function BrandMark({ size = "sm", wordmarkTestId, className }: BrandMarkProps) {
  const s = SIZE[size];

  return (
    <div className={cn("flex min-w-0 items-center", className)} style={{ gap: `${s.gap}px` }}>
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          width: `${s.mark}px`,
          height: `${s.mark}px`,
          backgroundColor: "#121212",
          borderRadius: `${s.radius}px`,
          color: "#ff3e00",
        }}
      >
        <svg width={s.icon} height={s.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3l8.5 4.7L12 12.4 3.5 7.7 12 3ZM4 12l8 4.5 8-4.5M4 16.3l8 4.5 8-4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span
        {...(wordmarkTestId ? { "data-testid": wordmarkTestId } : {})}
        className="truncate font-semibold"
        style={{
          color: "#343433",
          whiteSpace: "nowrap",
          fontSize: `${s.word}px`,
          letterSpacing: "-0.4px",
        }}
      >
        StudyDeck<span style={{ color: "#ff3e00" }}>.</span>
      </span>
    </div>
  );
}
