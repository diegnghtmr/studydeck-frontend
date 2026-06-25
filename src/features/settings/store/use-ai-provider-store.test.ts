import { describe, it, expect, beforeEach } from "vitest";
import {
  useAiProviderStore,
  selectActiveProviderOverride,
} from "./use-ai-provider-store";

// ---- Helpers ----------------------------------------------------------------

// Initial state shape that resets the store between tests.
// Zustand's persist middleware persists to localStorage (mocked in
// src/test/setup.ts) so setState triggers setItem — that's fine here.
const INITIAL_STATE = { providers: [], activeProviderId: null };

const FULL_PROVIDER = {
  label: "OpenAI",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "sk-test-key",
  model: "gpt-4o",
  enabled: true,
} as const;

// ---- Tests ------------------------------------------------------------------

describe("useAiProviderStore", () => {
  beforeEach(() => {
    useAiProviderStore.setState(INITIAL_STATE);
  });

  it("addProvider returns a string id", () => {
    const id = useAiProviderStore.getState().addProvider(FULL_PROVIDER);
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("first added provider becomes active automatically", () => {
    const id = useAiProviderStore.getState().addProvider(FULL_PROVIDER);
    expect(useAiProviderStore.getState().activeProviderId).toBe(id);
  });

  it("second added provider does NOT change activeProviderId", () => {
    const firstId = useAiProviderStore.getState().addProvider(FULL_PROVIDER);
    useAiProviderStore.getState().addProvider({
      label: "Anthropic",
      baseUrl: "https://api.anthropic.com/v1",
      apiKey: "sk-ant-key",
      model: "claude-sonnet-4-6",
      enabled: true,
    });
    expect(useAiProviderStore.getState().activeProviderId).toBe(firstId);
  });

  it("updateProvider patches a field", () => {
    const id = useAiProviderStore.getState().addProvider(FULL_PROVIDER);
    useAiProviderStore.getState().updateProvider(id, { baseUrl: "https://custom.example.com/v1" });
    const updated = useAiProviderStore.getState().providers.find((p) => p.id === id);
    expect(updated?.baseUrl).toBe("https://custom.example.com/v1");
  });

  it("removeProvider removes the provider from the list", () => {
    const id = useAiProviderStore.getState().addProvider(FULL_PROVIDER);
    useAiProviderStore.getState().removeProvider(id);
    const found = useAiProviderStore.getState().providers.find((p) => p.id === id);
    expect(found).toBeUndefined();
  });

  it("removeProvider clears activeProviderId when removing the active provider", () => {
    const id = useAiProviderStore.getState().addProvider(FULL_PROVIDER);
    expect(useAiProviderStore.getState().activeProviderId).toBe(id);
    useAiProviderStore.getState().removeProvider(id);
    expect(useAiProviderStore.getState().activeProviderId).toBeNull();
  });

  it("setActiveProvider changes the active provider", () => {
    const firstId = useAiProviderStore.getState().addProvider(FULL_PROVIDER);
    const secondId = useAiProviderStore.getState().addProvider({
      label: "Anthropic",
      baseUrl: "https://api.anthropic.com/v1",
      apiKey: "sk-ant-key",
      model: "claude-sonnet-4-6",
      enabled: true,
    });
    useAiProviderStore.getState().setActiveProvider(secondId);
    expect(useAiProviderStore.getState().activeProviderId).toBe(secondId);
    expect(useAiProviderStore.getState().activeProviderId).not.toBe(firstId);
  });
});

describe("selectActiveProviderOverride", () => {
  beforeEach(() => {
    useAiProviderStore.setState(INITIAL_STATE);
  });

  it("returns undefined when no active provider", () => {
    const state = useAiProviderStore.getState();
    expect(selectActiveProviderOverride(state)).toBeUndefined();
  });

  it("returns undefined when active provider is disabled", () => {
    const id = useAiProviderStore.getState().addProvider({ ...FULL_PROVIDER, enabled: false });
    useAiProviderStore.getState().setActiveProvider(id);
    const state = useAiProviderStore.getState();
    expect(selectActiveProviderOverride(state)).toBeUndefined();
  });

  it("returns undefined when active provider has empty baseUrl", () => {
    const id = useAiProviderStore.getState().addProvider({ ...FULL_PROVIDER, baseUrl: "" });
    useAiProviderStore.getState().setActiveProvider(id);
    const state = useAiProviderStore.getState();
    expect(selectActiveProviderOverride(state)).toBeUndefined();
  });

  it("returns undefined when active provider has empty apiKey", () => {
    const id = useAiProviderStore.getState().addProvider({ ...FULL_PROVIDER, apiKey: "" });
    useAiProviderStore.getState().setActiveProvider(id);
    const state = useAiProviderStore.getState();
    expect(selectActiveProviderOverride(state)).toBeUndefined();
  });

  it("returns undefined when active provider has empty model", () => {
    const id = useAiProviderStore.getState().addProvider({ ...FULL_PROVIDER, model: "" });
    useAiProviderStore.getState().setActiveProvider(id);
    const state = useAiProviderStore.getState();
    expect(selectActiveProviderOverride(state)).toBeUndefined();
  });

  it("returns the override when provider is active, enabled, and all fields non-empty", () => {
    const id = useAiProviderStore.getState().addProvider(FULL_PROVIDER);
    useAiProviderStore.getState().setActiveProvider(id);
    const state = useAiProviderStore.getState();
    const override = selectActiveProviderOverride(state);
    expect(override).toEqual({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-test-key",
      model: "gpt-4o",
    });
  });
});
