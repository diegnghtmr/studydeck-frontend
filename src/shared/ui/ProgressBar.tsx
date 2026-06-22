interface ProgressBarProps {
  value: number; // 0..1
  color?: string;
  height?: number;
  "data-testid"?: string;
}

export function ProgressBar({
  value,
  color = "#00ca48",
  height = 7,
  "data-testid": testId,
}: ProgressBarProps) {
  const pct = Math.min(1, Math.max(0, value)) * 100;

  return (
    <div
      data-testid={testId ?? "progress-bar"}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="w-full overflow-hidden"
      style={{
        height: `${height}px`,
        backgroundColor: "var(--color-stone-surface)",
        borderRadius: `${height}px`,
      }}
    >
      <div
        data-testid="progress-bar-fill"
        className="h-full transition-all duration-300"
        style={{
          width: `${pct}%`,
          backgroundColor: color,
          borderRadius: `${height}px`,
        }}
      />
    </div>
  );
}
