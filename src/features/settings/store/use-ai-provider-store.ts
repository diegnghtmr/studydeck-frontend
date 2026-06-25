import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---- Legacy storage key (read-only migration detection) ---------------------
// The old store persisted providers + apiKeys under this key. We only READ
// this key now to detect un-migrated keys; we never WRITE new keys here.
export const LEGACY_STORAGE_KEY = "studydeck-ai-providers";

// ---- Legacy shape (type-only, for migration detection) ----------------------

interface LegacyAiProvider {
  id: string;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

interface LegacyStorageState {
  providers: LegacyAiProvider[];
  activeProviderId: string | null;
}

interface LegacyStorageEnvelope {
  state?: LegacyStorageState;
}

// ---- Provider presets (UI concern only — no keys stored) --------------------

export const PROVIDER_PRESETS: Array<{ label: string; baseUrl: string; model: string }> = [
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o" },
  { label: "Anthropic", baseUrl: "https://api.anthropic.com/v1", model: "claude-sonnet-4-6" },
  { label: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  { label: "Cerebras", baseUrl: "https://api.cerebras.ai/v1", model: "llama-3.3-70b" },
  { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o" },
  { label: "Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash" },
  { label: "Custom", baseUrl: "", model: "" },
];

// ---- Store ------------------------------------------------------------------
// The store is now purely a UI state carrier:
//   - migrationDismissed: whether the one-time migration banner was dismissed.
// Provider data (including apiKey) lives on the server, NOT in localStorage.

export interface AiProviderStoreState {
  migrationDismissed: boolean;
  setMigrationDismissed: (dismissed: boolean) => void;
}

export const useAiProviderStore = create<AiProviderStoreState>()(
  persist(
    (set) => ({
      migrationDismissed: false,
      setMigrationDismissed: (dismissed) => set({ migrationDismissed: dismissed }),
    }),
    {
      // Use a different key so we don't accidentally read the legacy shape as our
      // new shape. The legacy key is intentionally left alone until explicit migration.
      name: "studydeck-ai-provider-ui",
    },
  ),
);

// ---- Migration utilities ----------------------------------------------------

/**
 * Returns true when the OLD `studydeck-ai-providers` localStorage entry
 * contains at least one provider entry (regardless of whether apiKey is set).
 * Any provider row indicates the user had previously configured something.
 *
 * Used ONLY for migration-prompt detection — never to retrieve keys for use.
 * Safe to call: returns false on any parse error or missing key.
 */
export function hasLegacyLocalStorageProviders(): boolean {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return false;
    const envelope = JSON.parse(raw) as LegacyStorageEnvelope;
    const providers = envelope.state?.providers ?? [];
    return providers.length > 0;
  } catch {
    return false;
  }
}

/**
 * Remove the legacy localStorage entry after a successful server-side save.
 * Idempotent — safe to call multiple times.
 */
export function clearLegacyLocalStorage(): void {
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
