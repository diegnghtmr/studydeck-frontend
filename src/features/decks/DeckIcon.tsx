import { getDeckColor, PALETTE, type DeckColor } from "./lib/deck-color";

/**
 * Curated set of simple, generic stroke glyphs used as deck avatars, keyed by name. Stroke-based to
 * stay consistent with the sidebar navigation icon language. Each path renders inside a 24×24
 * viewBox with {@code currentColor} stroke, so the deck color is applied via the wrapper's text
 * color. The names are the stable contract persisted as {@code deck.icon}.
 */
export const DECK_GLYPHS: Record<string, string> = {
  book: "M12 6c-1.7-1.1-4.2-1.6-7-1.1v12.2c2.8-.5 5.3 0 7 1.1m0-12.2c1.7-1.1 4.2-1.6 7-1.1v12.2c-2.8-.5-5.3 0-7 1.1m0-12.2v12.2",
  layers: "M12 3l8.5 4.7L12 12.4 3.5 7.7 12 3ZM4 12l8 4.5 8-4.5M4 16.3l8 4.5 8-4.5",
  lightbulb:
    "M9.2 17h5.6M10 20h4M12 3a6 6 0 00-3.2 11.1c.5.3.7.8.7 1.3v.6h5v-.6c0-.5.2-1 .7-1.3A6 6 0 0012 3Z",
  beaker: "M9 3h6M10 3v5.8l-4.4 7.9A1.6 1.6 0 007 19h10a1.6 1.6 0 001.4-2.3L14 8.8V3M7.6 14h8.8",
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18ZM3.2 12h17.6M12 3c2.4 2.6 2.4 15.4 0 18M12 3c-2.4 2.6-2.4 15.4 0 18",
  cap: "M12 4L2.5 8.5 12 13l9.5-4.5L12 4ZM5.5 10.5V15c0 1.4 2.9 2.8 6.5 2.8s6.5-1.4 6.5-2.8v-4.5M21.5 8.5V14",
  star: "M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4 6.9 19.2 8 13.5l-4.3-4 5.8-.7L12 3.5Z",
  bookmark: "M7 3.5h10a1 1 0 011 1v16l-6-3.6-6 3.6v-16a1 1 0 011-1Z",
  compass: "M12 3a9 9 0 100 18 9 9 0 000-18ZM15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1 5.1-2.1Z",
  leaf: "M5 19c0-8 5-13 14-13 0 9-5 14-13 14a4 4 0 01-1 0M5.5 18.5c2-4.5 5-7 8.5-8",
  music: "M9 18V6l10-2v12M9 18a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0ZM19 16a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0Z",
  code: "M8.5 8L4 12l4.5 4M15.5 8L20 12l-4.5 4M13.5 5.5l-3 13",
};

/** Ordered glyph names — used for the picker and for deterministic hash selection. */
export const DECK_GLYPH_NAMES: string[] = Object.keys(DECK_GLYPHS);

/** The selectable accent colors (with their tints), surfaced for the appearance picker. */
export const DECK_COLORS: DeckColor[] = PALETTE;

/**
 * Deterministic glyph name for a deck id. Uses a different seed/multiplier than the color hash so
 * the glyph varies independently of the color (two decks sharing a color usually differ in glyph).
 */
export function getDeckGlyphName(deckId: string): string {
  let hash = 2166136261;
  for (let i = 0; i < deckId.length; i++) {
    hash ^= deckId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const index = (hash >>> 0) % DECK_GLYPH_NAMES.length;
  return DECK_GLYPH_NAMES[index]!;
}

interface DeckIconProps {
  deckId: string;
  /** Stored glyph name override; falls back to the id-derived glyph when null/undefined/unknown. */
  icon?: string | null | undefined;
  /** Stored accent color override; falls back to the id-derived color when null/undefined. */
  color?: string | null | undefined;
  size?: number;
  "data-testid"?: string;
}

/**
 * Deck avatar — a tinted rounded square containing a glyph in the deck's accent color. Uses the
 * user-chosen icon/color when present, otherwise a stable id-derived default.
 */
export function DeckIcon({
  deckId,
  icon,
  color,
  size = 36,
  "data-testid": testId,
}: DeckIconProps) {
  const derived = getDeckColor(deckId);
  const accent = color ?? derived.color;
  const tint = color
    ? (PALETTE.find((p) => p.color === color)?.tint ?? `${color}22`)
    : derived.tint;
  const glyphName = (icon && DECK_GLYPHS[icon]) ? icon : getDeckGlyphName(deckId);
  const path = DECK_GLYPHS[glyphName]!;
  const glyphSize = Math.round(size * 0.58);
  const radius = Math.round(size * 0.3);

  return (
    <div
      data-testid={testId}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: tint,
        color: accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width={glyphSize}
        height={glyphSize}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d={path}
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
