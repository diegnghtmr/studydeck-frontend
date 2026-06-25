export type BadgeTone = "blue" | "green" | "amber" | "red" | "gray";

const TONE_STYLES: Record<BadgeTone, { bg: string; color: string }> = {
  blue:  { bg: "#eaf4ff", color: "#0090ff" },
  green: { bg: "#e6f9ed", color: "#00ca48" },
  amber: { bg: "#fff6e0", color: "#d48f00" },
  red:   { bg: "#fff0eb", color: "#ff3e00" },
  gray:  { bg: "#f2f0ed", color: "#a7a7a7" },
};

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** Override bg color (overrides tone) */
  bg?: string;
  /** Override text color (overrides tone) */
  color?: string;
  /** Border radius variant. "pill" = 9999px, "rounded" (default) = 6px. */
  shape?: "rounded" | "pill";
  "data-testid"?: string;
}

export function Badge({ label, tone = "blue", bg, color, shape, "data-testid": testId }: BadgeProps) {
  const resolved = TONE_STYLES[tone];
  return (
    <span
      data-testid={testId}
      className="inline-block text-[11px] font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: bg ?? resolved.bg,
        color: color ?? resolved.color,
        borderRadius: shape === "pill" ? "9999px" : "6px",
        padding: "3px 9px",
        letterSpacing: "0.3px",
      }}
    >
      {label}
    </span>
  );
}
