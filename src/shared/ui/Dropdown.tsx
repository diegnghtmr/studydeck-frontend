import { useState, useRef, useEffect, type ReactNode } from "react";

interface DropdownItem {
  value: string;
  label: string;
}

interface DropdownProps {
  items: DropdownItem[];
  value?: string;
  placeholder?: string;
  onSelect: (value: string) => void;
  searchable?: boolean;
  triggerLabel?: ReactNode;
  "data-testid"?: string;
}

export function Dropdown({
  items,
  value,
  placeholder = "Select…",
  onSelect,
  searchable = false,
  "data-testid": testId,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = items.find((i) => i.value === value)?.label ?? placeholder;

  const filtered = searchable
    ? items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
    : items;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block" data-testid={testId}>
      {/* Trigger */}
      <button
        type="button"
        data-testid={testId ? `${testId}-trigger` : "dropdown-trigger"}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-[14px]"
        style={{
          backgroundColor: "var(--color-stone-surface)",
          color: "var(--color-charcoal-primary)",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          minWidth: "160px",
        }}
      >
        <span className="truncate">{selectedLabel}</span>
        {/* Chevron */}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <>
          {/* Backdrop for click-away */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 30 }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            data-testid={testId ? `${testId}-panel` : "dropdown-panel"}
            className="sd-pop absolute left-0 mt-1 min-w-full overflow-hidden"
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              boxShadow: "var(--shadow-lg)",
              zIndex: 40,
            }}
          >
            {searchable && (
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded px-3 py-1.5 text-[13px] outline-none"
                  style={{
                    backgroundColor: "var(--color-stone-surface)",
                    color: "var(--color-charcoal-primary)",
                  }}
                  data-testid={testId ? `${testId}-search` : "dropdown-search"}
                />
              </div>
            )}
            <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
              {filtered.map((item) => (
                <li
                  key={item.value}
                  role="option"
                  aria-selected={item.value === value}
                  onClick={() => {
                    onSelect(item.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="cursor-pointer px-3 py-2 text-[14px] transition-colors hover:bg-[#f6f4ef]"
                  style={{
                    color:
                      item.value === value
                        ? "var(--color-midnight)"
                        : "var(--color-charcoal-primary)",
                    fontWeight: item.value === value ? 600 : 400,
                  }}
                >
                  {item.label}
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-[13px]" style={{ color: "var(--color-ash)" }}>
                  No results
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
