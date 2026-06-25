interface TagChipProps {
  label: string;
}

/**
 * TagChip — small neutral chip for free-form tags (not uppercase, unlike Badge
 * which is for type/status labels).
 */
export function TagChip({ label }: TagChipProps) {
  return (
    <span
      className="inline-block rounded-[6px] text-[11px] font-medium"
      style={{
        backgroundColor: "var(--color-stone-surface)",
        color: "var(--color-graphite)",
        padding: "3px 9px",
      }}
    >
      {label}
    </span>
  );
}
