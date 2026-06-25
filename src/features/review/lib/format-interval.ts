/**
 * Formats a scheduled-interval duration (in integer days) into a short human-readable string.
 *
 * Rules:
 *   0 or 1 day  → "1d"   (minimum display is one day)
 *   2–29 days   → "{n}d"
 *   30–364 days → "{mo}mo"  (rounded down to full months, minimum 1mo)
 *   365+ days   → "{y}y"   (rounded down to full years, minimum 1y)
 */
export function formatInterval(days: number): string {
  if (days <= 1) return "1d";
  if (days < 30) return `${days}d`;
  if (days < 365) {
    const months = Math.max(1, Math.floor(days / 30));
    return `${months}mo`;
  }
  const years = Math.max(1, Math.floor(days / 365));
  return `${years}y`;
}
