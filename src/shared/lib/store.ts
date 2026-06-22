import { create } from "zustand";
import { persist } from "zustand/middleware";

const THEME = {
  LIGHT: "light",
  DARK: "dark",
} as const;

type Theme = (typeof THEME)[keyof typeof THEME];

type SchedulerAlgorithm = "FSRS" | "SM-2";

interface PreferencesState {
  theme: Theme;
  sidebarOpen: boolean;
  showIntervals: boolean;
  schedulerAlgorithm: SchedulerAlgorithm;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setShowIntervals: (v: boolean) => void;
  setSchedulerAlgorithm: (v: SchedulerAlgorithm) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: THEME.LIGHT,
      sidebarOpen: true,
      showIntervals: false,
      schedulerAlgorithm: "FSRS",
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setShowIntervals: (v) => set({ showIntervals: v }),
      setSchedulerAlgorithm: (v) => set({ schedulerAlgorithm: v }),
    }),
    {
      name: "studydeck-preferences",
    },
  ),
);
