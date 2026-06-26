import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../shared/i18n/i18n";
import { useAuthStore } from "@shared/auth/auth-store";
import { usePreferencesStore } from "@shared/lib/store";
import { useUserStats, useUpdateDailyGoal, useUpdatePreferences } from "@shared/stats/use-user-stats";
import type { ApiProblem } from "@shared/api/problem";
import {
  Card,
  Badge,
  SegmentedTab,
  Dropdown,
  ToggleSwitch,
  PillButton,
  Toast,
  ConfirmDialog,
  ProblemBanner,
} from "@shared/ui";
import { useAuth } from "react-oidc-context";
import { useDeleteAccount, useLogoutAllSessions } from "./hooks/use-delete-account";
import { useSessions, useRevokeSession } from "./hooks/use-sessions";
import { formatRelativeTime } from "@shared/utils/format-relative-time";
import { FIELD_CLASS } from "@shared/ui/field";
import {
  useAiProviderStore,
  hasLegacyLocalStorageProviders,
  clearLegacyLocalStorage,
  PROVIDER_PRESETS,
} from "./store/use-ai-provider-store";
import {
  useAiProviders,
  useCreateAiProvider,
  useUpdateAiProvider,
  useDeleteAiProvider,
  useActivateAiProvider,
} from "./hooks/use-ai-providers";
import type { AiProvider } from "./hooks/use-ai-providers";
import type { Session } from "./hooks/use-sessions";

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

// PROVIDER_PRESETS used directly as preset buttons (no Dropdown needed)

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

// Brand-ish accent per provider, used for the preset card monogram. Falls back to a neutral grey.
const PROVIDER_ACCENTS: Record<string, string> = {
  OpenAI: "#10a37f",
  Anthropic: "#d97757",
  Groq: "#f55036",
  Cerebras: "#ff6a3d",
  OpenRouter: "#6467f2",
  Gemini: "#1a73e8",
};

// Official provider brand marks (monochrome, inherit currentColor) rendered white inside the tile.
// Used purely to identify each provider in the picker.
const PROVIDER_GLYPHS: Record<string, React.ReactNode> = {
  OpenAI: (
    <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z" />
  ),
  Anthropic: (
    <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
  ),
  Groq: (
    <path d="M12.036 2c-3.853-.035-7 3-7.036 6.781-.035 3.782 3.055 6.872 6.908 6.907h2.42v-2.566h-2.292c-2.407.028-4.38-1.866-4.408-4.23-.029-2.362 1.901-4.298 4.308-4.326h.1c2.407 0 4.358 1.915 4.365 4.278v6.305c0 2.342-1.944 4.25-4.323 4.279a4.375 4.375 0 01-3.033-1.252l-1.851 1.818A7 7 0 0012.029 22h.092c3.803-.056 6.858-3.083 6.879-6.816v-6.5C18.907 4.963 15.817 2 12.036 2z" />
  ),
  Cerebras: (
    <>
      <path
        clipRule="evenodd"
        d="M14.121 2.701a9.299 9.299 0 000 18.598V22.7c-5.91 0-10.7-4.791-10.7-10.701S8.21 1.299 14.12 1.299V2.7zm4.752 3.677A7.353 7.353 0 109.42 17.643l-.901 1.074a8.754 8.754 0 01-1.08-12.334 8.755 8.755 0 0112.335-1.08l-.901 1.075zm-2.255.844a5.407 5.407 0 00-5.048 9.563l-.656 1.24a6.81 6.81 0 016.358-12.043l-.654 1.24zM14.12 8.539a3.46 3.46 0 100 6.922v1.402a4.863 4.863 0 010-9.726v1.402z"
      />
      <path d="M15.407 10.836a2.24 2.24 0 00-.51-.409 1.084 1.084 0 00-.544-.152c-.255 0-.483.047-.684.14a1.58 1.58 0 00-.84.912c-.074.203-.11.416-.11.631 0 .218.036.43.11.631a1.594 1.594 0 00.84.913c.2.093.43.14.684.14.216 0 .417-.046.602-.135.188-.09.35-.225.475-.392l.928 1.006c-.14.14-.3.261-.482.363a3.367 3.367 0 01-1.083.38c-.17.026-.317.04-.44.04a3.315 3.315 0 01-1.182-.21 2.825 2.825 0 01-.961-.597 2.816 2.816 0 01-.644-.929 2.987 2.987 0 01-.238-1.21c0-.444.08-.847.238-1.21.15-.35.368-.666.643-.929.278-.261.605-.464.962-.596a3.315 3.315 0 011.182-.21c.355 0 .712.068 1.072.204.361.138.685.36.944.649l-.962.97z" />
    </>
  ),
  OpenRouter: (
    <path d="M16.804 1.957l7.22 4.105v.087L16.73 10.21l.017-2.117-.821-.03c-1.059-.028-1.611.002-2.268.11-1.064.175-2.038.577-3.147 1.352L8.345 11.03c-.284.195-.495.336-.68.455l-.515.322-.397.234.385.23.53.338c.476.314 1.17.796 2.701 1.866 1.11.775 2.083 1.177 3.147 1.352l.3.045c.694.091 1.375.094 2.825.033l.022-2.159 7.22 4.105v.087L16.589 22l.014-1.862-.635.022c-1.386.042-2.137.002-3.138-.162-1.694-.28-3.26-.926-4.881-2.059l-2.158-1.5a21.997 21.997 0 00-.755-.498l-.467-.28a55.927 55.927 0 00-.76-.43C2.908 14.73.563 14.116 0 14.116V9.888l.14.004c.564-.007 2.91-.622 3.809-1.124l1.016-.58.438-.274c.428-.28 1.072-.726 2.686-1.853 1.621-1.133 3.186-1.78 4.881-2.059 1.152-.19 1.974-.213 3.814-.138l.02-1.907z" />
  ),
  Gemini: (
    <path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" />
  ),
};

/** Renders the provider's brand mark, falling back to its first letter if unknown. */
function ProviderGlyph({ label }: { label: string }) {
  const glyph = PROVIDER_GLYPHS[label];
  if (!glyph) {
    return <>{label.charAt(0)}</>;
  }
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      aria-hidden="true"
    >
      {glyph}
    </svg>
  );
}

interface ProviderPresetCardProps {
  label: string;
  model: string;
  accent: string;
  onClick: () => void;
  testId: string;
}

/** A clickable quick-add card for a known provider preset: brand monogram + name + default model. */
function ProviderPresetCard({ label, model, accent, onClick, testId }: ProviderPresetCardProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="text-left"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        minWidth: 0,
        padding: "12px 14px",
        borderRadius: "12px",
        border: "1px solid #f2f0ed",
        backgroundColor: "var(--color-parchment-card)",
        cursor: "pointer",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = accent;
        el.style.boxShadow = "var(--shadow-sm)";
        el.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = "#f2f0ed";
        el.style.boxShadow = "none";
        el.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            backgroundColor: accent,
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          <ProviderGlyph label={label} />
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: "14px",
            fontWeight: 600,
            color: "#343433",
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: "12px",
          color: "var(--color-ash)",
        }}
      >
        {model}
      </span>
    </button>
  );
}

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
  const { t } = useTranslation();

  const NEW_CARDS_ITEMS = [
    { value: "5", label: t("settings.study.cardsOption", { count: 5 }) },
    { value: "10", label: t("settings.study.cardsOption", { count: 10 }) },
    { value: "20", label: t("settings.study.cardsOption", { count: 20 }) },
    { value: "30", label: t("settings.study.cardsOption", { count: 30 }) },
    { value: "50", label: t("settings.study.cardsOption", { count: 50 }) },
  ];

  const DAILY_GOAL_ITEMS = [
    { value: "10", label: t("settings.study.cardsPerDayOption", { count: 10 }) },
    { value: "20", label: t("settings.study.cardsPerDayOption", { count: 20 }) },
    { value: "30", label: t("settings.study.cardsPerDayOption", { count: 30 }) },
    { value: "40", label: t("settings.study.cardsPerDayOption", { count: 40 }) },
    { value: "60", label: t("settings.study.cardsPerDayOption", { count: 60 }) },
    { value: "80", label: t("settings.study.cardsPerDayOption", { count: 80 }) },
    { value: "100", label: t("settings.study.cardsPerDayOption", { count: 100 }) },
  ];

  const displayName = useAuthStore((s) => s.user?.displayName ?? "");
  const email = useAuthStore((s) => s.user?.email ?? "");

  const showIntervals = usePreferencesStore((s) => s.showIntervals);
  const setShowIntervals = usePreferencesStore((s) => s.setShowIntervals);

  const { data: userStats } = useUserStats();
  const schedulerAlgorithm = userStats?.schedulerAlgorithm ?? "FSRS";
  const updateDailyGoal = useUpdateDailyGoal();
  const updatePreferences = useUpdatePreferences();
  const dailyGoal = userStats?.dailyGoal ?? 40;

  const language = userStats?.language ?? "en";
  const timezone = userStats?.timezone ?? getDefaultTimezone();
  const retentionPct = Math.round((userStats?.desiredRetention ?? 0.9) * 100);
  const newCardsPerDay = String(userStats?.newCardsPerDay ?? 10);

  const [retentionDisplay, setRetentionDisplay] = useState<number | null>(null);
  const displayRetention = retentionDisplay ?? retentionPct;

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  function showToast(msg: string) {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }

  // Auth
  const auth = useAuth();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Delete account
  const deleteAccount = useDeleteAccount();
  const logoutAllSessions = useLogoutAllSessions();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<ApiProblem | null>(null);

  async function handleDeleteConfirm() {
    setDeleteConfirmOpen(false);
    try {
      await deleteAccount.mutateAsync();
      clearAuth();
      void auth?.signoutRedirect();
    } catch {
      setDeleteError({ type: "about:blank", status: 500, title: t("settings.account.deleteFailed") });
    }
  }

  async function handleSignOutEverywhere() {
    try {
      await logoutAllSessions.mutateAsync();
    } catch {
      // Ignore — still sign out locally below.
    }
    clearAuth();
    void auth?.signoutRedirect();
  }

  // AI Provider server data
  const { data: serverProviders, isLoading: providersLoading, isError: providersError } = useAiProviders();
  const createProvider = useCreateAiProvider();
  const updateProvider = useUpdateAiProvider();
  const deleteProvider = useDeleteAiProvider();
  const activateProvider = useActivateAiProvider();

  // Migration detection
  const migrationDismissed = useAiProviderStore((s) => s.migrationDismissed);
  const setMigrationDismissed = useAiProviderStore((s) => s.setMigrationDismissed);

  // C4: guard with !providersLoading so the banner never flashes during the initial fetch
  const showMigrationBanner =
    !migrationDismissed &&
    !providersLoading &&
    hasLegacyLocalStorageProviders() &&
    (serverProviders?.length ?? 0) === 0;

  // ConfirmDialog state for remove
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  function requestRemove(id: string) {
    setPendingRemoveId(id);
    setConfirmOpen(true);
  }

  // C1: move success/error toasts into mutation callbacks — never fire synchronously
  function confirmRemove() {
    if (pendingRemoveId) {
      deleteProvider.mutate(pendingRemoveId, {
        onSuccess: () => {
          showToast(t("settings.aiProviders.providerRemovedToast"));
        },
        onError: () => {
          showToast(t("settings.aiProviders.providerRemoveErrorToast"));
        },
      });
    }
    setPendingRemoveId(null);
    setConfirmOpen(false);
  }

  // C3: draft state for new provider — filled via preset or blank "Add" button
  interface ProviderDraft {
    label: string;
    baseUrl: string;
    model: string;
    apiKey: string;
  }
  const [draftProvider, setDraftProvider] = useState<ProviderDraft | null>(null);

  function openBlankDraft() {
    setDraftProvider({ label: "", baseUrl: "", model: "", apiKey: "" });
  }

  function openPresetDraft(presetLabel: string) {
    const preset = PROVIDER_PRESETS.find((p) => p.label === presetLabel);
    if (!preset) return;
    setDraftProvider({ label: preset.label, baseUrl: preset.baseUrl, model: preset.model, apiKey: "" });
  }

  function saveDraft() {
    if (!draftProvider || draftProvider.apiKey.trim() === "") return;
    createProvider.mutate(
      {
        label: draftProvider.label,
        baseUrl: draftProvider.baseUrl,
        model: draftProvider.model,
        apiKey: draftProvider.apiKey,
      },
      {
        onSuccess: () => {
          showToast(t("settings.aiProviders.providerAddedToast", { label: draftProvider.label }));
          // C2: only clear legacy data when migration context was active at save time
          if (showMigrationBanner) {
            clearLegacyLocalStorage();
          }
          setDraftProvider(null);
        },
        onError: () => {
          showToast(t("settings.aiProviders.providerSaveErrorToast"));
        },
      },
    );
  }

  function cancelDraft() {
    setDraftProvider(null);
  }

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
        {t("settings.title")}
      </h1>
      <p style={{ fontSize: "13px", color: "var(--color-ash)", marginBottom: "32px" }}>
        {t("settings.subtitle")}
      </p>

      {/* Section 1 — Profile */}
      <div style={{ marginBottom: cardMb }}>
        <Card radius={16}>
          <div style={{ padding: cardPad }}>
            <div style={sectionTitleStyle}>{t("settings.sections.profile")}</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              {/* Display name */}
              <div>
                <label style={fieldLabelStyle}>{t("settings.profile.displayName")}</label>
                <input
                  type="text"
                  value={displayName}
                  readOnly
                  style={recessedInputStyle}
                />
                <p style={helperStyle}>{t("settings.profile.syncedFromHint")}</p>
              </div>

              {/* Email */}
              <div>
                <label style={fieldLabelStyle}>{t("settings.profile.email")}</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  style={recessedInputStyle}
                />
                <p style={helperStyle}>{t("settings.profile.syncedFromHint")}</p>
              </div>

              {/* Language */}
              <div>
                <label style={fieldLabelStyle}>{t("settings.profile.language")}</label>
                <div style={{ width: "100%" }}>
                  <Dropdown
                    items={LANGUAGE_ITEMS}
                    value={language}
                    onSelect={(v) => {
                      updatePreferences.mutate({ language: v });
                      void i18n.changeLanguage(v);
                    }}
                  />
                </div>
                <p style={helperStyle}>{t("settings.profile.syncedHint")}</p>
              </div>

              {/* Timezone */}
              <div>
                <label style={fieldLabelStyle}>{t("settings.profile.timezone")}</label>
                <div style={{ width: "100%" }}>
                  <Dropdown
                    items={TIMEZONE_ITEMS}
                    value={timezone}
                    onSelect={(v) => updatePreferences.mutate({ timezone: v })}
                    searchable
                  />
                </div>
                <p style={helperStyle}>{t("settings.profile.syncedHint")}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Section 2 — AI Providers */}
      <div style={{ marginBottom: cardMb }}>
        <Card radius={16}>
          <div style={{ padding: cardPad }}>
            <div style={sectionTitleStyle}>{t("settings.sections.aiProviders")}</div>

            {/* Migration banner (B-5) */}
            {showMigrationBanner && (
              <div
                data-testid="migration-banner"
                style={{
                  background: "#fff7ed",
                  border: "1px solid #f97316",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  marginBottom: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "13px", color: "#9a3412", marginBottom: "4px" }}>
                    {t("settings.aiProviders.migrationBannerTitle")}
                  </div>
                  <div style={{ fontSize: "13px", color: "#7c2d12" }}>
                    {t("settings.aiProviders.migrationBannerBody")}
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="migration-banner-dismiss"
                  onClick={() => setMigrationDismissed(true)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#9a3412",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {t("settings.aiProviders.migrationBannerDismiss")}
                </button>
              </div>
            )}

            {/* Add a provider — preset cards grid + custom/manual entry */}
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--color-ash)",
                  marginBottom: "10px",
                }}
              >
                {t("settings.aiProviders.presetSectionLabel")}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: "10px",
                }}
              >
                {PROVIDER_PRESETS.filter((preset) => preset.label !== "Custom").map((preset) => (
                  <ProviderPresetCard
                    key={preset.label}
                    label={preset.label}
                    model={preset.model}
                    accent={PROVIDER_ACCENTS[preset.label] ?? "#848281"}
                    onClick={() => openPresetDraft(preset.label)}
                    testId={`preset-${preset.label}`}
                  />
                ))}
              </div>
              <button
                type="button"
                data-testid="add-provider-btn"
                onClick={openBlankDraft}
                style={{
                  marginTop: "10px",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: "1px dashed #d8d4cd",
                  backgroundColor: "transparent",
                  color: "var(--color-ash)",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition:
                    "border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = "#b9b4ab";
                  el.style.color = "#343433";
                  el.style.backgroundColor = "#faf9f7";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = "#d8d4cd";
                  el.style.color = "var(--color-ash)";
                  el.style.backgroundColor = "transparent";
                }}
              >
                <span aria-hidden="true" style={{ fontSize: "15px", lineHeight: 1 }}>
                  +
                </span>
                {t("settings.aiProviders.customManual")}
              </button>
            </div>

            {/* Draft form for a new provider (C3) */}
            {draftProvider !== null && (
              <NewProviderDraftEntry
                draft={draftProvider}
                onChange={setDraftProvider}
                onSave={saveDraft}
                onCancel={cancelDraft}
                isPending={createProvider.isPending}
              />
            )}

            {/* Provider list */}
            {providersLoading && (
              <p style={{ fontSize: "13px", color: "var(--color-ash)" }}>
                {t("settings.aiProviders.loadingProviders")}
              </p>
            )}

            {!providersLoading && providersError && (
              <p style={{ fontSize: "13px", color: "#ff3e00" }}>
                {t("settings.aiProviders.providersError")}
              </p>
            )}

            {!providersLoading && !providersError && (serverProviders?.length ?? 0) === 0 && (
              <p style={{ fontSize: "13px", color: "var(--color-ash)" }}>
                {t("settings.aiProviders.noProviders")}
              </p>
            )}

            {!providersLoading &&
              !providersError &&
              serverProviders?.map((provider, idx) => (
                <ServerProviderEntry
                  key={provider.id}
                  provider={provider}
                  onSave={(patch) => {
                    updateProvider.mutate(
                      { id: provider.id, ...patch },
                      {
                        onSuccess: () => {
                          showToast(t("settings.aiProviders.providerSavedToast"));
                          // C2: only clear legacy data when migration context was active at save time
                          if (showMigrationBanner) {
                            clearLegacyLocalStorage();
                          }
                        },
                        onError: () => {
                          showToast(t("settings.aiProviders.providerSaveErrorToast"));
                        },
                      },
                    );
                  }}
                  onActivate={() =>
                    activateProvider.mutate(provider.id, {
                      onSuccess: () => {
                        showToast(
                          t("settings.aiProviders.providerActivatedToast", {
                            label: provider.label,
                          }),
                        );
                      },
                      onError: () => {
                        showToast(t("settings.aiProviders.providerActivateErrorToast"));
                      },
                    })
                  }
                  onRemove={() => requestRemove(provider.id)}
                  showDivider={idx > 0}
                />
              ))}
          </div>
        </Card>
      </div>

      {/* Toast */}
      <Toast visible={toastVisible} message={toastMessage} />

      {/* Confirm remove dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={t("settings.aiProviders.removeDialogTitle")}
        description={t("settings.aiProviders.removeDialogDescription")}
        confirmLabel={t("settings.aiProviders.removeDialogConfirm")}
        cancelLabel={t("settings.aiProviders.removeDialogCancel")}
        destructive
        onConfirm={confirmRemove}
        onCancel={() => {
          setPendingRemoveId(null);
          setConfirmOpen(false);
        }}
      />

      {/* Section 3 — Study & Scheduler */}
      <div style={{ marginBottom: cardMb }}>
        <Card radius={16}>
          <div style={{ padding: cardPad }}>
            <div style={sectionTitleStyle}>{t("settings.sections.studyScheduler")}</div>

            {/* Scheduler algorithm */}
            <div>
              <label style={fieldLabelStyle}>{t("settings.study.schedulerAlgorithm")}</label>
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
                  onClick={() => updatePreferences.mutate({ schedulerAlgorithm: "FSRS" })}
                >
                  FSRS
                </SegmentedTab>
                <SegmentedTab
                  active={schedulerAlgorithm === "SM-2"}
                  onClick={() => updatePreferences.mutate({ schedulerAlgorithm: "SM-2" })}
                >
                  SM-2
                </SegmentedTab>
              </div>
              <p style={helperStyle}>{t("settings.study.syncedHint")}</p>
            </div>

            {/* Daily goal — synced to the backend */}
            <div style={rowDividerStyle}>
              <label style={fieldLabelStyle}>{t("settings.study.dailyGoal")}</label>
              <Dropdown
                items={DAILY_GOAL_ITEMS}
                value={String(dailyGoal)}
                onSelect={(v) => updateDailyGoal.mutate(Number(v))}
              />
              <p style={helperStyle}>
                {t("settings.study.dailyGoalHint")}
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
                <label style={{ ...fieldLabelStyle, marginBottom: 0 }}>{t("settings.study.targetRetention")}</label>
                <span
                  style={{
                    fontFamily: "var(--font-family)",
                    fontSize: "22px",
                    color: "var(--color-meadow-green)",
                    fontWeight: 700,
                  }}
                >
                  {displayRetention}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="99"
                step="1"
                value={displayRetention}
                onChange={(e) => setRetentionDisplay(Number(e.target.value))}
                onPointerUp={(e) => {
                  const val = Number((e.target as HTMLInputElement).value);
                  setRetentionDisplay(null);
                  updatePreferences.mutate({ desiredRetention: val / 100 });
                }}
                style={{ width: "100%", accentColor: "#121212" }}
              />
              <p style={helperStyle}>{t("settings.study.syncedHint")}</p>
            </div>

            {/* New cards per day */}
            <div style={rowDividerStyle}>
              <label style={fieldLabelStyle}>{t("settings.study.newCardsDay")}</label>
              <Dropdown
                items={NEW_CARDS_ITEMS}
                value={newCardsPerDay}
                onSelect={(v) => updatePreferences.mutate({ newCardsPerDay: Number(v) })}
              />
              <p style={helperStyle}>{t("settings.study.syncedHint")}</p>
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
                  {t("settings.study.showIntervals")}
                </span>
                <ToggleSwitch
                  checked={showIntervals}
                  onChange={setShowIntervals}
                  label={t("settings.study.showIntervals")}
                />
              </div>
              <p style={helperStyle}>{t("settings.study.savedLocallyHint")}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Section 4 — Account */}
      <div style={{ marginBottom: cardMb }}>
        <Card radius={16}>
          <div style={{ padding: cardPad }}>
            <div style={sectionTitleStyle}>{t("settings.sections.account")}</div>

            {/* Sessions title */}
            <p style={{ ...fieldLabelStyle, marginBottom: "12px" }}>
              {t("settings.account.sessionsTitle")}
            </p>
            <SessionList showToast={showToast} />

            <div style={{ borderTop: "1px solid #eee", margin: "16px 0" }} />

            {/* Action rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
              <button
                type="button"
                onClick={handleSignOutEverywhere}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "14px",
                  color: "var(--color-charcoal-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {t("settings.account.signOutEverywhere")}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "14px",
                  color: "#ff3e00",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {t("settings.account.deleteAccount")}
              </button>
            </div>

            {deleteError !== null && (
              <div style={{ marginTop: "12px" }}>
                <ProblemBanner
                  problem={deleteError}
                  onDismiss={() => setDeleteError(null)}
                />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Confirm delete account dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t("settings.account.deleteDialogTitle")}
        description={t("settings.account.deleteDialogDescription")}
        confirmLabel={t("settings.account.deleteDialogConfirm")}
        cancelLabel={t("settings.account.deleteDialogCancel")}
        destructive
        onConfirm={() => { void handleDeleteConfirm(); }}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}

// ---- ServerProviderEntry component -----------------------------------------

interface ServerProviderEntryProps {
  provider: AiProvider;
  onSave: (patch: { label: string; baseUrl: string; model: string; apiKey?: string }) => void;
  onActivate: () => void;
  onRemove: () => void;
  showDivider: boolean;
}

function ServerProviderEntry({
  provider,
  onSave,
  onActivate,
  onRemove,
  showDivider,
}: ServerProviderEntryProps) {
  const { t } = useTranslation();

  // Local draft state — the apiKey input is write-only and NEVER pre-filled
  const [draftLabel, setDraftLabel] = useState(provider.label);
  const [draftBaseUrl, setDraftBaseUrl] = useState(provider.baseUrl);
  const [draftModel, setDraftModel] = useState(provider.model);
  // Write-only: starts empty; user must type to replace; never bound to stored value
  const [draftApiKey, setDraftApiKey] = useState("");

  const badgeTone = provider.active ? "green" : provider.keyHint ? "blue" : "gray";
  const badgeLabel = provider.active
    ? t("settings.aiProviders.badgeActive")
    : provider.keyHint
    ? t("settings.aiProviders.badgeConfigured")
    : t("settings.aiProviders.badgeNotSet");

  function handleSave() {
    // Only include apiKey in the payload when the user typed something
    const patch = draftApiKey.trim() !== ""
      ? { label: draftLabel, baseUrl: draftBaseUrl, model: draftModel, apiKey: draftApiKey }
      : { label: draftLabel, baseUrl: draftBaseUrl, model: draftModel };
    onSave(patch);
    // Clear the draft key after save — write-only; never retained locally
    setDraftApiKey("");
  }

  return (
    <div data-testid={`provider-row-${provider.id}`}>
      {showDivider && <div style={{ borderTop: "1px solid #eee", margin: "16px 0" }} />}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Header row: label + badge + use + remove */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontWeight: 600, fontSize: "14px", flex: 1 }}>{provider.label}</span>
          <Badge tone={badgeTone} label={badgeLabel} data-testid={`badge-${provider.id}`} />
          {!provider.active && (
            <PillButton
              size="sm"
              variant="secondary"
              onClick={onActivate}
              data-testid={`use-${provider.id}`}
            >
              {t("settings.aiProviders.useButton")}
            </PillButton>
          )}
          <PillButton
            size="sm"
            variant="ghost-danger"
            onClick={onRemove}
            data-testid={`remove-${provider.id}`}
          >
            {t("settings.aiProviders.removeButton")}
          </PillButton>
        </div>

        {/* Fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={fieldLabelStyle}>{t("settings.aiProviders.baseUrlLabel")}</label>
            <input
              type="text"
              className={`w-full text-[14px] ${FIELD_CLASS}`}
              value={draftBaseUrl}
              onChange={(e) => setDraftBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              data-testid={`baseUrl-${provider.id}`}
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>{t("settings.aiProviders.modelLabel")}</label>
            <input
              type="text"
              className={`w-full text-[14px] ${FIELD_CLASS}`}
              value={draftModel}
              onChange={(e) => setDraftModel(e.target.value)}
              placeholder="gpt-4o"
              data-testid={`model-${provider.id}`}
            />
          </div>
        </div>

        {/* API Key — write-only input */}
        <div>
          <label style={fieldLabelStyle}>{t("settings.aiProviders.apiKeyLabel")}</label>
          {/* Show masked hint as read-only adjacent text when a key is stored */}
          {provider.keyHint && (
            <p style={{ ...helperStyle, marginTop: 0, marginBottom: "4px" }}>
              <span style={{ fontWeight: 500 }}>{t("settings.aiProviders.apiKeyHintLabel")}:</span>{" "}
              <span data-testid={`keyhint-${provider.id}`}>{provider.keyHint}</span>
            </p>
          )}
          {/* The input itself is always empty on mount — write-only */}
          <input
            type="password"
            className={`w-full text-[14px] ${FIELD_CLASS}`}
            value={draftApiKey}
            onChange={(e) => setDraftApiKey(e.target.value)}
            placeholder={t("settings.aiProviders.apiKeyPlaceholder")}
            data-testid={`apiKey-${provider.id}`}
          />
        </div>

        {/* Label */}
        <div>
          <label style={fieldLabelStyle}>Label</label>
          <input
            type="text"
            className={`w-full text-[14px] ${FIELD_CLASS}`}
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            placeholder="My Provider"
            data-testid={`label-${provider.id}`}
          />
        </div>

        {/* Save button */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <PillButton
            size="sm"
            variant="primary"
            onClick={handleSave}
            data-testid={`save-${provider.id}`}
          >
            {t("settings.aiProviders.saveButton")}
          </PillButton>
        </div>
      </div>
    </div>
  );
}

// ---- NewProviderDraftEntry component ---------------------------------------

interface NewProviderDraftEntryProps {
  draft: { label: string; baseUrl: string; model: string; apiKey: string };
  onChange: (next: { label: string; baseUrl: string; model: string; apiKey: string }) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function NewProviderDraftEntry({ draft, onChange, onSave, onCancel, isPending }: NewProviderDraftEntryProps) {
  const { t } = useTranslation();
  const canSave = draft.apiKey.trim() !== "" && !isPending;

  return (
    <div
      data-testid="new-provider-draft"
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "16px",
        marginBottom: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        background: "#fafafa",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={fieldLabelStyle}>Label</label>
          <input
            type="text"
            className={`w-full text-[14px] ${FIELD_CLASS}`}
            value={draft.label}
            onChange={(e) => onChange({ ...draft, label: e.target.value })}
            placeholder="My Provider"
            data-testid="draft-label-input"
          />
        </div>
        <div>
          <label style={fieldLabelStyle}>{t("settings.aiProviders.baseUrlLabel")}</label>
          <input
            type="text"
            className={`w-full text-[14px] ${FIELD_CLASS}`}
            value={draft.baseUrl}
            onChange={(e) => onChange({ ...draft, baseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1"
            data-testid="draft-baseUrl-input"
          />
        </div>
        <div>
          <label style={fieldLabelStyle}>{t("settings.aiProviders.modelLabel")}</label>
          <input
            type="text"
            className={`w-full text-[14px] ${FIELD_CLASS}`}
            value={draft.model}
            onChange={(e) => onChange({ ...draft, model: e.target.value })}
            placeholder="gpt-4o"
            data-testid="draft-model-input"
          />
        </div>
        <div>
          <label style={fieldLabelStyle}>{t("settings.aiProviders.apiKeyLabel")}</label>
          <input
            type="password"
            className={`w-full text-[14px] ${FIELD_CLASS}`}
            value={draft.apiKey}
            onChange={(e) => onChange({ ...draft, apiKey: e.target.value })}
            placeholder={t("settings.aiProviders.apiKeyPlaceholder")}
            data-testid="draft-apiKey-input"
          />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
        <PillButton
          size="sm"
          variant="secondary"
          onClick={onCancel}
          data-testid="draft-cancel-btn"
        >
          {t("settings.aiProviders.cancelButton")}
        </PillButton>
        <PillButton
          size="sm"
          variant="primary"
          onClick={onSave}
          disabled={!canSave}
          data-testid="draft-save-btn"
        >
          {t("settings.aiProviders.saveButton")}
        </PillButton>
      </div>
    </div>
  );
}

// ---- SessionList component -------------------------------------------------

interface SessionListProps {
  showToast: (msg: string) => void;
}

function SessionList({ showToast }: SessionListProps) {
  const { t } = useTranslation();
  const { data: sessions, isLoading, isError } = useSessions();
  const revokeSession = useRevokeSession();
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);

  function requestRevoke(id: string) {
    setRevokeTargetId(id);
    setRevokeDialogOpen(true);
  }

  function confirmRevoke() {
    if (revokeTargetId) {
      revokeSession.mutate(revokeTargetId, {
        onSuccess: () => {
          showToast(t("settings.account.revokedToast"));
        },
      });
    }
    setRevokeTargetId(null);
    setRevokeDialogOpen(false);
  }

  if (isLoading) {
    return (
      <p style={{ ...helperStyle, fontSize: "13px" }}>
        {t("settings.account.loadingSessions")}
      </p>
    );
  }

  if (isError) {
    return (
      <p style={{ ...helperStyle, fontSize: "13px" }}>
        {t("settings.account.sessionsError")}
      </p>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <p style={{ ...helperStyle, fontSize: "13px" }}>
        {t("settings.account.noSessions")}
      </p>
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {(sessions as Session[]).map((session, i) => (
          <div
            key={session.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              padding: "10px 0",
              borderBottom: i < sessions.length - 1 ? "1px solid #f0f0f0" : "none",
            }}
          >
            <div>
              <div style={{ fontSize: "14px", color: "var(--color-charcoal-primary)", fontWeight: 500 }}>
                {session.device}
                {" "}
                <span style={{ fontWeight: 400, color: "var(--color-ash)", fontSize: "12px" }}>
                  {session.ipAddress}
                </span>
              </div>
              <div style={{ ...helperStyle, marginTop: "2px" }}>
                {t("settings.account.lastActive", {
                  time: formatRelativeTime(session.lastAccessAt, Date.now()),
                })}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginLeft: "12px" }}>
              {session.current && (
                <Badge tone="green" label={t("settings.account.current")} />
              )}
              {!session.current && (
                <PillButton
                  variant="ghost-danger"
                  size="sm"
                  onClick={() => requestRevoke(session.id)}
                  data-testid={`revoke-${session.id}`}
                >
                  {t("settings.account.revoke")}
                </PillButton>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={revokeDialogOpen}
        title={t("settings.account.revokeDialogTitle")}
        description={t("settings.account.revokeDialogDescription")}
        confirmLabel={t("settings.account.revokeDialogConfirm")}
        cancelLabel={t("settings.aiProviders.removeDialogCancel")}
        destructive
        onConfirm={confirmRevoke}
        onCancel={() => {
          setRevokeTargetId(null);
          setRevokeDialogOpen(false);
        }}
      />
    </>
  );
}
