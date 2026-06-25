import "../shared/i18n/i18n";
import "@testing-library/jest-dom";
import i18n from "../shared/i18n/i18n";
import { afterEach } from "vitest";

// Reset i18n language to English after each test to prevent language leak
// between test files (e.g. a test that calls i18n.changeLanguage('es') should
// not affect subsequent test files in the same Vitest worker).
afterEach(() => {
  void i18n.changeLanguage("en");
});

// Provide a minimal localStorage shim for jsdom test environments where the
// native localStorage is either absent or blocked (opaque origin).
// Zustand's persist middleware lazily calls window.localStorage.setItem —
// if it's broken, we replace the whole property with a working in-memory shim.
if (typeof window !== "undefined") {
  let broken = false;
  try {
    // Check if setItem is actually callable
    if (typeof window.localStorage?.setItem !== "function") broken = true;
  } catch {
    broken = true;
  }

  if (broken) {
    const _storage: Record<string, string> = {};
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      writable: true,
      value: {
        getItem: (key: string) => _storage[key] ?? null,
        setItem: (key: string, value: string) => {
          _storage[key] = value;
        },
        removeItem: (key: string) => {
          delete _storage[key];
        },
        clear: () => {
          for (const k of Object.keys(_storage)) delete _storage[k];
        },
        get length() {
          return Object.keys(_storage).length;
        },
        key: (i: number) => Object.keys(_storage)[i] ?? null,
      },
    });
  }
}
