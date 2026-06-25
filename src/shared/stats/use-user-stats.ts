import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@shared/api/axios-instance";
import { queryKeys } from "@shared/query/query-keys";

/**
 * Wire token used by the backend for the SM-2 scheduler.
 * The UI displays "SM-2" but sends/receives "SM2" over the API.
 */
type SchedulerAlgorithmWire = "FSRS" | "SM2";

/** Display value used in the UI (and stored locally). */
export type SchedulerAlgorithmUI = "FSRS" | "SM-2";

/** Map from wire token → UI display value. */
export function wireToUiAlgorithm(wire: SchedulerAlgorithmWire): SchedulerAlgorithmUI {
  return wire === "SM2" ? "SM-2" : "FSRS";
}

/** Map from UI display value → wire token. */
export function uiToWireAlgorithm(ui: SchedulerAlgorithmUI): SchedulerAlgorithmWire {
  return ui === "SM-2" ? "SM2" : "FSRS";
}

export interface UserStats {
  dueToday: number;
  newCards: number;
  reviewedToday: number;
  dayStreak: number;
  retention30d?: number;
  dailyGoal: number;
  desiredRetention?: number;
  newCardsPerDay?: number;
  language?: string;
  timezone?: string;
  /** Scheduler algorithm returned from the backend (wire token). Mapped to UI via wireToUiAlgorithm. */
  schedulerAlgorithm?: SchedulerAlgorithmUI;
}

export interface PreferencesPayload {
  dailyGoal?: number;
  desiredRetention?: number;
  newCardsPerDay?: number;
  language?: string;
  timezone?: string;
  /** Scheduler algorithm in UI display form ("FSRS" | "SM-2"). Converted to wire token before sending. */
  schedulerAlgorithm?: SchedulerAlgorithmUI;
}

/** Raw stats shape returned by the API (schedulerAlgorithm uses wire tokens). */
type UserStatsWire = Omit<UserStats, "schedulerAlgorithm"> & {
  schedulerAlgorithm?: SchedulerAlgorithmWire;
};

export function useUserStats() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return useQuery<UserStats>({
    queryKey: queryKeys.stats.user(),
    queryFn: async (): Promise<UserStats> => {
      const response = await axiosInstance.get<UserStatsWire>("/v1/stats", { params: { tz } });
      const raw = response.data;
      const result: UserStats = {
        dueToday: raw.dueToday,
        newCards: raw.newCards,
        reviewedToday: raw.reviewedToday,
        dayStreak: raw.dayStreak,
        dailyGoal: raw.dailyGoal,
        ...(raw.retention30d !== undefined && { retention30d: raw.retention30d }),
        ...(raw.desiredRetention !== undefined && { desiredRetention: raw.desiredRetention }),
        ...(raw.newCardsPerDay !== undefined && { newCardsPerDay: raw.newCardsPerDay }),
        ...(raw.language !== undefined && { language: raw.language }),
        ...(raw.timezone !== undefined && { timezone: raw.timezone }),
        ...(raw.schedulerAlgorithm !== undefined && {
          schedulerAlgorithm: wireToUiAlgorithm(raw.schedulerAlgorithm),
        }),
      };
      return result;
    },
  });
}

/**
 * Updates one or more user preferences (synced to the backend) and refreshes stats on success.
 * Only the fields actually present in the payload are sent to the API — never explicit undefined.
 */
/** Wire body shape sent to PATCH /v1/account/preferences. */
interface PreferencesWireBody {
  dailyGoal?: number;
  desiredRetention?: number;
  newCardsPerDay?: number;
  language?: string;
  timezone?: string;
  schedulerAlgorithm?: SchedulerAlgorithmWire;
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, PreferencesPayload>({
    mutationFn: async (payload) => {
      const body: PreferencesWireBody = {
        ...(payload.dailyGoal !== undefined && { dailyGoal: payload.dailyGoal }),
        ...(payload.desiredRetention !== undefined && { desiredRetention: payload.desiredRetention }),
        ...(payload.newCardsPerDay !== undefined && { newCardsPerDay: payload.newCardsPerDay }),
        ...(payload.language !== undefined && { language: payload.language }),
        ...(payload.timezone !== undefined && { timezone: payload.timezone }),
        ...(payload.schedulerAlgorithm !== undefined && {
          schedulerAlgorithm: uiToWireAlgorithm(payload.schedulerAlgorithm),
        }),
      };
      await axiosInstance.patch("/v1/account/preferences", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.user() });
    },
  });
}

/**
 * Updates the user's daily study goal (synced to the backend) and refreshes the stats so the
 * sidebar goal widget and dashboard reflect the new target.
 *
 * Delegates to useUpdatePreferences internally.
 */
export function useUpdateDailyGoal() {
  const updatePreferences = useUpdatePreferences();
  return {
    ...updatePreferences,
    mutate: (dailyGoal: number) => updatePreferences.mutate({ dailyGoal }),
    mutateAsync: (dailyGoal: number) => updatePreferences.mutateAsync({ dailyGoal }),
  };
}
