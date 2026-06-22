import type { ReactNode } from "react";

export type PillButtonVariant = "primary" | "secondary" | "danger";

interface PillButtonProps {
  variant?: PillButtonVariant;
  leadingIcon?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  type?: "button" | "submit" | "reset";
  "data-testid"?: string;
}

export function PillButton({
  variant = "primary",
  leadingIcon,
  disabled,
  onClick,
  children,
  type = "button",
  "data-testid": testId,
}: PillButtonProps) {
  const bgColor =
    variant === "primary"
      ? "var(--color-midnight)"
      : variant === "danger"
        ? "var(--color-ember-orange)"
        : "#f6f4ef";
  const textColor =
    variant === "secondary" ? "var(--color-midnight)" : "#ffffff";

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className="inline-flex items-center gap-2 px-5 py-2 text-[14px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        borderRadius: "32px",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {leadingIcon && <span className="flex shrink-0 items-center">{leadingIcon}</span>}
      {children}
    </button>
  );
}
