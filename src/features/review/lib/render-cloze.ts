/**
 * render-cloze — pure utility for parsing Anki-style cloze markup.
 *
 * Supported syntax:
 *   {{cN::answer}}         → answer shown, cloze segment
 *   {{cN::answer::hint}}   → answer shown, hint ignored
 *
 * Returns an array of segments so callers can render emphasized cloze spans
 * without dangerouslySetInnerHTML.
 */

export interface ClozeSegment {
  text: string;
  isCloze: boolean;
  /** Cloze group ordinal (the N in {{cN::…}}); 0 for plain-text segments. */
  ordinal: number;
}

// Captures the cloze ordinal and answer portion.
// Group 1 = ordinal digits, Group 2 = answer text (everything up to the next :: or }})
const CLOZE_PATTERN = /\{\{c(\d+)::([^:}]*)(?:::[^}]*)?\}\}/g;

export function parseCloze(input: string): ClozeSegment[] {
  const segments: ClozeSegment[] = [];
  let lastIndex = 0;

  // Reset the regex state (g flag retains lastIndex between calls)
  CLOZE_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = CLOZE_PATTERN.exec(input)) !== null) {
    const [fullMatch, ordinalRaw, answer] = match;
    const matchStart = match.index;

    // Plain text before this cloze match
    if (matchStart > lastIndex) {
      segments.push({ text: input.slice(lastIndex, matchStart), isCloze: false, ordinal: 0 });
    }

    // Cloze segment — group 1 is the ordinal, group 2 is the answer (empty if {{c1::}})
    segments.push({
      text: answer ?? "",
      isCloze: true,
      ordinal: Number.parseInt(ordinalRaw ?? "0", 10) || 0,
    });

    lastIndex = matchStart + fullMatch.length;
  }

  // Remaining plain text after last match (or entire input when no matches found)
  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex), isCloze: false, ordinal: 0 });
  }

  // Edge case: input was empty or only cloze with nothing after → still return something
  if (segments.length === 0) {
    segments.push({ text: input, isCloze: false, ordinal: 0 });
  }

  return segments;
}

/**
 * Flattens cloze markup to plain readable text (answers shown, hints dropped) —
 * e.g. "El {{c1::sol}} y la {{c2::luna}}." → "El sol y la luna.". Useful for
 * compact previews where highlighting is not needed.
 */
export function clozePlainText(input: string): string {
  return input.replace(CLOZE_PATTERN, (_match, _ordinal, answer) => answer ?? "");
}
