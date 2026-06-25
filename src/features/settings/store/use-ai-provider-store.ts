import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---- Types ------------------------------------------------------------------

export interface AiProvider {
  id: string;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export interface AiProviderOverride {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AiProviderState {
  providers: AiProvider[];
  activeProviderId: string | null;
  addProvider: (input: Omit<AiProvider, "id">) => string;
  updateProvider: (id: string, patch: Partial<Omit<AiProvider, "id">>) => void;
  removeProvider: (id: string) => void;
  setActiveProvider: (id: string | null) => void;
}

// ---- Presets ----------------------------------------------------------------

export const PROVIDER_PRESETS: Array<{ label: string; baseUrl: string; model: string }> = [
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o" },
  { label: "Anthropic", baseUrl: "https://api.anthropic.com/v1", model: "claude-sonnet-4-6" },
  { label: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  { label: "Cerebras", baseUrl: "https://api.cerebras.ai/v1", model: "llama-3.3-70b" },
  { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o" },
  { label: "Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash" },
  { label: "Custom", baseUrl: "", model: "" },
];

// ---- Selector ---------------------------------------------------------------

/**
 * Returns the active provider override only when the active provider is
 * enabled and has non-empty baseUrl, apiKey, AND model.
 * Returns undefined otherwise — no explicit undefined passed.
 */
export function selectActiveProviderOverride(
  state: AiProviderState,
): AiProviderOverride | undefined {
  const active = state.providers.find((p) => p.id === state.activeProviderId);
  if (
    active &&
    active.enabled &&
    active.baseUrl.trim() !== "" &&
    active.apiKey.trim() !== "" &&
    active.model.trim() !== ""
  ) {
    return { baseUrl: active.baseUrl, apiKey: active.apiKey, model: active.model };
  }
}

// ---- Store ------------------------------------------------------------------

export const useAiProviderStore = create<AiProviderState>()(
  persist(
    (set) => ({
      providers: [],
      activeProviderId: null,

      addProvider: (input) => {
        const id = crypto.randomUUID();
        set((state) => {
          const isFirst = state.providers.length === 0;
          return {
            providers: [...state.providers, { ...input, id }],
            ...(isFirst ? { activeProviderId: id } : {}),
          };
        });
        return id;
      },

      updateProvider: (id, patch) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        }));
      },

      removeProvider: (id) => {
        set((state) => ({
          providers: state.providers.filter((p) => p.id !== id),
          ...(state.activeProviderId === id ? { activeProviderId: null } : {}),
        }));
      },

      setActiveProvider: (id) => {
        set({ activeProviderId: id });
      },
    }),
    {
      name: "studydeck-ai-providers",
    },
  ),
);
