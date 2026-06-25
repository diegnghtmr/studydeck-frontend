/**
 * Shared form-field styling — the canonical look for text inputs, textareas and
 * selects across the app (off-white surface, subtle inset ring, blue focus).
 * Single source of truth so a tweak propagates everywhere.
 *
 * Note: text size is intentionally NOT included — set it per field (text-[14px]
 * / text-[15px]) to avoid arbitrary font-size class conflicts.
 */

/** Base tokens shared by all field states (no ring color). */
const FIELD_BASE =
  "resize-none rounded-[10px] border-0 px-[13px] py-[11px] outline-none transition-colors bg-[#fbfaf9] focus:bg-white";

/** Canonical no-error field class string. Exported for backward compat. */
export const FIELD_CLASS =
  `${FIELD_BASE} ring-1 ring-[#e7e4df] focus:ring-2 focus:ring-[#0090ff]`;

/**
 * Returns the canonical field class string.
 * When `error` is true, returns the error-ring variant (coral-red).
 * When `error` is absent or false, returns FIELD_CLASS exactly.
 * Each branch emits exactly ONE ring-color token — order-independent.
 */
export function fieldClass({ error }: { error?: boolean } = {}): string {
  if (error) {
    return `${FIELD_BASE} ring-1 ring-[var(--color-coral-red)] focus:ring-2 focus:ring-[var(--color-coral-red)]`;
  }
  return FIELD_CLASS;
}
