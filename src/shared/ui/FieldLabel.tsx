import type { ReactNode } from "react";
import { cn } from "@shared/lib/cn";

interface FieldLabelProps {
  children: ReactNode;
  /** Extra classes (e.g. spacing). Merged after the base styles. */
  className?: string;
}

/**
 * FieldLabel — the small uppercase caption used above form fields and content
 * sections (FRONT, BACK, PROMPT, ANSWER, …). Single source of truth so the
 * style stays consistent across the app.
 */
export function FieldLabel({ children, className }: FieldLabelProps) {
  return (
    <p
      className={cn("text-[11px] font-semibold uppercase tracking-wide", className)}
      style={{ color: "var(--color-smoke)", letterSpacing: "0.3px", margin: 0 }}
    >
      {children}
    </p>
  );
}
