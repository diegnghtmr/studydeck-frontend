interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  "data-testid"?: string;
}

export function ToggleSwitch({ checked, onChange, label, "data-testid": testId }: ToggleSwitchProps) {
  return (
    <label
      data-testid={testId}
      className="inline-flex cursor-pointer items-center gap-2"
    >
      <button
        role="switch"
        type="button"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative shrink-0 transition-colors duration-200"
        style={{
          width: "38px",
          height: "22px",
          borderRadius: "11px",
          backgroundColor: checked ? "#00ca48" : "#dcd9d4",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <span
          className="absolute top-[3px] transition-transform duration-200"
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            left: "3px",
            transform: checked ? "translateX(16px)" : "translateX(0)",
            display: "block",
          }}
        />
      </button>
      {label && (
        <span className="text-[14px]" style={{ color: "var(--color-charcoal-primary)" }}>
          {label}
        </span>
      )}
    </label>
  );
}
