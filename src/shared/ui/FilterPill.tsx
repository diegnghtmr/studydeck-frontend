import type { ReactNode } from "react";

export type FilterPillShape = "pill" | "rounded";

interface FilterPillProps {
  active?: boolean;
  shape?: FilterPillShape;
  onClick?: () => void;
  children: ReactNode;
  "data-testid"?: string;
}

export function FilterPill({
  active = false,
  shape = "pill",
  onClick,
  children,
  "data-testid": testId,
}: FilterPillProps) {
  const radius = shape === "pill" ? "32px" : "8px";

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="inline-flex items-center px-4 py-2 text-[13px] font-medium transition-colors"
      style={{
        backgroundColor: active ? "#121212" : "#f6f4ef",
        color: active ? "#ffffff" : "#474645",
        borderRadius: radius,
        border: "none",
        cursor: "pointer",
        letterSpacing: "-0.16px",
      }}
    >
      {children}
    </button>
  );
}

// SegmentedTab is the same component with rounded shape as default
interface SegmentedTabProps {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  "data-testid"?: string;
}

export function SegmentedTab({ active, onClick, children, "data-testid": testId }: SegmentedTabProps) {
  return (
    <FilterPill
      active={active ?? false}
      shape="rounded"
      {...(onClick !== undefined && { onClick })}
      {...(testId !== undefined && { "data-testid": testId })}
    >
      {children}
    </FilterPill>
  );
}
