import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "@shared/lib/cn";

export type PillButtonVariant = "primary" | "secondary" | "danger" | "ghost-danger";
export type PillButtonSize = "sm" | "md";

const VARIANT_CLASS: Record<PillButtonVariant, string> = {
  primary: "bg-[var(--color-midnight)] text-white hover:opacity-90",
  secondary: "bg-[#f6f4ef] text-[var(--color-midnight)] hover:bg-[#ece9e4]",
  danger: "bg-[var(--color-coral-red)] text-white hover:opacity-90",
  "ghost-danger":
    "bg-transparent text-[var(--color-smoke)] hover:bg-[#fff0eb] hover:text-[#ff3e00]",
};

const SIZE_CLASS: Record<PillButtonSize, string> = {
  sm: "px-[18px] py-2.5 text-[13px]",
  md: "px-6 py-3 text-[14px]",
};

interface PillButtonBaseProps {
  variant?: PillButtonVariant;
  size?: PillButtonSize;
  leadingIcon?: ReactNode;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
  "aria-label"?: string;
}

interface PillButtonAsButton extends PillButtonBaseProps {
  href?: undefined;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

interface PillButtonAsLink extends PillButtonBaseProps {
  /** When set, renders a react-router Link instead of a button. */
  href: string;
}

type PillButtonProps = PillButtonAsButton | PillButtonAsLink;

const BASE_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-[32px] border-0 font-medium no-underline transition disabled:opacity-50";

export function PillButton(props: PillButtonProps) {
  const {
    variant = "primary",
    size = "md",
    leadingIcon,
    children,
    className,
    "data-testid": testId,
    "aria-label": ariaLabel,
  } = props;

  const classes = cn(BASE_CLASS, VARIANT_CLASS[variant], SIZE_CLASS[size], className);
  const content = (
    <>
      {leadingIcon && <span className="flex shrink-0 items-center">{leadingIcon}</span>}
      {children}
    </>
  );

  if (props.href !== undefined) {
    return (
      <Link to={props.href} data-testid={testId} aria-label={ariaLabel} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={props.type ?? "button"}
      disabled={props.disabled}
      onClick={props.onClick}
      data-testid={testId}
      aria-label={ariaLabel}
      className={cn(classes, props.disabled ? "cursor-not-allowed" : "cursor-pointer")}
    >
      {content}
    </button>
  );
}
