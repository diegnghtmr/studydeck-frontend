import { useState } from "react";
import { useAuthStore } from "@shared/auth/auth-store";
import { usePreferencesStore } from "@shared/lib/store";
import { useUserStats, useUpdateDailyGoal } from "@shared/stats/use-user-stats";
import { Card, Badge, SegmentedTab, Dropdown, ToggleSwitch } from "@shared/ui";

const LANGUAGE_ITEMS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "pt", label: "Portuguese" },
];

const TIMEZONE_ITEMS = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "America/Sao_Paulo", label: "America/Sao_Paulo" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles" },
  { value: "Europe/Paris", label: "Europe/Paris" },
];

const NEW_CARDS_ITEMS = [
  { value: "5", label: "5 cards" },
  { value: "10", label: "10 cards" },
  { value: "20", label: "20 cards" },
  { value: "30", label: "30 cards" },
  { value: "50", label: "50 cards" },
];

const DAILY_GOAL_ITEMS = [
  { value: "10", label: "10 cards / day" },
  { value: "20", label: "20 cards / day" },
  { value: "30", label: "30 cards / day" },
  { value: "40", label: "40 cards / day" },
  { value: "60", label: "60 cards / day" },
  { value: "80", label: "80 cards / day" },
  { value: "100", label: "100 cards / day" },
];

function getDefaultTimezone(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return TIMEZONE_ITEMS.some((t) => t.value === tz) ? tz : "UTC";
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "var(--color-charcoal-primary)",
  marginBottom: "20px",
};

const helperStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--color-ash)",
  marginTop: "4px",
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--color-charcoal-primary)",
  marginBottom: "6px",
  display: "block",
};

const recessedInputStyle: React.CSSProperties = {
  backgroundColor: "var(--color-stone-surface)",
  borderRadius: "8px",
  border: "none",
  padding: "8px 12px",
  fontSize: "14px",
  color: "var(--color-charcoal-primary)",
  width: "100%",
  outline: "none",
};

const rowDividerStyle: React.CSSProperties = {
  borderTop: "1px solid #f0f0f0",
  paddingTop: "16px",
  marginTop: "16px",
};

const cardPad = "28px";
const cardMb = "20px";

export function SettingsPage() {
  const displayName = useAuthStore((s) => s.user?.displayName ?? "");
  const email = useAuthStore((s) => s.user?.email ?? "");

  const showIntervals = usePreferencesStore((s) => s.showIntervals);
  const setShowIntervals = usePreferencesStore((s) => s.setShowIntervals);
  const schedulerAlgorithm = usePreferencesStore((s) => s.schedulerAlgorithm);
  const setSchedulerAlgorithm = usePreferencesStore((s) => s.setSchedulerAlgorithm);

  const { data: userStats } = useUserStats();
  const updateDailyGoal = useUpdateDailyGoal();
  const dailyGoal = userStats?.dailyGoal ?? 40;

  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState(getDefaultTimezone);
  const [retention, setRetention] = useState(90);
  const [newCardsPerDay, setNewCardsPerDay] = useState("10");

  return (
    <div
      className="sd-fade"
      style={{ maxWidth: "760px", margin: "0 auto", padding: "48px 56px 96px" }}
    >
      <h1
        style={{
          fontFamily: "var(--font-family)",
          fontSize: "40px",
          color: "#121212",
          fontWeight: 700,
          marginBottom: "8px",
        }}
      >
        Settings
      </h1>
      <p style={{ fontSize: "13px", color: "var(--color-ash)", marginBottom: "32px" }}>
        Some preferences are stored locally in your browser only and not synced to the server.
      </p>

      {/* Section 1 — Profile */}
      <div style={{ marginBottom: cardMb }}>
        <Card radius={16}>
          <div style={{ padding: cardPad }}>
            <div style={sectionTitleStyle}>Profile</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              {/* Display name */}
              <div>
                <label style={fieldLabelStyle}>Display name</label>
                <input
                  type="text"
                  value={displayName}
                  readOnly
                  style={recessedInputStyle}
                />
                <p style={helperStyle}>Synced from your account — not editable here.</p>
              </div>

              {/* Email */}
              <div>
                <label style={fieldLabelStyle}>Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  style={recessedInputStyle}
                />
                <p style={helperStyle}>Synced from your account — not editable here.</p>
              </div>

              {/* Language */}
              <div>
                <label style={fieldLabelStyle}>Language</label>
                <div style={{ width: "100%" }}>
                  <Dropdown
                    items={LANGUAGE_ITEMS}
                    value={language}
                    onSelect={setLanguage}
                  />
                </div>
                <p style={helperStyle}>Local preference — not synced.</p>
              </div>

              {/* Timezone */}
              <div>
                <label style={fieldLabelStyle}>Timezone</label>
                <div style={{ width: "100%" }}>
                  <Dropdown
                    items={TIMEZONE_ITEMS}
                    value={timezone}
                    onSelect={setTimezone}
                    searchable
                  />
                </div>
                <p style={helperStyle}>Local preference — not synced.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Section 2 — AI Providers */}
      <div style={{ marginBottom: cardMb }}>
        <Card radius={16}>
          <div style={{ padding: cardPad }}>
            <div style={sectionTitleStyle}>AI Providers</div>

            <div
              style={{
                background: "#eaf4ff",
                color: "#0086fc",
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "13px",
                marginBottom: "20px",
              }}
            >
              Your API keys are stored securely in your browser only. They are never sent to our servers.
            </div>

            <ProviderRow
              initials="OA"
              badgeBg="#10a37f"
              name="OpenAI"
              description="Powers GPT-4o card generation and AI features."
            />

            <div style={{ borderTop: "1px solid #eee", margin: "16px 0" }} />

            <ProviderRow
              initials="AN"
              badgeBg="#c25b2f"
              name="Anthropic"
              description="Powers Claude-based explanations and summaries."
            />
          </div>
        </Card>
      </div>

      {/* Section 3 — Study & Scheduler */}
      <div style={{ marginBottom: cardMb }}>
        <Card radius={16}>
          <div style={{ padding: cardPad }}>
            <div style={sectionTitleStyle}>Study & Scheduler</div>

            {/* Scheduler algorithm */}
            <div>
              <label style={fieldLabelStyle}>Scheduler algorithm</label>
              <div
                style={{
                  background: "#f6f4ef",
                  borderRadius: "10px",
                  padding: "3px",
                  display: "inline-flex",
                }}
              >
                <SegmentedTab
                  active={schedulerAlgorithm === "FSRS"}
                  onClick={() => setSchedulerAlgorithm("FSRS")}
                >
                  FSRS
                </SegmentedTab>
                <SegmentedTab
                  active={schedulerAlgorithm === "SM-2"}
                  onClick={() => setSchedulerAlgorithm("SM-2")}
                >
                  SM-2
                </SegmentedTab>
              </div>
              <p style={helperStyle}>Saved locally in your browser.</p>
            </div>

            {/* Daily goal — synced to the backend */}
            <div style={rowDividerStyle}>
              <label style={fieldLabelStyle}>Daily goal</label>
              <Dropdown
                items={DAILY_GOAL_ITEMS}
                value={String(dailyGoal)}
                onSelect={(v) => updateDailyGoal.mutate(Number(v))}
              />
              <p style={helperStyle}>
                Synced to your account — drives the sidebar goal and progress.
              </p>
            </div>

            {/* Target retention */}
            <div style={rowDividerStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <label style={{ ...fieldLabelStyle, marginBottom: 0 }}>Target retention</label>
                <span
                  style={{
                    fontFamily: "var(--font-family)",
                    fontSize: "22px",
                    color: "var(--color-meadow-green)",
                    fontWeight: 700,
                  }}
                >
                  {retention}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="99"
                step="1"
                value={retention}
                onChange={(e) => setRetention(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#121212" }}
              />
              <p style={helperStyle}>Local preference — resets on reload.</p>
            </div>

            {/* New cards per day */}
            <div style={rowDividerStyle}>
              <label style={fieldLabelStyle}>New cards / day</label>
              <Dropdown
                items={NEW_CARDS_ITEMS}
                value={newCardsPerDay}
                onSelect={setNewCardsPerDay}
              />
              <p style={helperStyle}>Local preference — not synced.</p>
            </div>

            {/* Show intervals */}
            <div style={rowDividerStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "14px", color: "var(--color-charcoal-primary)" }}>
                  Show intervals
                </span>
                <ToggleSwitch
                  checked={showIntervals}
                  onChange={setShowIntervals}
                  label="Show intervals"
                />
              </div>
              <p style={helperStyle}>Saved locally in your browser.</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Section 4 — Account */}
      <div style={{ marginBottom: cardMb }}>
        <Card radius={16}>
          <div style={{ padding: cardPad }}>
            <div style={sectionTitleStyle}>Account</div>

            {/* Current session row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
              }}
            >
              <span style={{ fontSize: "14px", color: "var(--color-charcoal-primary)" }}>
                This device
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#00ca48",
                    display: "inline-block",
                  }}
                />
                <span style={{ fontSize: "12px", color: "#00ca48" }}>Active</span>
              </span>
            </div>
            <p style={{ ...helperStyle, fontSize: "11px" }}>
              Only your current session is shown. Multi-session management is not yet available.
            </p>

            <div style={{ borderTop: "1px solid #eee", margin: "16px 0" }} />

            {/* Action rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
              <button
                type="button"
                disabled
                title="Coming soon"
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "14px",
                  color: "var(--color-charcoal-primary)",
                  cursor: "not-allowed",
                  textAlign: "left",
                  opacity: 0.6,
                }}
              >
                Sign out everywhere
              </button>
              <button
                type="button"
                disabled
                title="Coming soon"
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "14px",
                  color: "#ff3e00",
                  cursor: "not-allowed",
                  textAlign: "left",
                  opacity: 0.6,
                }}
              >
                Delete account
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

interface ProviderRowProps {
  initials: string;
  badgeBg: string;
  name: string;
  description: string;
}

function ProviderRow({ initials, badgeBg, name, description }: ProviderRowProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      {/* Provider icon */}
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          backgroundColor: badgeBg,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "11px",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>

      {/* Provider info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-charcoal-primary)" }}
        >
          {name}
        </div>
        <div style={{ fontSize: "12px", color: "var(--color-ash)" }}>{description}</div>
      </div>

      {/* Right area */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "220px" }}>
        <Badge tone="gray" label="Not set" />
        <input
          type="password"
          placeholder="sk-••••••••••••"
          disabled
          style={{
            backgroundColor: "var(--color-stone-surface)",
            borderRadius: "8px",
            border: "none",
            padding: "8px 12px",
            fontSize: "14px",
            color: "var(--color-charcoal-primary)",
            width: "100%",
            outline: "none",
            opacity: 0.6,
            cursor: "not-allowed",
          }}
        />
        <button
          type="button"
          disabled
          title="Coming soon"
          style={{
            backgroundColor: "#121212",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "not-allowed",
            opacity: 0.5,
          }}
        >
          Save key
        </button>
      </div>
    </div>
  );
}
