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
  selectActiveProviderOverride,
  PROVIDER_PRESETS,
} from "./store/use-ai-provider-store";
import type { AiProvider } from "./store/use-ai-provider-store";

// Suppress unused import warning — selectActiveProviderOverride is re-exported
// for consumers of this module to use without direct store access.
void selectActiveProviderOverride;

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


const PRESET_ITEMS = PROVIDER_PRESETS.map((p) => ({ value: p.label, label: p.label }));

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

  // AI Provider store
  const providers = useAiProviderStore((s) => s.providers);
  const activeProviderId = useAiProviderStore((s) => s.activeProviderId);
  const addProvider = useAiProviderStore((s) => s.addProvider);
  const updateProvider = useAiProviderStore((s) => s.updateProvider);
  const removeProvider = useAiProviderStore((s) => s.removeProvider);
  const setActiveProvider = useAiProviderStore((s) => s.setActiveProvider);

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
    // Best-effort: revoke all IdP sessions, then end this one.
    try {
      await logoutAllSessions.mutateAsync();
    } catch {
      // Ignore — still sign out locally below.
    }
    clearAuth();
    void auth?.signoutRedirect();
  }

  // ConfirmDialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  function requestRemove(id: string) {
    setPendingRemoveId(id);
    setConfirmOpen(true);
  }

  function confirmRemove() {
    if (pendingRemoveId) {
      removeProvider(pendingRemoveId);
      showToast(t("settings.aiProviders.providerRemovedToast"));
    }
    setPendingRemoveId(null);
    setConfirmOpen(false);
  }

  function handleAddFromPreset(presetLabel: string) {
    const preset = PROVIDER_PRESETS.find((p) => p.label === presetLabel);
    if (!preset) return;
    addProvider({
      label: preset.label,
      baseUrl: preset.baseUrl,
      model: preset.model,
      apiKey: "",
      enabled: true,
    });
    showToast(t("settings.aiProviders.providerAddedToast", { label: preset.label }));
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

            {/* Info banner */}
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
              {t("settings.aiProviders.infoBanner")}
            </div>

            {/* Add provider */}
            <div
              style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}
            >
              <span style={{ fontSize: "13px", color: "var(--color-ash)" }}>{t("settings.aiProviders.addLabel")}</span>
              <Dropdown
                items={PRESET_ITEMS}
                placeholder={t("settings.aiProviders.choosePlaceholder")}
                onSelect={handleAddFromPreset}
                data-testid="add-provider-dropdown"
              />
            </div>

            {/* Provider list */}
            {providers.length === 0 && (
              <p style={{ fontSize: "13px", color: "var(--color-ash)" }}>
                {t("settings.aiProviders.noProviders")}
              </p>
            )}

            {providers.map((provider, idx) => (
              <ProviderEntry
                key={provider.id}
                provider={provider}
                isActive={provider.id === activeProviderId}
                onUpdate={(patch) => {
                  updateProvider(provider.id, patch);
                  showToast(t("settings.aiProviders.providerSavedToast"));
                }}
                onSetActive={() => setActiveProvider(provider.id)}
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

// ---- ProviderEntry component -----------------------------------------------

interface ProviderEntryProps {
  provider: AiProvider;
  isActive: boolean;
  onUpdate: (patch: Partial<Omit<AiProvider, "id">>) => void;
  onSetActive: () => void;
  onRemove: () => void;
  showDivider: boolean;
}

function ProviderEntry({
  provider,
  isActive,
  onUpdate,
  onSetActive,
  onRemove,
  showDivider,
}: ProviderEntryProps) {
  const { t } = useTranslation();
  const hasAllFields =
    provider.baseUrl.trim() !== "" &&
    provider.apiKey.trim() !== "" &&
    provider.model.trim() !== "";
  const badgeTone = isActive ? "green" : hasAllFields ? "blue" : "gray";
  const badgeLabel = isActive
    ? t("settings.aiProviders.badgeActive")
    : hasAllFields
    ? t("settings.aiProviders.badgeConfigured")
    : t("settings.aiProviders.badgeNotSet");

  return (
    <div>
      {showDivider && <div style={{ borderTop: "1px solid #eee", margin: "16px 0" }} />}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Header row: label + badge + use + remove */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontWeight: 600, fontSize: "14px", flex: 1 }}>{provider.label}</span>
          <Badge tone={badgeTone} label={badgeLabel} data-testid={`badge-${provider.id}`} />
          {!isActive && (
            <PillButton
              size="sm"
              variant="secondary"
              onClick={onSetActive}
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
          <ToggleSwitch
            checked={provider.enabled}
            onChange={(v) => onUpdate({ enabled: v })}
            label={t("settings.aiProviders.enabledLabel")}
          />
        </div>
        {/* Fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={fieldLabelStyle}>{t("settings.aiProviders.baseUrlLabel")}</label>
            <input
              type="text"
              className={`w-full text-[14px] ${FIELD_CLASS}`}
              value={provider.baseUrl}
              onChange={(e) => onUpdate({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              data-testid={`baseUrl-${provider.id}`}
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>{t("settings.aiProviders.modelLabel")}</label>
            <input
              type="text"
              className={`w-full text-[14px] ${FIELD_CLASS}`}
              value={provider.model}
              onChange={(e) => onUpdate({ model: e.target.value })}
              placeholder="gpt-4o"
              data-testid={`model-${provider.id}`}
            />
          </div>
        </div>
        <div>
          <label style={fieldLabelStyle}>{t("settings.aiProviders.apiKeyLabel")}</label>
          <input
            type="password"
            className={`w-full text-[14px] ${FIELD_CLASS}`}
            value={provider.apiKey}
            onChange={(e) => onUpdate({ apiKey: e.target.value })}
            placeholder="sk-••••••••••••"
            data-testid={`apiKey-${provider.id}`}
          />
        </div>
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
        {sessions.map((session, i) => (
          <div
            key={session.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              padding: "10px 0",
              // Last row drops its divider so it doesn't double up with the
              // section separator that follows.
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
