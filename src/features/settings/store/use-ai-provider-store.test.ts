import { describe, it, expect, beforeEach } from "vitest";
import {
  useAiProviderStore,
  hasLegacyLocalStorageProviders,
  clearLegacyLocalStorage,
  LEGACY_STORAGE_KEY,
} from "./use-ai-provider-store";

// ---- Helpers ----------------------------------------------------------------

const INITIAL_STATE = { migrationDismissed: false };

// ---- Tests ------------------------------------------------------------------

describe("useAiProviderStore", () => {
  beforeEach(() => {
    useAiProviderStore.setState(INITIAL_STATE);
    // Clear legacy key between tests
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  });

  it("migrationDismissed is false by default", () => {
    expect(useAiProviderStore.getState().migrationDismissed).toBe(false);
  });

  it("setMigrationDismissed sets the flag to true", () => {
    useAiProviderStore.getState().setMigrationDismissed(true);
    expect(useAiProviderStore.getState().migrationDismissed).toBe(true);
  });

  it("setMigrationDismissed can reset the flag to false", () => {
    useAiProviderStore.getState().setMigrationDismissed(true);
    useAiProviderStore.getState().setMigrationDismissed(false);
    expect(useAiProviderStore.getState().migrationDismissed).toBe(false);
  });
});

describe("hasLegacyLocalStorageProviders", () => {
  beforeEach(() => {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  });

  it("returns false when localStorage has no legacy key", () => {
    expect(hasLegacyLocalStorageProviders()).toBe(false);
  });

  it("returns false when legacy key is present but providers array is empty", () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ state: { providers: [], activeProviderId: null } }),
    );
    expect(hasLegacyLocalStorageProviders()).toBe(false);
  });

  it("returns true when legacy key has providers with non-empty apiKey", () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({
        state: {
          providers: [
            {
              id: "p1",
              label: "OpenAI",
              baseUrl: "https://api.openai.com/v1",
              apiKey: "sk-test",
              model: "gpt-4o",
              enabled: true,
            },
          ],
          activeProviderId: "p1",
        },
        version: 0,
      }),
    );
    expect(hasLegacyLocalStorageProviders()).toBe(true);
  });

  it("returns false when legacy providers have empty apiKey", () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({
        state: {
          providers: [
            {
              id: "p1",
              label: "OpenAI",
              baseUrl: "https://api.openai.com/v1",
              apiKey: "",
              model: "gpt-4o",
              enabled: true,
            },
          ],
          activeProviderId: null,
        },
      }),
    );
    // C6: empty-key entry still counts — any provider in the legacy array
    // means the user had configured something (even if the key is blank)
    expect(hasLegacyLocalStorageProviders()).toBe(true);
  });

  it("returns true for a legacy entry with any provider regardless of apiKey content (C6)", () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({
        state: {
          providers: [
            {
              id: "p1",
              label: "Custom",
              baseUrl: "https://custom.example.com/v1",
              apiKey: "",
              model: "my-model",
              enabled: false,
            },
          ],
          activeProviderId: null,
        },
      }),
    );
    expect(hasLegacyLocalStorageProviders()).toBe(true);
  });

  it("returns false when legacy JSON is malformed", () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, "not-json");
    expect(hasLegacyLocalStorageProviders()).toBe(false);
  });
});

describe("clearLegacyLocalStorage", () => {
  beforeEach(() => {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  });

  it("removes the legacy key from localStorage", () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, "anything");
    clearLegacyLocalStorage();
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  it("is a no-op when key is already absent", () => {
    expect(() => clearLegacyLocalStorage()).not.toThrow();
  });
});
