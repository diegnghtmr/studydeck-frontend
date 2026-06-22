export interface DeckColor {
  color: string; // foreground/accent color
  tint: string; // background tint
}

export const PALETTE: DeckColor[] = [
  { color: "#0090ff", tint: "#eaf4ff" },
  { color: "#ff3e00", tint: "#fff0eb" },
  { color: "#00ca48", tint: "#e6f9ed" },
  { color: "#9f4fff", tint: "#f4ecff" },
  { color: "#ffbb26", tint: "#fff6e0" },
  { color: "#ff58ae", tint: "#ffeef7" },
];

/**
 * Maps a deck id to a stable palette entry using a djb2-like hash.
 * Same id always returns the same color (deterministic).
 */
export function getDeckColor(deckId: string): DeckColor {
  let hash = 5381;
  for (let i = 0; i < deckId.length; i++) {
    hash = (hash * 33) ^ deckId.charCodeAt(i);
  }
  // Convert to unsigned 32-bit integer before modulo to avoid negative indices
  const index = (hash >>> 0) % PALETTE.length;
  return PALETTE[index];
}
