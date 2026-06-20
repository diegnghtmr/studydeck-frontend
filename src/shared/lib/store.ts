import { create } from "zustand";
import { persist } from "zustand/middleware";

const THEME = {
  LIGHT: "light",
  DARK: "dark",
} as const;

type Theme = (typeof THEME)[keyof typeof THEME];

interface PreferencesState {
  theme: Theme;
  sidebarOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: THEME.LIGHT,
      sidebarOpen: true,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: "studydeck-preferences",
    },
  ),
);
