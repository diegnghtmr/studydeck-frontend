import { useState } from "react";
import { Link } from "react-router";

export interface BreadcrumbItem {
  label: string;
  /** When present (and not the last item) the crumb is a link. */
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

function CrumbLink({ to, children }: { to: string; children: string }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      to={to}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="max-w-[180px] truncate no-underline transition-colors"
      style={{ color: hover ? "var(--color-charcoal-primary)" : "var(--color-ash)" }}
    >
      {children}
    </Link>
  );
}

function Chevron() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-fog)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/**
 * Breadcrumb — shared navigation trail. The last item is rendered as the
 * current page (non-link, emphasized); earlier items with an `href` are links.
 */
export function Breadcrumb({ items, className = "mb-6" }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1.5 text-[13px] font-medium ${className}`}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <Chevron />}
            {isLast || !item.href ? (
              <span
                {...(isLast ? { "aria-current": "page" as const } : {})}
                className="max-w-[220px] truncate font-semibold"
                style={{ color: "var(--color-charcoal-primary)" }}
              >
                {item.label}
              </span>
            ) : (
              <CrumbLink to={item.href}>{item.label}</CrumbLink>
            )}
          </span>
        );
      })}
    </nav>
  );
}
