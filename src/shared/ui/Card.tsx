import type { ReactNode } from "react";
import { cn } from "@shared/lib/cn";

interface CardProps {
  children: ReactNode;
  recessed?: boolean;
  radius?: number;
  className?: string;
  "data-testid"?: string;
  onClick?: () => void;
}

export function Card({
  children,
  recessed = false,
  radius = 14,
  className,
  "data-testid": testId,
  onClick,
}: CardProps) {
  return (
    <div
      data-testid={testId}
      className={cn("overflow-hidden", className)}
      style={{
        backgroundColor: recessed ? "var(--color-parchment-card)" : "#ffffff",
        boxShadow: "var(--shadow-subtle)",
        borderRadius: `${radius}px`,
        cursor: onClick ? "pointer" : undefined,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
