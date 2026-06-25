import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreferencesState {
  sidebarOpen: boolean;
  showIntervals: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setShowIntervals: (v: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      showIntervals: false,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setShowIntervals: (v) => set({ showIntervals: v }),
    }),
    {
      name: "studydeck-preferences",
    },
  ),
);
