interface ToastProps {
  visible: boolean;
  message: string;
  "data-testid"?: string;
}

export function Toast({ visible, message, "data-testid": testId }: ToastProps) {
  if (!visible) return null;

  return (
    <div
      data-testid={testId ?? "toast"}
      role="status"
      aria-live="polite"
      className="sd-fade fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 px-5 py-3 text-[14px] font-medium text-white"
      style={{
        backgroundColor: "#121212",
        borderRadius: "32px",
        boxShadow: "var(--shadow-lg)",
        whiteSpace: "nowrap",
      }}
    >
      {/* Checkmark icon */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8l3.5 3.5L13 5" stroke="#00ca48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {message}
    </div>
  );
}
