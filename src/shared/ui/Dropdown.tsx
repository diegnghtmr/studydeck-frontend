import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useId,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

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
  searchPlaceholder?: string;
  triggerLabel?: ReactNode;
  "data-testid"?: string;
  /** Associates a visible label element with the trigger button via aria-labelledby */
  "aria-labelledby"?: string;
  /** id forwarded to the trigger button so a visible <label htmlFor> can point at it */
  id?: string;
}

export function Dropdown({
  items,
  value,
  placeholder = "Select…",
  onSelect,
  searchable = false,
  searchPlaceholder = "Search…",
  "data-testid": testId,
  "aria-labelledby": ariaLabelledBy,
  id,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [triggerHover, setTriggerHover] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  // Viewport coords for the portalled panel — lets it escape any `overflow:hidden` ancestor.
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  const selectedLabel = items.find((i) => i.value === value)?.label ?? placeholder;

  const filtered = searchable
    ? items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
    : items;

  // Position the panel under the trigger; keep it aligned on scroll/resize.
  useLayoutEffect(() => {
    if (!open) return;
    function update() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setCoords({ top: r.bottom + 6, left: r.left, width: r.width });
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Reset active index when list opens/closes; focus the search input when opening.
  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
      setSearch("");
    } else {
      const selectedIdx = filtered.findIndex((i) => i.value === value);
      setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
      if (searchable) {
        setTimeout(() => searchRef.current?.focus(), 0);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Scroll active item into view (scrollIntoView may be absent in JSDOM)
  useEffect(() => {
    if (!open || activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    if (item && typeof item.scrollIntoView === "function") {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  // Close on outside click — the panel lives in a portal, so check it explicitly too.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (!containerRef.current?.contains(t) && !panelRef.current?.contains(t)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function selectItem(item: DropdownItem) {
    onSelect(item.value);
    setOpen(false);
    setSearch("");
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
      setTimeout(() => listRef.current?.focus(), 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setTimeout(() => listRef.current?.focus(), 0);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function handleListKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(filtered.length - 1);
    } else if ((e.key === "Enter" || e.key === " ") && activeIndex >= 0) {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) selectItem(item);
    }
  }

  const listboxId = `${uid}-listbox`;
  const activeOptionId = activeIndex >= 0 ? `${uid}-option-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className="relative inline-block" data-testid={testId}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        data-testid={testId ? `${testId}-trigger` : "dropdown-trigger"}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        {...(ariaLabelledBy !== undefined ? { "aria-labelledby": ariaLabelledBy } : {})}
        {...(activeOptionId !== undefined && open ? { "aria-activedescendant": activeOptionId } : {})}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        onMouseEnter={() => setTriggerHover(true)}
        onMouseLeave={() => setTriggerHover(false)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-[14px]"
        style={{
          background: triggerHover ? "#fff" : "#fbfaf9",
          boxShadow: triggerHover ? "#dcd9d4 0 0 0 1px inset" : "#e7e4df 0 0 0 1px inset",
          color: "var(--color-charcoal-primary)",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          minWidth: "160px",
          transition: "background 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        <span className="truncate">{selectedLabel}</span>
        {/* Chevron */}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Panel — portalled to <body> so it is never clipped by an overflow:hidden ancestor */}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            data-testid={testId ? `${testId}-panel` : "dropdown-panel"}
            className="sd-pop overflow-hidden"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              minWidth: Math.max(coords.width, 210),
              maxWidth: 360,
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              boxShadow: "rgba(0,0,0,0.14) 0 12px 32px -8px, #f2f0ed 0 0 0 1px inset",
              padding: 8,
              zIndex: 50,
            }}
          >
            {searchable && (
              <input
                ref={searchRef}
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="mb-1.5 w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                style={{
                  backgroundColor: searchFocused ? "#fff" : "#fbfaf9",
                  color: "var(--color-charcoal-primary)",
                  border: "none",
                  boxShadow: searchFocused
                    ? "#0090ff 0 0 0 1.5px inset"
                    : "#e7e4df 0 0 0 1px inset",
                }}
                data-testid={testId ? `${testId}-search` : "dropdown-search"}
              />
            )}
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              tabIndex={-1}
              aria-activedescendant={activeOptionId}
              onKeyDown={handleListKeyDown}
              className="max-h-[200px] overflow-y-auto outline-none"
            >
              {filtered.map((item, idx) => (
                <li
                  key={item.value}
                  id={`${uid}-option-${idx}`}
                  role="option"
                  aria-selected={item.value === value}
                  onClick={() => selectItem(item)}
                  className="cursor-pointer rounded-lg px-3 py-2 text-[14px] transition-colors hover:bg-[#f6f4ef]"
                  style={{
                    color:
                      item.value === value
                        ? "var(--color-midnight)"
                        : "var(--color-charcoal-primary)",
                    fontWeight: item.value === value ? 600 : 400,
                    backgroundColor: idx === activeIndex ? "#f6f4ef" : undefined,
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
          </div>,
          document.body,
        )}
    </div>
  );
}
